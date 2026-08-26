"""Driver do Evolution GO para texto, mídia, áudio/PTT e consulta de números."""

from __future__ import annotations

import time
from typing import Any
from urllib.parse import unquote, urlparse

import httpx
import structlog
from django.conf import settings

from whatsapp.driver import WhatsAppDriver
from whatsapp.errors import (
    WhatsAppSessionDown,
    WhatsAppTransportError,
    looks_like_session_down,
)

logger = structlog.get_logger()

MEDIA_TYPES = {"image", "video", "audio", "document"}
_BR_JID_TTL_S = 3600
_br_jid_cache: dict[str, tuple[str | None, float]] = {}


def _filename_from_url(media_url: str) -> str:
    filename = unquote(urlparse(media_url).path.rsplit("/", 1)[-1]).strip()
    return filename or "arquivo"


def _br_phone_variants(phone: str) -> list[str]:
    digits = "".join(character for character in phone if character.isdigit())
    if not digits.startswith("55") or len(digits) not in (12, 13):
        return [digits or phone]
    country, ddd, rest = digits[:2], digits[2:4], digits[4:]
    if len(rest) == 9 and rest.startswith("9"):
        return [country + ddd + rest, country + ddd + rest[1:]]
    if len(rest) == 8:
        return [country + ddd + "9" + rest, country + ddd + rest]
    return [digits]


class WhatsAppGoError(WhatsAppTransportError):
    def __init__(self, status_code: int, body: Any, message: str = ""):
        super().__init__(status_code, body, message or f"Evolution GO {status_code}: {body!r}")


class WhatsAppGoSessionDown(WhatsAppGoError, WhatsAppSessionDown):
    """Sessão da instância na GO está fora — candidato a fallback / 503."""


