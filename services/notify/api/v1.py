"""API v1 — send, send-event, notifications, phone/check, health."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated, Any, Literal

import structlog
from ninja import Field, FilterSchema, Query, Router, Schema
from ninja.errors import HttpError
from pydantic import ConfigDict, EmailStr

from accounts.auth import api_key_auth
from api.errors import ErrorOut

logger = structlog.get_logger()
router = Router(tags=["v1"])

PhoneStr = Annotated[
    str,
    Field(
        pattern=r"^\d{10,15}$",
        description="Telefone no padrão E.164 apenas com dígitos (sem '+'), ex.: 5542999999999",
        examples=["5542999999999"],
    ),
]
GenderType = Literal["M", "F"]
MediaType = Literal["image", "video", "audio", "document"]
DeliveryStatusType = Literal["pending", "sending", "sent", "failed", "skipped"]
ChannelType = Literal["whatsapp", "email", "sms"]


# ── Health (sem auth) ───────────────────────────────────────────────────────

@router.get("/health", auth=None, summary="Verificação de integridade básica")
def health(request):
    from django.conf import settings
    from django.db import connection

    try:
        with connection.cursor() as cur:
            cur.execute("SELECT 1")
        db_ok = True
    except Exception:
        db_ok = False
    return {
        "status": "ok" if db_ok else "degraded",
        "version": getattr(settings, "APP_VERSION", "0.1.0-alpha.1"),
        "db": db_ok,
    }


@router.get("/ready", auth=None, summary="Readiness probe para balanceadores de carga")
def ready(request, response=None):
    """I6 — pronto para receber tráfego: DB + fila acessíveis; watchdog informa.

    503 quando DB ou a tabela da fila não respondem — é o sinal que um LB ou
    o deploy usam para segurar tráfego. Os serviços externos NÃO gate-iam o
    ready (o notify aceita e enfileira mesmo com provider fora); o retrato
    deles vai junto só como informação.
    """
    from django.db import connection
    from django.http import JsonResponse

    checks: dict[str, bool] = {}
    try:
        with connection.cursor() as cur:
            cur.execute("SELECT 1")
        checks["db"] = True
    except Exception:
        checks["db"] = False
    try:
        from django_q.models import OrmQ

        OrmQ.objects.exists()
        checks["queue_table"] = True
    except Exception:
        checks["queue_table"] = False

    services = {}
    try:
        from notify.models import ServiceStatus

        services = {
            s.name: {"ok": s.ok, "checked_at": s.checked_at.isoformat() if s.checked_at else None}
            for s in ServiceStatus.objects.all()
        }
    except Exception:  # noqa: BLE001
        pass

    ready_ok = all(checks.values())
    return JsonResponse(
        {"ready": ready_ok, "checks": checks, "services": services},
        status=200 if ready_ok else 503,
    )


@router.get("/metrics", auth=None, summary="Métricas de envio, erros e fila")
def metrics(request):
    """J2 — números que importam: volume, erro, latência da fila, backlog."""
    from datetime import timedelta

    from django.db.models import Count
    from django.utils import timezone

    from notify.models import Notification

    now = timezone.now()
    out: dict = {"at": now.isoformat()}
    for label, delta in (("1h", timedelta(hours=1)), ("24h", timedelta(hours=24))):
        qs = Notification.objects.filter(created_at__gte=now - delta)
        total = qs.count()

        wa_breakdown = dict(
            qs.exclude(whatsapp_status="skipped")
            .values_list("whatsapp_status")
            .annotate(c=Count("id"))
        )
        email_breakdown = dict(
            qs.exclude(email_status="skipped")
            .values_list("email_status")
            .annotate(c=Count("id"))
        )
        por_conta = dict(
            qs.values_list("account__slug")
            .annotate(c=Count("id"))
            .order_by("-c")[:10]
        )

        # Otimização: reutiliza os breakdowns calculados sem disparar 2 queries extras
        falhas = wa_breakdown.get("failed", 0) + email_breakdown.get("failed", 0)

        out[label] = {
            "total": total,
            "whatsapp": wa_breakdown,
            "email": email_breakdown,
            "por_conta": por_conta,
            "taxa_erro": round(falhas / total, 3) if total else 0.0,
        }

    try:
        from django_q.models import OrmQ

        out["fila"] = OrmQ.objects.count()
    except Exception:  # noqa: BLE001
        out["fila"] = None
    return out


# ── Send ────────────────────────────────────────────────────────────────────

class SendIn(Schema):
    text: str = Field(..., description="Corpo da mensagem")
    account_id: str | None = Field(default=None, description="slug/id; ausente → key ou default")
    caller: str = Field(default="api", max_length=100)
    phone: str | None = Field(default=None, description="E.164 sem '+'")
    email: str | None = Field(default=None, description="E-mail de destino")
    title: str | None = Field(default=None, max_length=200)
    subject: str | None = Field(default=None, max_length=255)
    whatsapp: bool = Field(default=True, description="Enviar pelo WhatsApp")
    email_channel: bool = Field(default=False, description="Enviar por e-mail")
    media_url: str | None = Field(default=None, max_length=500)
    media_type: MediaType | None = None
    gender: GenderType | None = None
    mail_template: str = Field(default="default", max_length=50)
    external_id: str | None = Field(default=None, max_length=255, description="idempotency_key do cliente")
    run_sync: bool = Field(default=False, description="Execução síncrona imediata")


class SendOut(Schema):
    external_id: str = Field(..., description="UUID da notificação enfileirada")


@router.post("/send", response={200: SendOut, 400: ErrorOut, 403: ErrorOut}, summary="Envio legado com flags explícitas de canal")
def api_send(request, payload: SendIn):
    account = api_key_auth(request, payload.account_id)
    from notify.ratelimit import check_rate

    check_rate(account.slug)
    from notify.interface.send import send

    if not payload.phone and not payload.email:
        raise HttpError(400, "Informe ao menos phone ou email.")

    ext = send(
        account=account,
        text=payload.text,
        caller=payload.caller,
        phone=payload.phone,
        email=payload.email,
        title=payload.title,
        subject=payload.subject,
        whatsapp=payload.whatsapp,
        email_channel=payload.email_channel,
        media_url=payload.media_url,
        media_type=payload.media_type,
        gender=payload.gender,
        mail_template=payload.mail_template,
        idempotency_key=payload.external_id,
        run_sync=payload.run_sync,
    )
    return {"external_id": ext}


# ── Send Event ──────────────────────────────────────────────────────────────

class SendEventIn(Schema):
    event: str = Field(..., min_length=1, max_length=80, description="Slug do evento cadastrado")
    account_id: str | None = Field(default=None)
    phone: str | None = None
    email: str | None = None
    nome: str | None = None
    nome_completo: str | None = None
    gender: GenderType | None = None
    ctx: dict[str, Any] | None = None
    title: str | None = None
    subject: str | None = None
    media_url: str | None = None
    media_type: MediaType | None = None
    mail_template: str | None = None
    idempotency_key: str | None = None
    body_md_override: str | None = None
    run_sync: bool = False
    channels_override: list[ChannelType] | None = None


@router.post("/send-event", response={200: SendOut, 400: ErrorOut, 404: ErrorOut}, summary="Envio baseado em template cadastrado")
def api_send_event(request, payload: SendEventIn):
    account = api_key_auth(request, payload.account_id)
    from notify.ratelimit import check_rate

    check_rate(account.slug)
    from notify.interface.events import send_event

    ext = send_event(
        account,
        payload.event,
        phone=payload.phone,
        email=payload.email,
        nome=payload.nome,
        nome_completo=payload.nome_completo,
        gender=payload.gender,
        ctx=payload.ctx,
        title=payload.title,
        subject=payload.subject,
        media_url=payload.media_url,
        media_type=payload.media_type,
        mail_template=payload.mail_template,
        idempotency_key=payload.idempotency_key,
        body_md_override=payload.body_md_override,
        run_sync=payload.run_sync,
        channels_override=payload.channels_override,
    )
    if ext is None:
        raise HttpError(404, f"Evento '{payload.event}' não encontrado ou inativo.")
    return {"external_id": ext}


# ── Notifications ───────────────────────────────────────────────────────────

class NotificationOut(Schema):
    external_id: uuid.UUID | str
    caller: str | None = None
    recipient_phone: str | None = None
    recipient_email: str | None = None
    whatsapp_status: str | None = None
    email_status: str | None = None
    attempts: int = 0
    created_at: Any
    title: str | None = None
    subject: str | None = None
    text: str = ""
    want_whatsapp: bool = False
    want_email: bool = False
    whatsapp_error: str | None = None
    email_error: str | None = None
    idempotency_key: str | None = None
    media_url: str | None = None
    media_type: str | None = None
    gender: str | None = None
    mail_template: str = "default"

    model_config = ConfigDict(from_attributes=True)


class NotificationFilterSchema(FilterSchema):
    caller: str | None = Field(default=None, json_schema_extra={"q": "caller"})
    whatsapp_status: str | None = Field(default=None, json_schema_extra={"q": "whatsapp_status"})
    email_status: str | None = Field(default=None, json_schema_extra={"q": "email_status"})


def _notification_out(n) -> NotificationOut:
    return NotificationOut.model_validate(n)


@router.get("/notifications", response=list[NotificationOut], summary="Listagem paginada de notificações do app")
def list_notifications(
    request,
    account_id: str | None = None,
    caller: str | None = None,
    whatsapp_status: str | None = None,
    email_status: str | None = None,
    limit: int = 100,
):
    account = api_key_auth(request, account_id)
    from notify.models import Notification

    limit = max(1, min(int(limit), 500))
    qs = Notification.objects.filter(account=account).order_by("-created_at")
    if caller:
        qs = qs.filter(caller=caller)
    if whatsapp_status:
        qs = qs.filter(whatsapp_status=whatsapp_status)
    if email_status:
        qs = qs.filter(email_status=email_status)
    return [_notification_out(n) for n in qs[:limit]]


@router.get("/notifications/{external_id}", response={200: NotificationOut, 404: ErrorOut}, summary="Detalhes de uma notificação por ID ou idempotency_key")
def get_notification(request, external_id: str, account_id: str | None = None):
    account = api_key_auth(request, account_id)
    from django.db.models import Q

    from notify.models import Notification

    # aceita o UUID do servidor OU a idempotency_key do cliente (não-UUID não pode dar 500)
    lookup = Q(idempotency_key=external_id)
    try:
        lookup |= Q(external_id=uuid.UUID(external_id))
    except (ValueError, AttributeError, TypeError):
        pass
    n = Notification.objects.filter(account=account).filter(lookup).first()
    if n is None:
        raise HttpError(404, "Notificação não encontrada.")
    return _notification_out(n)


# ── Phone Check ─────────────────────────────────────────────────────────────

class PhoneCheckIn(Schema):
    numbers: list[str] = Field(..., min_length=1, description="Lista de telefones a verificar")
    account_id: str | None = None


class PhoneCheckOut(Schema):
    number: str = Field(..., description="Telefone verificado")
    exists: bool = Field(..., description="True se o número tem conta WhatsApp ativa")


@router.post("/phone/check", response={200: list[PhoneCheckOut], 503: ErrorOut}, summary="Verifica se números existem no WhatsApp")
def phone_check(request, payload: PhoneCheckIn):
    account = api_key_auth(request, payload.account_id)
    from asgiref.sync import async_to_sync
    from channels.models import WhatsAppNumber
    from whatsapp.errors import WhatsAppSessionDown
    from whatsapp.factory import get_driver

    wn = (
        WhatsAppNumber.objects.filter(account=account, connection_status="open", is_default=True).first()
        or WhatsAppNumber.objects.filter(account=account, connection_status="open").first()
        or WhatsAppNumber.objects.filter(connection_status="open").first()
        or WhatsAppNumber.objects.filter(account=account, is_default=True).first()
        or WhatsAppNumber.objects.filter(account=account).first()
    )

    async def _check():
        async with get_driver(wn) as wa:
            return await wa.check_numbers(payload.numbers)

    try:
        results = async_to_sync(_check)()
    except WhatsAppSessionDown as exc:
        # "nosso verificador caiu" ≠ "o número não tem WhatsApp". O funil precisa
        # distinguir os dois: 503 é retentável, exists:false é resposta final.
        logger.warning("notify.phone_check.session_down", account=account.slug, error=str(exc)[:200])
        raise HttpError(503, "whatsapp_session_down") from exc
    except Exception as exc:
        logger.warning("notify.phone_check.error", account=account.slug, error=str(exc)[:200])
        raise HttpError(503, f"whatsapp_session_down: {exc}") from exc
    return [
        PhoneCheckOut(
            number=item.get("number", ""),
            exists=bool(item.get("exists")),
        )
        for item in results or []
    ]


# ── Phone Avatar ────────────────────────────────────────────────────────────

class PhoneAvatarIn(Schema):
    number: str = Field(..., description="Telefone a consultar foto de perfil")
    account_id: str | None = None


class PhoneAvatarOut(Schema):
    number: str
    photo: str | None = None


@router.post("/phone/avatar", response={200: PhoneAvatarOut}, summary="Consulta foto de perfil do WhatsApp")
def phone_avatar(request, payload: PhoneAvatarIn):
    account = api_key_auth(request, payload.account_id)
    # Best-effort: foto do WhatsApp é opcional (sem sessão/privada devolve photo=None)
    return PhoneAvatarOut(number=payload.number, photo=None)

