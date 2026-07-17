"""ABC do driver de WhatsApp — desacopla Evolution v2 de future evolution-go."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class WhatsAppDriver(ABC):
    """Interface mínima que todo driver de WhatsApp deve implementar."""

    @abstractmethod
    async def send_text(self, number: str, text: str, **kwargs) -> dict[str, Any]: ...

    @abstractmethod
    async def send_media(
        self, number: str, media_url: str, media_type: str, *, caption: str | None = None, **kwargs
    ) -> dict[str, Any]: ...

    @abstractmethod
    async def send_audio(self, number: str, audio_url: str, **kwargs) -> dict[str, Any]: ...

    @abstractmethod
    async def check_numbers(self, numbers: list[str]) -> list[dict[str, Any]]: ...

    async def resolve_br_number(self, phone: str) -> str:
        """Resolve 9º dígito BR. Default: devolve como veio (driver pode override)."""
        return phone

    async def health(self) -> Any:
        return "ok"

    async def aclose(self) -> None:
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        await self.aclose()
