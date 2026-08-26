"""Pacote Gemini AI."""

from .services import edit_image_from_prompt, generate_image_from_prompt


def generate_image_from_text(*args, **kwargs):
    """Compatibilidade pública para geração de imagem."""

    return generate_image_from_prompt(*args, **kwargs)


def edit_image_with_text(*args, **kwargs):
    """Compatibilidade pública para edição de imagem."""

    return edit_image_from_prompt(*args, **kwargs)


__all__ = ["generate_image_from_text", "edit_image_with_text"]
