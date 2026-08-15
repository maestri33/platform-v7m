"""Receiver de eventos do Asaas (webhook de status).

Porte da lógica do micro legado (charge.apply_webhook + payment.apply_webhook) pro mono Django,
ORM síncrono. Fluxo (CONVENTION §7): persiste o evento bruto → mapeia PAYMENT_*/TRANSFER_* pra
Payment.status (só altera estado DENTRO do app Asaas). O payload bruto permanece em WebhookEvent.
"""

import structlog
from django.utils import timezone

from core import hooks as core_hooks

from .models import Payment, WebhookEvent

logger = structlog.get_logger()

# Evento de cobrança (inbound, kind=charge) -> status. None = no-op (só refresh de metadata).
ASAAS_TO_CHARGE_STATUS = {
    "PAYMENT_CREATED": "PENDING",
    "PAYMENT_UPDATED": None,
    "PAYMENT_CONFIRMED": "PAID",
    "PAYMENT_RECEIVED": "PAID",
    "PAYMENT_OVERDUE": "EXPIRED",
    "PAYMENT_DELETED": "CANCELLED",
    "PAYMENT_RESTORED": "PENDING",
    "PAYMENT_REFUNDED": "REFUNDED",
    "PAYMENT_RECEIVED_IN_CASH_UNDONE": "PENDING",
}

# Evento de transferência (outbound, kind=pixkey|qrcode) -> status.
ASAAS_TO_PAYOUT_STATUS = {
    "TRANSFER_DONE": "PAID",
    "TRANSFER_FAILED": "FAILED",
    "TRANSFER_BLOCKED": "FAILED",
    "TRANSFER_CANCELLED": "CANCELLED",
}

_PAYOUT_KINDS = (Payment.Kind.PIXKEY, Payment.Kind.QRCODE)

# Trechos do `failReason` do Asaas que indicam SALDO insuficiente na conta — não é recusa
# definitiva: o Payment (e a PaymentRequest que reconcilia por cima) fica AWAITING_BALANCE e a
# fila re-tenta sozinha (CONVENTION §8: não perde dinheiro), em vez de FAILED terminal.
_INSUFFICIENT_BALANCE_HINTS = (
    "saldo insuficiente",
    "insufficient balance",
    "insufficient_balance",
    "insufficient funds",
)


def is_insufficient_balance_reason(reason: str | None) -> bool:
    """True se o motivo de falha do Asaas indica falta de saldo (retryable, não terminal)."""
    reason = (reason or "").lower()
    return any(hint in reason for hint in _INSUFFICIENT_BALANCE_HINTS)


def handle_event(payload, source_ip=None, user_agent=None):
    """Persiste o evento bruto e roteia. Retorna o WebhookEvent.

    A persistência do evento NÃO é protegida (se o banco falhar, a view 500a e o Asaas re-tenta).
    O roteamento é protegido: erro ao aplicar não pode perder o evento já salvo — cai no fallback.
    """
    event = payload.get("event") if isinstance(payload, dict) else None

    row = WebhookEvent.objects.create(
        event=event or "",
        payload=payload if isinstance(payload, dict) else {"_raw": payload},
        source_ip=source_ip,
        user_agent=user_agent,
    )

    payment, reason = None, "unknown_event"
    try:
        if isinstance(event, str) and event.startswith("PAYMENT_"):
            payment, reason = _apply_charge(payload, event)
        elif isinstance(event, str) and event.startswith("TRANSFER_"):
            payment, reason = _apply_payout(payload, event)
    except Exception as exc:  # roteamento falhou -> não perde o evento, cai no fallback
        logger.error("webhook_apply_failed", asaas_event=event, error=str(exc))
        payment, reason = None, f"apply_failed: {exc}"

    if payment is not None:
        # COBRANÇA PAGA (kind=charge) -> dispara o hook do app destino (lead) §7.3.
        # G4: reraise=True — se o handler (comissão/matrícula) falhar, a exceção propaga, a view dá
        # 500 e o Asaas re-tenta (o retry re-dispatcha via `already_paid_redispatch`). Antes o
        # dispatch engolia e a view respondia 200 → dinheiro recebido sem efeito, mascarado. O row
        # NÃO é marcado forwarded_ok se o dispatch levantar (a linha abaixo não executa).
        consumed = False
        if payment.status == "PAID" and payment.kind == Payment.Kind.CHARGE:
            consumed = core_hooks.dispatch(
                "payment.paid",
                reraise=True,
                provider="asaas",
                provider_payment_id=payment.payment_id,
                amount_cents=int(payment.amount * 100),
                # comprovante PIX (Asaas) → o lead manda pro aluno na notify de pago.
                receipt_url=(payload.get("payment") or {}).get("transactionReceiptUrl"),
            )
        row.forwarded_ok = True
        row.forwarded_at = timezone.now()
        row.save(update_fields=["forwarded_ok", "forwarded_at"])
        if not consumed:
            logger.warning(
                "webhook_unconsumed",
                provider="asaas",
                provider_event=event or "",
                reason=f"applied_no_consumer: {reason}",
            )
    else:
        logger.warning(
            "webhook_unconsumed",
            provider="asaas",
            provider_event=event or "",
            reason=reason,
        )

    return row


