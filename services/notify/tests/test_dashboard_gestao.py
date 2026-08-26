"""Gestão de conta, filtros de log e status dos serviços no painel (F2-F5)."""

from __future__ import annotations

import pytest

from accounts.models import ApiKey
from notify.models import Notification

pytestmark = pytest.mark.django_db


# ── F2: ativar/desativar conta e revogar key ────────────────────────────────

def test_toggle_desativa_e_derruba_o_envio(client, account, auth_headers):
    resp = client.post(f"/dashboard/app/{account.slug}/account/toggle")
    assert resp.status_code == 200
    account.refresh_from_db()
    assert account.is_active is False

    # conta desativada não envia: por account_id → 403 explícito
    api = client.post(
        "/notify",
        data={"content": "oi", "whatsapp": "5542999990000", "account_id": account.slug},
        content_type="application/json",
    )
    assert api.status_code == 403

    client.post(f"/dashboard/app/{account.slug}/account/toggle")
    account.refresh_from_db()
    assert account.is_active is True


def test_revogar_key(client, account):
    key = account.api_keys.first()
    resp = client.post(f"/dashboard/app/{account.slug}/key/{key.id}/revoke")
    assert resp.status_code == 200
    key.refresh_from_db()
    assert key.is_active is False


def test_save_account_muda_nome_e_ia(client, account):
    resp = client.post(
        f"/dashboard/app/{account.slug}/account", data={"name": "Novo Nome"}
    )  # checkbox ausente = IA desligada
    assert resp.status_code == 200
    account.refresh_from_db()
    assert account.name == "Novo Nome"
    assert account.ai_adapt is False

    client.post(f"/dashboard/app/{account.slug}/account", data={"name": "Novo Nome", "ai_adapt": "1"})
    account.refresh_from_db()
    assert account.ai_adapt is True


# ── F3: filtros por canal e provider ────────────────────────────────────────

def _mk(account, **kw):
    defaults = dict(
        account=account, caller="pytest", text="x",
        want_whatsapp=False, want_email=False,
        whatsapp_status="skipped", email_status="skipped",
    )
    defaults.update(kw)
    return Notification.objects.create(**defaults)


def test_filtro_canal_status_e_provider(client, account):
    _mk(account, want_whatsapp=True, whatsapp_status="failed", driver_used="evolution-go")
    _mk(account, want_whatsapp=True, whatsapp_status="sent", driver_used="evolution-go")
    _mk(account, want_email=True, email_status="failed")

    # canal + status: só a falha DO whatsapp
    resp = client.get("/dashboard/notifications/?channel=whatsapp&status=failed")
    assert resp.content.count(b"<tr>") == 2  # header + 1 linha

    # provider (GO é o único provedor agora — todas as whatsapp batem)
    resp = client.get("/dashboard/notifications/?provider=evolution-go")
    assert resp.content.count(b"<tr>") == 3  # header + 2 whatsapp
    assert b"evolution-go" in resp.content

    # canal sozinho
    resp = client.get("/dashboard/notifications/?channel=email")
    assert resp.content.count(b"<tr>") == 2


def test_filtro_no_sent_por_app(client, account):
    _mk(account, want_whatsapp=True, whatsapp_status="failed", driver_used="evolution-go")
    _mk(account, want_email=True, email_status="sent")

    resp = client.get(f"/dashboard/app/{account.slug}/sent?channel=whatsapp&status=failed")
    assert resp.status_code == 200
    assert resp.content.count(b'class="pill st-failed"') >= 1


# ── F4: status dos serviços ─────────────────────────────────────────────────

def test_status_lista_os_quatro_servicos(client, monkeypatch):
    # nada configurado no ambiente de teste → todos aparecem, marcados como fora
    resp = client.get("/dashboard/status")
    body = resp.content.decode()
    for nome in ("Evolution GO", "Stalwart", "OmniRouter"):
        assert nome in body


# ── F5: teste de análise IA (fail-open) ─────────────────────────────────────

def test_adapt_test_fail_open_sem_gateway(client, account):
    resp = client.post(
        f"/dashboard/app/{account.slug}/ai/adapt-test", data={"text": "olá {nome}"}
    )
    body = resp.content.decode()
    assert "fail-open" in body
    assert "olá {nome}" in body  # original mostrado


def test_adapt_test_mostra_resultado_adaptado(client, account, monkeypatch):
    from ai import adapt as adapt_mod

    monkeypatch.setattr(
        adapt_mod,
        "complete",
        lambda *a, **kw: '{"whatsapp": "*Oi!*", "email": "Olá, tudo bem?", "subject": "Oi"}',
    )
    resp = client.post(
        f"/dashboard/app/{account.slug}/ai/adapt-test", data={"text": "oi"}
    )
    body = resp.content.decode()
    assert "adaptado" in body and "*Oi!*" in body and "Olá, tudo bem?" in body
