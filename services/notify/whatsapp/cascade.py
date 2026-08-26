"""Driver em cascata — tenta o provedor preferido e cai no fallback.

Com a Evolution GO como único provedor (v2 aposentada em 2026-08-18) a cadeia é
um caminho só, mas a maquinaria segue válida para um segundo provedor futuro.
A queda só acontece em `WhatsAppSessionDown`, ou seja, quando o problema é
NOSSO (sessão fora). Erro de negócio — número inválido, mídia recusada — sobe
direto, sem tentar o outro provedor: repetir não mudaria nada e só duplicaria
efeito colateral.

Retry/backoff: sessão fora costuma ser transitória (reconexão do whatsmeow leva
segundos). Antes de abandonar um provedor, o método é retentado
`WHATSAPP_RETRY_ATTEMPTS` vezes com backoff exponencial
(`WHATSAPP_RETRY_BACKOFF_S`). Só depois disso a cascata cai para o próximo.
"""

from __future__ import annotations

import asyncio
from typing import Any, Callable

import structlog
from django.conf import settings

from whatsapp.driver import WhatsAppDriver
from whatsapp.errors import WhatsAppSessionDown

logger = structlog.get_logger()

# Indireção para os testes conseguirem medir o backoff sem esperar de verdade.
_sleep = asyncio.sleep


def _retry_attempts() -> int:
    return max(1, int(getattr(settings, "WHATSAPP_RETRY_ATTEMPTS", 2)))


def _retry_backoff_s() -> float:
    return max(0.0, float(getattr(settings, "WHATSAPP_RETRY_BACKOFF_S", 0.4)))


class CascadeDriver(WhatsAppDriver):
    """Encadeia drivers; usa o primeiro cuja sessão responder."""

    def __init__(self, builders: list[tuple[str, Callable[[], WhatsAppDriver]]]) -> None:
        if not builders:
            raise ValueError("CascadeDriver exige ao menos um driver.")
        self._builders = builders
        self._open: dict[str, WhatsAppDriver] = {}
        # Quem respondeu por último. É o que o dispatch grava como driver_used —
        # saber que caiu no fallback é metade do diagnóstico de um incidente.
        self.name = builders[0][0]
        # Por que a entrega saiu por onde saiu — vazio quando o preferido
        # respondeu de primeira. O dispatch persiste isto em driver_reason.
        self.last_reason = ""

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
        from whatsapp import breaker

        last_down: WhatsAppSessionDown | None = None
        quedas: list[str] = []
        attempts = _retry_attempts()
        backoff = _retry_backoff_s()

        for index, (name, build) in enumerate(self._builders):
            # I5: circuito aberto = provedor comprovadamente morto — não gasta
            # timeout nele, cai direto pro próximo da cadeia.
            if breaker.is_open(name):
                quedas.append(f"{name}: circuit open")
                last_down = last_down or WhatsAppSessionDown(503, f"{name}: circuit open")
                logger.warning("whatsapp.cascade.skip_open_circuit", driver=name, method=method)
                continue
            driver = self._driver(name, build)
            for attempt in range(attempts):
                try:
                    result = await getattr(driver, method)(*args, **kwargs)
                except WhatsAppSessionDown as exc:
                    last_down = exc
                    breaker.record_fail(name)
                    if attempt < attempts - 1:
                        wait = backoff * (2**attempt)
                        logger.warning(
                            "whatsapp.cascade.retry",
                            driver=name,
                            method=method,
                            attempt=attempt + 1,
                            wait_s=wait,
                        )
                        if wait:
                            await _sleep(wait)
                        continue
                    quedas.append(f"{name}: {str(exc)[:120]}")
                    remaining = len(self._builders) - index - 1
                    logger.warning(
                        "whatsapp.cascade.session_down",
                        driver=name,
                        method=method,
                        tentativas=attempts,
                        fallbacks_restantes=remaining,
                    )
                    break  # próximo driver da cadeia
                else:
                    self.name = name
                    breaker.record_ok(name)
                    if index > 0 or attempt > 0:
                        motivo = "; ".join(quedas) if quedas else "retry no mesmo provedor"
                        self.last_reason = (
                            f"fallback→{name} ({motivo})" if index > 0 else f"retry ok ({attempt + 1}ª tentativa)"
                        )[:200]
                        logger.info(
                            "whatsapp.cascade.fallback_ok",
                            driver=name,
                            method=method,
                            motivo=self.last_reason,
                        )
                    else:
                        self.last_reason = ""
                    return result

        assert last_down is not None
        self.last_reason = ("todos fora: " + "; ".join(quedas))[:200]
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

    async def send_poll(
        self, number: str, question: str, options: list[str], *, selectable_count: int = 1, **kwargs
    ) -> dict[str, Any]:
        return await self._try(
            "send_poll", number, question, options, selectable_count=selectable_count, **kwargs
        )

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
        return await self._try(
            "send_pix_button",
            number,
            title,
            description,
            footer,
            name=name,
            key_type=key_type,
            key=key,
            currency=currency,
            **kwargs,
        )

    async def send_carousel(
        self,
        number: str,
        cards: list[dict[str, Any]],
        *,
        body: str = "",
        footer: str = "",
        **kwargs,
    ) -> dict[str, Any]:
        return await self._try("send_carousel", number, cards, body=body, footer=footer, **kwargs)

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
        return await self._try(
            "send_location", number, latitude, longitude, name=name, address=address, **kwargs
        )

    async def send_contact(
        self,
        number: str,
        full_name: str,
        phone: str,
        *,
        organization: str = "",
        **kwargs,
    ) -> dict[str, Any]:
        return await self._try(
            "send_contact", number, full_name, phone, organization=organization, **kwargs
        )

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
        return await self._try(
            "send_link", number, url, text=text, title=title, description=description, **kwargs
        )

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
