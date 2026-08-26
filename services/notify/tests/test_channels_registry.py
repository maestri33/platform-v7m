"""Canal plugável via registry (G1) — SMS entra sem refatorar o dispatch.

O que estes testes travam:
- registrar um sender de SMS e despachar uma Notification com sms pendente
  funciona fim a fim, sem tocar em nenhuma linha do dispatch;
- canal pedido SEM sender registrado sai `skipped` com motivo — nunca um
  `sent` de mentira;
- sender que estoura vira `failed` com o erro, sem derrubar os outros canais.
"""

from __future__ import annotations

import pytest
from django.test import override_settings

from notify import channels_registry, dispatch as dispatch_mod
from notify.models import Notification

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _clean_registry():
    yield
    channels_registry.unregister("sms")


@pytest.fixture
def _real_dispatch(monkeypatch):
    monkeypatch.setattr(dispatch_mod.settings, "TEST_MODE", False)
    from ai import adapt as ai_adapt

    monkeypatch.setattr(ai_adapt, "enabled_for", lambda account: False)


def _sms_notif(account) -> Notification:
    return Notification.objects.create(
        account=account,
        caller="pytest",
        recipient_phone="5542999990000",
        text="codigo 1234",
        want_whatsapp=False,
        want_email=False,
        want_sms=True,
        whatsapp_status="skipped",
        email_status="skipped",
        sms_status="pending",
    )


def test_sms_pluga_sem_refatorar_o_dispatch(account, _real_dispatch):
    enviados = []

    def send_sms(notif):
        enviados.append((notif.recipient_phone, notif.text))
        notif.sms_status = "sent"

    channels_registry.register("sms", send_sms)
    notif = _sms_notif(account)

    dispatch_mod.dispatch(notif.id)

    notif.refresh_from_db()
    assert notif.sms_status == "sent"
    assert enviados == [("5542999990000", "codigo 1234")]


def test_sem_sender_sai_skipped_com_motivo(account, _real_dispatch):
    notif = _sms_notif(account)

    dispatch_mod.dispatch(notif.id)

    notif.refresh_from_db()
    assert notif.sms_status == "skipped"
    assert "sem provedor de sms" in notif.sms_error


def test_sender_que_estoura_vira_failed(account, _real_dispatch):
    def send_sms(notif):
        raise RuntimeError("gateway fora")

    channels_registry.register("sms", send_sms)
    notif = _sms_notif(account)

    dispatch_mod.dispatch(notif.id)

    notif.refresh_from_db()
    assert notif.sms_status == "failed"
    assert "gateway fora" in notif.sms_error


@override_settings(TEST_MODE=True)
def test_dry_run_cobre_sms(account):
    notif = _sms_notif(account)
    dispatch_mod.dispatch(notif.id)
    notif.refresh_from_db()
    assert notif.sms_status == "sent"
