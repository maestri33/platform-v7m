"""Geração TTS isolada do ElevenLabs."""

import base64
import logging
import uuid
from pathlib import Path

from django.conf import settings

from apps.common.services.upload_paths import build_service_upload_path
from services.base import ServiceResponse

from ..client import get_elevenlabs_client
from ..schemas import TTSDeliveryResult

logger = logging.getLogger(__name__)


def _create_tts_log(**kwargs):
    """Persiste log sem quebrar o fluxo principal."""

    try:
        from ..models import ElevenLabsTTSLog

        log = ElevenLabsTTSLog.objects.create(**kwargs)
        return str(log.id)
    except Exception as exc:
        logger.exception("Falha ao persistir log do ElevenLabs: %s", exc)
        return ""


def generate_tts_audio(*, text, voice_id=None, context=None):
    """Gera áudio TTS e devolve payload consumível pelo dispatcher."""

    if not settings.ELEVENLABS_API_KEY:
        return ServiceResponse.fail("ELEVENLABS_API_KEY não configurada no .env")
    if not str(text or "").strip():
        return ServiceResponse.fail("Texto vazio nao pode ser convertido em audio.")

    request_data = {
        "text": text,
        "voice_id": voice_id or settings.ELEVENLABS_VOICE_ID,
        "model_id": settings.ELEVENLABS_MODEL_ID,
        "output_format": settings.ELEVENLABS_OUTPUT_FORMAT,
        "timeout": settings.ELEVENLABS_REQUEST_TIMEOUT,
        "context": context or {},
    }
    try:
        client = get_elevenlabs_client()
        request_id = ""
        character_count = ""
        with client.text_to_speech.with_raw_response.convert(
            text=text,
            voice_id=voice_id or settings.ELEVENLABS_VOICE_ID,
            model_id=settings.ELEVENLABS_MODEL_ID,
            output_format=settings.ELEVENLABS_OUTPUT_FORMAT,
        ) as response:
            request_id = response.headers.get("request-id", "")
            character_count = response.headers.get("x-character-count", "")
            audio_bytes = b"".join(response.data)

        generated_uuid = uuid.uuid4()
        rel_path = build_service_upload_path("ai", "elevenlabs", generated_uuid, f"{generated_uuid}.mp3")
        abs_path = Path(settings.MEDIA_ROOT) / rel_path
        abs_path.parent.mkdir(parents=True, exist_ok=True)
        abs_path.write_bytes(audio_bytes)
        audio_base64 = base64.b64encode(audio_bytes).decode("ascii")

        log_id = _create_tts_log(
            text=text,
            voice_id=voice_id or settings.ELEVENLABS_VOICE_ID,
            audio_path=rel_path,
            request_data=request_data,
            response_data={
                "audio_path": rel_path,
                "request_id": request_id,
                "character_count": character_count,
            },
            response_text="OK",
        )
        result = TTSDeliveryResult(
            success=True,
            audio_path=rel_path,
            audio_url=f"{settings.APP_BASE_URL}{settings.MEDIA_URL}{rel_path}",
            audio_base64=audio_base64,
            log_id=log_id,
        )
        return ServiceResponse.ok(data=result)
    except Exception as exc:
        log_id = _create_tts_log(
            text=text,
            voice_id=voice_id or settings.ELEVENLABS_VOICE_ID,
            request_data=request_data,
            response_data={"exception": str(exc)},
            response_text=str(exc),
        )
        result = TTSDeliveryResult(success=False, log_id=log_id, error=str(exc))
        return ServiceResponse(success=False, error=str(exc), data=result)
