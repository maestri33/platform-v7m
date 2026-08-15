"""Ciclo completo do webhook de status + rastro por tentativa (P1/P2).

O que estes testes travam:
- o aceite emite stage="queued" ANTES do despacho, e o despacho "dispatched";
- cada tentativa de entrega vira uma linha em WebhookDelivery;
- falha agenda retry com backoff exponencial (1, 2, 4 min) até o teto;
- sucesso não agenda nada.
"""

from __future__ import annotations

import httpx
import pytest

from channels.models import AppWebhook, WebhookDelivery
from notify import outbound

pytestmark = pytest.mark.django_db


@pytest.fixture
def hook(account):
    return AppWebhook.objects.create(account=account, url="http://app.test/hooks")


@pytest.fixture
def http_mock(monkeypatch):
    calls = {"n": 0, "resp": []}

    def _post(url, content=b"", headers=None, timeout=None):
        calls["n"] += 1
        item = calls["resp"].pop(0) if calls["resp"] else 200
        if isinstance(item, Exception):
            raise item
        return httpx.Response(item, text="" if item < 400 else "erro do app")

    monkeypatch.setattr(outbound.httpx, "post", _post)
    return calls


@pytest.fixture
def scheduled(monkeypatch):
    agendados: list[dict] = []

    def _sched(account_id, event, payload, attempt):
        agendados.append({"attempt": attempt + 1})

    monkeypatch.setattr(outbound, "_schedule_retry", lambda a, e, p, at: _sched(a, e, p, at))
    return agendados


def test_stage_queued_no_aceite(account, hook, monkeypatch, django_capture_on_commit_callbacks):
    """O aceite agenda push_status com stage='queued' antes do despacho."""
    stages: list[str] = []
    monkeypatch.setattr(
        outbound, "push_status", lambda notif, stage="update": stages.append(stage)
    )
    from notify.interface.send import send

    with django_capture_on_commit_callbacks(execute=True):
        send(account=account, text="oi", caller="pytest", phone="5542999990000")

    assert stages[0] == "queued"


def test_payload_carrega_o_stage(account):
    from notify.models import Notification

    n = Notification.objects.create(account=account, caller="t", text="x")
    assert outbound.status_payload(n, "queued")["stage"] == "queued"
    assert outbound.status_payload(n)["stage"] == "update"


def test_cada_tentativa_vira_linha(account, hook, http_mock, scheduled):
    http_mock["resp"] = [500]
    outbound.deliver(account.id, "status", {"x": 1}, attempt=1)
    http_mock["resp"] = [200]
    outbound.deliver(account.id, "status", {"x": 1}, attempt=2)

    rows = list(WebhookDelivery.objects.order_by("attempt"))
    assert [(r.attempt, r.status_code) for r in rows] == [(1, 500), (2, 200)]


def test_falha_agenda_retry_ate_o_teto(account, hook, http_mock, scheduled):
    http_mock["resp"] = [httpx.ConnectError("recusado")]
    outbound.deliver(account.id, "status", {"x": 1}, attempt=1)
    assert scheduled == [{"attempt": 2}]

    scheduled.clear()
    http_mock["resp"] = [500]
    outbound.deliver(account.id, "status", {"x": 1}, attempt=5)  # teto default = 5
    assert scheduled == []  # esgotou — sem novo agendamento

    falha = WebhookDelivery.objects.get(attempt=5)
    assert falha.status_code == 500


def test_sucesso_nao_agenda(account, hook, http_mock, scheduled):
    outbound.deliver(account.id, "status", {"x": 1})
    assert scheduled == []
    assert WebhookDelivery.objects.get().status_code == 200


def test_backoff_exponencial_agendado(account, hook, http_mock, monkeypatch):
    """Sem mock do _schedule_retry: confere o Schedule once com o delay certo."""
    from django.utils import timezone

    from django_q.models import Schedule

    http_mock["resp"] = [500]
    antes = timezone.now()
    outbound.deliver(account.id, "status", {"x": 1}, attempt=2)

    s = Schedule.objects.get()
    assert s.func == "notify.outbound.deliver"
    delta_min = (s.next_run - antes).total_seconds() / 60
    assert 1.9 <= delta_min <= 2.2  # 2**(2-1) = 2 minutos
