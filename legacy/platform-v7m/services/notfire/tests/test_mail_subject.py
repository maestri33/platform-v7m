"""Assunto do e-mail — o template da conta define o default (C4).

Ordem travada aqui: subject explícito do envio > assunto do MailTemplate da
conta (com {{title}}/{{service_name}}) > título > primeira frase do corpo.
"""

from __future__ import annotations

import pytest

from channels.models import MailTemplate
from notify import dispatch as dispatch_mod
from notify.models import Notification


class _FakeMailClient:
    def __init__(self):
        self.sent: list[dict] = []

    async def send_email(self, to_email, subject, *, html_body, plain_body=None):
        self.sent.append({"to": to_email, "subject": subject, "html": html_body})
        return {}


@pytest.fixture
def fake_client(monkeypatch):
    client = _FakeMailClient()
    monkeypatch.setattr(dispatch_mod, "_get_mail_client", lambda notif: client)
    return client


def _notif(account, **kw) -> Notification:
    defaults = dict(
        account=account,
        caller="pytest",
        recipient_email="dest@example.com",
        text="Seu pedido foi aprovado. Obrigado.",
        want_email=True,
        want_whatsapp=False,
    )
    defaults.update(kw)
    return Notification.objects.create(**defaults)


@pytest.mark.django_db
def test_assunto_vem_do_template_da_conta(account, fake_client):
    MailTemplate.objects.create(
        account=account,
        html="<html>{{content}}</html>",
        subject="{{service_name}}: {{title}}",
        brand_name="Acme",
    )
    notif = _notif(account, title="Pedido 12")

    dispatch_mod._send_email(notif)

    assert fake_client.sent[0]["subject"] == "Acme: Pedido 12"


@pytest.mark.django_db
def test_subject_do_envio_vence_o_template(account, fake_client):
    MailTemplate.objects.create(
        account=account,
        html="<html>{{content}}</html>",
        subject="Assunto da conta",
    )
    notif = _notif(account, subject="Assunto do envio")

    dispatch_mod._send_email(notif)

    assert fake_client.sent[0]["subject"] == "Assunto do envio"


@pytest.mark.django_db
def test_sem_template_cai_no_titulo_e_no_corpo(account, fake_client):
    notif = _notif(account, title="Só o título")
    dispatch_mod._send_email(notif)
    assert fake_client.sent[0]["subject"] == "Só o título"

    notif2 = _notif(account)
    dispatch_mod._send_email(notif2)
    assert fake_client.sent[1]["subject"].startswith("Seu pedido foi aprovado")
