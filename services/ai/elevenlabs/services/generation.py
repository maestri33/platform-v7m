"""Geração TTS isolada do ElevenLabs."""

import base64
import logging
import re
import uuid
from pathlib import Path

from django.conf import settings
from elevenlabs import VoiceSettings

from apps.common.services.upload_paths import build_service_upload_path
from services.base import ServiceResponse

from ..client import get_elevenlabs_client
from ..schemas import TTSDeliveryResult

logger = logging.getLogger(__name__)

ELEVEN_V3_MODEL_ID = "eleven_v3"
MODEL_CHARACTER_LIMITS = {
    ELEVEN_V3_MODEL_ID: 5000,
    "eleven_multilingual_v2": 10000,
    "eleven_flash_v2_5": 40000,
}


def _create_tts_log(**kwargs):
    """Persiste log sem quebrar o fluxo principal."""

    try:
        from ..models import ElevenLabsTTSLog

        log = ElevenLabsTTSLog.objects.create(**kwargs)
        return str(log.id)
    except Exception as exc:
        logger.exception("Falha ao persistir log do ElevenLabs: %s", exc)
        return ""


def _resolve_model_id(model_id=None):
    """Resolve o model id efetivo respeitando override explícito."""

    return str(model_id or settings.ELEVENLABS_MODEL_ID or "").strip() or ELEVEN_V3_MODEL_ID


def _resolve_language_code(language_code=None):
    """Resolve o language_code efetivo para a síntese."""

    value = str(language_code or getattr(settings, "ELEVENLABS_LANGUAGE_CODE", "") or "").strip().lower()
    return value or None


def _resolve_context_profile():
    """Resolve o perfil de contexto aplicado ao TTS."""

    return str(getattr(settings, "ELEVENLABS_CONTEXT_PROFILE", "") or "").strip().lower()


def _resolve_output_extension(output_format):
    """Mapeia output_format para extensão coerente do arquivo salvo."""

    normalized = str(output_format or "").strip().lower()
    if normalized.startswith("mp3_"):
        return ".mp3"
    if normalized.startswith("wav_"):
        return ".wav"
    if normalized.startswith("opus_"):
        return ".opus"
    if normalized.startswith("pcm_"):
        return ".pcm"
    if normalized.startswith("ulaw_"):
        return ".ulaw"
    if normalized.startswith("alaw_"):
        return ".alaw"
    return ".bin"


def _get_character_limit_for_model(model_id):
    """Retorna o limite conhecido por modelo."""

    return MODEL_CHARACTER_LIMITS.get(str(model_id or "").strip(), 10000)


def _normalize_voice_settings_payload(voice_settings=None):
    """Normaliza voice_settings vindos por parâmetro ou settings."""

    if isinstance(voice_settings, VoiceSettings):
        payload = dict(voice_settings.__dict__)
    elif isinstance(voice_settings, dict):
        payload = dict(voice_settings)
    else:
        payload = {
            "stability": getattr(settings, "ELEVENLABS_VOICE_STABILITY", None),
            "similarity_boost": getattr(settings, "ELEVENLABS_VOICE_SIMILARITY_BOOST", None),
            "style": getattr(settings, "ELEVENLABS_VOICE_STYLE", None),
            "speed": getattr(settings, "ELEVENLABS_VOICE_SPEED", None),
            "use_speaker_boost": getattr(settings, "ELEVENLABS_VOICE_USE_SPEAKER_BOOST", None),
        }

    cleaned = {}
    for key in ["stability", "similarity_boost", "style", "speed", "use_speaker_boost"]:
        value = payload.get(key)
        if value is None:
            continue
        cleaned[key] = value
    return cleaned


def _resolve_voice_settings(voice_settings=None):
    """Monta VoiceSettings quando houver configuração explícita."""

    payload = _normalize_voice_settings_payload(voice_settings)
    if not payload:
        return None
    return VoiceSettings(**payload)


def _enhance_text_for_context(*, text, model_id, context=None):
    """Ajusta o prompt de entrada para soar mais natural no perfil configurado."""

    normalized = str(text or "").strip()
    if not normalized:
        return normalized
    if str(model_id or "").strip() != ELEVEN_V3_MODEL_ID:
        return normalized

    profile = _resolve_context_profile()
    if profile != "church_brazil_male":
        return normalized

    tags = str(getattr(settings, "ELEVENLABS_V3_PREFIX_TAGS", "") or "").strip()
    if not tags:
        title = str((context or {}).get("title", "") or "").strip().lower()
        if any(token in title for token in ["boas-vindas", "bem-vindo", "acolhimento", "recepcao", "recepção"]):
            tags = "[warmly] [thoughtful]"
        else:
            tags = "[thoughtful]"

    enhanced = re.sub(
        r"^(ol[áa]|gra[çc]a e paz),\s+",
        lambda match: f"{match.group(1)}... ",
        normalized,
        flags=re.IGNORECASE,
    )
    enhanced = re.sub(r"\.\s+(Seja|Estamos|Que|Nosso|Nossa)\b", r". ... \1", enhanced)
    return f"{tags} {enhanced}".strip()


