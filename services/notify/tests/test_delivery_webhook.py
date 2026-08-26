"""Webhook da Evolution: status de entrega, inbound e conexão.

O que estes testes protegem: `sent` significa apenas "o provedor aceitou". Quem
transforma isso em entregue/lido é o MESSAGES_UPDATE — e ele só encosta na linha
certa porque o envio guardou o `provider_message_id`.
"""

import json

import pytest

from channels.models import DRIVER_GO, AppWebhook, WhatsAppNumber
from notify.models import InboundEvent, Notification


@pytest.fixture
def numero(account):
    return WhatsAppNumber.objects.create(
        account=account, instance_name="testes", slug="principal",
        phone_number="554299999999", driver=DRIVER_GO, is_default=True,
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


# --- Dialeto GO (whatsmeow cru) — formatos medidos ao vivo em 2026-08-16 ---


@pytest.mark.django_db
def test_go_receipt_promove_para_entregue_e_lido(client, account, numero):
    """RECEIPT do GO: Type vazio é entrega, 'read' é leitura — em lote."""
    n = _notificacao(account, "AC756F99EF6D6723C26C4B3E76D6035A")

    _post(client, "testes", {"event": "Receipt", "data": {
        "Chat": "554288887777@s.whatsapp.net", "Type": "",
        "MessageIDs": [n.provider_message_id], "IsFromMe": False}})
    n.refresh_from_db()
    assert n.delivery_status == "delivered"

    _post(client, "testes", {"event": "Receipt", "data": {
        "Chat": "554288887777@s.whatsapp.net", "Type": "read",
        "MessageIDs": [n.provider_message_id], "IsFromMe": False}})
    n.refresh_from_db()
    assert n.delivery_status == "read"
    assert n.read_at is not None


@pytest.mark.django_db
def test_go_receipt_em_lote_promove_cada_mensagem(client, account, numero):
    a = _notificacao(account, "LOTADO1")
    b = _notificacao(account, "LOTADO2")
    _post(client, "testes", {"event": "Receipt", "data": {
        "Type": "read", "MessageIDs": [a.provider_message_id, b.provider_message_id]}})
    a.refresh_from_db()
    b.refresh_from_db()
    assert a.delivery_status == "read"
    assert b.delivery_status == "read"


@pytest.mark.django_db
def test_go_receipt_read_self_promove_e_ignora_desconhecidos(client, account, numero):
    """read-self é o dono lendo numa extensão; ID que não é nosso não pode dar erro."""
    n = _notificacao(account, "SELFREAD1")
    n.delivery_status = "delivered"
    n.save()

    _post(client, "testes", {"event": "Receipt", "data": {
        "Type": "read-self", "MessageIDs": ["NAOEXISTE", n.provider_message_id]}})
    n.refresh_from_db()
    assert n.delivery_status == "read"


@pytest.mark.django_db
def test_go_mensagem_crua_vira_inbound(client, account, numero):
    """MESSAGE cru do GO: id em Info.ID, texto em Message.conversation."""
    _post(client, "testes", {"event": "MESSAGE", "data": {
        "Info": {"ID": "A51D9B73197AD8E739770C53C161364E",
                 "Chat": "554288887777@s.whatsapp.net", "IsFromMe": False,
                 "PushName": "Fulano", "Timestamp": "2026-08-17T10:00:40-03:00"},
        "Message": {"conversation": "chegou pelo dialeto cru"},
    }})
    evento = InboundEvent.objects.get(wa_message_id="A51D9B73197AD8E739770C53C161364E")
    assert evento.from_number == "554288887777"
    assert evento.preview == "chegou pelo dialeto cru"


@pytest.mark.django_db
def test_go_mensagem_crua_nossa_nao_vira_inbound(client, account, numero):
    """MESSAGE com IsFromMe é eco do envio — nunca caixa de entrada."""
    _post(client, "testes", {"event": "MESSAGE", "data": {
        "Info": {"ID": "MEUCRU1", "Chat": "554288887777@s.whatsapp.net", "IsFromMe": True},
        "Message": {"conversation": "eco"},
    }})
    assert InboundEvent.objects.count() == 0


@pytest.mark.django_db
def test_go_mensagem_crua_com_media_gera_previa(client, account, numero):
    _post(client, "testes", {"event": "MESSAGE", "data": {
        "Info": {"ID": "MIDIA1", "Chat": "554288887777@s.whatsapp.net", "IsFromMe": False,
                 "MediaType": "image"},
        "Message": {"imageMessage": {"caption": "foto do contrato"}},
    }})
    assert InboundEvent.objects.get(wa_message_id="MIDIA1").preview == "foto do contrato"
