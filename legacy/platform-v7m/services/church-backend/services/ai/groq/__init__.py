"""Pacote Groq vision."""

def analyze_image(*args, **kwargs):
    from .client import analyze_image as _analyze_image

    return _analyze_image(*args, **kwargs)


def analyze_image_with_groq(*args, **kwargs):
    from .client import analyze_image_with_groq as _analyze_image_with_groq

    return _analyze_image_with_groq(*args, **kwargs)


def analyze_document_selfie_base64(*args, **kwargs):
    from .vision import analyze_document_selfie_base64 as _analyze_document_selfie_base64

    return _analyze_document_selfie_base64(*args, **kwargs)

__all__ = [
    "analyze_image",
    "analyze_image_with_groq",
    "analyze_document_selfie_base64",
]
