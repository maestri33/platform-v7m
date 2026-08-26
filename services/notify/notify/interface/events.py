"""send_event() — despacho orientado a evento, multi-tenant.

No serviço, o caller JÁ passa phone/email/nome/gender resolvidos (sem users.profiles).
Template lookup por conta. Trigger.active=False desliga sem código.
"""

from __future__ import annotations

import structlog

from notify.interface import templates as _db
from notify.models import Trigger

logger = structlog.get_logger()

_DEFAULT_CHANNELS = ("whatsapp", "email")


def send_event(
    account,
    event: str,
    *,
    phone: str | None = None,
    email: str | None = None,
    nome: str | None = None,
    nome_completo: str | None = None,
    gender: str | None = None,
    ctx: dict | None = None,
    title: str | None = None,
    subject: str | None = None,
    media_url: str | None = None,
    media_type: str | None = None,
    mail_template: str | None = None,
    idempotency_key: str | None = None,
    run_sync: bool = False,
    body_md_override: str | None = None,
    channels_override: tuple[str, ...] | list[str] | None = None,
) -> str | None:
    """Despacha notificação do evento para a conta. Devolve external_id ou None.

    Diferente do monólito: NÃO resolve profile (caller passa phone/email/nome pronto).
    """
    from notify.interface import send as _send_iface

    data = _db.get(account.id, event)

    # Trigger.active=False desliga
    if data is not None:
        trigger = Trigger.objects.filter(template__account=account, template__event=event).first()
        if trigger is not None and not trigger.active:
            logger.info("notify.event_inactive", event_key=event, account=account.slug)
            return None

    nome = nome or "tudo bem"
    nome_completo = nome_completo or "tudo bem"

    # ── teor: 3 caminhos (override > DB.Template > vazio) ──
    if body_md_override is not None:
        body = body_md_override
        channels = list(channels_override) if channels_override is not None else (
            list(data.channels) if data is not None else list(_DEFAULT_CHANNELS)
        )
        t_title = title or (data.title if data is not None else None)
        t_subject = subject or (data.subject if data is not None else None) or "Notificação"
        t_media_url = media_url or (data.media_url if data is not None else None)
        t_media_type = media_type or (data.media_type if data is not None else None)
        t_mail_tpl = mail_template or (data.mail_template if data is not None else None) or "default"
    elif data is not None:
        render_ctx: dict = {
            "nome": nome,
            "nome_completo": nome_completo,
            "name": nome,
        }
        if ctx:
            render_ctx.update(ctx)
        body = _db.render(data.body_md, render_ctx)
        channels = list(channels_override) if channels_override is not None else (
            list(data.channels) or list(_DEFAULT_CHANNELS)
        )
        t_title = title or data.title
        t_subject = subject or data.subject
        t_media_url = media_url or data.media_url
        t_media_type = media_type or data.media_type
        t_mail_tpl = mail_template or data.mail_template
        # ponytail: storytelling via omnirouter fica pra Fase 3 (decisão 7 do Victor)
    else:
        logger.warning("notify.event_no_template", event_key=event, account=account.slug)
        return None

    # ── flags por canal ──
    want_whatsapp = "whatsapp" in channels and bool(phone)
    want_email = "email" in channels and bool(email)
    if not want_whatsapp and not want_email:
        logger.warning("notify.event_no_recipient", event_key=event, account=account.slug)
        return None

    return _send_iface.send(
        account=account,
        text=body,
        caller=f"event:{event}",
        phone=phone if want_whatsapp else None,
        email=email if want_email else None,
        title=t_title,
        subject=t_subject,
        whatsapp=want_whatsapp,
        email_channel=want_email,
        media_url=t_media_url,
        media_type=t_media_type,
        gender=gender,
        mail_template=t_mail_tpl or "default",
        idempotency_key=idempotency_key,
        run_sync=run_sync,
    )
