"""health() do OmniRouter — /v1/models travado não pode virar 'gateway fora'.

Registrado em produção (2026-08-02): da LXC, GET /v1/models estoura timeout
enquanto POST /v1/chat/completions responde 200. O health precisa
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


def test_raiz_viva_e_ok_e_nao_toca_no_catalogo(monkeypatch):
    """/v1/models NUNCA é consultado: abortar o catálogo envenena a conexão
    seguinte (tarpit pós-abort medido em produção)."""
    urls: list[str] = []

    def _get(url, *a, **kw):
        urls.append(url)
        return _Resp(307)

    monkeypatch.setattr(ai_client.httpx, "get", _get)
    out = ai_client.health()
    assert out["ok"] is True
    assert "gateway de pé" in out.get("detail", "")
    assert all(not u.endswith("/v1/models") for u in urls)


def test_tudo_fora_e_fora_mesmo(monkeypatch):
    def _boom(*a, **kw):
        raise httpx.ConnectError("recusado")

    monkeypatch.setattr(ai_client.httpx, "get", _boom)
    out = ai_client.health()
    assert out["ok"] is False
