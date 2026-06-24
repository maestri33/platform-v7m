"""Client Gemini (imagem/visão) — porta mínima.

M1.7 só precisa de stubs funcionais: o ``services/ai/gemini/`` legado continua
sendo usado pelo resto do sistema até M1.10 (consolidação). Quando alguém
chamar ``integrations.ai.gemini`` agora, devolvemos ``NotImplementedError``
limpo se a credencial faltar — o service.py trata como ``retryable=False``
e segue a cadeia (ou falha alto, conforme o caller).

Implementação completa (geração de imagem + visão) entra em M1.10 quando
consolidarmos com o ``services/ai/gemini``.
"""

from __future__ import annotations

import logging
from django.conf import settings

logger = logging.getLogger(__name__)


class GeminiError(Exception):
    """Erro ao falar com o Gemini (placeholder M1.7)."""


class GeminiClient:
    """Stub M1.7 — implementação real entra em M1.10."""

    def __init__(
        self,
        *,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: int = 90,
    ):
        self._api_key = (
            api_key if api_key is not None else str(getattr(settings, "GEMINI_API_KEY", "") or "")
        )
        self._base_url = (
            base_url
            if base_url is not None
            else str(
                getattr(
                    settings,
                    "GEMINI_API_BASE_URL",
                    "https://generativelanguage.googleapis.com/v1beta",
                )
            )
        ).rstrip("/")
        self._timeout = timeout

    def generate_image(self, prompt: str) -> tuple[bytes, str]:
        """Gera imagem a partir de prompt. Stub M1.7."""
        if not self._api_key:
            raise GeminiError("GEMINI_API_KEY não configurada no .env")
        raise NotImplementedError(
            "integrations.ai.gemini.generate_image stub M1.7 — "
            "use services.ai.gemini até M1.10"
        )

    def describe(self, image_bytes: bytes, *, mime_type: str = "image/jpeg", prompt: str | None = None) -> str:
        """Descreve imagem. Stub M1.7."""
        if not self._api_key:
            raise GeminiError("GEMINI_API_KEY não configurada no .env")
        raise NotImplementedError(
            "integrations.ai.gemini.describe stub M1.7 — "
            "use services.ai.gemini até M1.10"
        )
