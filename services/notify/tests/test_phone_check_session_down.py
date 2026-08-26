"""`/v1/phone/check` precisa distinguir "verificador caiu" de "número não tem WhatsApp".

Antes, sessão fora estourava como 500 genérico e o funil não tinha como saber se
devia retentar ou seguir. Agora é 503 estruturado.
"""

from __future__ import annotations

import pytest

from accounts.models import Account
from channels.models import DRIVER_GO, DRIVER_GO, WhatsAppNumber
from tests.conftest import RAW_KEY  # noqa: F401  (fixtures usam a mesma key)
from whatsapp.driver import WhatsAppDriver
from whatsapp.errors import WhatsAppSessionDown

pytestmark = pytest.mark.django_db


class _Down(WhatsAppDriver):
    async def send_text(self, *a, **k): ...
    async def send_media(self, *a, **k): ...
    async def send_audio(self, *a, **k): ...

    async def check_numbers(self, numbers):
        raise WhatsAppSessionDown(503, "no active session found")


class _Up(WhatsAppDriver):
    async def send_text(self, *a, **k): ...
    async def send_media(self, *a, **k): ...
    async def send_audio(self, *a, **k): ...

    async def check_numbers(self, numbers):
        return [{"number": n, "exists": n.endswith("9")} for n in numbers]


def test_sessao_fora_responde_503_estruturado(client, auth_headers, monkeypatch):
    monkeypatch.setattr("whatsapp.factory.get_driver", lambda *_a, **_k: _Down())

    resp = client.post(
        "/v1/phone/check",
        data={"numbers": ["5542999999999"]},
        content_type="application/json",
        headers=auth_headers,
    )

    assert resp.status_code == 503
    assert "whatsapp_session_down" in resp.content.decode()


def test_numero_sem_whatsapp_continua_200_com_exists_false(client, auth_headers, monkeypatch):
    monkeypatch.setattr("whatsapp.factory.get_driver", lambda *_a, **_k: _Up())

    resp = client.post(
        "/v1/phone/check",
        data={"numbers": ["5542999999999", "5542999999990"]},
        content_type="application/json",
        headers=auth_headers,
    )

    assert resp.status_code == 200
    assert resp.json() == [
        {"number": "5542999999999", "exists": True},
        {"number": "5542999999990", "exists": False},
    ]


def test_usa_o_numero_default_da_conta(account):
    """Sem is_default marcado, cai no primeiro número da conta — nunca em None."""
    outra = Account.objects.create(slug="outra", name="Outra")
    WhatsAppNumber.objects.create(
        account=outra, slug="a", instance_name="outra", driver=DRIVER_GO
    )
    escolhido = WhatsAppNumber.objects.create(
        account=account,
        slug="unico",
        instance_name="testes",
        driver=DRIVER_GO,
        fallback_driver=DRIVER_GO,
        is_default=False,
    )

    achado = (
        WhatsAppNumber.objects.filter(account=account, is_default=True).first()
        or WhatsAppNumber.objects.filter(account=account).first()
    )
    assert achado == escolhido
    assert achado.driver_chain == [DRIVER_GO]