def _apply_charge(payload, event):
    """PAYMENT_* -> Payment(kind=charge). Retorna (payment_atualizado|None, reason)."""
    if event not in ASAAS_TO_CHARGE_STATUS:
        return None, f"unmapped_charge_event: {event}"
    new_status = ASAAS_TO_CHARGE_STATUS[event]
    data = payload.get("payment") or {}
    asaas_id = data.get("id")
    ext_ref = data.get("externalReference")

    row = _find_payment(ext_ref, asaas_id, kinds=(Payment.Kind.CHARGE,))
    if row is None:
        return None, f"no_matching_charge: ext_ref={ext_ref} asaas_id={asaas_id}"

    if asaas_id and row.asaas_id != asaas_id:
        row.asaas_id = asaas_id
    if new_status is None:  # PAYMENT_UPDATED -> só refresh, sem mudar status
        row.save()
        return None, "payment_updated_noop"
    # G5: não rebaixa estado terminal por evento tardio/fora de ordem. REFUNDED é final; PAID só
    # aceita ir pra PAID/REFUNDED. Pagamento tardio legítimo (PENDING/EXPIRED -> PAID) continua. Sem
    # isso, um PAYMENT_OVERDUE reentregue sobre um PAID gravava EXPIRED e travava o reembolso depois.
    if row.status == "REFUNDED" or (
        row.status == "PAID" and new_status not in ("PAID", "REFUNDED")
    ):
        return None, f"terminal_{row.status}_ignora_{new_status}"
    if row.status == new_status:
        # G4: PAID já-pago ainda RE-dispatcha (retorna o row). No retry após uma falha de efeito, o
        # Payment já está PAID; sem isso, `status_unchanged` pulava o re-dispatch e o efeito
        # (comissão/matrícula) nunca reprocessava. O handler é idempotente → re-dispatch de sucesso
        # é no-op seguro. Só PAID (terminal de cobrança) re-dispatcha; os demais seguem no-op.
        if new_status == "PAID":
            return row, "already_paid_redispatch"
        return None, "status_unchanged"
    row.status = new_status
    row.save()
    logger.info(
        "charge_status_changed",
        payment_id=row.payment_id,
        status=new_status,
        asaas_event=event,
    )
    return row, "ok"


def _apply_payout(payload, event):
    """TRANSFER_* -> Payment(kind in pixkey,qrcode). Retorna (payment|None, reason)."""
    new_status = ASAAS_TO_PAYOUT_STATUS.get(event)
    if not new_status:
        return None, f"unmapped_transfer_event: {event}"
    data = payload.get("transfer") or {}
    asaas_id = data.get("id")
    ext_ref = data.get("externalReference")
    fail_reason = data.get("failReason") or ""

    # saldo insuficiente NÃO é recusa definitiva: vira AWAITING_BALANCE (não-terminal, a fila
    # do finance re-tenta sozinha) em vez de FAILED.
    if new_status == "FAILED" and is_insufficient_balance_reason(fail_reason):
        new_status = "AWAITING_BALANCE"

    row = _find_payment(ext_ref, asaas_id, kinds=_PAYOUT_KINDS)
    if row is None:
        return None, f"no_matching_transfer: ext_ref={ext_ref} asaas_id={asaas_id}"

    if asaas_id and row.asaas_id != asaas_id:
        row.asaas_id = asaas_id
    if row.status == new_status:
        return None, "status_unchanged"
    row.status = new_status
    if new_status == "FAILED":
        row.last_error = fail_reason or f"event={event}"
    row.save()
    logger.info(
        "payout_status_changed",
        payment_id=row.payment_id,
        status=new_status,
        asaas_event=event,
    )
    return row, "ok"


def _find_payment(ext_ref, asaas_id, kinds):
    """Match por externalReference (= nosso payment_id) e, em seguida, por asaas_id."""
    qs = Payment.objects.filter(kind__in=kinds)
    if ext_ref:
        row = qs.filter(payment_id=ext_ref).first()
        if row is not None:
            return row
    if asaas_id:
        return qs.filter(asaas_id=asaas_id).first()
    return None
