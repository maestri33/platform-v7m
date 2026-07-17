"""Client TTS — omnirouter (10.1.30.35).

Contrato confirmado (2026-07-17):
  POST http://10.1.30.35/v1/audio/speech
  Content-Type: application/json
  Body: {"model":"minimax/speech-2.8-hd","input":"texto","voice":"Portuguese_SereneWoman"}
  Response: bytes do mp3 (200 OK)

Provider: MiniMax via OmniRoute. ElevenLabs indisponível (pagamento pendente).
Vozes: Portuguese_SereneWoman (feminina), Portuguese_GentleTeacher (masculina).
Regra cruzada (Victor): homem recebe voz feminina, mulher recebe voz masculina.
"""

from __future__ import annotations

import structlog
import httpx
from django.conf import settings

logger = structlog.get_logger()

OMNIROUTER_MODEL = "minimax/speech-2.8-hd"
DEFAULT_VOICE_FEMALE = "Portuguese_SereneWoman"
DEFAULT_VOICE_MALE = "Portuguese_GentleTeacher"


class TtsError(Exception):
    def __init__(self, message: str, status_code: int = 0):
        self.status_code = status_code
        super().__init__(message)


class TtsClient:
    """HTTP fino pro omnirouter (OpenAI-compatible /v1/audio/speech)."""

    def __init__(self, *, base_url: str | None = None) -> None:
        self._base_url = (base_url or getattr(settings, "OMNIROUTER_URL", "")).rstrip("/")

    async def synthesize(self, text: str, voice: str | None = None) -> bytes:
        """Gera áudio (mp3) a partir de texto. Retorna bytes.

        voice: nome da voz MiniMax (ex.: Portuguese_SereneWoman).
               None → default feminina.
        """
        voice = voice or DEFAULT_VOICE_FEMALE
        url = f"{self._base_url}/v1/audio/speech"
        payload = {
            "model": OMNIROUTER_MODEL,
            "input": text,
            "voice": voice,
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, json=payload)

        if resp.status_code >= 400:
            raise TtsError(
                f"Omnirouter TTS {resp.status_code}: {resp.text[:200]}",
                status_code=resp.status_code,
            )

        logger.info("tts.synthesized", voice=voice, text_len=len(text), audio_bytes=len(resp.content))
        return resp.content


def voice_for_gender(gender: str | None) -> str:
    """Gender do DESTINATÁRIO → voz MiniMax (regra CRUZADA: homem recebe voz feminina).

    M → voz feminina (Portuguese_SereneWoman)
    F → voz masculina (Portuguese_GentleTeacher)
    None → voz feminina (default)
    """
    if gender == "F":
        return DEFAULT_VOICE_MALE  # mulher recebe voz masculina
    return DEFAULT_VOICE_FEMALE  # homem (ou unknown) recebe voz feminina
