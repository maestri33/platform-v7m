"""API v1 — send, send-event, notifications, phone/check, health."""

from __future__ import annotations

import uuid

import structlog
from ninja import Router, Schema
from ninja.errors import HttpError

from accounts.auth import api_key_auth

logger = structlog.get_logger()
router = Router(tags=["v1"])


# ── Health (sem auth) ───────────────────────────────────────────────────────

@router.get("/health", auth=None)
def health(request):
    from django.db import connection
    try:
        with connection.cursor() as cur:
            cur.execute("SELECT 1")
        db_ok = True
    except Exception:
        db_ok = False
    return {"status": "ok" if db_ok else "degraded", "db": db_ok}


@router.get("/ready", auth=None)
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


@router.get("/metrics", auth=None)
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
        out[label] = {
            "total": total,
            "whatsapp": dict(qs.exclude(whatsapp_status="skipped").values_list("whatsapp_status").annotate(c=Count("id"))),
            "email": dict(qs.exclude(email_status="skipped").values_list("email_status").annotate(c=Count("id"))),
            "por_conta": dict(qs.values_list("account__slug").annotate(c=Count("id")).order_by("-c")[:10]),
        }
        falhas = qs.filter(whatsapp_status="failed").count() + qs.filter(email_status="failed").count()
        out[label]["taxa_erro"] = round(falhas / total, 3) if total else 0.0
    try:
        from django_q.models import OrmQ

        out["fila"] = OrmQ.objects.count()
    except Exception:  # noqa: BLE001
        out["fila"] = None
    return out


# ── Send ────────────────────────────────────────────────────────────────────

class SendIn(Schema):
    text: str
    account_id: str | None = None  # slug/id; ausente → key (se houver) ou default
    caller: str = "api"
    phone: str | None = None
    email: str | None = None
    title: str | None = None
    subject: str | None = None
    whatsapp: bool = True
    email_channel: bool = False
    tts: bool = False
    media_url: str | None = None
    media_type: str | None = None
    gender: str | None = None
    mail_template: str = "default"
    external_id: str | None = None  # idempotency_key do cliente
    run_sync: bool = False


class SendOut(Schema):
    external_id: str


@router.post("/send", response=SendOut)
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
        tts=payload.tts,
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
    event: str
    account_id: str | None = None
    phone: str | None = None
    email: str | None = None
    nome: str | None = None
    nome_completo: str | None = None
    gender: str | None = None
    ctx: dict | None = None
    title: str | None = None
    subject: str | None = None
    media_url: str | None = None
    media_type: str | None = None
    mail_template: str | None = None
    idempotency_key: str | None = None
    body_md_override: str | None = None
    run_sync: bool = False
    is_tts_override: bool | None = None
    channels_override: list[str] | None = None


@router.post("/send-event", response=SendOut)
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
        is_tts_override=payload.is_tts_override,
        channels_override=payload.channels_override,
    )
    if ext is None:
        raise HttpError(404, f"Evento '{payload.event}' não encontrado ou inativo.")
    return {"external_id": ext}


# ── Notifications ───────────────────────────────────────────────────────────

class NotificationOut(Schema):
    external_id: str
    caller: str | None
    recipient_phone: str | None
    recipient_email: str | None
    whatsapp_status: str | None
    email_status: str | None
    tts_status: str | None
    attempts: int
    created_at: str
    title: str | None = None
    subject: str | None = None
    text: str = ""
    want_whatsapp: bool = False
    want_email: bool = False
    want_tts: bool = False
    whatsapp_error: str | None = None
    email_error: str | None = None
    tts_error: str | None = None
    idempotency_key: str | None = None
    media_url: str | None = None
    media_type: str | None = None
    gender: str | None = None
    mail_template: str = "default"


def _notification_out(n) -> NotificationOut:
    return NotificationOut(
        external_id=str(n.external_id),
        caller=n.caller,
        recipient_phone=n.recipient_phone,
        recipient_email=n.recipient_email,
        whatsapp_status=n.whatsapp_status,
        email_status=n.email_status,
        tts_status=n.tts_status,
        attempts=n.attempts,
        created_at=n.created_at.isoformat(),
        title=n.title,
        subject=n.subject,
        text=n.text,
        want_whatsapp=n.want_whatsapp,
        want_email=n.want_email,
        want_tts=n.want_tts,
        whatsapp_error=n.whatsapp_error,
        email_error=n.email_error,
        tts_error=n.tts_error,
        idempotency_key=n.idempotency_key,
        media_url=n.media_url,
        media_type=n.media_type,
        gender=n.gender,
        mail_template=n.mail_template,
    )


@router.get("/notifications", response=list[NotificationOut])
def list_notifications(
    request,
    account_id: str | None = None,
    caller: str | None = None,
    whatsapp_status: str | None = None,
    email_status: str | None = None,
    tts_status: str | None = None,
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
    if tts_status:
        qs = qs.filter(tts_status=tts_status)
    return [_notification_out(n) for n in qs[:limit]]


@router.get("/notifications/{external_id}", response=NotificationOut)
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
    numbers: list[str]
    account_id: str | None = None


class PhoneCheckOut(Schema):
    number: str
    exists: bool


@router.post("/phone/check", response=list[PhoneCheckOut])
def phone_check(request, payload: PhoneCheckIn):
    account = api_key_auth(request, payload.account_id)
    from asgiref.sync import async_to_sync
    from channels.models import WhatsAppNumber
    from whatsapp.errors import WhatsAppSessionDown
    from whatsapp.factory import get_driver

    wn = (
        WhatsAppNumber.objects.filter(account=account, is_default=True).first()
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
    return [
        PhoneCheckOut(
            number=item.get("number", ""),
            exists=bool(item.get("exists")),
        )
        for item in results or []
    ]
