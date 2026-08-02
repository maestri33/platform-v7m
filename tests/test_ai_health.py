"""health() do OmniRouter — /v1/models travado não pode virar 'gateway fora'.

Registrado em produção (2026-08-02): da LXC, GET /v1/models estoura timeout
enquanto POST /v1/chat/completions e o TTS respondem 200. O health precisa
tentar o chat antes de declarar o serviço morto.
"""

from __future__ import annotations

import httpx
import pytest

from ai import client as ai_client


class _Resp:
    def __init__(self, status_code=200, data=None):
        self.status_code = status_code
        self._data = data or {}

    def json(self):
        return self._data


def test_raiz_e_catalogo_ok(monkeypatch):
    def _get(url, *a, **kw):
        if url.endswith("/v1/models"):
            return _Resp(200, {"data": [1, 2, 3]})
        return _Resp(307)

    monkeypatch.setattr(ai_client.httpx, "get", _get)
    out = ai_client.health()
    assert out["ok"] is True and out["models"] == 3


def test_catalogo_pendurado_nao_derruba_o_ok(monkeypatch):
    """Cenário real de produção: raiz 307 em <0.2s, /v1/models estoura no body."""

    def _get(url, *a, **kw):
        if url.endswith("/v1/models"):
            raise httpx.ReadTimeout("body de 5k modelos pendurado")
        return _Resp(307)

    monkeypatch.setattr(ai_client.httpx, "get", _get)
    out = ai_client.health()
    assert out["ok"] is True
    assert "gateway de pé" in out.get("detail", "")


def test_tudo_fora_e_fora_mesmo(monkeypatch):
    def _boom(*a, **kw):
        raise httpx.ConnectError("recusado")

    monkeypatch.setattr(ai_client.httpx, "get", _boom)
    out = ai_client.health()
    assert out["ok"] is False
