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


def test_models_ok_e_o_caminho_feliz(monkeypatch):
    monkeypatch.setattr(
        ai_client.httpx, "get", lambda *a, **kw: _Resp(200, {"data": [1, 2, 3]})
    )
    out = ai_client.health()
    assert out["ok"] is True and out["models"] == 3


def test_models_travado_mas_raiz_viva_e_ok(monkeypatch):
    """Cenário real de produção: /v1/models pendura, raiz responde 307."""
    calls = {"n": 0}

    def _get(url, *a, **kw):
        calls["n"] += 1
        if url.endswith("/v1/models"):
            raise httpx.ReadTimeout("models pendurado")
        return _Resp(307)

    monkeypatch.setattr(ai_client.httpx, "get", _get)
    out = ai_client.health()
    assert out["ok"] is True
    assert "gateway de pé" in out.get("detail", "")
    assert calls["n"] == 2


def test_tudo_fora_e_fora_mesmo(monkeypatch):
    def _boom(*a, **kw):
        raise httpx.ConnectError("recusado")

    monkeypatch.setattr(ai_client.httpx, "get", _boom)
    out = ai_client.health()
    assert out["ok"] is False
