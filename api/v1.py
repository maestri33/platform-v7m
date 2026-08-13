"""API v1 — send, send-event, notifications, phone/check, health."""

from __future__ import annotations

import uuid

from ninja import ModelSchema, Router, Schema
from ninja.errors import HttpError
from ninja.responses import Status

from accounts.auth import api_key_auth
from notify.models import Incident, Notification

router = Router(tags=["v1"], auth=api_key_auth)


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


# ── Send ────────────────────────────────────────────────────────────────────

class SendIn(Schema):
    text: str
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


class NotificationCreateIn(Schema):
    external_id: str
    text: str
    phone: str | None = None
    email: str | None = None
    channels: list[str]
    allow_alternate_sender: bool = False


class NotificationAcceptedOut(Schema):
    external_id: str
    notification_id: str
    status: str
    status_url: str


@router.post("/notifications", response={202: NotificationAcceptedOut})
def create_notification(request, payload: NotificationCreateIn):
    from notify.interface.send import send

    external_id = payload.external_id.strip()
    if not external_id:
        raise HttpError(400, "external_id é obrigatório.")

    channels = {channel.strip().lower() for channel in payload.channels}
    invalid_channels = channels - {"whatsapp", "email", "tts"}
    if invalid_channels:
        raise HttpError(400, f"Canais inválidos: {', '.join(sorted(invalid_channels))}.")
    if not channels:
        raise HttpError(400, "Informe ao menos um canal.")
    if channels & {"whatsapp", "tts"} and not payload.phone:
        raise HttpError(400, "phone é obrigatório para WhatsApp ou TTS.")
    if "email" in channels and not payload.email:
        raise HttpError(400, "email é obrigatório para o canal de e-mail.")

    notification_id = send(
        account=request.auth,
        text=payload.text,
        caller="api.notifications",
        phone=payload.phone,
        email=payload.email,
        whatsapp="whatsapp" in channels,
        email_channel="email" in channels,
        tts="tts" in channels,
        allow_alternate_sender=payload.allow_alternate_sender,
        idempotency_key=external_id,
    )
    return Status(202, {
        "external_id": external_id,
        "notification_id": notification_id,
        "status": "queued",
        "status_url": f"/v1/notifications/{external_id}",
    })


@router.post("/send", response=SendOut)
def api_send(request, payload: SendIn):
    account = request.auth
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
    account = request.auth
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

class NotificationOut(ModelSchema):
    class Meta:
        model = Notification
        fields = [
            "external_id", "created_at", "caller", "recipient_phone", "recipient_email", "whatsapp_status",
            "email_status", "tts_status", "attempts", "title", "subject", "text",
            "want_whatsapp", "want_email", "want_tts", "whatsapp_error", "email_error",
            "tts_error", "idempotency_key", "media_url", "media_type", "gender",
            "mail_template",
        ]


@router.get("/notifications", response=list[NotificationOut])
def list_notifications(
    request,
    caller: str | None = None,
    whatsapp_status: str | None = None,
    email_status: str | None = None,
    tts_status: str | None = None,
    limit: int = 100,
):
    account = request.auth

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
    return qs[:limit]


@router.get("/notifications/{external_id}", response=NotificationOut)
def get_notification(request, external_id: str):
    account = request.auth
    from django.db.models import Q

    # aceita o UUID do servidor OU a idempotency_key do cliente (não-UUID não pode dar 500)
    lookup = Q(idempotency_key=external_id)
    try:
        lookup |= Q(external_id=uuid.UUID(external_id))
    except (ValueError, AttributeError, TypeError):
        pass
    n = Notification.objects.filter(account=account).filter(lookup).first()
    if n is None:
        raise HttpError(404, "Notificação não encontrada.")
    return n


class IncidentOut(Schema):
    id: int
    channel: str
    category: str
    summary: str
    detail: str
    status: str
    occurrences: int
    notification_ids: list[str]


def _incident_out(incident: Incident) -> dict:
    return {
        "id": incident.id,
        "channel": incident.channel,
        "category": incident.category,
        "summary": incident.summary,
        "detail": incident.detail,
        "status": incident.status,
        "occurrences": incident.occurrences,
        "notification_ids": [
            str(value)
            for value in incident.notifications.values_list("external_id", flat=True)
        ],
    }


@router.get("/incidents", response=list[IncidentOut])
def list_incidents(request, status: str | None = None):
    incidents = Incident.objects.filter(account=request.auth).prefetch_related("notifications")
    if status:
        incidents = incidents.filter(status=status)
    return [_incident_out(incident) for incident in incidents[:100]]


@router.post("/incidents/{incident_id}/resolve", response=IncidentOut)
def resolve_incident(request, incident_id: int):
    incident = Incident.objects.filter(account=request.auth, pk=incident_id).first()
    if incident is None:
        raise HttpError(404, "Ocorrência não encontrada.")
    incident.status = Incident.STATUS_RESOLVED
    incident.save(update_fields=["status", "updated_at"])
    return _incident_out(incident)


# ── WhatsApp Poll ───────────────────────────────────────────────────────────

class PollIn(Schema):
    phone: str
    question: str
    options: list[str]
    max_answers: int = 1


@router.post("/whatsapp/poll")
def send_poll(request, payload: PollIn):
    account = request.auth
    if len(payload.options) < 2:
        raise HttpError(400, "A enquete precisa de ao menos duas opções.")
    if not 1 <= payload.max_answers <= len(payload.options):
        raise HttpError(400, "max_answers deve estar entre 1 e o total de opções.")

    from asgiref.sync import async_to_sync
    from channels.models import WhatsAppNumber
    from whatsapp.factory import get_driver

    wn = WhatsAppNumber.objects.filter(account=account, is_default=True).first()
    instance = wn.instance_name if wn else "default"

    async def _send():
        async with get_driver(instance) as wa:
            number = await wa.resolve_br_number(payload.phone)
            return await wa.send_poll(
                number,
                payload.question,
                payload.options,
                max_answers=payload.max_answers,
            )

    return async_to_sync(_send)()


# ── Phone Check ─────────────────────────────────────────────────────────────

class PhoneCheckIn(Schema):
    numbers: list[str]


class PhoneCheckOut(Schema):
    number: str
    exists: bool


@router.post("/phone/check", response=list[PhoneCheckOut])
def phone_check(request, payload: PhoneCheckIn):
    account = request.auth
    from asgiref.sync import async_to_sync
    from channels.models import WhatsAppNumber
    from whatsapp.factory import get_driver

    wn = WhatsAppNumber.objects.filter(account=account, is_default=True).first()
    instance = wn.instance_name if wn else "default"

    async def _check():
        async with get_driver(instance) as wa:
            return await wa.check_numbers(payload.numbers)

    results = async_to_sync(_check)()
    return [
        PhoneCheckOut(
            number=item.get("number", ""),
            exists=bool(item.get("exists")),
        )
        for item in results or []
    ]
