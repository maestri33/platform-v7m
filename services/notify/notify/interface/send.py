"""Superfície pública do notify-server — send() e send_adhoc().

Versão multi-tenant: toda chamada passa `account`. Config de canal vem das rows.
"""

from __future__ import annotations

import structlog
from django.db import IntegrityError, transaction

from notify.models import STATUS_PENDING, STATUS_SKIPPED, Notification

logger = structlog.get_logger()

_MEDIA_EXT = {
    "image": {"png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"},
    "video": {"mp4", "mov", "avi", "mkv", "webm", "3gp"},
    "audio": {"mp3", "ogg", "wav", "m4a", "aac", "opus"},
}


def _validate_media_url(url: str) -> None:
    """H6 — media_url vai crua pros providers; barra esquema/host abusivos.

    http(s) apenas; localhost/loopback só quando for a própria base de mídia
    do serviço (EXTERNAL_URL/MEDIA_LAN_BASE) — o resto é vetor de SSRF.
    """
    from urllib.parse import urlparse

    from django.conf import settings

    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError(f"media_url deve ser http(s), veio '{parsed.scheme or 'sem esquema'}'")
    host = (parsed.hostname or "").lower()
    if not host:
        raise ValueError("media_url sem host")
    proibidos = {"localhost", "127.0.0.1", "0.0.0.0", "::1", "169.254.169.254"}
    confiaveis = set()
    for base in (getattr(settings, "EXTERNAL_URL", ""), getattr(settings, "MEDIA_LAN_BASE", "")):
        h = urlparse(base).hostname
        if h:
            confiaveis.add(h.lower())
    if host in proibidos and host not in confiaveis:
        raise ValueError(f"media_url com host proibido: {host}")


def _guess_media_type(url: str) -> str:
    tail = url.rsplit("?", 1)[0].rsplit("/", 1)[-1]
    ext = tail.rsplit(".", 1)[-1].lower() if "." in tail else ""
    for media_type, exts in _MEDIA_EXT.items():
        if ext in exts:
            return media_type
    return "document"


def send(
    *,
    account,
    text: str,
    caller: str,
    phone: str | None = None,
    email: str | None = None,
    title: str | None = None,
    subject: str | None = None,
    whatsapp: bool = True,
    email_channel: bool = False,
    media_url: str | None = None,
    media_type: str | None = None,
    gender: str | None = None,
    mail_template: str = "default",
    idempotency_key: str | None = None,
    run_sync: bool = False,
    extra: dict | None = None,
) -> str:
    """Cria Notification e dispara envio. Devolve external_id.

    idempotency_key repetido (na mesma conta) devolve a notificação existente.
    """
    if idempotency_key:
        existing = Notification.objects.filter(
            account=account, idempotency_key=idempotency_key
        ).first()
        if existing is not None:
            logger.info("notify.idempotent_hit", external_id=str(existing.external_id), caller=caller)
            return str(existing.external_id)

    if media_url:
        _validate_media_url(media_url)
        if not media_type:
            media_type = _guess_media_type(media_url)

    # resolve qual número WhatsApp usar (default da conta)
    wa_number = None
    if whatsapp and phone:
        from channels.models import WhatsAppNumber
        wa_number = (
            WhatsAppNumber.objects.filter(account=account, connection_status="open", is_default=True).first()
            or WhatsAppNumber.objects.filter(account=account, connection_status="open").first()
            or WhatsAppNumber.objects.filter(connection_status="open").first()
            or WhatsAppNumber.objects.filter(account=account, is_default=True).first()
            or WhatsAppNumber.objects.filter(account=account).first()
        )

    wa_status = STATUS_PENDING if (whatsapp and phone) else STATUS_SKIPPED
    mail_status = STATUS_PENDING if (email_channel and email) else STATUS_SKIPPED

    try:
        with transaction.atomic():
            notif = Notification.objects.create(
                account=account,
                whatsapp_number=wa_number,
                idempotency_key=idempotency_key,
                caller=caller,
                recipient_phone=phone,
                recipient_email=email,
                title=title,
                text=text,
                subject=subject,
                mail_template=mail_template,
                media_url=media_url,
                media_type=media_type,
                gender=gender,
                extra=extra or {},
                want_whatsapp=whatsapp,
                want_email=email_channel,
                whatsapp_status=wa_status,
                email_status=mail_status,
            )
    except IntegrityError:
        existing = Notification.objects.get(account=account, idempotency_key=idempotency_key)
        logger.info("notify.idempotent_race", external_id=str(existing.external_id), caller=caller)
        return str(existing.external_id)

    logger.info(
        "notify.queued",
        external_id=str(notif.external_id),
        caller=caller,
        whatsapp=wa_status,
        email=mail_status,
        media=media_type or "",
        run_sync=run_sync,
    )

    # P1: o app fica sabendo que o envio foi ACEITO e está na fila — antes
    # mesmo do despacho. stage="queued", canais em pending.
    from notify import outbound
    transaction.on_commit(lambda: outbound.push_status(notif, stage="queued"))

    if run_sync:
        from notify.dispatch import dispatch
        dispatch(notif.id, sync=True)
    else:
        from django_q.tasks import async_task
        transaction.on_commit(lambda: async_task("notify.dispatch.dispatch", notif.id))

    return str(notif.external_id)


def get_by_external_id(account, external_id) -> Notification | None:
    if not external_id:
        return None
    return Notification.objects.filter(account=account, external_id=external_id).first()


def send_adhoc(
    *,
    account,
    message: str,
    phone: str | None = None,
    email: str | None = None,
    subject: str | None = None,
    channels: list[str] | None = None,
    caller: str = "notify.adhoc",
) -> str:
    """Notificação avulsa do staff. Devolve external_id."""
    message = (message or "").strip()
    if not message:
        raise ValueError("Mensagem não pode ser vazia.")

    phone = (phone or "").strip() or None
    email = (email or "").strip().lower() or None

    if not phone and not email:
        raise ValueError("Informe ao menos um destino (phone ou email).")

    requested = {c.strip().lower() for c in (channels or [])} or {"whatsapp", "email"}
    want_whatsapp = "whatsapp" in requested and bool(phone)
    want_email = "email" in requested and bool(email)
    if not want_whatsapp and not want_email:
        raise ValueError("Nenhum canal com destino válido.")

    return send(
        account=account,
        text=message,
        caller=caller,
        phone=phone if want_whatsapp else None,
        email=email if want_email else None,
        subject=subject,
        title=subject,
        whatsapp=want_whatsapp,
        email_channel=want_email,
    )
