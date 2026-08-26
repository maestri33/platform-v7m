"""MCP do notify — handshake, resolução de conta SEM key e ferramentas.

Modelo novo (decisão do Chefe): key é tolerada mas não exigida. A conta vem do
Bearer válido (compat) > `account_id` nos arguments > conta default.
"""

import json

import pytest

from accounts.models import Account, ApiKey
from channels.models import DRIVER_GO, WhatsAppNumber
from notify.models import InboundEvent, Notification, Template
from tests.conftest import RAW_KEY


def _rpc(client, method, params=None, headers=None, req_id=1):
    body = {"jsonrpc": "2.0", "id": req_id, "method": method}
    if params is not None:
        body["params"] = params
    return client.post(
        "/mcp", data=json.dumps(body), content_type="application/json", **(headers or {})
    )


def _auth(headers):
    return {"HTTP_AUTHORIZATION": headers["Authorization"]}


def _payload(resp):
    return json.loads(resp.json()["result"]["content"][0]["text"])


@pytest.mark.django_db
def test_initialize_nao_exige_key(client):
    resp = _rpc(client, "initialize")
    assert resp.status_code == 200
    result = resp.json()["result"]
    assert result["serverInfo"]["name"] == "notify"
    assert "tools" in result["capabilities"]


@pytest.mark.django_db
def test_tools_list_nao_exige_key(client, account):
    resp = _rpc(client, "tools/list")
    assert resp.status_code == 200
    nomes = {t["name"] for t in resp.json()["result"]["tools"]}
    assert {"notify_send", "notify_status", "notify_inbox", "notify_channels"} <= nomes


@pytest.mark.django_db
def test_call_sem_key_usa_account_id(client, account):
    resp = _rpc(client, "tools/call", {
        "name": "notify_send",
        "arguments": {"text": "oi", "phone": "5542988887777", "account_id": account.slug},
    })
    assert resp.status_code == 200
    data = _payload(resp)
    assert Notification.objects.filter(account=account, external_id=data["external_id"]).exists()


@pytest.mark.django_db
def test_call_sem_key_auto_provisiona_default(client, account):
    resp = _rpc(client, "tools/call", {"name": "notify_channels", "arguments": {}})
    assert resp.status_code == 200
    assert _payload(resp)["app"] == "default"


@pytest.mark.django_db
def test_send_cria_notificacao_da_conta_da_key(client, account, auth_headers):
    resp = _rpc(client, "tools/call", {
        "name": "notify_send",
        "arguments": {"text": "oi", "phone": "5542988887777", "external_id": "mcp-1"},
    }, headers=_auth(auth_headers))
    data = _payload(resp)
    n = Notification.objects.get(external_id=data["external_id"])
    assert n.account_id == account.id
    assert n.caller == "mcp"


@pytest.mark.django_db
def test_send_sem_destino_volta_como_erro_de_ferramenta(client, account, auth_headers):
    """Erro de uso é resultado com isError, não falha de protocolo."""
    resp = _rpc(client, "tools/call", {
        "name": "notify_send", "arguments": {"text": "oi"},
    }, headers=_auth(auth_headers))
    assert resp.json()["result"]["isError"] is True
    assert "phone ou email" in _payload(resp)["error"]


@pytest.mark.django_db
def test_uma_conta_nao_le_a_notificacao_da_outra(client, account, auth_headers):
    outra = Account.objects.create(slug="outro-app", name="Outro")
    alheia = Notification.objects.create(
        account=outra, caller="x", recipient_phone="5542911112222", text="segredo"
    )
    resp = _rpc(client, "tools/call", {
        "name": "notify_status", "arguments": {"external_id": str(alheia.external_id)},
    }, headers=_auth(auth_headers))
    assert resp.json()["result"]["isError"] is True
    assert "não encontrada" in _payload(resp)["error"]


@pytest.mark.django_db
def test_inbox_lista_recebidas_da_conta(client, account, auth_headers):
    InboundEvent.objects.create(
        account=account, instance_name="testes", wa_message_id="M1",
        from_number="554288887777", preview="oi, tudo bem?",
    )
    resp = _rpc(client, "tools/call", {"name": "notify_inbox", "arguments": {}},
                headers=_auth(auth_headers))
    itens = _payload(resp)["items"]
    assert itens[0]["from"] == "554288887777"
    assert itens[0]["text"] == "oi, tudo bem?"


@pytest.mark.django_db
def test_channels_descreve_o_que_o_app_tem(client, account, auth_headers):
    WhatsAppNumber.objects.create(
        account=account, instance_name="testes", slug="principal",
        phone_number="554299999999", driver=DRIVER_GO, is_default=True,
    )
    resp = _rpc(client, "tools/call", {"name": "notify_channels", "arguments": {}},
                headers=_auth(auth_headers))
    data = _payload(resp)
    assert data["app"] == account.slug
    assert data["whatsapp"][0]["instance"] == "testes"
    assert data["sms"]["available"] is False


@pytest.mark.django_db
def test_template_upsert_grava_na_conta(client, account, auth_headers):
    resp = _rpc(client, "tools/call", {
        "name": "notify_template_upsert",
        "arguments": {"event": "boas-vindas", "body_md": "Olá {nome}!", "channels": "whatsapp"},
    }, headers=_auth(auth_headers))
    assert _payload(resp)["created"] is True
    assert Template.objects.get(account=account, event="boas-vindas").body_md == "Olá {nome}!"


@pytest.mark.django_db
def test_ferramenta_desconhecida_e_erro_de_protocolo(client, account, auth_headers):
    resp = _rpc(client, "tools/call", {"name": "nao_existe", "arguments": {}},
                headers=_auth(auth_headers))
    assert resp.json()["error"]["code"] == -32602


@pytest.mark.django_db
def test_key_inativa_nao_da_acesso_a_conta(client, account, auth_headers):
    """Key revogada não escolhe a conta antiga: cai no default automático."""
    ApiKey.objects.filter(account=account).update(is_active=False)
    resp = _rpc(client, "tools/call", {"name": "notify_channels", "arguments": {}},
                headers=_auth(auth_headers))
    assert resp.status_code == 200
    assert _payload(resp)["app"] == "default"
