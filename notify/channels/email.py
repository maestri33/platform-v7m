"""Canal e-mail — SMTP via mailcow, templates HTML por marca.

Resolve a `MailIdentity` da conta, monta o subject e o HTML (com
embed de mídia quando aplicável) e envia. `_subject_from_body` ficou
aqui porque é regra de e-mail, não do dispatch.
"""

from __future__ import annotations

import logging
import re

from asgiref.sync import async_to_sync

from notify.channels.base import mark_channel_failed
from notify.models import CHANNEL_EMAIL, Notification, STATUS_SENT

logger = logging.getLogger(__name__)


def _subject_from_body(text: str) -> str:
    """Assunto derivado do corpo quando o template não define subject/title."""
    if not text:
        return ""
    line = next((ln.strip() for ln in text.splitlines() if ln.strip()), "")
    line = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", line)
    line = re.sub(r"[*_`~]", "", line)
    line = re.sub(r"^[\wÀ-ÿ'.\- ]{1,30}?,\s+", "", line, count=1)
    m = re.match(r"(.+?[.!?])(?:\s|$)", line)
    sent = m.group(1) if m and len(m.group(1)) >= 12 else line
    sent = sent.strip().rstrip(".!?")
    if not sent:
        return ""
    sent = sent[0].upper() + sent[1:]
    if len(sent) > 78:
        sent = sent[:77].rsplit(" ", 1)[0] + "…"
    return sent


def _get_mail_client(notif: Notification):
    """Constrói MailClient com o remetente coerente com a marca do envelope."""
    from channels.models import MailIdentity
    from mail.client import get_client_from_identity

    identity = (
        MailIdentity.objects.filter(account=notif.account, is_default=True).first()
        or MailIdentity.objects.filter(account=notif.account).first()
    )
    if identity is None:
        return None
    if notif.mail_template == "v7m":
        from_name = "V7M"
    elif notif.mail_template in {"supletivo", "checkout", "parabens", "receipt", "welcome"}:
        from_name = "Supletivo Brasil"
    else:
        from_name = identity.from_name
    return get_client_from_identity(identity, from_name=from_name)


def send(notif: Notification) -> None:
    """E-mail SMTP. Sem MailIdentity → FAILED com incident (configuration_missing).
    Falha de envio → FAILED + incident + Sentry.
    """
    from mail import templates as mail_templates

    try:
        client = _get_mail_client(notif)
        if client is None:
            notif.email_status = "failed"
            notif.email_error = "Nenhuma MailIdentity configurada para esta conta"
            from notify.channels.base import _record_failure

            _record_failure(
                notif,
                channel=CHANNEL_EMAIL,
                category="configuration_missing",
                summary="E-mail não configurado",
                detail=notif.email_error,
            )
            return

        subject = notif.subject or notif.title or _subject_from_body(notif.text) or "Notificação"
        service_name = notif.account.name if hasattr(notif, "account") else "Notify"
        if notif.media_url:
            content_html = mail_templates.md_to_html(notif.text) + mail_templates.media_html(
                notif.media_url, notif.media_type or "document", caption=notif.title or ""
            )
            html = mail_templates.render(
                notif.mail_template, title=notif.title or "", content=content_html,
                content_is_html=True, service_name=service_name,
            )
        else:
            html = mail_templates.render(
                notif.mail_template, title=notif.title or "", content=notif.text,
                service_name=service_name,
            )
        async_to_sync(client.send_email)(
            notif.recipient_email, subject, html_body=html, plain_body=notif.text
        )
        notif.email_status = STATUS_SENT
    except Exception as exc:
        mark_channel_failed(
            notif,
            status_attr="email_status",
            error_attr="email_error",
            channel=CHANNEL_EMAIL,
            category="delivery_failed",
            summary="Falha no envio por e-mail",
            exc=exc,
        )
