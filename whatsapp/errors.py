"""Erros compartilhados dos drivers de WhatsApp.

A distinção que importa para o chamador é UMA: o problema é **nosso** (a sessão
WhatsApp caiu / a instância não está logada) ou é **do destino** (número não
existe, mídia inválida)? Só o primeiro caso justifica fallback e 503; o segundo
é resposta legítima e deve subir como erro de negócio.
"""

from __future__ import annotations

from typing import Any


class WhatsAppTransportError(Exception):
    """Falha ao falar com o provedor (HTTP, payload inesperado, timeout)."""

    def __init__(self, status_code: int, body: Any, message: str = ""):
        self.status_code = status_code
        self.body = body
        super().__init__(message or f"WhatsApp {status_code}: {body!r}")


class WhatsAppSessionDown(WhatsAppTransportError):
    """A instância existe mas não tem sessão WhatsApp utilizável.

    Sinaliza "nosso verificador caiu", não "o número não tem WhatsApp".
    É a condição que dispara fallback para o driver secundário e, se não houver
    secundário saudável, um 503 estruturado na API.
    """


# Trechos que os provedores usam para dizer "não há sessão". Comparados em
# lowercase contra o corpo da resposta.
_SESSION_DOWN_MARKERS = (
    "no active session",
    "not logged in",
    "instance not connected",
    "connection closed",
    "connection is closed",
    "session not found",
    "not connected",
    "logged out",
    "instance does not exist",
    "license required",
    "service not activated",
    # Sessão ZUMBI da v2 (visto em produção 2026-08-02): connectionStatus dizia
    # `open`/`close` mas o socket interno estava morto e o sendText respondia
    # 500 com erro de JS do Baileys. É problema NOSSO — a mensagem não saiu e o
    # fallback é seguro; sem este marcador, a cascata não caía pro GO.
    "cannot read properties of undefined",
    "cannot read property",
)


def looks_like_session_down(body: Any) -> bool:
    """Heurística sobre o corpo da resposta do provedor."""
    if body is None:
        return False
    text = body if isinstance(body, str) else repr(body)
    lowered = text.lower()
    return any(marker in lowered for marker in _SESSION_DOWN_MARKERS)


def raise_for_body(status_code: int, body: Any, cls, message: str = "") -> None:
    """Levanta WhatsAppSessionDown ou `cls`, conforme o corpo da resposta."""
    if looks_like_session_down(body) or status_code == 503:
        raise WhatsAppSessionDown(status_code, body, message)
    raise cls(status_code, body, message)
