"""Watchdog — transições alertam, auto-heal reconecta, canário valida (Q/K1).

O que estes testes travam:
- tick persiste ServiceStatus e só alerta em TRANSIÇÃO (ok→fora / fora→ok);
- GO sem sessão dispara auto-heal (connect immediate) com cooldown e com o
  subscribe no vocabulário certo do GO (wuzapi) — nomes v2 são descartados
  em silêncio pela GO, e corpo incompleto apaga o webhook registrado;
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


def test_tick_persiste_os_4_servicos(checks_ok, alerts):
    out = watchdog.tick()
    assert set(out) == {"evolution-go", "mailcow", "omnirouter", "queue"}
    assert ServiceStatus.objects.filter(ok=True).count() == 4
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
        reconectadas.append((url, json))

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


def test_heal_go_assina_vocabulario_do_go(monkeypatch):
    """O subscribe do /instance/connect precisa dos nomes wuzapi — nomes v2
    são descartados EM SILÊNCIO e a inscrição de webhook nasce vazia."""
    posts: list[dict] = []

    def _fake_post(url, headers=None, json=None, timeout=None):
        posts.append(json)

        class _R:
            status_code = 200

        return _R()

    monkeypatch.setattr(watchdog.httpx, "post", _fake_post)
    watchdog._heal_go("http://go.test", {"default": "tok1"})
    assert posts, "nenhum POST disparado"
    body = posts[0]
    assert body["immediate"] is True
    assert body["subscribe"] == ["MESSAGE", "READ_RECEIPT", "HISTORY_SYNC"]
    assert body["webhookUrl"].endswith("/v1/webhook/evolution/default")


def test_go_reconecta_cada_instancia_registrada_que_estiver_fora(
    account, monkeypatch, settings
):
    from channels.models import WhatsAppNumber

    settings.EVOLUTION_GO_BASE_URL = "http://go.test"
    WhatsAppNumber.objects.create(
        account=account,
        slug="principal",
        instance_name="app-principal",
        is_default=True,
    )
    posts = []

    class _Response:
        status_code = 200

        def __init__(self, payload):
            self._payload = payload

        def json(self):
            return self._payload

    def fake_get(url, **_kwargs):
        # /instance/status com LoggedIn=False → instância considerada fora
        return _Response({"data": {"Connected": False, "LoggedIn": False}})

    def fake_post(url, headers=None, json=None, timeout=None):
        posts.append(url)
        return _Response({"message": "success"})

    monkeypatch.setattr(watchdog.httpx, "get", fake_get)
    monkeypatch.setattr(watchdog.httpx, "post", fake_post)
    # a row não tem go_token → cai na key global default
    settings.EVOLUTION_GO_API_KEY = "global-go-key"

    ok, detail = watchdog._check_go()

    assert ok is False
    assert "sem sessão" in detail
    assert any(u.endswith("/instance/connect") for u in posts)


def test_heal_go_executa_forcereconnect_quando_sessao_zumbi(monkeypatch, settings):
    settings.EVOLUTION_GO_BASE_URL = "http://go.test"
    settings.EVOLUTION_GO_ADMIN_KEY = "admin-secret"
    
    posts = []

    class _Response:
        def __init__(self, payload, status_code=200):
            self._payload = payload
            self.status_code = status_code

        def json(self):
            return self._payload

    def fake_get(url, headers=None, **_kwargs):
        if url.endswith("/instance/all"):
            return _Response([
                {
                    "id": "uuid-1234-5678",
                    "name": "default",
                    "jid": "5511999999999:15@s.whatsapp.net",
                    "connected": False,
                }
            ])
        # status inicial -> desconectado; status após forcereconnect -> conectado
        if any("/instance/forcereconnect" in p[0] for p in posts):
            return _Response({"data": {"Connected": True, "LoggedIn": True}})
        return _Response({"data": {"Connected": False, "LoggedIn": False}})

    def fake_post(url, headers=None, json=None, timeout=None):
        posts.append((url, json, headers))
        return _Response({"message": "success"})

    monkeypatch.setattr(watchdog.httpx, "get", fake_get)
    monkeypatch.setattr(watchdog.httpx, "post", fake_post)

    healed = watchdog._heal_go("http://go.test", {"default": "tok1"}, force=True)

    assert healed is True
    # Garante que executou a Fase 1 (connect) e a Fase 2 (forcereconnect com UUID e admin key)
    assert any(p[0].endswith("/instance/connect") for p in posts)
    force_call = next((p for p in posts if "/instance/forcereconnect/uuid-1234-5678" in p[0]), None)
    assert force_call is not None
    assert force_call[1] == {"number": "5511999999999"}
    assert force_call[2].get("apikey") == "admin-secret"


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
