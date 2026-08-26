"""Retry de falha transitória no dispatch (E4).

O que estes testes travam:
- sessão fora / SMTP sem conexão → canal volta a `pending` e o dispatch levanta
  TransientDispatchError (a Django-Q reagenda);
- erro de negócio → `failed` definitivo, sem raise;
- run_sync (API) → nunca raise, falha vira status na resposta;
- esgotou attempts → `failed` definitivo.
"""

from __future__ import annotations

import pytest
from django.test import override_settings

from mail.client import MailError
from notify import dispatch as dispatch_mod
from notify.dispatch import TransientDispatchError
from notify.models import Notification
from whatsapp.driver import WhatsAppDriver
from whatsapp.errors import WhatsAppSessionDown, WhatsAppTransportError

pytestmark = [pytest.mark.django_db, pytest.mark.usefixtures("_no_ai")]


@pytest.fixture
def _no_ai(monkeypatch):
    monkeypatch.setattr(dispatch_mod.settings, "TEST_MODE", False)
    from ai import adapt as ai_adapt

    monkeypatch.setattr(ai_adapt, "enabled_for", lambda account: False)


class _Driver(WhatsAppDriver):
    name = "fake"

    def __init__(self, error: Exception | None = None):
        self.error = error

    async def send_text(self, number, text, **kw):
        if self.error:
            raise self.error
        return {"key": {"id": "MSG1"}}

    async def send_media(self, *a, **kw):  # pragma: no cover
        return {}

    async def send_audio(self, *a, **kw):  # pragma: no cover
        return {}

    async def check_numbers(self, numbers):  # pragma: no cover
        return []


def _notif(account, **kw) -> Notification:
    defaults = dict(
        account=account,
        caller="pytest",
        recipient_phone="5542999990000",
        text="oi",
        want_whatsapp=True,
        want_email=False,
        email_status="skipped",
    )
    defaults.update(kw)
    return Notification.objects.create(**defaults)


def test_sessao_fora_volta_pra_pending_e_reagenda(account, monkeypatch):
    monkeypatch.setattr(
        dispatch_mod,
        "_get_whatsapp_driver",
        lambda notif, **kw: _Driver(WhatsAppSessionDown(503, "no active session")),
    )
    notif = _notif(account)

    with pytest.raises(TransientDispatchError):
        dispatch_mod.dispatch(notif.id)

    notif.refresh_from_db()
    assert notif.whatsapp_status == "pending"  # pronto pro retry
    assert notif.attempts == 1
    assert "no active session" in notif.whatsapp_error


def test_erro_de_negocio_e_failed_definitivo(account, monkeypatch):
    monkeypatch.setattr(
        dispatch_mod,
        "_get_whatsapp_driver",
        lambda notif, **kw: _Driver(WhatsAppTransportError(400, "invalid number")),
    )
    notif = _notif(account)

    dispatch_mod.dispatch(notif.id)  # sem raise

    notif.refresh_from_db()
    assert notif.whatsapp_status == "failed"


def test_run_sync_nao_levanta_mesmo_transitorio(account, monkeypatch):
    monkeypatch.setattr(
        dispatch_mod,
        "_get_whatsapp_driver",
        lambda notif, **kw: _Driver(WhatsAppSessionDown(503, "down")),
    )
    notif = _notif(account)

    dispatch_mod.dispatch(notif.id, sync=True)  # sem raise

    notif.refresh_from_db()
    assert notif.whatsapp_status == "failed"


def test_esgotou_attempts_e_failed(account, monkeypatch):
    monkeypatch.setattr(
        dispatch_mod,
        "_get_whatsapp_driver",
        lambda notif, **kw: _Driver(WhatsAppSessionDown(503, "down")),
    )
    notif = _notif(account)
    notif.attempts = 2  # próxima chamada vira a 3ª (max do Q_CLUSTER)
    notif.save(update_fields=["attempts"])

    dispatch_mod.dispatch(notif.id)  # 3ª tentativa: sem raise

    notif.refresh_from_db()
    assert notif.attempts == 3
    assert notif.whatsapp_status == "failed"


def test_smtp_sem_conexao_e_transitorio(account, monkeypatch):
    class _Client:
        async def send_email(self, *a, **kw):
            raise MailError("conexão SMTP falhou: TimeoutError: timed out")

    monkeypatch.setattr(dispatch_mod, "_get_mail_client", lambda notif: _Client())
    notif = _notif(
        account,
        want_whatsapp=False,
        whatsapp_status="skipped",
        want_email=True,
        email_status="pending",
        recipient_email="x@example.com",
    )

    with pytest.raises(TransientDispatchError):
        dispatch_mod.dispatch(notif.id)

    notif.refresh_from_db()
    assert notif.email_status == "pending"


def test_destinatario_recusado_nao_e_transitorio(account, monkeypatch):
    class _Client:
        async def send_email(self, *a, **kw):
            raise MailError("destinatário recusado: x@example.com", recipients_refused={"x": (550, b"no")})

    monkeypatch.setattr(dispatch_mod, "_get_mail_client", lambda notif: _Client())
    notif = _notif(
        account,
        want_whatsapp=False,
        whatsapp_status="skipped",
        want_email=True,
        email_status="pending",
        recipient_email="x@example.com",
    )

    dispatch_mod.dispatch(notif.id)  # sem raise

    notif.refresh_from_db()
    assert notif.email_status == "failed"


def test_smtp_server_disconnected_e_transitorio(account, monkeypatch):
    class _Client:
        async def send_email(self, *a, **kw):
            raise MailError("SMTP falhou: SMTPServerDisconnected: please run connect() first")

    monkeypatch.setattr(dispatch_mod, "_get_mail_client", lambda notif: _Client())
    notif = _notif(
        account,
        want_whatsapp=False,
        whatsapp_status="skipped",
        want_email=True,
        email_status="pending",
        recipient_email="x@example.com",
    )

    with pytest.raises(TransientDispatchError):
        dispatch_mod.dispatch(notif.id)

    notif.refresh_from_db()
    assert notif.email_status == "pending"

