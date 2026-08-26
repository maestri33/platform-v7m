"""Produção — bounce/supressão (L2), expurgo (M3), requeue (I2), métricas (J2)."""

from __future__ import annotations

from datetime import timedelta

import pytest
from django.utils import timezone

from channels.models import SuppressedEmail
from mail.client import MailError
from notify import dispatch as dispatch_mod
from notify.models import Notification

pytestmark = pytest.mark.django_db


@pytest.fixture
def _real(monkeypatch):
    monkeypatch.setattr(dispatch_mod.settings, "TEST_MODE", False)
    from ai import adapt as ai_adapt

    monkeypatch.setattr(ai_adapt, "enabled_for", lambda a: False)


def _email_notif(account, to="morto@example.com"):
    return Notification.objects.create(
        account=account, caller="t", recipient_email=to, text="oi",
        want_whatsapp=False, want_email=True,
        whatsapp_status="skipped", tts_status="skipped",
    )


def test_bounce_vira_supressao_e_nao_insiste(account, _real, monkeypatch):
    class _C:
        async def send_email(self, *a, **kw):
            raise MailError("destinatário recusado", recipients_refused={"morto@example.com": (550, b"no user")})

    monkeypatch.setattr(dispatch_mod, "_get_mail_client", lambda n: _C())

    n1 = _email_notif(account)
    dispatch_mod.dispatch(n1.id)
    n1.refresh_from_db()
    assert n1.email_status == "failed"
    assert SuppressedEmail.objects.filter(account=account, email="morto@example.com").exists()

    # segundo envio pro mesmo destino: nem tenta — skipped com motivo
    chamado = []

    class _C2:
        async def send_email(self, *a, **kw):
            chamado.append(1)

    monkeypatch.setattr(dispatch_mod, "_get_mail_client", lambda n: _C2())
    n2 = _email_notif(account)
    dispatch_mod.dispatch(n2.id)
    n2.refresh_from_db()
    assert n2.email_status == "skipped"
    assert "suprimido" in n2.email_error
    assert chamado == []


def test_purge_respeita_retencao(account):
    from seed.management.commands.notify_purge import purge

    velho = _email_notif(account)
    Notification.objects.filter(pk=velho.pk).update(
        created_at=timezone.now() - timedelta(days=120)
    )
    novo = _email_notif(account)

    out = purge(days=90)
    assert out["notifications"] >= 1
    assert not Notification.objects.filter(pk=velho.pk).exists()
    assert Notification.objects.filter(pk=novo.pk).exists()


def test_requeue_volta_canal_failed_pra_fila(client, account):
    n = Notification.objects.create(
        account=account, caller="t", recipient_phone="5542999990000", text="oi",
        want_whatsapp=True, want_email=False,
        whatsapp_status="failed", email_status="skipped", tts_status="skipped",
    )
    resp = client.post(f"/dashboard/app/{account.slug}/msg/{n.external_id}/requeue")
    assert b"reenfileirado" in resp.content
    n.refresh_from_db()
    # failed → pending: de volta à fila (broker ORM grava a task nos testes)
    assert n.whatsapp_status == "pending"


def test_metrics_conta_o_que_importa(client, account):
    _email_notif(account)
    resp = client.get("/v1/metrics")
    assert resp.status_code == 200
    body = resp.json()
    assert body["24h"]["total"] >= 1
    assert "taxa_erro" in body["24h"]
    assert "fila" in body
