"""Módulo de e-mail do notify-server."""

from __future__ import annotations

from typing import Any


def get_admin_client() -> Any:
    """Retorna o cliente administrativo Stalwart."""
    from mail import stalwart

    return stalwart.get_client()
