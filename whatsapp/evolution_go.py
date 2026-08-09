"""Driver do Evolution GO para texto, mídia, áudio/PTT e consulta de números."""

from __future__ import annotations

import logging
from typing import Any
from urllib.parse import unquote, urlparse

import httpx
from django.conf import settings

logger = logging.getLogger(__name__)

MEDIA_TYPES = {"image", "video", "audio", "document"}


def _filename_from_url(media_url: str) -> str:
    filename = unquote(urlparse(media_url).path.rsplit("/", 1)[-1]).strip()
    return filename or "arquivo"


class EvolutionGoDriver:
    """Cliente da instância identificada pelo token do Evolution GO."""

    def __init__(
        self,
        *,
        base_url: str | None = None,
        api_key: str | None = None,
        timeout: float = 10.0,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._client = httpx.AsyncClient(
            base_url=(
                base_url or getattr(settings, "EVOLUTION_GO_BASE_URL", "")
            ).rstrip("/"),
            headers={
                "apikey": api_key
                or getattr(settings, "EVOLUTION_GO_API_KEY", "")
            },
            timeout=timeout,
            transport=transport,
        )

    async def aclose(self) -> None:
        await self._client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.aclose()

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json: dict[str, Any] | None = None,
        timeout: float | None = None,
    ) -> Any:
        kwargs: dict[str, Any] = {"json": json} if json is not None else {}
        if timeout is not None:
            kwargs["timeout"] = httpx.Timeout(timeout, connect=5.0)
        response = await self._client.request(method, path, **kwargs)
        response.raise_for_status()
        try:
            return response.json()
        except ValueError as exc:
            raise ValueError("Evolution GO respondeu conteúdo que não é JSON") from exc

    async def check_numbers(self, numbers: list[str]) -> list[dict[str, Any]]:
        result = await self._request(
            "POST",
            "/user/check",
            json={"number": numbers},
        )
        users = result.get("data", {}).get("Users") if isinstance(result, dict) else None
        if not isinstance(users, list):
            raise ValueError("Evolution GO devolveu resposta inesperada em /user/check")

        normalized = []
        for index, user in enumerate(users):
            requested = user.get("Query") or (
                numbers[index] if index < len(numbers) else ""
            )
            jid = user.get("JID") or None
            remote_jid = user.get("RemoteJID") or jid
            normalized.append(
                {
                    "jid": jid,
                    "exists": bool(user.get("IsInWhatsapp")),
                    "number": (
                        remote_jid.split("@", 1)[0]
                        if remote_jid
                        else requested
                    ),
                    "name": user.get("VerifiedName") or None,
                }
            )

        logger.info("whatsapp.check count=%s provider=evolution_go", len(numbers))
        return normalized

    async def send_text(
        self,
        number: str,
        text: str,
        **kwargs,
    ) -> dict[str, Any]:
        result = await self._request(
            "POST",
            "/send/text",
            json={"number": number, "text": text},
        )
        logger.info("whatsapp.text_sent provider=evolution_go")
        return result

    async def send_media(
        self,
        number: str,
        media_url: str,
        media_type: str,
        *,
        caption: str | None = None,
        **kwargs,
    ) -> dict[str, Any]:
        if media_type not in MEDIA_TYPES:
            raise ValueError(f"media_type inválido: {media_type}")
        if not media_url.startswith(("http://", "https://")):
            raise ValueError("Evolution GO requer uma URL http(s)")

        payload = {
            "number": number,
            "url": media_url,
            "type": media_type,
        }
        if media_type == "document":
            payload["filename"] = _filename_from_url(media_url)
        if caption:
            payload["caption"] = caption
        result = await self._request(
            "POST",
            "/send/media",
            json=payload,
            timeout=60.0,
        )
        logger.info("whatsapp.media_sent provider=evolution_go type=%s", media_type)
        return result

    async def send_audio(
        self,
        number: str,
        audio_url: str,
        **kwargs,
    ) -> dict[str, Any]:
        return await self.send_media(number, audio_url, "audio")

    async def send_poll(
        self,
        number: str,
        question: str,
        options: list[str],
        *,
        max_answers: int = 1,
        **kwargs,
    ) -> dict[str, Any]:
        return await self._request(
            "POST",
            "/send/poll",
            json={
                "number": number,
                "question": question,
                "options": options,
                "maxAnswer": max_answers,
            },
        )
