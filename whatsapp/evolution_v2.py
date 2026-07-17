"""Driver Evolution API v2 — porte do monólito (integrations/communication/whatsapp/client.py).

Config vem da row WhatsAppNumber (instance_name) + settings (base_url, api_key).
"""

from __future__ import annotations

import time
from typing import Any

import httpx
import structlog
from django.conf import settings

from whatsapp.driver import WhatsAppDriver

logger = structlog.get_logger()

MEDIA_TYPES = {"image", "video", "audio", "document"}

# Cache de resolução de JID BR (nono dígito). phone -> (resolved, monotonic_ts). TTL 1h.
_BR_JID_TTL_S = 3600
_br_jid_cache: dict[str, tuple[str | None, float]] = {}


def _br_phone_variants(phone: str) -> list[str]:
    """Para mobile BR, gera as duas variantes (com 9 / sem 9)."""
    digits = "".join(c for c in phone if c.isdigit())
    if not digits.startswith("55") or len(digits) not in (12, 13):
        return [phone]
    country, ddd, rest = digits[:2], digits[2:4], digits[4:]
    if len(rest) == 9 and rest.startswith("9"):
        return [country + ddd + rest, country + ddd + rest[1:]]
    if len(rest) == 8:
        return [country + ddd + "9" + rest, country + ddd + rest]
    return [phone]


class WhatsAppError(Exception):
    def __init__(self, status_code: int, body: Any, message: str = ""):
        self.status_code = status_code
        self.body = body
        super().__init__(message or f"WhatsApp API {status_code}: {body!r}")


class EvolutionV2Driver(WhatsAppDriver):
    """Cliente Evolution API v2 — config por row WhatsAppNumber."""

    def __init__(
        self,
        instance_name: str,
        *,
        base_url: str | None = None,
        api_key: str | None = None,
        timeout: float = 10.0,
    ) -> None:
        self._base_url = base_url or getattr(settings, "WHATSAPP_API_BASE_URL", "")
        self._api_key = api_key or getattr(settings, "WHATSAPP_GLOBAL_API_KEY", "")
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            headers={"apikey": self._api_key},
            timeout=timeout,
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
        if resp.status_code >= 400:
            raise WhatsAppError(resp.status_code, resp.text)
        return resp.json()

    async def _get(self, path: str) -> Any:
        resp = await self._client.get(path)
        if resp.status_code >= 400:
            raise WhatsAppError(resp.status_code, resp.text)
        return resp.json()

    # ---------- WhatsAppDriver interface ----------

    async def health(self) -> Any:
        return await self._get("/instance/fetchInstances")

    async def check_numbers(self, numbers: list[str]) -> list[dict[str, Any]]:
        result = await self._post(self._chat_path("whatsappNumbers"), {"numbers": numbers})
        logger.info("whatsapp.check", count=len(numbers))
        return result

    async def resolve_br_number(self, phone: str) -> str:
        cached = _br_jid_cache.get(phone)
        if cached is not None:
            value, ts = cached
            if time.monotonic() - ts < _BR_JID_TTL_S:
                return value or phone
            del _br_jid_cache[phone]

        variants = _br_phone_variants(phone)
        if len(variants) == 1:
            return phone

        try:
            result = await self.check_numbers(variants)
        except Exception as exc:
            logger.warning("whatsapp.resolve_br.check_failed", phone=phone, error=str(exc)[:160])
            return phone

        chosen: str | None = None
        for item in result or []:
            if item.get("exists"):
                chosen = item.get("number") or item.get("jid", "").split("@")[0]
                break

        _br_jid_cache[phone] = (chosen, time.monotonic())

        if chosen is None:
            logger.warning("whatsapp.resolve_br.none_exists", phone=phone, tried=variants)
            return phone
        if chosen != phone:
            logger.info("whatsapp.resolve_br.normalized", phone_original=phone, phone_resolved=chosen)
        return chosen

    async def send_text(self, number: str, text: str, **kwargs) -> dict[str, Any]:
        payload: dict[str, Any] = {"number": number, "text": text}
        result = await self._post(self._msg_path("sendText"), payload)
        logger.info("whatsapp.text_sent", number=number, text_preview=text[:50])
        return result

    async def send_media(
        self, number: str, media_url: str, media_type: str, *, caption: str | None = None, **kwargs
    ) -> dict[str, Any]:
        if media_type not in MEDIA_TYPES:
            raise WhatsAppError(0, media_type, f"media_type inválido: {media_type}")
        payload: dict[str, Any] = {"number": number, "mediatype": media_type, "media": media_url}
        if caption:
            payload["caption"] = caption
        result = await self._post(self._msg_path("sendMedia"), payload)
        logger.info("whatsapp.media_sent", number=number, type=media_type, url=media_url[:80])
        return result

    async def send_audio(self, number: str, audio_url: str, **kwargs) -> dict[str, Any]:
        payload: dict[str, Any] = {"number": number, "audio": audio_url}
        result = await self._post(self._msg_path("sendWhatsAppAudio"), payload, timeout=60.0)
        logger.info("whatsapp.audio_sent", number=number, url=audio_url[:80])
        return result
