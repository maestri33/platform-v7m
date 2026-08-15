"""Charge service — cobranças PIX recebidas via Asaas (porte do legado, ORM síncrono).

Fluxo de criação (CONVENTION §8 — caminho do dinheiro idempotente):
  1. find_or_create customer (payer)
  2. POST /v3/payments {customer, billingType: PIX, value, dueDate, description, externalReference=payment_id}
  3. GET /v3/payments/{id}/pixQrCode -> {payload (copia-e-cola), encodedImage (PNG base64)}
  4. grava o PNG em /media/ + persiste Payment(kind=charge, status=PENDING)
O status depois é guiado pelo webhook (1a-iii mapeia PAYMENT_*). O client httpx é async; chamamos
via asyncio.run() (mesmo padrão do /status/), com o ORM síncrono em volta.
"""

import asyncio
import uuid
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation

import structlog
from django.conf import settings

from . import customers
from .client import AsaasError, get_client
from .models import Payment
from .qr import qr_url_for, save_pix_qr_png

logger = structlog.get_logger()

_TERMINAL = {"PAID", "EXPIRED", "CANCELLED", "REFUNDED"}


class ChargeError(Exception):
    pass


def _new_or_check_payment_id(payment_id: str | None) -> str:
    pid = payment_id or f"pay_{uuid.uuid4().hex[:16]}"
    if Payment.objects.filter(payment_id=pid).exists():
        raise ChargeError("payment_id_already_exists")
    return pid


def _resolve_due_date(due_date: str | None) -> date:
    if not due_date:
        return date.today() + timedelta(days=settings.ASAAS_CHARGE_DUE_DAYS)
    try:
        parsed = date.fromisoformat(due_date)
    except ValueError as e:
        raise ChargeError(f"invalid_due_date: {e}") from e
    if parsed < date.today():
        raise ChargeError(f"invalid_due_date: {due_date} está no passado")
    return parsed


async def _create_payment_and_qr(
    customer_asaas_id, value, due, description, pid, success_url=None
):
    async with get_client() as c:
        payload = {
            "customer": customer_asaas_id,
            "billingType": "PIX",
            "value": value,
            "dueDate": due.isoformat(),
            "description": description or f"charge {pid}",
            "externalReference": pid,
        }
        if success_url:
            # a página hospedada do Asaas redireciona pra cá depois de pago.
            payload["callback"] = {"successUrl": success_url, "autoRedirect": True}
        created = await c.create_payment(payload)
        qr = None
        try:
            qr = await c.get_payment_pix_qr_code(created["id"])
        except AsaasError as e:
            # não bloqueia a criação — persistimos sem QR e dá pra rebuscar
            logger.warning(
                "charge_qr_fetch_failed", asaas_id=created.get("id"), body=str(e.body)
            )
        return created, qr


def create_charge(
    *, amount, payer, description=None, due_date=None, payment_id=None, success_url=None
) -> Payment:
    """Cria uma cobrança PIX (kind=charge). Retorna o Payment persistido (status PENDING).

    `success_url` (opcional): URL pra onde a página hospedada do Asaas redireciona após o pagamento.
    O `invoiceUrl` (página hospedada) volta como atributo transiente `row.invoice_url`."""
    if amount is None:
        raise ChargeError("amount_required")
    try:
        amt = Decimal(str(amount)).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError) as e:
        raise ChargeError(f"invalid_amount: {amount}") from e
    if amt <= 0:
        raise ChargeError("invalid_amount")

    cust = customers.find_or_create(payer)
    pid = _new_or_check_payment_id(payment_id)
    due = _resolve_due_date(due_date)

    try:
        created, qr = asyncio.run(
            _create_payment_and_qr(
                cust.asaas_id, float(amt), due, description, pid, success_url
            )
        )
    except AsaasError as e:
        raise ChargeError(f"asaas_charge_create_failed: {e.body}") from e

    encoded = (qr or {}).get("encodedImage")
    if encoded:
        try:
            save_pix_qr_png(pid, encoded)
        except Exception as exc:  # decode/IO falhou — não bloqueia a criação
            logger.error("qrcode_save_failed", payment_id=pid, error=str(exc))

    row = Payment.objects.create(
        payment_id=pid,
        kind=Payment.Kind.CHARGE,
        customer=cust,
        qrcode_payload=(qr or {}).get("payload"),
        pix_qr_image=encoded,
        amount=amt,
        description=description,
        due_date=due,
        status="PENDING",
        asaas_id=created["id"],
    )
    # invoiceUrl = página hospedada do Asaas (alvo do link curto). Transiente: não persistimos no Payment.
    row.invoice_url = created.get("invoiceUrl")
    logger.info(
        "charge_created", payment_id=pid, asaas_id=created["id"], amount=str(amt)
    )
    return row


def get_charge(payment_id: str) -> Payment:
    row = Payment.objects.filter(
        payment_id=payment_id, kind=Payment.Kind.CHARGE
    ).first()
    if row is None:
        raise ChargeError("not_found")
    return row


async def _delete(asaas_id):
    async with get_client() as c:
        return await c.delete_payment(asaas_id)


def cancel_charge(payment_id: str) -> Payment:
    row = get_charge(payment_id)
    if row.status in _TERMINAL:
        if row.status == "CANCELLED":
            return row
        raise ChargeError(f"cannot_cancel_status: {row.status}")
    if row.asaas_id:
        try:
            asyncio.run(_delete(row.asaas_id))
        except AsaasError as e:
            row.last_error = str(e.body)[:500]
            row.save(update_fields=["last_error"])
            raise ChargeError(f"asaas_charge_delete_failed: {e.body}") from e
    row.status = "CANCELLED"
    row.save()
    logger.info("charge_cancelled", payment_id=payment_id, asaas_id=row.asaas_id)
    return row


async def _refund(asaas_id):
    async with get_client() as c:
        return await c.refund_payment(asaas_id)


def refund_charge(payment_id: str) -> Payment:
    row = get_charge(payment_id)
    if row.status != "PAID":
        raise ChargeError(f"cannot_refund_status: {row.status}")
    try:
        asyncio.run(_refund(row.asaas_id))
    except AsaasError as e:
        raise ChargeError(f"asaas_charge_refund_failed: {e.body}") from e
    row.status = "REFUNDED"
    row.save()
    logger.info("charge_refunded", payment_id=payment_id, asaas_id=row.asaas_id)
    return row


def to_dict(row: Payment) -> dict:
    return {
        "payment_id": row.payment_id,
        "status": row.status,
        "asaas_id": row.asaas_id,
        "amount": str(row.amount),
        "description": row.description,
        "due_date": row.due_date.isoformat() if row.due_date else None,
        "customer": str(row.customer.external_id) if row.customer_id else None,
        "qr": {"payload": row.qrcode_payload, "image_url": qr_url_for(row.payment_id)},
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }
