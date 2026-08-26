"""Testes para o receptor de Webhook do Stalwart Mail Server e padronização de webhooks."""

from __future__ import annotations

import pytest
from django.utils import timezone

from channels.models import AppWebhook, MailIdentity, SuppressedEmail, WhatsAppNumber
from notify.models import InboundEvent, Notification, WebhookEvent


@pytest.fixture
def mail_notif(account):
    return Notification.objects.create(
        account=account,
        recipient_email="cliente@example.com",
        want_email=True,
        email_status="sent",
        provider_message_id="msg-123456@v7m.org",
        text="Olá mundo",
    )


@pytest.mark.django_db
def test_stalwart_webhook_delivered_por_message_id(client, account, mail_notif, monkeypatch):
    pushed = []
    monkeypatch.setattr("notify.outbound.push_status", lambda n, stage=None: pushed.append((n.id, stage)))

    payload = {
        "event": "delivery.delivered",
        "messageId": "<msg-123456@v7m.org>",
        "recipient": "cliente@example.com",
        "details": "OK 250 gsmtp",
    }
    resp = client.post("/v1/webhook/stalwart", data=payload, content_type="application/json")
    assert resp.status_code == 200
    assert resp.json()["handled"] == "delivered"

    mail_notif.refresh_from_db()
    assert mail_notif.delivery_status == "delivered"
    assert mail_notif.delivered_at is not None
    assert len(pushed) == 1
    assert pushed[0] == (mail_notif.id, "delivery")


@pytest.mark.django_db
def test_stalwart_webhook_delivered_por_email_fallback(client, account, mail_notif, monkeypatch):
    pushed = []
    monkeypatch.setattr("notify.outbound.push_status", lambda n, stage=None: pushed.append((n.id, stage)))

    payload = {
        "event": "delivery.delivered",
        "recipient": "cliente@example.com",
        "details": "250 OK",
    }
    resp = client.post("/v1/webhook/email", data=payload, content_type="application/json")
    assert resp.status_code == 200
    assert resp.json()["handled"] == "delivered"

    mail_notif.refresh_from_db()
    assert mail_notif.delivery_status == "delivered"


@pytest.mark.django_db
def test_stalwart_webhook_failed_cria_suppressed_email(client, account, mail_notif, monkeypatch):
    pushed = []
    monkeypatch.setattr("notify.outbound.push_status", lambda n, stage=None: pushed.append((n.id, stage)))

    payload = {
        "event": "delivery.failed",
        "messageId": "msg-123456@v7m.org",
        "recipient": "cliente@example.com",
        "details": "550 5.1.1 User unknown",
    }
    resp = client.post("/v1/webhook/stalwart", data=payload, content_type="application/json")
    assert resp.status_code == 200
    assert resp.json()["handled"] == "bounced"

    mail_notif.refresh_from_db()
    assert mail_notif.email_status == "failed"
    assert "User unknown" in mail_notif.email_error

    sup = SuppressedEmail.objects.filter(account=account, email="cliente@example.com").first()
    assert sup is not None
    assert "User unknown" in sup.reason


@pytest.mark.django_db
def test_stalwart_webhook_inbound_message(client, account, monkeypatch):
    MailIdentity.objects.create(
        account=account,
        from_email="suporte@v7m.org",
        from_name="Suporte",
        is_default=True,
    )
    inbound_pushed = []
    monkeypatch.setattr("notify.outbound.push_inbound", lambda ev: inbound_pushed.append(ev.id))

    payload = {
        "event": "smtp.message-received",
        "sender": "suporte@v7m.org",
        "recipient": "contato@cliente.com",
        "details": "E-mail de resposta recebido",
        "data": {"subject": "Re: Suporte"},
    }
    resp = client.post("/v1/webhook/stalwart", data=payload, content_type="application/json")
    assert resp.status_code == 200
    assert resp.json()["handled"] == "inbound"

    event = InboundEvent.objects.filter(account=account, instance_name="stalwart").first()
    assert event is not None
    assert "E-mail de resposta recebido" in event.preview
    assert len(inbound_pushed) == 1


@pytest.mark.django_db
def test_whatsapp_webhook_padronizado_e_alias(client, account):
    WhatsAppNumber.objects.create(
        account=account,
        phone_number="5542999999999",
        instance_name="inst_test",
    )

    payload = {
        "event": "CONNECTION_UPDATE",
        "instance": "inst_test",
        "data": {"state": "open"},
    }
    # Rota padronizada
    resp1 = client.post("/v1/webhook/whatsapp/inst_test", data=payload, content_type="application/json")
    assert resp1.status_code == 200
    assert resp1.json()["handled"] == "connection"

    # Alias legado
    resp2 = client.post("/v1/webhook/evolution/inst_test", data=payload, content_type="application/json")
    assert resp2.status_code == 200
    assert resp2.json()["handled"] == "connection"
