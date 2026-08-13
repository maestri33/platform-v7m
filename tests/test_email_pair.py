"""Testes do wizard de pareamento de e-mail (Step 3)."""
import smtplib
from unittest.mock import patch

import pytest


pytestmark = pytest.mark.django_db


# ── Helpers ────────────────────────────────────────────────────────────────


class _FakeSMTP:
    """Stand-in de smtplib.SMTP. Configurável pra simular sucesso/falha."""

    def __init__(self, host, port, timeout=10):
        self.host = host
        self.port = port
        self.timeout = timeout
        self.calls: list[str] = []
        self.connected = True

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.connected = False
        return False

    def ehlo(self):
        self.calls.append("ehlo")

    def starttls(self):
        self.calls.append("starttls")

    def login(self, user, password):
        self.calls.append(("login", user, password))

    def mail(self, from_addr):
        self.calls.append(("mail", from_addr))
        if getattr(self, "_fail_mail", None):
            raise smtplib.SMTPAuthenticationError(535, b"auth failed")

    def quit(self):
        self.calls.append("quit")


@pytest.fixture
def smtp_ok(monkeypatch):
    """Patch smtplib.SMTP pra sempre dar OK."""
    fake = _FakeSMTP("mailhog", 1025)

    def factory(*args, **kwargs):
        return fake

    import mail.client as mc
    monkeypatch.setattr(mc.smtplib, "SMTP", factory)
    return fake


@pytest.fixture
def smtp_fail(monkeypatch):
    """Patch smtplib.SMTP pra explodir no connect."""
    def factory(*args, **kwargs):
        raise smtplib.SMTPConnectError(421, b"connect failed")

    import mail.client as mc
    monkeypatch.setattr(mc.smtplib, "SMTP", factory)
    return factory


# ── GET /controlpanel/email/pair/ ──────────────────────────────────────────


def test_email_pair_renders_empty_form(client):
    """Sem MailIdentity, mostra form vazio com 'Testar conexão'."""
    resp = client.get("/controlpanel/email/pair/")
    assert resp.status_code == 200
    body = resp.content.decode()
    assert "Parear E-mail" in body
    assert "Testar conexão" in body
    assert 'name="smtp_host"' in body
    assert 'name="from_email"' in body


def test_email_pair_renders_state_with_edit_button(client, account):
    """Com MailIdentity existente, mostra estado + botão Editar."""
    from channels.models import MailIdentity
    MailIdentity.objects.create(
        account=account,
        smtp_host="mailhog", smtp_port=1025,
        smtp_user="", smtp_password="",
        from_email="noreply@example.com", from_name="Notify",
        is_default=True,
    )
    resp = client.get("/controlpanel/email/pair/")
    assert resp.status_code == 200
    body = resp.content.decode()
    assert "Estado atual" in body
    assert "noreply@example.com" in body
    assert "Editar" in body


# ── POST /controlpanel/email/pair/test/ ────────────────────────────────────


def test_email_pair_test_success_creates_singleton(client, account, smtp_ok):
    """Sucesso no probe → cria MailIdentity (deleta qualquer outra)."""
    from channels.models import MailIdentity
    # lixo pré-existente
    MailIdentity.objects.create(
        account=account, smtp_host="old", smtp_port=25,
        smtp_user="", smtp_password="",
        from_email="old@x.com", from_name="old",
    )
    resp = client.post("/controlpanel/email/pair/test/", {
        "smtp_host": "mailhog", "smtp_port": "1025",
        "smtp_user": "", "smtp_password": "",
        "from_email": "noreply@example.com", "from_name": "Notify",
    })
    assert resp.status_code == 302
    assert resp.headers["Location"].endswith("/controlpanel/email/pair/")
    assert MailIdentity.objects.filter(account=account).count() == 1
    mi = MailIdentity.objects.get(account=account)
    assert mi.smtp_host == "mailhog"
    assert mi.smtp_port == 1025
    assert mi.from_email == "noreply@example.com"
    assert mi.is_default is True
    # SMTP foi sondado (sem starttls/login pq user vazio)
    assert "ehlo" in smtp_ok.calls
    assert ("mail", "noreply@example.com") in smtp_ok.calls


def test_email_pair_test_failure_does_not_create(client, account, smtp_fail):
    """Falha no probe → alert vermelho, sem criar MailIdentity."""
    from channels.models import MailIdentity
    assert MailIdentity.objects.filter(account=account).count() == 0
    resp = client.post("/controlpanel/email/pair/test/", {
        "smtp_host": "broken.host", "smtp_port": "1025",
        "smtp_user": "", "smtp_password": "",
        "from_email": "noreply@example.com", "from_name": "Notify",
    })
    assert resp.status_code == 302
    assert MailIdentity.objects.filter(account=account).count() == 0
    # GET mostra alert com erro
    body = client.get("/controlpanel/email/pair/").content.decode()
    assert "Falha no teste SMTP" in body
    assert "SMTPConnectError" in body or "connect failed" in body


