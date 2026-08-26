"""Client ElevenLabs — text-to-speech (TTS) síncrono (requests, sem SDK).

API: ``POST https://api.elevenlabs.io/v1/text-to-speech/<voice_id>`` com
header ``xi-api-key`` → bytes mp3. Zero regra de negócio: só fala com o
provider e devolve os bytes. Config (key/voice_id/modelo/voice_settings)
vem do .env via settings.

Síncrono (requests) — casa com o resto do IEADPG. O ``services/ai/elevenlabs``
legado continua sendo o que o ``notifications.dispatch`` chama hoje — fica
intacto até M1.10 (consolidação de notifications + integrations).
"""

from __future__ import annotations

import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class ElevenLabsError(Exception):
    """Erro ao falar com o ElevenLabs."""


class ElevenLabsClient:
    def __init__(
        self,
        *,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: int = 90,
    ):
        self._api_key = (
            api_key if api_key is not None else str(getattr(settings, "ELEVENLABS_API_KEY", "") or "")
        )
        self._base_url = (
            base_url
            if base_url is not None
            else str(
                getattr(
                    settings,
                    "ELEVENLABS_BASE_URL",
                    "https://api.elevenlabs.io",
                )
            )
        ).rstrip("/")
        self._voice_id = str(getattr(settings, "ELEVENLABS_VOICE_ID", "") or "")
        self._model_id = str(
            getattr(settings, "ELEVENLABS_MODEL_ID", "eleven_v3")
        )
        self._output_format = str(
            getattr(settings, "ELEVENLABS_OUTPUT_FORMAT", "mp3_44100_128")
        )
        self._timeout = timeout

    def _headers(self) -> dict[str, str]:
        return {
            "xi-api-key": self._api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        }

    def tts(
        self,
        text: str,
        *,
        voice_id: str | None = None,
        model_id: str | None = None,
        output_format: str | None = None,
    ) -> bytes:
        """Converte texto em fala. Devolve os bytes do áudio (mp3)."""
        if not self._api_key:
            raise ElevenLabsError("ELEVENLABS_API_KEY não configurada no .env")
        voice = voice_id or self._voice_id
        if not voice:
            raise ElevenLabsError("ELEVENLABS_VOICE_ID não configurada no .env")
        fmt = output_format or self._output_format
        url = f"{self._base_url}/v1/text-to-speech/{voice}?output_format={fmt}"
        body = {
            "text": text,
            "model_id": model_id or self._model_id,
        }
        language_code = getattr(settings, "ELEVENLABS_LANGUAGE_CODE", None)
        if language_code:
            body["language_code"] = language_code
        try:
            resp = requests.post(
                url,
                json=body,
                headers=self._headers(),
                timeout=self._timeout,
            )
        except requests.exceptions.RequestException as exc:
            raise ElevenLabsError(f"falha de rede: {exc}") from exc
        if resp.status_code >= 400:
            raise ElevenLabsError(
                f"ElevenLabs HTTP {resp.status_code}: {resp.text[:300]}"
            )
        audio = resp.content
        logger.info(
            "elevenlabs.tts_done voice=%s model=%s text_len=%s audio_kb=%.1f",
            voice,
            body["model_id"],
            len(text),
            round(len(audio) / 1024, 1),
        )
        return audio
