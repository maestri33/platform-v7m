"""Webhook da Evolution: status de entrega, inbound e conexão.

O que estes testes protegem: `sent` significa apenas "o provedor aceitou". Quem
transforma isso em entregue/lido é o MESSAGES_UPDATE — e ele só encosta na linha
certa porque o envio guardou o `provider_message_id`.
"""

import json

import pytest

from channels.models import DRIVER_V2, AppWebhook, WhatsAppNumber
from notify.models import InboundEvent, Notification


@pytest.fixture
def numero(account):
    return WhatsAppNumber.objects.create(
        account=account, instance_name="testes", slug="principal",
        phone_number="554299999999", driver=DRIVER_V2, is_default=True,
    )


def _post(client, instance, payload):
    return client.post(
        f"/v1/webhook/evolution/{instance}", data=json.dumps(payload),
        content_type="application/json",
    )


def _notificacao(account, msg_id="BAE5F5A632EAE722"):
    return Notification.objects.create(
        account=account, caller="teste", recipient_phone="5542988887777",
        text="oi", provider_message_id=msg_id, whatsapp_status="sent", delivery_status="sent",
    )


@pytest.mark.django_db
def test_ack_promove_para_entregue_e_lido(client, account, numero):
    n = _notificacao(account)

    _post(client, "testes", {"event": "messages.update", "data": {
        "key": {"id": n.provider_message_id}, "status": "DELIVERY_ACK"}})
    n.refresh_from_db()
    assert n.delivery_status == "delivered"
    assert n.delivered_at is not None

    _post(client, "testes", {"event": "messages.update", "data": {
        "key": {"id": n.provider_message_id}, "status": "READ"}})
    n.refresh_from_db()
    assert n.delivery_status == "read"
    assert n.read_at is not None


@pytest.mark.django_db
def test_ack_atrasado_nao_rebaixa_status(client, account, numero):
    """ACK fora de ordem é comum; 'entregue' chegando depois de 'lido' é ruído."""
    n = _notificacao(account)
    n.delivery_status = "read"
    n.save()

    _post(client, "testes", {"event": "messages.update", "data": {
        "key": {"id": n.provider_message_id}, "status": "DELIVERY_ACK"}})
    n.refresh_from_db()
    assert n.delivery_status == "read"


@pytest.mark.django_db
def test_mensagem_recebida_vira_inbound_com_previa(client, account, numero):
    resp = _post(client, "testes", {"event": "messages.upsert", "data": {
        "key": {"id": "ABC123", "remoteJid": "554288887777@s.whatsapp.net", "fromMe": False},
        "message": {"conversation": "quero saber do curso"},
    }})
    assert resp.status_code == 200
    evento = InboundEvent.objects.get(wa_message_id="ABC123")
    assert evento.account_id == account.id
    assert evento.from_number == "554288887777"
    assert evento.preview == "quero saber do curso"


@pytest.mark.django_db
def test_mensagem_nossa_no_upsert_nao_vira_inbound(client, account, numero):
    """`fromMe` é eco do nosso próprio envio — vira ACK, não caixa de entrada."""
    n = _notificacao(account, "MEUENVIO1")
    _post(client, "testes", {"event": "messages.upsert", "data": {
        "key": {"id": "MEUENVIO1", "remoteJid": "5542988887777@s.whatsapp.net", "fromMe": True},
        "status": "DELIVERY_ACK",
    }})
    assert InboundEvent.objects.count() == 0
    n.refresh_from_db()
    assert n.delivery_status == "delivered"


@pytest.mark.django_db
def test_instancia_desconhecida_e_aceita_sem_erro(client, account):
    """Devolver erro faria a Evolution reenviar para sempre."""
    resp = _post(client, "nao-existe", {"event": "messages.upsert", "data": {}})
    assert resp.status_code == 200
    assert resp.json()["status"] == "ignored"


@pytest.mark.django_db
def test_connection_update_atualiza_status_do_numero(client, account, numero):
    _post(client, "testes", {"event": "connection.update", "data": {"state": "open"}})
    numero.refresh_from_db()
    assert numero.connection_status == "open"
    assert numero.status_checked_at is not None


@pytest.mark.django_db
def test_inbound_marca_forwarded_quando_ha_webhook(client, account, numero, monkeypatch):
    AppWebhook.objects.create(account=account, url="http://app.invalid/hook")
    monkeypatch.setattr("notify.outbound._enqueue", lambda *a, **k: None)

    _post(client, "testes", {"event": "messages.upsert", "data": {
        "key": {"id": "FWD1", "remoteJid": "554288887777@s.whatsapp.net", "fromMe": False},
        "message": {"conversation": "oi"},
    }})
    assert InboundEvent.objects.get(wa_message_id="FWD1").forwarded is True
