"""Entrypoint publico do envio de notificacoes."""

from .services.dispatch import send_notification

__all__ = ["send_notification"]