class EvolutionGoDriver(WhatsAppDriver):
    """Cliente da instância identificada pelo token do Evolution GO."""

    name = "evolution-go"

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
        try:
            response = await self._client.request(method, path, **kwargs)
        except httpx.TransportError as exc:
            # Mesma regra da v2: falha de transporte é sessão/serviço fora
            # (problema NOSSO) — classifica aqui para a cascata poder cair.
            raise WhatsAppGoSessionDown(0, f"{type(exc).__name__}: {exc}") from exc
        if response.status_code >= 400:
            if response.status_code == 503 or looks_like_session_down(response.text):
                raise WhatsAppGoSessionDown(response.status_code, response.text)
            raise WhatsAppGoError(response.status_code, response.text)
        try:
            return response.json()
        except ValueError as exc:
            raise WhatsAppGoError(
                response.status_code,
                response.text,
                "Evolution GO respondeu conteúdo que não é JSON",
            ) from exc

    async def health(self) -> Any:
        return await self._request("GET", "/instance/status")

    async def check_numbers(self, numbers: list[str]) -> list[dict[str, Any]]:
        result = await self._request(
            "POST",
            "/user/check",
            json={"number": numbers},
        )
        data = result.get("data") if isinstance(result, dict) else None
        users = data.get("Users") if isinstance(data, dict) else None
        if not isinstance(users, list):
            raise WhatsAppGoError(
                200,
                result,
                "Evolution GO devolveu resposta inesperada em /user/check",
            )

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

        logger.info(
            "whatsapp.check",
            count=len(numbers),
            provider="evolution_go",
        )
        return normalized

    async def resolve_br_number(self, phone: str) -> str:
        cached = _br_jid_cache.get(phone)
        if cached is not None:
            value, timestamp = cached
            if time.monotonic() - timestamp < _BR_JID_TTL_S:
                return value or phone
            del _br_jid_cache[phone]

        variants = _br_phone_variants(phone)
        if len(variants) == 1:
            return variants[0]

        try:
            result = await self.check_numbers(variants)
        except Exception as exc:
            logger.warning(
                "whatsapp.resolve_br.check_failed",
                error=type(exc).__name__,
            )
            return phone

        chosen = next(
            (item["number"] for item in result if item["exists"]),
            None,
        )
        _br_jid_cache[phone] = (chosen, time.monotonic())
        if chosen is None:
            logger.warning(
                "whatsapp.resolve_br.none_exists",
                variant_count=len(variants),
            )
            return phone
        if chosen != phone:
            logger.info("whatsapp.resolve_br.normalized", changed=True)
        return chosen

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
        logger.info("whatsapp.text_sent", provider="evolution_go")
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
            raise WhatsAppGoError(
                0,
                media_type,
                f"media_type inválido: {media_type}",
            )
        if not media_url.startswith(("http://", "https://")):
            raise WhatsAppGoError(
                0,
                "<mídia omitida>",
                "Evolution GO requer uma URL http(s)",
            )

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
        logger.info(
            "whatsapp.media_sent",
            provider="evolution_go",
            type=media_type,
        )
        return result

    async def send_audio(
        self,
        number: str,
        audio_url: str,
        **kwargs,
    ) -> dict[str, Any]:
        return await self.send_media(number, audio_url, "audio")

    # ── recursos exclusivos da GO (B6 — testados em produção 2026-08-02) ────
    # poll e location FUNCIONAM (chegaram no destino de controle). button e
    # list passam na API da GO mas o SERVIDOR do WhatsApp recusa (erros 473 e
    # 405): mensagens interativas exigem a Business API oficial. Detalhe em
    # docs/capacidades-whatsapp.md.

    async def send_poll(
        self,
        number: str,
        question: str,
        options: list[str],
        *,
        selectable_count: int = 1,
        **kwargs,
    ) -> dict[str, Any]:
        count = max(1, int(selectable_count))
        result = await self._request(
            "POST",
            "/send/poll",
            json={
                "number": number,
                "question": question,
                "options": list(options),
                "maxAnswer": count,
                "selectableCount": count,
            },
        )
        logger.info("whatsapp.poll_sent", provider="evolution_go", options=len(options))
        return result

    async def send_location(
        self,
        number: str,
        latitude: float,
        longitude: float,
        *,
        name: str = "",
        address: str = "",
        **kwargs,
    ) -> dict[str, Any]:
        result = await self._request(
            "POST",
            "/send/location",
            json={
                "number": number,
                "latitude": float(latitude),
                "longitude": float(longitude),
                "name": name or "Localização",
                "address": address or name or "—",
            },
        )
        logger.info("whatsapp.location_sent", provider="evolution_go")
        return result

    async def send_pix_button(
        self,
        number: str,
        title: str,
        description: str,
        footer: str,
        *,
        name: str,
        key_type: str,
        key: str,
        currency: str = "BRL",
        **kwargs,
    ) -> dict[str, Any]:
        result = await self._request(
            "POST",
            "/send/button",
            json={
                "number": number,
                "title": title or "Pagamento via Pix",
                "description": description or f"Chave Pix: {key}",
                "footer": footer or "Notify",
                "buttons": [
                    {
                        "type": "pix",
                        "currency": currency or "BRL",
                        "name": name or "Beneficiário",
                        "keyType": key_type.lower(),
                        "key": key,
                    }
                ],
            },
        )
        logger.info("whatsapp.pix_button_sent", provider="evolution_go", key_type=key_type)
        return result

    async def send_carousel(
        self,
        number: str,
        cards: list[dict[str, Any]],
        *,
        body: str = "",
        footer: str = "",
        **kwargs,
    ) -> dict[str, Any]:
        result = await self._request(
            "POST",
            "/send/carousel",
            json={
                "number": number,
                "body": body,
                "footer": footer,
                "cards": cards,
            },
            timeout=60.0,
        )
        logger.info("whatsapp.carousel_sent", provider="evolution_go", cards_count=len(cards))
        return result

    async def send_contact(
        self,
        number: str,
        full_name: str,
        phone: str,
        *,
        organization: str = "",
        **kwargs,
    ) -> dict[str, Any]:
        result = await self._request(
            "POST",
            "/send/contact",
            json={
                "number": number,
                "vcard": {
                    "fullName": full_name,
                    "phone": phone,
                    "organization": organization,
                },
            },
        )
        logger.info("whatsapp.contact_sent", provider="evolution_go", name=full_name)
        return result

    async def send_link(
        self,
        number: str,
        url: str,
        *,
        text: str = "",
        title: str = "",
        description: str = "",
        **kwargs,
    ) -> dict[str, Any]:
        result = await self._request(
            "POST",
            "/send/link",
            json={
                "number": number,
                "url": url,
                "text": text or url,
                "title": title,
                "description": description,
            },
        )
        logger.info("whatsapp.link_sent", provider="evolution_go", url=url)
        return result
