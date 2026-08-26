"""Recursos exclusivos da GO (B6) — poll de verdade, degradação honesta.

Resultado dos testes REAIS em produção (2026-08-02, destino de controle):
- /send/poll  → ENTREGUE (enquete clicável chegou);
- /send/location → ENTREGUE (pin chegou);
- /send/button → servidor WhatsApp recusa (erro 473);
- /send/list → servidor WhatsApp recusa (erro 405).
Interativas (button/list) exigem a Business API oficial — limitação do
WhatsApp, não do notify. O produto expõe o que funciona: poll.
"""

from __future__ import annotations

import json

import httpx
import pytest

from notify.models import Notification
from whatsapp.capabilities import order_chain
from whatsapp.evolution_go import EvolutionGoDriver

pytestmark = pytest.mark.django_db


async def test_send_poll_monta_o_payload_da_go():
    seen = {}

    async def handler(request):
        seen["path"] = request.url.path
        seen["body"] = json.loads(request.content)
        return httpx.Response(200, json={"data": {"Info": {"ID": "P1"}}})

    async with EvolutionGoDriver(
        base_url="http://go.test", api_key="tok", transport=httpx.MockTransport(handler)
    ) as driver:
        await driver.send_poll("5543996648750", "Funciona?", ["Sim", "Não"], selectable_count=1)

    assert seen["path"] == "/send/poll"
    assert seen["body"] == {
        "number": "5543996648750",
        "question": "Funciona?",
        "options": ["Sim", "Não"],
        "maxAnswer": 1,
        "selectableCount": 1,
    }


def test_poll_e_go_first_no_mapa():
    assert order_chain(["evolution-v2", "evolution-go"], feature="poll")[0] == "evolution-go"
    assert order_chain(["evolution-v2", "evolution-go"], feature="location")[0] == "evolution-go"


def test_notify_aceita_options_poll(client, account):
    resp = client.post(
        "/notify",
        data={
            "content": "Escolhe aí",
            "account_id": account.slug,
            "whatsapp": "5543996648750",
            "options": {"poll": {"question": "Tá voando?", "options": ["Sim", "Reiva"]}},
        },
        content_type="application/json",
    )
    assert resp.status_code == 200
    n = Notification.objects.get(external_id=resp.json()["external_id"])
    assert n.extra["poll"]["question"] == "Tá voando?"
    assert n.extra["poll"]["options"] == ["Sim", "Reiva"]


def test_dispatch_envia_poll_e_degrada_para_texto(account, monkeypatch):
    from notify import dispatch as dispatch_mod

    monkeypatch.setattr(dispatch_mod.settings, "TEST_MODE", False)
    from ai import adapt as ai_adapt

    monkeypatch.setattr(ai_adapt, "enabled_for", lambda a: False)

    class _PollDriver:
        name = "evolution-go"
        last_reason = ""

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return None

        async def resolve_br_number(self, phone):
            return phone

        async def send_poll(self, number, question, options, **kw):
            return {"key": {"id": "POLL1"}}

    monkeypatch.setattr(
        dispatch_mod, "_get_whatsapp_driver", lambda notif, **kw: _PollDriver()
    )
    n = Notification.objects.create(
        account=account, caller="t", recipient_phone="5543996648750", text="x",
        want_whatsapp=True, want_email=False, email_status="skipped",
        extra={"poll": {"question": "Q?", "options": ["A", "B"]}},
    )
    dispatch_mod.dispatch(n.id)
    n.refresh_from_db()
    assert n.whatsapp_status == "sent"

    # degradação: driver sem send_poll → texto numerado
    class _TextoDriver(_PollDriver):
        name = "evolution-v2"

        async def send_poll(self, *a, **kw):
            raise NotImplementedError("sem poll")

        async def send_text(self, number, text, **kw):
            assert "1. A" in text and "2. B" in text
            return {"key": {"id": "TXT1"}}

    monkeypatch.setattr(
        dispatch_mod, "_get_whatsapp_driver", lambda notif, **kw: _TextoDriver()
    )
    n2 = Notification.objects.create(
        account=account, caller="t", recipient_phone="5543996648750", text="x",
        want_whatsapp=True, want_email=False, email_status="skipped",
        extra={"poll": {"question": "Q?", "options": ["A", "B"]}},
    )
    dispatch_mod.dispatch(n2.id)
    n2.refresh_from_db()
    assert n2.whatsapp_status == "sent"


