"""Client isolado do ElevenLabs."""

from django.conf import settings
from elevenlabs.client import ElevenLabs


def get_elevenlabs_client():
    """Retorna client configurado do ElevenLabs."""

    return ElevenLabs(
        api_key=settings.ELEVENLABS_API_KEY,
        timeout=settings.ELEVENLABS_REQUEST_TIMEOUT,
    )
