"""Adaptadores de notificacao para o notify-server (V7M).

Mesmo contrato do ``evolutionapi``: cada funcao retorna
``{"success": bool, "status_code": int, "data": dict}`` — o dispatch nao
distingue o provedor. O notify entrega de forma assincrona (retry proprio),
entao sucesso aqui significa "aceito pelo notify", nao "entregue no WhatsApp".
"""

import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def _send(payload):
    base_url = str(getattr(settings, "NOTIFY_SERVER_URL", "") or "").rstrip("/")
    api_key = str(getattr(settings, "NOTIFY_API_KEY", "") or "")
    timeout = int(getattr(settings, "NOTIFY_REQUEST_TIMEOUT", 15))
    if not base_url or not api_key:
        return {"success": False, "error": "NOTIFY_SERVER_URL/NOTIFY_API_KEY ausentes no ambiente."}
    try:
        response = requests.post(
            f"{base_url}/v1/send",
            json=payload,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            timeout=timeout,
        )
        try:
            data = response.json() if response.content else {}
        except ValueError:
            data = {"raw_text": response.text}
        return {
            "success": 200 <= response.status_code < 300,
            "status_code": response.status_code,
            "data": data,
        }
    except Exception as exc:
        logger.error(f"Notify server error: {exc}")
        return {"success": False, "error": str(exc)}


def send_text_message(*, number, message):
    """Envia mensagem textual via notify."""

    return _send(
        {
            "text": message,
            "phone": str(number),
            "whatsapp": True,
            "caller": "backend.notifications",
        }
    )


def send_audio_message(*, number, audio_payload):
    """Envia audio (URL) via notify."""

    return _send(
        {
            "text": "",
            "phone": str(number),
            "whatsapp": True,
            "caller": "backend.notifications",
            "media_url": audio_payload,
            "media_type": "audio",
        }
    )


def send_media_message(
    *,
    number,
    media_payload,
    media_type="image",
    caption="",
    filename="",
    mime_type="",
):
    """Envia midia (URL) via notify."""

    return _send(
        {
            "text": caption or "",
            "phone": str(number),
            "whatsapp": True,
            "caller": "backend.notifications",
            "media_url": media_payload,
            "media_type": media_type,
        }
    )