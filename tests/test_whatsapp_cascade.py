"""Driver por número + cascata v2 → GO.

O que estes testes travam:
- a row WhatsAppNumber manda no provedor (antes era uma env var global);
- só `WhatsAppSessionDown` provoca fallback — erro de negócio sobe direto,
  porque repetir num outro provedor não muda a resposta e pode duplicar envio;
- sessão fora vira 503 estruturado, nunca 500.
"""

from __future__ import annotations

import json

import httpx
import pytest
from django.test import override_settings

from accounts.models import Account
from channels.models import DRIVER_GO, DRIVER_V2, WhatsAppNumber
from whatsapp.cascade import CascadeDriver
from whatsapp.driver import WhatsAppDriver
from whatsapp.errors import WhatsAppSessionDown, WhatsAppTransportError
from whatsapp.evolution_go import EvolutionGoDriver, WhatsAppGoSessionDown
from whatsapp.factory import get_driver


# ── dublês ──────────────────────────────────────────────────────────────────

class _FakeDriver(WhatsAppDriver):
    def __init__(self, name: str, raises: Exception | None = None):
        self.name = name
        self.raises = raises
        self.calls: list[str] = []
        self.closed = False

    async def _maybe_raise(self, method: str):
        self.calls.append(method)
        if self.raises is not None:
            raise self.raises

    async def send_text(self, number, text, **kw):
        await self._maybe_raise("send_text")
        return {"driver": self.name}

    async def send_media(self, number, media_url, media_type, *, caption=None, **kw):
        await self._maybe_raise("send_media")
        return {"driver": self.name}

    async def send_audio(self, number, audio_url, **kw):
        await self._maybe_raise("send_audio")
        return {"driver": self.name}

    async def check_numbers(self, numbers):
        await self._maybe_raise("check_numbers")
        return [{"number": n, "exists": True} for n in numbers]

    async def aclose(self):
        self.closed = True


def _cascade(*drivers: _FakeDriver) -> CascadeDriver:
    return CascadeDriver([(d.name, (lambda d=d: d)) for d in drivers])


# ── cascata ─────────────────────────────────────────────────────────────────

async def test_cai_para_o_fallback_quando_a_sessao_esta_fora():
    v2 = _FakeDriver("v2", raises=WhatsAppSessionDown(503, "no active session found"))
    go = _FakeDriver("go")

    async with _cascade(v2, go) as wa:
        result = await wa.send_text("5542999999999", "oi")

    assert result == {"driver": "go"}
    assert v2.calls == ["send_text"] and go.calls == ["send_text"]


async def test_erro_de_negocio_nao_tenta_o_fallback():
    """Mídia recusada é resposta legítima: repetir na GO duplicaria o envio."""
    v2 = _FakeDriver("v2", raises=WhatsAppTransportError(400, "invalid media type"))
    go = _FakeDriver("go")

    with pytest.raises(WhatsAppTransportError):
        async with _cascade(v2, go) as wa:
            await wa.send_media("5542999999999", "http://x/y.bin", "document")

    assert go.calls == []


async def test_todos_fora_levanta_session_down():
    v2 = _FakeDriver("v2", raises=WhatsAppSessionDown(503, "connection closed"))
    go = _FakeDriver("go", raises=WhatsAppSessionDown(503, "no active session found"))

    with pytest.raises(WhatsAppSessionDown):
        async with _cascade(v2, go) as wa:
            await wa.check_numbers(["5542999999999"])


async def test_resolve_br_degrada_sem_derrubar_o_envio():
    """Resolver o 9º dígito é otimização: sessão fora devolve o número original."""
    v2 = _FakeDriver("v2", raises=WhatsAppSessionDown(503, "not logged in"))

    async with _cascade(v2) as wa:
        assert await wa.resolve_br_number("5542999999999") == "5542999999999"


