"""Schemas simples da integração Gemini."""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class GeminiImageResult:
    """Resultado normalizado de imagem do Gemini."""

    success: bool
    operation: str = ""
    prompt: str = ""
    model: str = ""
    image_path: str = ""
    image_url: str = ""
    log_id: str = ""
    response_text: str = ""
    response_data: dict[str, Any] = field(default_factory=dict)
    error: str = ""
