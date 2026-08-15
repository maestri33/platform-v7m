"""Watchdog — transições alertam, auto-heal reconecta, canário valida (Q/K1).

O que estes testes travam:
- tick persiste ServiceStatus e só alerta em TRANSIÇÃO (ok→fora / fora→ok);
- GO sem sessão dispara auto-heal (connect immediate) com cooldown;
- canário falho alerta o admin; canário ok registra o sucesso.
"""

from __future__ import annotations

import pytest
from django.utils import timezone

from notify import watchdog
from notify.models import ServiceStatus

pytestmark = pytest.mark.django_db


@pytest.fixture
def checks_ok(monkeypatch):
    monkeypatch.setattr(watchdog, "_check_v2", lambda: (True, "2 instância(s)"))
    monkeypatch.setattr(watchdog, "_check_go", lambda heal=True: (True, "logadas: default"))
    monkeypatch.setattr(watchdog, "_check_mailcow", lambda: (True, "7 domínio(s)"))
    monkeypatch.setattr(watchdog, "_check_omnirouter", lambda: (True, "gateway de pé"))
    monkeypatch.setattr(watchdog, "_check_queue", lambda: (True, "0 na fila"))


@pytest.fixture
def alerts(monkeypatch):
    sent: list[str] = []
    monkeypatch.setattr(watchdog, "_alert_admin", lambda msg: sent.append(msg))
    monkeypatch.setattr(watchdog, "_push_service_event", lambda *a, **kw: None)
    return sent


def test_tick_persiste_os_5_servicos(checks_ok, alerts):
    out = watchdog.tick()
    assert set(out) == {"evolution-v2", "evolution-go", "mailcow", "omnirouter", "queue"}
    assert ServiceStatus.objects.filter(ok=True).count() == 5
    assert alerts == []  # primeira medição não é transição


def test_transicao_alerta_uma_vez(checks_ok, alerts, monkeypatch):
    watchdog.tick()  # baseline ok
    monkeypatch.setattr(watchdog, "_check_mailcow", lambda: (False, "ConnectError"))
    watchdog.tick()  # caiu → alerta
    watchdog.tick()  # continua fora → SEM alerta novo
    assert len(alerts) == 1 and "mailcow" in alerts[0] and "CAIU" in alerts[0]

    monkeypatch.setattr(watchdog, "_check_mailcow", lambda: (True, "7 domínio(s)"))
    watchdog.tick()  # voltou → alerta de retorno
    assert len(alerts) == 2 and "voltou" in alerts[1]


def test_auto_heal_reconecta_com_cooldown(monkeypatch):
    reconectadas: list[str] = []

    def _fake_post(url, headers=None, json=None, timeout=None):
        reconectadas.append(url)

        class _R:
            status_code = 200

        return _R()

    monkeypatch.setattr(watchdog.httpx, "post", _fake_post)
    watchdog._heal_go("http://go.test", {"staging": "tok1"})
    assert len(reconectadas) == 1

    # cooldown: segunda chamada imediata não reconecta de novo
    watchdog._heal_go("http://go.test", {"staging": "tok1"})
    assert len(reconectadas) == 1

    # cooldown vencido → tenta de novo
    row = ServiceStatus.objects.get(name="evolution-go")
    row.heal_attempted_at = timezone.now() - timezone.timedelta(minutes=11)
    row.save()
    watchdog._heal_go("http://go.test", {"staging": "tok1"})
    assert len(reconectadas) == 2


def test_v2_reconecta_cada_instancia_registrada_que_estiver_fora(
    account, monkeypatch, settings
):
    from channels.models import WhatsAppNumber

    settings.WHATSAPP_API_BASE_URL = "http://v2.test"
    settings.WHATSAPP_GLOBAL_API_KEY = "global"
    WhatsAppNumber.objects.create(
        account=account,
        slug="principal",
        instance_name="app-principal",
        is_default=True,
    )
    calls = []

    class _Response:
        status_code = 200

        def __init__(self, payload):
            self._payload = payload

        def json(self):
            return self._payload

        def raise_for_status(self):
            return None

    def fake_get(url, **_kwargs):
        calls.append(url)
        if url.endswith("/instance/fetchInstances"):
            return _Response([
                {"name": "app-principal", "connectionStatus": "close"},
            ])
        return _Response({"instance": {"state": "connecting"}})

    monkeypatch.setattr(watchdog.httpx, "get", fake_get)

    ok, detail = watchdog._check_v2()

    assert ok is False
    assert "esperadas fora: app-principal" in detail
    assert calls[-1].endswith("/instance/connect/app-principal")
    number = WhatsAppNumber.objects.get(instance_name="app-principal")
    assert number.connection_status == "down"


def test_canario_ok_registra_sucesso(account, alerts, monkeypatch, settings):
    settings.NOTIFY_DEFAULT_ACCOUNT_SLUG = account.slug
    settings.CANARY_PHONE = "5543996648750"
    settings.CANARY_EMAIL = ""
    ext = watchdog.canary()  # TEST_MODE dry-run marca sent
    assert ext is not None
    assert ServiceStatus.objects.get(name="canary").ok is True
    assert alerts == []


def test_canario_falho_alerta(account, alerts, monkeypatch, settings):
    settings.NOTIFY_DEFAULT_ACCOUNT_SLUG = account.slug
    settings.CANARY_PHONE = "5543996648750"
    settings.CANARY_EMAIL = ""

    def _boom(**kw):
        raise RuntimeError("pipeline morto")

    monkeypatch.setattr("notify.interface.send.send", _boom)
    watchdog.canary()
    assert ServiceStatus.objects.get(name="canary").ok is False
    assert alerts and "CANÁRIO FALHOU" in alerts[0]


def test_canario_sem_destino_nao_roda(account, alerts, settings):
    settings.CANARY_PHONE = ""
    settings.CANARY_EMAIL = ""
    assert watchdog.canary() is None
    assert ServiceStatus.objects.get(name="canary").ok is False