async def test_fecha_todos_os_drivers_abertos():
    v2 = _FakeDriver("v2", raises=WhatsAppSessionDown(503, "logged out"))
    go = _FakeDriver("go")

    async with _cascade(v2, go) as wa:
        await wa.send_text("5542999999999", "oi")

    assert v2.closed and go.closed


# ── factory ─────────────────────────────────────────────────────────────────

def _number(**kw) -> WhatsAppNumber:
    account = Account.objects.create(slug=kw.pop("slug", "acme"), name="Acme")
    defaults = dict(
        account=account, slug="principal", instance_name="acme", driver=DRIVER_V2
    )
    defaults.update(kw)
    return WhatsAppNumber.objects.create(**defaults)


@pytest.mark.django_db
def test_row_sem_fallback_devolve_driver_unico():
    driver = get_driver(_number())
    assert not isinstance(driver, CascadeDriver)
    assert type(driver).__name__ == "EvolutionV2Driver"


@pytest.mark.django_db
def test_row_com_fallback_devolve_cascata_na_ordem_da_row():
    number = _number(driver=DRIVER_V2, fallback_driver=DRIVER_GO)
    assert number.driver_chain == [DRIVER_V2, DRIVER_GO]
    assert isinstance(get_driver(number), CascadeDriver)


@pytest.mark.django_db
def test_fallback_igual_ao_preferido_nao_duplica():
    number = _number(driver=DRIVER_GO, fallback_driver=DRIVER_GO)
    assert number.driver_chain == [DRIVER_GO]


@pytest.mark.django_db
@override_settings(WHATSAPP_FORCE_DRIVER=DRIVER_GO)
def test_trava_de_emergencia_ignora_a_row():
    driver = get_driver(_number(driver=DRIVER_V2, fallback_driver=DRIVER_GO))
    assert type(driver).__name__ == "EvolutionGoDriver"


@override_settings(WHATSAPP_DRIVER=DRIVER_GO, WHATSAPP_FORCE_DRIVER="")
def test_chamada_legada_por_string_ainda_funciona():
    assert type(get_driver("default")).__name__ == "EvolutionGoDriver"


@pytest.mark.django_db
def test_go_token_da_row_vai_criptografado_e_volta_em_claro():
    number = _number()
    number.set_go_token("tok-da-instancia")
    number.save()

    assert number.go_api_key() == "tok-da-instancia"
    assert WhatsAppNumber.objects.get(pk=number.pk).go_api_key() == "tok-da-instancia"


# ── detecção de sessão fora no driver GO ────────────────────────────────────

async def test_go_traduz_sessao_fora_em_session_down():
    async def handler(request):
        return httpx.Response(500, json={"error": "no active session found"})

    async with EvolutionGoDriver(
        base_url="http://go.test",
        api_key="tok",
        transport=httpx.MockTransport(handler),
    ) as driver:
        with pytest.raises(WhatsAppGoSessionDown):
            await driver.send_text("5542999999999", "oi")


async def test_go_mantem_erro_comum_como_erro_comum():
    async def handler(request):
        return httpx.Response(400, json={"error": "invalid number"})

    async with EvolutionGoDriver(
        base_url="http://go.test",
        api_key="tok",
        transport=httpx.MockTransport(handler),
    ) as driver:
        with pytest.raises(WhatsAppTransportError) as exc:
            await driver.send_text("abc", "oi")
        assert not isinstance(exc.value, WhatsAppSessionDown)


async def test_go_usa_o_token_da_instancia_e_nao_a_key_global():
    seen = {}

    async def handler(request):
        seen["apikey"] = request.headers["apikey"]
        seen["body"] = json.loads(request.content)
        return httpx.Response(200, json={"data": {"ok": True}})

    async with EvolutionGoDriver(
        base_url="http://go.test",
        api_key="tok-da-instancia",
        transport=httpx.MockTransport(handler),
    ) as driver:
        await driver.send_text("5542999999999", "oi")

    assert seen["apikey"] == "tok-da-instancia"
