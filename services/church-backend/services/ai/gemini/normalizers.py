"""Normalização de respostas do Gemini."""

import base64
from io import BytesIO

from PIL import Image


def extract_response_parts(response):
    """Extrai parts da resposta em formatos compatíveis do SDK."""

    if isinstance(response, dict):
        candidates = response.get("candidates") or []
        for candidate in candidates:
            content = candidate.get("content") or {}
            parts = content.get("parts") or []
            if parts:
                return list(parts)
        return []

    direct_parts = getattr(response, "parts", None)
    if direct_parts:
        return list(direct_parts)

    candidates = getattr(response, "candidates", None) or []
    for candidate in candidates:
        content = getattr(candidate, "content", None)
        parts = getattr(content, "parts", None)
        if parts:
            return list(parts)
    return []


def extract_response_text(response):
    """Extrai texto útil da resposta para log e auditoria."""

    if isinstance(response, dict):
        texts = []
        for part in extract_response_parts(response):
            part_text = part.get("text")
            if part_text:
                texts.append(str(part_text))
        return "\n".join(texts)

    response_text = getattr(response, "text", None)
    if response_text:
        return str(response_text)

    texts = []
    for part in extract_response_parts(response):
        part_text = getattr(part, "text", None)
        if part_text:
            texts.append(str(part_text))
    return "\n".join(texts)


def extract_image_from_part(part):
    """Converte um part retornado pelo SDK em PIL Image."""

    if isinstance(part, dict):
        inline_data = part.get("inlineData") or part.get("inline_data")
        if not inline_data:
            return None
        raw_data = inline_data.get("data")
        if raw_data is None:
            return None
        if isinstance(raw_data, str):
            raw_data = base64.b64decode(raw_data)
        return Image.open(BytesIO(raw_data))

    if hasattr(part, "as_image"):
        try:
            image = part.as_image()
        except Exception:
            image = None
        if image is not None:
            pil_image = getattr(image, "_pil_image", None)
            if callable(pil_image):
                return pil_image()
            if pil_image is not None:
                return pil_image

            image_bytes = getattr(image, "image_bytes", None)
            if image_bytes is not None:
                return Image.open(BytesIO(image_bytes))

            return image

    inline_data = getattr(part, "inline_data", None)
    if inline_data is None:
        return None

    raw_data = getattr(inline_data, "data", None)
    if raw_data is None:
        return None

    return Image.open(BytesIO(raw_data))
