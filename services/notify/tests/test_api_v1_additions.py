"""Fase 2 — S1..S4: aditivos na API v1 (run_sync, NotificationOut ampliado,
lookup tolerante por external_id/idempotency_key, overrides do send-event)."""

import pytest

from accounts.models import Account
from notify.models import Notification, Template

pytestmark = pytest.mark.django_db

JSON = "application/json"


def _send(client, headers, **extra):
    payload = {"text": "olá", "caller": "pytest", "phone": "5511999990000", **extra}
    return client.post("/v1/send", data=payload, content_type=JSON, headers=headers)


def _template(account, event="teste.evento", **extra):
    defaults = {"body_md": "Olá {nome}!", "channels": "whatsapp,email"}
    defaults.update(extra)
    return Template.objects.create(account=account, event=event, **defaults)


# ── S1: run_sync ────────────────────────────────────────────────────────────

def test_send_run_sync_despacha_inline(client, auth_headers):
    resp = _send(client, auth_headers, run_sync=True)
    assert resp.status_code == 200
    n = Notification.objects.get(external_id=resp.json()["external_id"])
    # TEST_MODE: dispatch dry-run marcou como sent — prova que rodou inline
    assert n.whatsapp_status == "sent"
    assert n.attempts == 1


def test_send_sem_run_sync_continua_async(client, auth_headers):
    # payload antigo (sem run_sync) segue válido e assíncrono
    resp = _send(client, auth_headers)
    assert resp.status_code == 200
    n = Notification.objects.get(external_id=resp.json()["external_id"])
    assert n.whatsapp_status == "pending"
    assert n.attempts == 0


def test_send_event_run_sync(client, auth_headers, account):
    _template(account)
    resp = client.post(
        "/v1/send-event",
        data={"event": "teste.evento", "phone": "5511999990000", "run_sync": True},
        content_type=JSON,
        headers=auth_headers,
    )
    assert resp.status_code == 200
    n = Notification.objects.get(external_id=resp.json()["external_id"])
    assert n.whatsapp_status == "sent"
    assert n.attempts == 1


# ── S2: NotificationOut ampliado + filtros de status ────────────────────────

def test_notifications_expoe_campos_novos(client, auth_headers):
    resp = _send(
        client,
        auth_headers,
        email="a@b.com",
        email_channel=True,
        title="Título",
        subject="Assunto",
        media_url="https://x/y.png",
        gender="F",
        external_id="chave-cliente-1",
    )
    assert resp.status_code == 200

    resp = client.get("/v1/notifications?limit=1", headers=auth_headers)
    assert resp.status_code == 200
    item = resp.json()[0]
    # campos antigos preservados
    for k in ("external_id", "caller", "recipient_phone", "recipient_email",
              "whatsapp_status", "email_status", "attempts", "created_at"):
        assert k in item
    # campos novos
    assert item["text"] == "olá"
    assert item["title"] == "Título"
    assert item["subject"] == "Assunto"
    assert item["idempotency_key"] == "chave-cliente-1"
    assert item["media_url"] == "https://x/y.png"
    assert item["media_type"] == "image"
    assert item["gender"] == "F"
    assert item["mail_template"] == "default"
    assert item["want_whatsapp"] is True
    assert item["want_email"] is True
    assert item["whatsapp_error"] is None
    assert item["email_error"] is None


def test_filtros_por_status(client, auth_headers):
    sent_id = _send(client, auth_headers, run_sync=True).json()["external_id"]
    pending_id = _send(client, auth_headers).json()["external_id"]

    resp = client.get("/v1/notifications?whatsapp_status=sent", headers=auth_headers)
    assert [i["external_id"] for i in resp.json()] == [sent_id]

    resp = client.get("/v1/notifications?whatsapp_status=pending", headers=auth_headers)
    assert [i["external_id"] for i in resp.json()] == [pending_id]

    # ambos sem canal email → skipped
    resp = client.get("/v1/notifications?email_status=skipped", headers=auth_headers)
    assert len(resp.json()) == 2


# ── S3: detail tolerante (UUID ou idempotency_key, escopado na conta) ───────

def test_detail_por_uuid(client, auth_headers):
    ext = _send(client, auth_headers).json()["external_id"]
    resp = client.get(f"/v1/notifications/{ext}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["external_id"] == ext


def test_detail_por_idempotency_key_nao_uuid(client, auth_headers):
    ext = _send(client, auth_headers, external_id="minha-chave-abc").json()["external_id"]
    resp = client.get("/v1/notifications/minha-chave-abc", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["external_id"] == ext
    assert body["idempotency_key"] == "minha-chave-abc"


def test_detail_nao_uuid_desconhecido_da_404(client, auth_headers):
    # antes: ValidationError não tratada → 500
    resp = client.get("/v1/notifications/nao-e-uuid", headers=auth_headers)
    assert resp.status_code == 404


def test_detail_escopado_na_conta(client, auth_headers):
    outra = Account.objects.create(slug="outra", name="Outra")
    n = Notification.objects.create(
        account=outra, caller="x", text="t", recipient_phone="551100000000",
        idempotency_key="chave-da-outra",
    )
    for eid in (str(n.external_id), "chave-da-outra"):
        resp = client.get(f"/v1/notifications/{eid}", headers=auth_headers)
        assert resp.status_code == 404


# ── S4: channels_override no send-event ──────────────────────────────────────

def _send_event(client, headers, **extra):
    payload = {"event": "teste.evento", "phone": "5511999990000", **extra}
    return client.post("/v1/send-event", data=payload, content_type=JSON, headers=headers)


def test_channels_override_substitui_canais(client, auth_headers, account):
    _template(account)  # channels whatsapp,email
    resp = _send_event(client, auth_headers, email="a@b.com", channels_override=["email"])
    assert resp.status_code == 200
    n = Notification.objects.get(external_id=resp.json()["external_id"])
    assert n.want_email is True
    assert n.want_whatsapp is False
    assert n.recipient_phone is None
    assert n.recipient_email == "a@b.com"


def test_channels_override_sem_destino_da_404(client, auth_headers, account):
    _template(account)
    resp = _send_event(client, auth_headers, channels_override=["email"])  # só phone
    assert resp.status_code == 404


def test_send_event_evento_inexistente_da_404(client, auth_headers, account):
    """Evento que NUNCA existiu (nenhum Template criado p/ ele) → 404 com o shape de erro padrão."""
    resp = _send_event(client, auth_headers, event="evento.jamais.criado")
    assert resp.status_code == 404
    body = resp.json()
    assert "detail" in body
    assert "evento.jamais.criado" in body["detail"]
    assert not Notification.objects.exists()


def test_send_event_trigger_inativo_da_404(client, auth_headers, account):
    """Template existe mas o Trigger está active=False → evento desligado sem código, 404."""
    from notify.models import Trigger

    t = _template(account, event="evento.desligado")
    Trigger.objects.create(template=t, active=False)

    resp = _send_event(client, auth_headers, event="evento.desligado")
    assert resp.status_code == 404
    body = resp.json()
    assert "detail" in body
    assert not Notification.objects.exists()


def test_send_event_payload_antigo_segue_valido(client, auth_headers, account):
    _template(account)
    resp = _send_event(client, auth_headers, nome="Maria")
    assert resp.status_code == 200
    n = Notification.objects.get(external_id=resp.json()["external_id"])
    assert n.text == "Olá Maria!"
    assert n.whatsapp_status == "pending"
