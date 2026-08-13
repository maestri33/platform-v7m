"""Canal TTS — gera MP3 via OmniRoute e entrega como voice-note no WhatsApp.

Em qualquer falha (geração, gravação, entrega), cai pra texto simples no
WhatsApp. É o único canal com fallback automático.
"""

from __future__ import annotations

import logging
import os
import uuid
from urllib.parse import urljoin

from asgiref.sync import async_to_sync
from django.conf import settings

from notify import sanitize
from notify.channels import whatsapp
from notify.channels.base import mark_channel_failed
from notify.models import (
    CHANNEL_TTS,
    Notification,
    STATUS_SENT,
    STATUS_SKIPPED,
)

logger = logging.getLogger(__name__)


def _resolve_voice(notif: Notification) -> str:
    """Voz TTS por conta (regra cruzada: homem→feminina, mulher→masculina).
    Row da conta sobrescreve o default do `tts.client`.
    """
    from tts.client import voice_for_gender

    voice = voice_for_gender(notif.gender)

    from channels.models import TtsVoices

    voices_row = TtsVoices.objects.filter(account=notif.account).first()
    if voices_row:
        voice = voices_row.voice_for_gender(notif.gender) or voice
    return voice


def _save_audio(audio_bytes: bytes) -> str:
    """Persiste MP3 em MEDIA_ROOT e devolve o path RELATIVO ao MEDIA_URL."""
    audio_name = f"{uuid.uuid4()}.mp3"
    audio_rel_path = f"tts/{audio_name}"
    audio_abs = os.path.join(settings.MEDIA_ROOT, audio_rel_path)
    os.makedirs(os.path.dirname(audio_abs), exist_ok=True)
    with open(audio_abs, "wb") as f:
        f.write(audio_bytes)
    return audio_rel_path


def _audio_url(rel_path: str) -> str:
    """Path relativo do MEDIA_ROOT → URL pública (LAN-relay se configurado)."""
    base = settings.MEDIA_LAN_BASE or settings.EXTERNAL_URL
    return urljoin(base + "/", settings.MEDIA_URL + rel_path)


def send(notif: Notification) -> None:
    """Tenta voice-note. Se falhar em qualquer ponto, cai pra texto no WhatsApp.

    TTS é entregue como PTT no WhatsApp — não existe canal TTS isolado, então
    sucesso marca TANTO `tts_status` QUANTO `whatsapp_status` como SENT.
    """
    try:
        speakable = sanitize.for_tts(notif.text)
        if not speakable.strip():
            notif.tts_status = STATUS_SKIPPED
            whatsapp.send_text(notif)
            return

        from tts.client import TtsClient

        voice = _resolve_voice(notif)
        tts_client = TtsClient()
        audio_bytes = async_to_sync(tts_client.synthesize)(speakable, voice)

        rel_path = _save_audio(audio_bytes)
        notif.tts_audio_path = rel_path
        audio_url = _audio_url(rel_path)

        whatsapp.send_audio(notif, audio_url)
        # send_audio já marca whatsapp_status=STATUS_SENT em sucesso
        notif.tts_status = STATUS_SENT

    except Exception as exc:
        mark_channel_failed(
            notif,
            status_attr="tts_status",
            error_attr="tts_error",
            channel=CHANNEL_TTS,
            category="generation_failed",
            summary="Falha na geração ou entrega do TTS",
            exc=exc,
        )
        logger.warning(
            "notify.tts_failed_fallback_text external_id=%s error=%s",
            notif.external_id,
            str(exc)[:200],
        )
        if notif.whatsapp_status != STATUS_SENT:
            whatsapp.send_text(notif)
