"""Correlation-id ponta a ponta (J1).

Cada request ganha (ou propaga) um `X-Request-ID`; o id entra no contexto do
structlog e sai em TODA linha de log do request. O send() grava o id no caller
implícito? Não — o elo com a fila é o `external_id` da Notification, que o
dispatch também binda. Requisição → fila → provider, tudo rastreável.
"""

from __future__ import annotations

import uuid

import structlog


class CorrelationIdMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        rid = (request.headers.get("X-Request-ID") or "").strip() or uuid.uuid4().hex[:16]
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=rid)
        request.request_id = rid
        response = self.get_response(request)
        response["X-Request-ID"] = rid
        return response
