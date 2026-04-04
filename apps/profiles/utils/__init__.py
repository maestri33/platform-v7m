"""Funções públicas para integração de outros apps com profiles."""

from .get_email import get_email
from .get_phone import get_phone

__all__ = [
    "get_email",
    "get_phone",
]
