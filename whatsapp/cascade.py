"""Driver em cascata — tenta o provedor preferido e cai no fallback.

Regra da casa: Evolution v2 é a base; Evolution GO entra como fallback (e para
funções que a v2 não tem). A queda só acontece em `WhatsAppSessionDown`, ou seja,
quando o problema é NOSSO (sessão fora). Erro de negócio — número inválido, mídia
recusada — sobe direto, sem tentar o outro provedor: repetir não mudaria nada e
só duplicaria efeito colateral.
"""

from __future__ import annotations

from typing import Any, Callable

import structlog

from whatsapp.driver import WhatsAppDriver
from whatsapp.errors import WhatsAppSessionDown

logger = structlog.get_logger()


class CascadeDriver(WhatsAppDriver):
    """Encadeia drivers; usa o primeiro cuja sessão responder."""

    def __init__(self, builders: list[tuple[str, Callable[[], WhatsAppDriver]]]) -> None:
        if not builders:
            raise ValueError("CascadeDriver exige ao menos um driver.")
        self._builders = builders
        self._open: dict[str, WhatsAppDriver] = {}

    # ---------- ciclo de vida ----------

    def _driver(self, name: str, build: Callable[[], WhatsAppDriver]) -> WhatsAppDriver:
        if name not in self._open:
            self._open[name] = build()
        return self._open[name]

    async def aclose(self) -> None:
        for driver in self._open.values():
            try:
                await driver.aclose()
            except Exception:  # noqa: BLE001 — fechar não pode derrubar o envio
                logger.warning("whatsapp.cascade.close_failed")
        self._open.clear()

    # ---------- núcleo ----------

    async def _try(self, method: str, *args, **kwargs) -> Any:
        last_down: WhatsAppSessionDown | None = None
        for index, (name, build) in enumerate(self._builders):
            driver = self._driver(name, build)
            try:
                result = await getattr(driver, method)(*args, **kwargs)
            except WhatsAppSessionDown as exc:
                last_down = exc
                remaining = len(self._builders) - index - 1
                logger.warning(
                    "whatsapp.cascade.session_down",
                    driver=name,
                    method=method,
                    fallbacks_restantes=remaining,
                )
                continue
            if index > 0:
                logger.info("whatsapp.cascade.fallback_ok", driver=name, method=method)
            return result
        assert last_down is not None
        raise last_down

    # ---------- interface WhatsAppDriver ----------

    async def send_text(self, number: str, text: str, **kwargs) -> dict[str, Any]:
        return await self._try("send_text", number, text, **kwargs)

    async def send_media(
        self, number: str, media_url: str, media_type: str, *, caption: str | None = None, **kwargs
    ) -> dict[str, Any]:
        return await self._try(
            "send_media", number, media_url, media_type, caption=caption, **kwargs
        )

    async def send_audio(self, number: str, audio_url: str, **kwargs) -> dict[str, Any]:
        return await self._try("send_audio", number, audio_url, **kwargs)

    async def check_numbers(self, numbers: list[str]) -> list[dict[str, Any]]:
        return await self._try("check_numbers", numbers)

    async def resolve_br_number(self, phone: str) -> str:
        try:
            return await self._try("resolve_br_number", phone)
        except WhatsAppSessionDown:
            # resolver o 9º dígito é otimização, não requisito: segue com o
            # número como veio e deixa o envio decidir.
            return phone

    async def health(self) -> Any:
        return await self._try("health")
