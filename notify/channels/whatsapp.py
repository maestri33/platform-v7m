"""Canal WhatsApp — texto, mídia e áudio (voice-note via PTT).

Resolve o driver (Evolution v2 com fallback GO), aplica o `for_whatsapp`
do sanitize e chama o método certo do driver. Em falha, delega ao
`base.mark_channel_failed`.
"""

from __future__ import annotations

import logging

from asgiref.sync import async_to_sync
from django.conf import settings

from notify import sanitize
from notify.channels.base import mark_channel_failed
from notify.models import (
    CHANNEL_WHATSAPP,
    Notification,
    STATUS_SENT,
)

logger = logging.getLogger(__name__)


def _to_lan(url: str) -> str:
    """URL pública → LAN (Evolution busca mídia pelo IP interno)."""
    lan = settings.MEDIA_LAN_BASE
    ext = settings.EXTERNAL_URL
    if lan and ext and url.startswith(ext):
        return lan + url[len(ext):]
    return url


def _get_whatsapp_driver(notif: Notification):
    """Constrói o driver de WhatsApp a partir da row WhatsAppNumber da notificação.

    Mantém o nome antigo para que o monkeypatch dos testes (`tests/test_sentry.py`)
    troque só o path do módulo, sem mudar a string do atributo.
    """
    from whatsapp.factory import get_driver as _factory_get_driver

    if notif.whatsapp_number_id:
        wn = notif.whatsapp_number
        if wn:
            return _factory_get_driver(
                wn.instance_name,
                allow_alternate_sender=notif.allow_alternate_sender,
            )
    return _factory_get_driver(allow_alternate_sender=notif.allow_alternate_sender)


def _body(notif: Notification) -> str:
    body = sanitize.for_whatsapp(notif.text)
    if notif.title:
        return f"*{notif.title}*\n\n{body}"
    return body


def send_text(notif: Notification) -> None:
    """WhatsApp texto. Em falha → FAILED + incident + Sentry."""
    driver = _get_whatsapp_driver(notif)  # fora da coroutine — FK load é ORM síncrono

    async def _run():
        async with driver as wa:
            number = await wa.resolve_br_number(notif.recipient_phone)
            return await wa.send_text(number, _body(notif))

    try:
        async_to_sync(_run)()
        notif.whatsapp_status = STATUS_SENT
    except Exception as exc:
        mark_channel_failed(
            notif,
            status_attr="whatsapp_status",
            error_attr="whatsapp_error",
            channel=CHANNEL_WHATSAPP,
            category="delivery_failed",
            summary="Falha no envio por WhatsApp",
            exc=exc,
        )


def send_media(notif: Notification) -> None:
    """WhatsApp mídia (imagem/vídeo/documento). Em falha → FAILED + incident + Sentry."""
    driver = _get_whatsapp_driver(notif)  # fora da coroutine — FK load é ORM síncrono

    async def _run():
        async with driver as wa:
            number = await wa.resolve_br_number(notif.recipient_phone)
            wa_url = _to_lan(notif.media_url)
            return await wa.send_media(
                number, wa_url, notif.media_type or "document", caption=_body(notif)
            )

    try:
        async_to_sync(_run)()
        notif.whatsapp_status = STATUS_SENT
    except Exception as exc:
        mark_channel_failed(
            notif,
            status_attr="whatsapp_status",
            error_attr="whatsapp_error",
            channel=CHANNEL_WHATSAPP,
            category="delivery_failed",
            summary="Falha no envio de mídia por WhatsApp",
            exc=exc,
        )


def send_audio(notif: Notification, audio_url: str) -> None:
    """WhatsApp voice-note (PTT). Usado pelo canal TTS após gerar o MP3."""
    driver = _get_whatsapp_driver(notif)  # fora da coroutine — FK load é ORM síncrono

    async def _run():
        async with driver as wa:
            number = await wa.resolve_br_number(notif.recipient_phone)
            return await wa.send_audio(number, audio_url)

    try:
        async_to_sync(_run)()
        notif.whatsapp_status = STATUS_SENT
    except Exception as exc:
        mark_channel_failed(
            notif,
            status_attr="whatsapp_status",
            error_attr="whatsapp_error",
            channel=CHANNEL_WHATSAPP,
            category="delivery_failed",
            summary="Falha no envio de áudio por WhatsApp",
            exc=exc,
        )