def test_email_pair_test_with_user_uses_starttls_and_login(client, account):
    """Com user preenchido, starttls + login são chamados."""
    fake = _FakeSMTP("smtp.example.com", 587)

    def factory(*args, **kwargs):
        return fake

    with patch("mail.client.smtplib.SMTP", factory):
        resp = client.post("/controlpanel/email/pair/test/", {
            "smtp_host": "smtp.example.com", "smtp_port": "587",
            "smtp_user": "user", "smtp_password": "secret",
            "from_email": "noreply@example.com", "from_name": "Notify",
        })
    assert resp.status_code == 302
    assert "ehlo" in fake.calls
    assert "starttls" in fake.calls
    assert ("login", "user", "secret") in fake.calls


def test_email_pair_test_rejects_missing_fields(client, account):
    """Sem host ou from_email, recusa com 302 (alert)."""
    resp = client.post("/controlpanel/email/pair/test/", {
        "smtp_host": "", "smtp_port": "587",
        "from_email": "noreply@example.com", "from_name": "Notify",
    })
    assert resp.status_code == 302
    body = client.get("/controlpanel/email/pair/").content.decode()
    assert "obrigatórios" in body


# ── POST /controlpanel/email/pair/save/ ────────────────────────────────────


def test_email_pair_save_updates_singleton(client, account):
    """POST de save altera os campos do singleton."""
    from channels.models import MailIdentity
    from mail import crypto
    mi = MailIdentity.objects.create(
        account=account,
        smtp_host="mailhog", smtp_port=1025,
        smtp_user="", smtp_password="",
        from_email="old@example.com", from_name="Old",
        is_default=True,
    )
    resp = client.post("/controlpanel/email/pair/save/", {
        "smtp_host": "smtp.example.com", "smtp_port": "587",
        "smtp_user": "newuser", "smtp_password": "newpass",
        "from_email": "new@example.com", "from_name": "New Name",
    })
    assert resp.status_code == 302
    mi.refresh_from_db()
    assert mi.smtp_host == "smtp.example.com"
    assert mi.smtp_port == 587
    assert mi.smtp_user == "newuser"
    assert mi.from_email == "new@example.com"
    assert mi.from_name == "New Name"
    # senha passou por crypto.encrypt (Fernet está configurado no test)
    assert crypto.decrypt(mi.smtp_password) == "newpass"


def test_email_pair_save_keeps_password_when_blank(client, account):
    """Senha vazia no form não sobrescreve a senha atual."""
    from channels.models import MailIdentity
    mi = MailIdentity.objects.create(
        account=account,
        smtp_host="mailhog", smtp_port=1025,
        smtp_user="", smtp_password="keepme",
        from_email="x@x.com", from_name="x", is_default=True,
    )
    client.post("/controlpanel/email/pair/save/", {
        "smtp_host": "mailhog", "smtp_port": "1025",
        "smtp_user": "", "smtp_password": "",
        "from_email": "x@x.com", "from_name": "x",
    })
    mi.refresh_from_db()
    assert mi.smtp_password == "keepme"


def test_email_pair_save_without_singleton_returns_409(client, account):
    """Save sem singleton prévio retorna 409 (precisa testar antes)."""
    resp = client.post("/controlpanel/email/pair/save/", {
        "smtp_host": "x", "smtp_port": "587",
        "from_email": "x@x.com", "from_name": "x",
    })
    assert resp.status_code == 409


# ── singleton: 1 row por account ──────────────────────────────────────────


def test_singleton_keeps_only_one_row_per_account(client, account, smtp_ok):
    """Cada teste bem-sucedido deleta MailIdentities antigas e cria 1 nova."""
    from channels.models import MailIdentity
    for i in range(3):
        MailIdentity.objects.create(
            account=account, smtp_host=f"h{i}", smtp_port=25,
            smtp_user="", smtp_password="",
            from_email=f"a{i}@x.com", from_name=f"a{i}",
        )
    assert MailIdentity.objects.filter(account=account).count() == 3
    client.post("/controlpanel/email/pair/test/", {
        "smtp_host": "mailhog", "smtp_port": "1025",
        "from_email": "noreply@example.com", "from_name": "Notify",
    })
    rows = MailIdentity.objects.filter(account=account)
    assert rows.count() == 1
    assert rows.first().from_email == "noreply@example.com"


# ── link no dashboard ──────────────────────────────────────────────────────


def test_dashboard_has_email_pair_link(client):
    """Dashboard mostra link pro wizard de e-mail."""
    from django.utils import timezone
    from controlpanel.models import ControlPanelState

    state = ControlPanelState.load()
    ControlPanelState.objects.filter(pk=state.pk).update(completed_at=timezone.now())

    resp = client.get("/")
    assert resp.status_code == 200
    body = resp.content.decode()
    assert "Parear E-mail" in body
    assert 'href="/controlpanel/email/pair/"' in body
