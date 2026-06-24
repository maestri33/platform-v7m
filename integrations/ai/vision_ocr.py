"""Client Google Cloud Vision — OCR (texto em imagem).

Stub M1.7: sem credencial configurada por padrão. Implementação real entra
em M1.10 (consolidação com ``services/ai/``). Por enquanto, levantar
``NotImplementedError`` limpo quando chamado.
"""

from __future__ import annotations

import logging
from django.conf import settings

logger = logging.getLogger(__name__)


class VisionOCRError(Exception):
    """Erro ao falar com o Google Vision."""


class VisionOCRClient:
    def __init__(
        self,
        *,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: int = 60,
    ):
        self._api_key = (
            api_key if api_key is not None else str(getattr(settings, "GOOGLE_VISION_API_KEY", "") or "")
        )
        self._base_url = (
            base_url
            if base_url is not None
            else str(
                getattr(
                    settings,
                    "GOOGLE_VISION_BASE_URL",
                    "https://vision.googleapis.com",
                )
            )
        ).rstrip("/")
        self._timeout = timeout

    def detect_text(self, image_bytes: bytes, *, document: bool = False) -> str:
        """Extrai o texto de uma imagem. Stub M1.7."""
        if not self._api_key:
            raise VisionOCRError("GOOGLE_VISION_API_KEY não configurada no .env")
        raise NotImplementedError(
            "integrations.ai.vision_ocr stub M1.7 — implementação real em M1.10"
        )
