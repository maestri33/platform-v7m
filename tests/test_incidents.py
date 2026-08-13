import pytest

from notify.incidents import record_incident
from notify.models import Incident, Notification


pytestmark = pytest.mark.django_db


def test_falhas_da_mesma_causa_sao_agrupadas(account):
    first = Notification.objects.create(
        account=account,
        caller="pytest",
        text="Primeira",
        recipient_phone="551100000001",
    )
    second = Notification.objects.create(
        account=account,
        caller="pytest",
        text="Segunda",
        recipient_phone="551100000002",
    )

    incident = record_incident(
        notification=first,
        channel="whatsapp",
        category="provider_unavailable",
        summary="Evolution v2 indisponível",
        detail="timeout durante envio",
    )
    repeated = record_incident(
        notification=second,
        channel="whatsapp",
        category="provider_unavailable",
        summary="Evolution v2 indisponível",
        detail="outra tentativa falhou",
    )

    assert repeated.pk == incident.pk
    incident.refresh_from_db()
    assert incident.status == "open"
    assert incident.occurrences == 2
    assert list(incident.notifications.order_by("id")) == [first, second]


def test_incidente_resolvido_reabre_quando_causa_recidiva(account):
    notification = Notification.objects.create(
        account=account,
        caller="pytest",
        text="Mensagem",
    )
    incident = record_incident(
        notification=notification,
        channel="email",
        category="smtp_rejected",
        summary="SMTP rejeitou mensagem",
        detail="550",
    )
    incident.status = Incident.STATUS_RESOLVED
    incident.save(update_fields=["status"])

    record_incident(
        notification=notification,
        channel="email",
        category="smtp_rejected",
        summary="SMTP rejeitou mensagem",
        detail="550 novamente",
    )

    incident.refresh_from_db()
    assert incident.status == "open"
    assert incident.occurrences == 2


def test_api_lista_e_resolve_ocorrencia(client, auth_headers, account):
    notification = Notification.objects.create(
        account=account,
        caller="pytest",
        text="Mensagem",
    )
    incident = record_incident(
        notification=notification,
        channel="tts",
        category="generation_failed",
        summary="TTS indisponível",
        detail="falha interna",
    )

    listing = client.get("/v1/incidents", headers=auth_headers)
    assert listing.status_code == 200
    assert listing.json()[0]["id"] == incident.id
    assert listing.json()[0]["status"] == "open"
    assert listing.json()[0]["occurrences"] == 1
    assert listing.json()[0]["notification_ids"] == [str(notification.external_id)]

    resolved = client.post(
        f"/v1/incidents/{incident.id}/resolve",
        headers=auth_headers,
    )
    assert resolved.status_code == 200
    incident.refresh_from_db()
    assert incident.status == Incident.STATUS_RESOLVED
