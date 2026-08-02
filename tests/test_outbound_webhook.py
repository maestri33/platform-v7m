"""Entrega para o webhook do app — assinatura e falha que reagenda."""

import hashlib
import hmac
import json

import httpx
import pytest

from channels.models import AppWebhook
from notify import outbound
from notify.models import Notification


class _FakeResp:
    def __init__(self, status_code=200, text="ok"):
        self.status_code = status_code
        self.text = text


@pytest.mark.django_db
def test_corpo_vai_assinado_quando_ha_segredo(account, monkeypatch):
    AppWebhook.objects.create(account=account, url="http://app.invalid/hook", secret="s3gr3d0")
    capturado = {}

    def _fake_post(url, content=None, headers=None, timeout=None):
        capturado["url"] = url
        capturado["body"] = content
        capturado["headers"] = headers
        return _FakeResp()

    monkeypatch.setattr(httpx, "post", _fake_post)
    outbound.deliver(account.id, "status", {"ok": True})

    esperado = "sha256=" + hmac.new(b"s3gr3d0", capturado["body"], hashlib.sha256).hexdigest()
    assert capturado["headers"]["X-Notify-Signature"] == esperado
    assert capturado["headers"]["X-Notify-Event"] == "status"
    assert json.loads(capturado["body"])["event"] == "status"


@pytest.mark.django_db
def test_sem_segredo_nao_assina(account, monkeypatch):
    AppWebhook.objects.create(account=account, url="http://app.invalid/hook")
    capturado = {}
    monkeypatch.setattr(
        httpx, "post",
        lambda url, content=None, headers=None, timeout=None: (capturado.update(headers=headers), _FakeResp())[1],
    )
    outbound.deliver(account.id, "status", {"ok": True})
    assert "X-Notify-Signature" not in capturado["headers"]


@pytest.mark.django_db
def test_resposta_de_erro_agenda_retry_com_backoff(account, monkeypatch):
    """Contrato novo (P2): falha NÃO relança — agenda a próxima tentativa."""
    hook = AppWebhook.objects.create(account=account, url="http://app.invalid/hook")
    monkeypatch.setattr(
        httpx, "post",
        lambda *a, **k: _FakeResp(500, "boom"),
    )
    agendou = []
    monkeypatch.setattr(outbound, "_schedule_retry", lambda *a: agendou.append(a))
    outbound.deliver(account.id, "status", {"ok": True})  # sem raise
    hook.refresh_from_db()
    assert hook.last_status == 500
    assert "boom" in hook.last_error
    assert len(agendou) == 1


@pytest.mark.django_db
def test_evento_nao_assinado_pela_conta_nao_e_entregue(account, monkeypatch):
    AppWebhook.objects.create(account=account, url="http://app.invalid/hook", events="status")
    chamado = []
    monkeypatch.setattr(httpx, "post", lambda *a, **k: chamado.append(1) or _FakeResp())
    outbound.deliver(account.id, "inbound", {"x": 1})
    assert chamado == []


@pytest.mark.django_db
def test_payload_de_status_traz_entrega_e_driver(account):
    n = Notification.objects.create(
        account=account, caller="t", recipient_phone="5542988887777", text="oi",
        delivery_status="delivered", driver_used="evolution-go", provider_message_id="X1",
    )
    payload = outbound.status_payload(n)
    assert payload["delivery_status"] == "delivered"
    assert payload["driver_used"] == "evolution-go"
    assert payload["provider_message_id"] == "X1"
