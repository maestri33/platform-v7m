"""Hardening (H2/H3/H6, I5/I6, K3) — limites que protegem provedores e serviço."""

from __future__ import annotations

import pytest
from django.test import override_settings

from notify import ratelimit
from whatsapp import breaker

pytestmark = pytest.mark.django_db

JSON = "application/json"


@pytest.fixture(autouse=True)
def _clean():
    ratelimit.reset()
    breaker.reset()
    yield
    ratelimit.reset()
    breaker.reset()


# ── H2: rate limit ──────────────────────────────────────────────────────────

@override_settings(RATE_LIMIT_PER_MIN_ACCOUNT=3, RATE_LIMIT_PER_MIN_GLOBAL=100)
def test_conta_estoura_o_limite_e_leva_429(client, account):
    payload = {"content": "oi", "whatsapp": "5542999990000", "account_id": account.slug}
    for _ in range(3):
        assert client.post("/notify", data=payload, content_type=JSON).status_code == 200
    resp = client.post("/notify", data=payload, content_type=JSON)
    assert resp.status_code == 429
    assert account.slug in resp.json()["detail"]


@override_settings(RATE_LIMIT_PER_MIN_ACCOUNT=0, RATE_LIMIT_PER_MIN_GLOBAL=2)
def test_limite_global(client, account):
    payload = {"content": "oi", "whatsapp": "5542999990000", "account_id": account.slug}
    client.post("/notify", data=payload, content_type=JSON)
    client.post("/notify", data=payload, content_type=JSON)
    assert client.post("/notify", data=payload, content_type=JSON).status_code == 429


# ── I5: circuit breaker ─────────────────────────────────────────────────────

@override_settings(BREAKER_FAIL_THRESHOLD=3, BREAKER_COOLDOWN_S=60)
def test_breaker_abre_apos_n_falhas_e_meio_abre(monkeypatch):
    for _ in range(3):
        breaker.record_fail("evolution-v2")
    assert breaker.is_open("evolution-v2") is True

    # cooldown vencido → meio-aberto libera UMA sondagem
    import time as _t

    futuro = _t.monotonic() + 120
    monkeypatch.setattr(breaker.time, "monotonic", lambda: futuro)
    assert breaker.is_open("evolution-v2") is False  # sondagem liberada
    breaker.record_fail("evolution-v2")  # sondagem falhou → reabre
    assert breaker.is_open("evolution-v2") is True

    breaker.record_ok("evolution-v2")
    assert breaker.is_open("evolution-v2") is False


@override_settings(BREAKER_FAIL_THRESHOLD=1, BREAKER_COOLDOWN_S=60,
                   WHATSAPP_RETRY_ATTEMPTS=1)
async def test_cascata_pula_provedor_com_circuito_aberto():
    from whatsapp.cascade import CascadeDriver
    from whatsapp.driver import WhatsAppDriver

    class _D(WhatsAppDriver):
        def __init__(self, name):
            self.name = name
            self.calls = 0

        async def send_text(self, number, text, **kw):
            self.calls += 1
            return {"driver": self.name}

        async def send_media(self, *a, **kw): ...
        async def send_audio(self, *a, **kw): ...
        async def check_numbers(self, n): ...

    breaker.record_fail("v2")  # threshold=1 → aberto
    v2, go = _D("v2"), _D("go")
    cascade = CascadeDriver([("v2", lambda: v2), ("go", lambda: go)])
    result = await cascade.send_text("55429", "oi")

    assert result == {"driver": "go"}
    assert v2.calls == 0  # nem encostou no provedor morto
    assert "circuit open" in cascade.last_reason


# ── I6: /ready ──────────────────────────────────────────────────────────────

def test_ready_responde_com_checks(client):
    resp = client.get("/v1/ready")
    assert resp.status_code == 200
    body = resp.json()
    assert body["ready"] is True
    assert body["checks"] == {"db": True, "queue_table": True}


# ── H6: media_url ───────────────────────────────────────────────────────────

def test_media_url_com_esquema_errado_e_400(client, account):
    resp = client.post(
        "/notify",
        data={"content": "x", "whatsapp": "5542999990000", "account_id": account.slug,
              "options": {"media_url": "file:///etc/passwd"}},
        content_type=JSON,
    )
    assert resp.status_code == 400
    assert "http" in resp.json()["detail"]


def test_media_url_metadata_endpoint_barrada(client, account):
    resp = client.post(
        "/notify",
        data={"content": "x", "whatsapp": "5542999990000", "account_id": account.slug,
              "options": {"media_url": "http://169.254.169.254/latest/meta-data"}},
        content_type=JSON,
    )
    assert resp.status_code == 400


# ── H3: shell sem script ────────────────────────────────────────────────────

def test_shell_com_script_e_rejeitado(client, account):
    resp = client.post(
        f"/dashboard/app/{account.slug}/mailtemplate",
        data={"html": "<html><script>alert(1)</script>{{content}}</html>"},
    )
    assert b"rejeitado" in resp.content


def test_shell_com_onload_e_rejeitado(client, account):
    resp = client.post(
        f"/dashboard/app/{account.slug}/mailtemplate",
        data={"html": '<html><img src=x onerror=alert(1)>{{content}}</html>'},
    )
    assert b"rejeitado" in resp.content


# ── K3: cadência ────────────────────────────────────────────────────────────

@override_settings(WA_RATE_PER_MIN_ACCOUNT=1, WA_JITTER_MAX_S=0)
def test_cadencia_segura_o_segundo_envio(account, monkeypatch):
    from notify import dispatch as dispatch_mod
    from notify.dispatch import TransientDispatchError
    from notify.models import Notification

    monkeypatch.setattr(dispatch_mod.settings, "TEST_MODE", False)
    from ai import adapt as ai_adapt

    monkeypatch.setattr(ai_adapt, "enabled_for", lambda a: False)

    class _D:
        name = "evolution-go"
        last_reason = ""

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return None

        async def resolve_br_number(self, p):
            return p

        async def send_text(self, n, t, **k):
            return {"key": {"id": "M1"}}

    monkeypatch.setattr(dispatch_mod, "_get_whatsapp_driver", lambda notif, **kw: _D())

    def _mk():
        return Notification.objects.create(
            account=account, caller="t", recipient_phone="5542999990000", text="x",
            want_whatsapp=True, want_email=False, email_status="skipped",
        )

    n1 = _mk()
    dispatch_mod.dispatch(n1.id)
    n1.refresh_from_db()
    assert n1.whatsapp_status == "sent"

    n2 = _mk()
    with pytest.raises(TransientDispatchError):
        dispatch_mod.dispatch(n2.id)  # cadência 1/min → segura e reagenda
    n2.refresh_from_db()
    assert n2.whatsapp_status == "pending"
