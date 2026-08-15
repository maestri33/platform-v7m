"""Pacote ElevenLabs TTS."""

from .services.generation import generate_tts_audio


def speak(text: str, voice_id: str | None = None):
    """Compatibilidade pública para geração TTS."""

    return generate_tts_audio(text=text, voice_id=voice_id)

__all__ = ["speak"]
