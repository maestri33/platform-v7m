"""Driver Evolution API v2 — porte do monólito (integrations/communication/whatsapp/client.py).

Config vem da row WhatsAppNumber (instance_name) + settings (base_url, api_key).
"""

from __future__ import annotations

import logging
from typing import Any

import httpx
from django.conf import settings

from whatsapp.errors import DeliveryRejected

logger = logging.getLogger(__name__)

MEDIA_TYPES = {"image", "video", "audio", "document"}

class EvolutionV2Driver:
    """Cliente Evolution API v2 — config por row WhatsAppNumber."""

    def __init__(
        self,
        instance_name: str,
        *,
        base_url: str | None = None,
        api_key: str | None = None,
        timeout: float = 10.0,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._base_url = base_url or getattr(settings, "WHATSAPP_API_BASE_URL", "")
        self._api_key = api_key or getattr(settings, "WHATSAPP_GLOBAL_API_KEY", "")
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            headers={"apikey": self._api_key},
            timeout=timeout,
            transport=transport,
        )
        self._instance = instance_name

    async def aclose(self) -> None:
        await self._client.aclose()

    def _msg_path(self, endpoint: str) -> str:
        return f"/message/{endpoint}/{self._instance}"

    def _chat_path(self, endpoint: str) -> str:
        return f"/chat/{endpoint}/{self._instance}"

    async def _post(self, path: str, json: dict[str, Any], *, timeout: float | None = None) -> Any:
        kwargs: dict[str, Any] = {}
        if timeout is not None:
            kwargs["timeout"] = httpx.Timeout(timeout, connect=5.0)
        resp = await self._client.post(path, json=json, **kwargs)
        try:
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            if resp.status_code in {400, 404, 405, 410, 422, 501}:
                raise DeliveryRejected(
                    f"Evolution v2 rejeitou a entrega (HTTP {resp.status_code})"
                ) from exc
            raise
        return resp.json()

    async def check_numbers(self, numbers: list[str]) -> list[dict[str, Any]]:
        result = await self._post(self._chat_path("whatsappNumbers"), {"numbers": numbers})
        logger.info("whatsapp.check count=%s", len(numbers))
        return result

    async def send_text(self, number: str, text: str, **kwargs) -> dict[str, Any]:
        payload: dict[str, Any] = {"number": number, "text": text}
        result = await self._post(self._msg_path("sendText"), payload)
        logger.info("whatsapp.text_sent number=%s", number)
        return result

    async def send_media(
        self, number: str, media_url: str, media_type: str, *, caption: str | None = None, **kwargs
    ) -> dict[str, Any]:
        if media_type not in MEDIA_TYPES:
            raise ValueError(f"media_type inválido: {media_type}")
        payload: dict[str, Any] = {"number": number, "mediatype": media_type, "media": media_url}
        if caption:
            payload["caption"] = caption
        result = await self._post(self._msg_path("sendMedia"), payload)
        logger.info("whatsapp.media_sent number=%s type=%s", number, media_type)
        return result

    async def send_audio(self, number: str, audio_url: str, **kwargs) -> dict[str, Any]:
        payload: dict[str, Any] = {"number": number, "audio": audio_url}
        result = await self._post(self._msg_path("sendWhatsAppAudio"), payload, timeout=60.0)
        logger.info("whatsapp.audio_sent number=%s", number)
        return result

    async def send_poll(
        self, number: str, question: str, options: list[str], *, max_answers: int = 1, **kwargs
    ) -> dict[str, Any]:
        return await self._post(
            self._msg_path("sendPoll"),
            {
                "number": number,
                "name": question,
                "selectableCount": max_answers,
                "values": options,
            },
        )
