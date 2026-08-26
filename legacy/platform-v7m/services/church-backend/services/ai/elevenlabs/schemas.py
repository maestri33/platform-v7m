"""Schemas simples da integração ElevenLabs."""

from dataclasses import dataclass


@dataclass
class TTSDeliveryResult:
    """Resultado normalizado da geração de TTS."""

    success: bool
    model: str = ""
    audio_path: str = ""
    audio_url: str = ""
    audio_base64: str = ""
    log_id: str = ""
    error: str = ""
