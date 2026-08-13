"""Contrato público da API canônica de notificações."""

import pytest

from notify.models import Notification


pytestmark = pytest.mark.django_db


def test_cria_notificacao_assincrona_idempotente(client, auth_headers):
    response = client.post(
        "/v1/notifications",
        data={
            "external_id": "pedido-123",
            "text": "Pagamento confirmado.",
            "phone": "5511999990000",
            "channels": ["whatsapp"],
            "allow_alternate_sender": True,
        },
        content_type="application/json",
        headers=auth_headers,
    )

    assert response.status_code == 202
    assert response.json() == {
        "external_id": "pedido-123",
        "notification_id": response.json()["notification_id"],
        "status": "queued",
        "status_url": "/v1/notifications/pedido-123",
    }

    notification = Notification.objects.get(idempotency_key="pedido-123")
    assert str(notification.external_id) == response.json()["notification_id"]
    assert notification.text == "Pagamento confirmado."
    assert notification.want_whatsapp is True
    assert notification.want_email is False
    assert notification.want_tts is False
    assert notification.allow_alternate_sender is True

    repeated = client.post(
        "/v1/notifications",
        data={
            "external_id": "pedido-123",
            "text": "Este conteúdo não pode criar outro envio.",
            "phone": "5511999990000",
            "channels": ["whatsapp"],
            "allow_alternate_sender": True,
        },
        content_type="application/json",
        headers=auth_headers,
    )

    assert repeated.status_code == 202
    assert repeated.json()["notification_id"] == str(notification.external_id)
    assert Notification.objects.filter(idempotency_key="pedido-123").count() == 1
    notification.refresh_from_db()
    assert notification.text == "Pagamento confirmado."
