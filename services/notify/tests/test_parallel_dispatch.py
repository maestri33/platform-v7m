"""Despacho paralelo (E6) — canais simultâneos, falha isolada.

O que estes testes travam:
- com WhatsApp e e-mail presentes, os senders rodam em THREADS distintas;
- a falha (até exceção crua) de um canal não impede o outro de completar;
- com um canal só, nada de thread — caminho direto.
"""

from __future__ import annotations

import threading
import time

import pytest

from notify import dispatch as dispatch_mod
from notify.models import Notification

pytestmark = pytest.mark.django_db


@pytest.fixture
def _real_dispatch(monkeypatch):
    monkeypatch.setattr(dispatch_mod.settings, "TEST_MODE", False)
    from ai import adapt as ai_adapt

    monkeypatch.setattr(ai_adapt, "enabled_for", lambda account: False)


def _notif(account) -> Notification:
    return Notification.objects.create(
        account=account,
        caller="pytest",
        recipient_phone="5542999990000",
        recipient_email="x@example.com",
        text="oi",
        want_whatsapp=True,
        want_email=True,
    )


def test_canais_rodam_em_threads_distintas(account, _real_dispatch, monkeypatch):
    threads: dict[str, int] = {}
    started = threading.Barrier(2, timeout=5)  # prova de simultaneidade real

    def _wa(notif):
        started.wait()
        threads["wa"] = threading.get_ident()
        notif.whatsapp_status = "sent"

    def _mail(notif):
        started.wait()
        threads["mail"] = threading.get_ident()
        notif.email_status = "sent"

    monkeypatch.setattr(dispatch_mod, "_send_whatsapp_text", _wa)
    monkeypatch.setattr(dispatch_mod, "_send_email", _mail)

    notif = _notif(account)
    dispatch_mod.dispatch(notif.id)  # Barrier estoura se não for paralelo

    notif.refresh_from_db()
    assert notif.whatsapp_status == "sent" and notif.email_status == "sent"
    assert threads["wa"] != threads["mail"] != threading.get_ident()


def test_falha_num_canal_nao_derruba_o_outro(account, _real_dispatch, monkeypatch):
    def _wa(notif):
        raise RuntimeError("explosão crua fora do try do sender")

    def _mail(notif):
        time.sleep(0.05)
        notif.email_status = "sent"

    monkeypatch.setattr(dispatch_mod, "_send_whatsapp_text", _wa)
    monkeypatch.setattr(dispatch_mod, "_send_email", _mail)

    notif = _notif(account)
    dispatch_mod.dispatch(notif.id)  # sem raise

    notif.refresh_from_db()
    assert notif.email_status == "sent"


def test_um_canal_so_nao_abre_thread(account, _real_dispatch, monkeypatch):
    main = threading.get_ident()
    seen = {}

    def _mail(notif):
        seen["thread"] = threading.get_ident()
        notif.email_status = "sent"

    monkeypatch.setattr(dispatch_mod, "_send_email", _mail)
    notif = Notification.objects.create(
        account=account, caller="t", recipient_email="x@example.com", text="oi",
        want_whatsapp=False, want_email=True, whatsapp_status="skipped",
    )
    dispatch_mod.dispatch(notif.id)
    assert seen["thread"] == main


def test_paralelo_preserva_provider_message_id_do_whatsapp(account, _real_dispatch, monkeypatch):
    def _wa(notif):
        notif.whatsapp_status = "sent"
        notif.provider_message_id = "wa-msg-12345"

    class FakeMailClient:
        async def send_email(self, *args, **kwargs):
            return {"message_id": "<smtp-msg-9999@test.org>"}

    monkeypatch.setattr(dispatch_mod, "_send_whatsapp_text", _wa)
    monkeypatch.setattr(dispatch_mod, "_get_mail_client", lambda notif: FakeMailClient())

    notif = _notif(account)
    dispatch_mod.dispatch(notif.id)

    notif.refresh_from_db()
    assert notif.whatsapp_status == "sent"
    assert notif.email_status == "sent"
    assert notif.provider_message_id == "wa-msg-12345"
    assert notif.extra.get("email_message_id") == "smtp-msg-9999@test.org"

