"""POST /notify — contrato da spec (E1/E2).

Regra travada: canal decidido pela PRESENÇA do destino. Ambos → 2 canais; um →
1; nenhum → 400 com mensagem clara. Auth obrigatória.
"""

import pytest

from notify.models import Notification

pytestmark = pytest.mark.django_db

JSON = "application/json"


def _post(client, headers=None, **payload):
    return client.post("/notify", data=payload, content_type=JSON, headers=headers or {})


def test_sem_api_key_e_401(client):
    resp = _post(client, content="oi", whatsapp="5542999990000")
    assert resp.status_code == 401


def test_ambos_destinos_saem_nos_dois_canais(client, auth_headers):
    resp = _post(
        client,
        auth_headers,
        content="Seu pedido saiu para entrega.",
        whatsapp="5542999990000",
        email="dest@example.com",
        options={"run_sync": True},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert sorted(body["channels"]) == ["email", "whatsapp"]

    n = Notification.objects.get(external_id=body["external_id"])
    assert n.want_whatsapp and n.want_email
    assert n.whatsapp_status == "sent" and n.email_status == "sent"  # dry-run TEST_MODE


def test_so_whatsapp(client, auth_headers):
    resp = _post(client, auth_headers, content="oi", whatsapp="5542999990000")
    assert resp.status_code == 200
    n = Notification.objects.get(external_id=resp.json()["external_id"])
    assert n.want_whatsapp and not n.want_email
    assert n.email_status == "skipped"


def test_so_email(client, auth_headers):
    resp = _post(client, auth_headers, content="oi", email="a@b.com")
    assert resp.status_code == 200
    n = Notification.objects.get(external_id=resp.json()["external_id"])
    assert n.want_email and not n.want_whatsapp
    assert n.whatsapp_status == "skipped"


def test_nenhum_destino_e_400_claro(client, auth_headers):
    resp = _post(client, auth_headers, content="oi")
    assert resp.status_code == 400
    assert "destino" in resp.json()["detail"]


def test_content_vazio_e_400(client, auth_headers):
    resp = _post(client, auth_headers, content="  ", whatsapp="5542999990000")
    assert resp.status_code == 400


def test_idempotencia_via_options_external_id(client, auth_headers):
    kw = dict(content="oi", whatsapp="5542999990000", options={"external_id": "pedido-77"})
    first = _post(client, auth_headers, **kw).json()["external_id"]
    second = _post(client, auth_headers, **kw).json()["external_id"]
    assert first == second
    assert Notification.objects.filter(idempotency_key="pedido-77").count() == 1


def test_tts_liga_nota_de_voz(client, auth_headers):
    resp = _post(
        client,
        auth_headers,
        content="oi",
        whatsapp="5542999990000",
        options={"tts": True, "gender": "M"},
    )
    n = Notification.objects.get(external_id=resp.json()["external_id"])
    assert n.want_tts and n.gender == "M"