async def test_send_pix_button_monta_payload_da_go():
    seen = {}

    async def handler(request):
        seen["path"] = request.url.path
        seen["body"] = json.loads(request.content)
        return httpx.Response(200, json={"data": {"Info": {"ID": "PIX1"}}})

    async with EvolutionGoDriver(
        base_url="http://go.test", api_key="tok", transport=httpx.MockTransport(handler)
    ) as driver:
        await driver.send_pix_button(
            "5543996648750",
            "Pagar Boleto",
            "Chave de teste",
            "Notify",
            name="V7M Loja",
            key_type="cpf",
            key="11144477735",
        )

    assert seen["path"] == "/send/button"
    assert seen["body"]["number"] == "5543996648750"
    assert seen["body"]["buttons"][0] == {
        "type": "pix",
        "currency": "BRL",
        "name": "V7M Loja",
        "keyType": "cpf",
        "key": "11144477735",
    }


async def test_send_carousel_monta_payload_da_go():
    seen = {}

    async def handler(request):
        seen["path"] = request.url.path
        seen["body"] = json.loads(request.content)
        return httpx.Response(200, json={"data": {"Info": {"ID": "CAR1"}}})

    cards = [
        {
            "header": {"title": "Curso 1", "imageUrl": "https://img.test/1.jpg"},
            "body": {"text": "Desc 1"},
            "buttons": [{"type": "URL", "displayText": "Ver", "id": "https://site.test"}],
        }
    ]

    async with EvolutionGoDriver(
        base_url="http://go.test", api_key="tok", transport=httpx.MockTransport(handler)
    ) as driver:
        await driver.send_carousel("5543996648750", cards, body="Novidades", footer="V7M")

    assert seen["path"] == "/send/carousel"
    assert seen["body"]["cards"] == cards
    assert seen["body"]["body"] == "Novidades"


async def test_send_contact_monta_payload_da_go():
    seen = {}

    async def handler(request):
        seen["path"] = request.url.path
        seen["body"] = json.loads(request.content)
        return httpx.Response(200, json={"data": {"Info": {"ID": "CNT1"}}})

    async with EvolutionGoDriver(
        base_url="http://go.test", api_key="tok", transport=httpx.MockTransport(handler)
    ) as driver:
        await driver.send_contact("5543996648750", "Suporte V7M", "5511920062177", organization="V7M")

    assert seen["path"] == "/send/contact"
    assert seen["body"]["vcard"] == {
        "fullName": "Suporte V7M",
        "phone": "5511920062177",
        "organization": "V7M",
    }


def test_notify_aceita_options_pix_button(client, account):
    resp = client.post(
        "/notify",
        data={
            "content": "Pague seu boleto com desconto",
            "account_id": account.slug,
            "whatsapp": "5543996648750",
            "options": {
                "pix": {
                    "key": "financeiro@v7m.com.br",
                    "key_type": "email",
                    "name": "V7M Financeiro",
                }
            },
        },
        content_type="application/json",
    )
    assert resp.status_code == 200
    n = Notification.objects.get(external_id=resp.json()["external_id"])
    assert n.extra["pix"]["key"] == "financeiro@v7m.com.br"
    assert n.extra["pix"]["key_type"] == "email"


def test_notify_aceita_options_location_e_contact(client, account):
    resp_loc = client.post(
        "/notify",
        data={
            "content": "Local da reunião",
            "account_id": account.slug,
            "whatsapp": "5543996648750",
            "options": {
                "location": {
                    "latitude": -23.5505,
                    "longitude": -46.6333,
                    "name": "Sede",
                    "address": "Av Paulista",
                }
            },
        },
        content_type="application/json",
    )
    assert resp_loc.status_code == 200
    n_loc = Notification.objects.get(external_id=resp_loc.json()["external_id"])
    assert n_loc.extra["location"]["latitude"] == -23.5505

    resp_cnt = client.post(
        "/notify",
        data={
            "content": "Contato do suporte",
            "account_id": account.slug,
            "whatsapp": "5543996648750",
            "options": {
                "contact": {
                    "full_name": "Victor",
                    "phone": "5543996648750",
                    "organization": "Notify",
                }
            },
        },
        content_type="application/json",
    )
    assert resp_cnt.status_code == 200
    n_cnt = Notification.objects.get(external_id=resp_cnt.json()["external_id"])
    assert n_cnt.extra["contact"]["full_name"] == "Victor"


def test_notify_aceita_options_carousel(client, account):
    resp = client.post(
        "/notify",
        data={
            "content": "Veja as ofertas",
            "account_id": account.slug,
            "whatsapp": "5543996648750",
            "options": {
                "carousel": {
                    "body": "Destaques do mês",
                    "footer": "V7M",
                    "cards": [
                        {
                            "title": "Produto 1",
                            "image_url": "https://img.test/p1.jpg",
                            "text": "Super oferta 1",
                            "buttons": [
                                {"type": "URL", "display_text": "Comprar", "url": "https://v7m.com.br"}
                            ],
                        }
                    ],
                }
            },
        },
        content_type="application/json",
    )
    assert resp.status_code == 200
    n = Notification.objects.get(external_id=resp.json()["external_id"])
    assert len(n.extra["carousel"]["cards"]) == 1
    assert n.extra["carousel"]["cards"][0]["title"] == "Produto 1"
