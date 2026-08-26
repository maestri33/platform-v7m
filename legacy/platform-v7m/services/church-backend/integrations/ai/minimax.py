"""Client MiniMax — TTS (t2a_v2) síncrono, sem SDK.

API: ``POST https://api.minimax.chat/v1/t2a_v2`` com header
``Authorization: Bearer <key>``. O áudio vem em ``data.audio`` como string
HEXADECIMAL (decodificar com ``bytes.fromhex``).

TTS é a única capacidade usada pelo IEADPG no M1.7 (MiniMax = fallback do
ElevenLabs). Visão não é usada nesta fase (Gemini segue como visao). Sem
chamada real se ``MINIMAX_API_KEY`` ausente — ``tts()`` levanta
``MiniMaxError`` limpo e o service cai pro próximo provider.
"""

from __future__ import annotations

import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class MiniMaxError(Exception):
    """Erro ao falar com o MiniMax."""


class MiniMaxClient:
    def __init__(
        self,
        *,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: int = 90,
    ):
        self._api_key = (
            api_key if api_key is not None else str(getattr(settings, "MINIMAX_API_KEY", "") or "")
        )
        self._base_url = (
            base_url
            if base_url is not None
            else str(
                getattr(
                    settings,
                    "MINIMAX_BASE_URL",
                    "https://api.minimax.chat/v1",
                )
            )
        ).rstrip("/")
        self._tts_model = str(
            getattr(settings, "MINIMAX_TTS_MODEL", "speech-2.8-hd")
        )
        self._timeout = timeout

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

    def tts(
        self,
        text: str,
        *,
        voice_id: str | None = None,
        model: str | None = None,
        output_format: str = "mp3",
    ) -> bytes:
        """Converte texto em fala (t2a_v2). Devolve os bytes do áudio."""
        if not self._api_key:
            raise MiniMaxError("MINIMAX_API_KEY não configurada no .env")
        url = f"{self._base_url}/v1/t2a_v2"
        voice_default = str(
            getattr(settings, "MINIMAX_VOICE_MALE", "") or ""
        )
        body = {
            "model": model or self._tts_model,
            "text": text,
            "stream": False,
            "voice_setting": {
                "voice_id": voice_id or voice_default,
                "speed": 1,
                "vol": 1,
                "pitch": 0,
            },
            "audio_setting": {
                "sample_rate": 32000,
                "bitrate": 128000,
                "format": output_format,
                "channel": 1,
            },
        }
        try:
            resp = requests.post(
                url,
                json=body,
                headers=self._headers(),
                timeout=self._timeout,
            )
        except requests.exceptions.RequestException as exc:
            raise MiniMaxError(f"falha de rede: {exc}") from exc
        if resp.status_code >= 400:
            raise MiniMaxError(
                f"MiniMax TTS HTTP {resp.status_code}: {resp.text[:300]}"
            )
        data = resp.json()
        base = data.get("base_resp") or {}
        if base.get("status_code") not in (0, None):
            raise MiniMaxError(
                f"MiniMax TTS status {base.get('status_code')}: "
                f"{base.get('status_msg')}"
            )
        audio_hex = (data.get("data") or {}).get("audio")
        if not audio_hex:
            raise MiniMaxError("MiniMax TTS não retornou áudio")
        audio = bytes.fromhex(audio_hex)
        logger.info(
            "minimax.tts_done model=%s voice=%s text_len=%s audio_kb=%.1f",
            body["model"],
            body["voice_setting"]["voice_id"],
            len(text),
            round(len(audio) / 1024, 1),
        )
        return audio