def _split_oversized_segment(segment, *, limit):
    """Quebra um segmento grande em sentenças e, se preciso, por palavras."""

    sentence_parts = [part.strip() for part in re.split(r"(?<=[.!?])\s+", segment) if part.strip()]
    if not sentence_parts:
        sentence_parts = [segment.strip()]

    chunks = []
    current = ""
    for part in sentence_parts:
        candidate = f"{current} {part}".strip() if current else part
        if len(candidate) <= limit:
            current = candidate
            continue

        if current:
            chunks.append(current)
            current = ""

        if len(part) <= limit:
            current = part
            continue

        words = [word for word in part.split() if word]
        word_chunk = ""
        for word in words:
            candidate = f"{word_chunk} {word}".strip() if word_chunk else word
            if len(candidate) <= limit:
                word_chunk = candidate
                continue

            if word_chunk:
                chunks.append(word_chunk)
                word_chunk = ""

            while len(word) > limit:
                chunks.append(word[:limit])
                word = word[limit:]
            word_chunk = word

        if word_chunk:
            current = word_chunk

    if current:
        chunks.append(current)
    return chunks


def _split_text_for_model(text, *, model_id):
    """Quebra textos longos para modelos com limite menor, como o eleven_v3."""

    normalized = str(text or "").strip()
    if not normalized:
        return []

    limit = _get_character_limit_for_model(model_id)
    if len(normalized) <= limit:
        return [normalized]

    paragraph_parts = [part.strip() for part in re.split(r"\n\s*\n", normalized) if part.strip()]
    if not paragraph_parts:
        paragraph_parts = [normalized]

    chunks = []
    current = ""
    for part in paragraph_parts:
        segments = [part]
        if len(part) > limit:
            segments = _split_oversized_segment(part, limit=limit)

        for segment in segments:
            candidate = f"{current}\n\n{segment}".strip() if current else segment
            if len(candidate) <= limit:
                current = candidate
                continue
            if current:
                chunks.append(current)
            current = segment

    if current:
        chunks.append(current)
    return chunks


def _merge_audio_chunks(*, audio_chunks, output_format):
    """Une áudio de múltiplas requisições quando o modelo exige chunking."""

    if len(audio_chunks) == 1:
        return audio_chunks[0]

    normalized = str(output_format or "").strip().lower()
    if not normalized.startswith("mp3_"):
        raise ValueError(
            "O texto excede o limite do modelo atual e o merge automatico "
            "esta habilitado apenas para formatos MP3."
        )

    return b"".join(audio_chunks)


def generate_tts_audio(*, text, voice_id=None, model_id=None, language_code=None, voice_settings=None, context=None):
    """Gera áudio TTS e devolve payload consumível pelo dispatcher."""

    if not settings.ELEVENLABS_API_KEY:
        return ServiceResponse.fail("ELEVENLABS_API_KEY não configurada no .env")
    if not str(text or "").strip():
        return ServiceResponse.fail("Texto vazio nao pode ser convertido em audio.")

    resolved_model_id = _resolve_model_id(model_id)
    resolved_language_code = _resolve_language_code(language_code)
    output_format = settings.ELEVENLABS_OUTPUT_FORMAT
    resolved_voice_settings = _resolve_voice_settings(voice_settings)
    prepared_text = _enhance_text_for_context(
        text=text,
        model_id=resolved_model_id,
        context=context,
    )
    text_chunks = _split_text_for_model(prepared_text, model_id=resolved_model_id)
    request_data = {
        "text": text,
        "prepared_text": prepared_text,
        "text_chunks": text_chunks,
        "voice_id": voice_id or settings.ELEVENLABS_VOICE_ID,
        "model_id": resolved_model_id,
        "language_code": resolved_language_code,
        "voice_settings": (
            dict(resolved_voice_settings.__dict__)
            if resolved_voice_settings is not None
            else {}
        ),
        "output_format": output_format,
        "timeout": settings.ELEVENLABS_REQUEST_TIMEOUT,
        "context": context or {},
    }
    try:
        client = get_elevenlabs_client()
        request_ids = []
        character_counts = []
        audio_chunks = []
        for index, text_chunk in enumerate(text_chunks):
            with client.text_to_speech.with_raw_response.convert(
                text=text_chunk,
                voice_id=voice_id or settings.ELEVENLABS_VOICE_ID,
                model_id=resolved_model_id,
                language_code=resolved_language_code,
                output_format=output_format,
                voice_settings=resolved_voice_settings,
                previous_text=text_chunks[index - 1] if index > 0 else None,
                next_text=text_chunks[index + 1] if index + 1 < len(text_chunks) else None,
                apply_text_normalization="auto",
            ) as response:
                request_ids.append(response.headers.get("request-id", ""))
                character_counts.append(response.headers.get("x-character-count", ""))
                audio_chunks.append(b"".join(response.data))

        audio_bytes = _merge_audio_chunks(audio_chunks=audio_chunks, output_format=output_format)

        generated_uuid = uuid.uuid4()
        extension = _resolve_output_extension(output_format)
        rel_path = build_service_upload_path("ai", "elevenlabs", generated_uuid, f"{generated_uuid}{extension}")
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
                "request_ids": request_ids,
                "character_counts": character_counts,
                "chunk_count": len(text_chunks),
                "model_id": resolved_model_id,
                "output_format": output_format,
            },
            response_text="OK",
        )
        result = TTSDeliveryResult(
            success=True,
            model=resolved_model_id,
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
        result = TTSDeliveryResult(success=False, model=resolved_model_id, log_id=log_id, error=str(exc))
        return ServiceResponse(success=False, error=str(exc), data=result)
