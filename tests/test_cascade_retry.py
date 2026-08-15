"""Retry/backoff da cascata + mapa de capacidades (B3/B4/B5).

O que estes testes travam:
- sessão fora é retentada N vezes com backoff exponencial ANTES do fallback;
- erro de negócio continua sem retry nenhum;
- `last_reason` conta por que a entrega saiu por onde saiu (persistível);
- feature GO-first reordena a cadeia (voice_note → GO na frente da v2).
"""

from __future__ import annotations

import pytest
from django.test import override_settings

from whatsapp import cascade as cascade_mod
from whatsapp.capabilities import order_chain
from whatsapp.cascade import CascadeDriver
from whatsapp.driver import WhatsAppDriver
from whatsapp.errors import WhatsAppSessionDown, WhatsAppTransportError


class _FlakyDriver(WhatsAppDriver):
    """Falha `fail_times` vezes com sessão fora e depois responde."""

    def __init__(self, name: str, fail_times: int = 0, error: Exception | None = None):
        self.name = name
        self.fail_times = fail_times
        self.error = error or WhatsAppSessionDown(503, "no active session found")
        self.calls = 0

    async def send_text(self, number, text, **kw):
        self.calls += 1
        if self.calls <= self.fail_times:
            raise self.error
        return {"driver": self.name}

    async def send_media(self, *a, **kw):  # pragma: no cover - não usado aqui
        return {}

    async def send_audio(self, *a, **kw):  # pragma: no cover
        return {}

    async def check_numbers(self, numbers):  # pragma: no cover
        return []


def _cascade(*drivers) -> CascadeDriver:
    return CascadeDriver([(d.name, (lambda d=d: d)) for d in drivers])


@pytest.fixture
def sleeps(monkeypatch):
    """Captura os backoffs sem esperar de verdade."""
    waited: list[float] = []

    async def _fake_sleep(seconds):
        waited.append(seconds)

    monkeypatch.setattr(cascade_mod, "_sleep", _fake_sleep)
    return waited


@override_settings(WHATSAPP_RETRY_ATTEMPTS=3, WHATSAPP_RETRY_BACKOFF_S=0.4)
async def test_retry_no_mesmo_provedor_antes_do_fallback(sleeps):
    v2 = _FlakyDriver("v2", fail_times=2)  # cai 2x, responde na 3ª
    go = _FlakyDriver("go")

    async with _cascade(v2, go) as wa:
        result = await wa.send_text("5542999999999", "oi")

    assert result == {"driver": "v2"}
    assert v2.calls == 3 and go.calls == 0
    assert sleeps == [0.4, 0.8]  # backoff exponencial
    assert "retry ok" in wa.last_reason


@override_settings(WHATSAPP_RETRY_ATTEMPTS=2, WHATSAPP_RETRY_BACKOFF_S=0.4)
async def test_esgotou_retries_cai_pro_fallback_com_motivo(sleeps):
    v2 = _FlakyDriver("v2", fail_times=99)
    go = _FlakyDriver("go")

    async with _cascade(v2, go) as wa:
        result = await wa.send_text("5542999999999", "oi")

    assert result == {"driver": "go"}
    assert v2.calls == 2  # 1 + 1 retry
    assert wa.name == "go"
    assert wa.last_reason.startswith("fallback→go")
    assert "v2" in wa.last_reason  # motivo da queda registrado


@override_settings(WHATSAPP_RETRY_ATTEMPTS=3, WHATSAPP_RETRY_BACKOFF_S=0.4)
async def test_erro_de_negocio_nao_ganha_retry(sleeps):
    v2 = _FlakyDriver(
        "v2", fail_times=99, error=WhatsAppTransportError(400, "invalid media")
    )
    go = _FlakyDriver("go")

    with pytest.raises(WhatsAppTransportError):
        async with _cascade(v2, go) as wa:
            await wa.send_text("5542999999999", "oi")

    assert v2.calls == 1 and go.calls == 0 and sleeps == []


@override_settings(WHATSAPP_RETRY_ATTEMPTS=2, WHATSAPP_RETRY_BACKOFF_S=0.4)
async def test_todos_fora_registra_motivo_completo(sleeps):
    v2 = _FlakyDriver("v2", fail_times=99)
    go = _FlakyDriver("go", fail_times=99)

    cascade = _cascade(v2, go)
    with pytest.raises(WhatsAppSessionDown):
        async with cascade as wa:
            await wa.send_text("5542999999999", "oi")

    assert cascade.last_reason.startswith("todos fora:")
    assert "v2" in cascade.last_reason and "go" in cascade.last_reason


# ── mapa de capacidades ─────────────────────────────────────────────────────

def test_voice_note_manda_a_go_pra_frente():
    assert order_chain(["evolution-v2", "evolution-go"], feature="voice_note") == [
        "evolution-go",
        "evolution-v2",
    ]


def test_feature_desconhecida_mantem_a_ordem():
    chain = ["evolution-v2", "evolution-go"]
    assert order_chain(chain, feature="texto") == chain
    assert order_chain(chain, feature=None) == chain


def test_go_ausente_mantem_a_ordem_sem_inventar_provedor():
    assert order_chain(["evolution-v2"], feature="voice_note") == ["evolution-v2"]


@override_settings(WHATSAPP_GO_FIRST_FEATURES="balõezinhos, voice_note")
def test_lista_de_features_vem_do_env():
    assert order_chain(["evolution-v2", "evolution-go"], feature="balõezinhos")[0] == (
        "evolution-go"
    )
