"""Testes do wizard sequencial de bootstrap (Carregou → Bootstrap → Dashboard)."""
import pytest


pytestmark = pytest.mark.django_db


# ── Home → Wizard quando incompleto ──────────────────────────────────────


def test_root_redirects_to_bootstrap_when_incomplete(client, monkeypatch):
    """Sem WhatsApp pareado, root redireciona pro wizard."""
    from notify.models import Template
    from channels.models import MailIdentity, WhatsAppNumber

    # Garante estado limpo: nada pareado
    WhatsAppNumber.objects.all().delete()
    MailIdentity.objects.all().delete()
    Template.objects.all().delete()

    # Monkeypatch do EvolutionAdminClient pra retornar "missing"
    from whatsapp.admin import EvolutionAdminClient
    monkeypatch.setattr(EvolutionAdminClient, "is_configured", False)

    resp = client.get("/")
    assert resp.status_code == 302
    assert resp.headers["Location"].endswith("/controlpanel/bootstrap/")


def test_root_shows_dashboard_when_all_steps_done(client, monkeypatch):
    """Com tudo configurado, root mostra dashboard direto."""
    from notify.models import Template
    from channels.models import MailIdentity, WhatsAppNumber
    from accounts.models import Account

    acc = Account.objects.first() or Account.objects.create(name="x", slug="x")
    WhatsAppNumber.objects.update_or_create(
        instance_name="default", defaults={"account": acc, "slug": "default", "is_default": True}
    )
    MailIdentity.objects.update_or_create(
        from_email="a@b.c", defaults={"account": acc, "smtp_host": "h", "smtp_port": 587, "is_default": True}
    )
    Template.objects.update_or_create(
        event="default.welcome", defaults={"account": acc, "title": "Bem-vindo", "body_md": "Oi {nome}"}
    )

    # Monkeypatch: Evolution diz "open"
    from whatsapp.admin import EvolutionAdminClient
    real_init = EvolutionAdminClient.__init__

    def _fake_init(self, *a, **kw):
        real_init(self, *a, **kw)
        self._fake_state = "open"
    monkeypatch.setattr(EvolutionAdminClient, "__init__", _fake_init)
    monkeypatch.setattr(EvolutionAdminClient, "is_configured", True)
    monkeypatch.setattr(EvolutionAdminClient, "get_connect_qr", lambda self, name: (None, "open"))

    resp = client.get("/")
    assert resp.status_code == 200
    body = resp.content.decode()
    # Dashboard tem "Painel" no título
    assert "Painel" in body or "Dashboard" in body or "Dashboard" in body or "Bootstrap" not in body.split("Configurar Notify Server")[0]


# ── Wizard renderiza passo atual ──────────────────────────────────────────


def test_bootstrap_shows_whatsapp_as_first_step(client, monkeypatch):
    """Sem nada configurado, passo atual é WhatsApp."""
    from notify.models import Template
    from channels.models import MailIdentity, WhatsAppNumber
    from whatsapp.admin import EvolutionAdminClient
    monkeypatch.setattr(EvolutionAdminClient, "is_configured", True)
    monkeypatch.setattr(EvolutionAdminClient, "get_connect_qr", lambda self, name: (None, "missing"))
    WhatsAppNumber.objects.all().delete()
    MailIdentity.objects.all().delete()
    Template.objects.all().delete()

    resp = client.get("/controlpanel/bootstrap/")
    assert resp.status_code == 200
    body = resp.content.decode()
    assert "Parear WhatsApp" in body
    assert "Começar" in body
    assert "1 de 3" in body


def test_bootstrap_advances_to_email_after_whatsapp(client, monkeypatch):
    """Com WhatsApp OK, passo atual vira E-mail."""
    from notify.models import Template
    from channels.models import MailIdentity, WhatsAppNumber
    from accounts.models import Account
    from whatsapp.admin import EvolutionAdminClient
    monkeypatch.setattr(EvolutionAdminClient, "is_configured", True)
    monkeypatch.setattr(EvolutionAdminClient, "get_connect_qr", lambda self, name: (None, "open"))

    acc = Account.objects.first() or Account.objects.create(name="x", slug="x")
    WhatsAppNumber.objects.update_or_create(
        instance_name="default", defaults={"account": acc, "slug": "default", "is_default": True}
    )
    MailIdentity.objects.all().delete()
    Template.objects.all().delete()

    resp = client.get("/controlpanel/bootstrap/")
    assert resp.status_code == 200
    body = resp.content.decode()
    assert "Parear E-mail" in body  # passo atual
    assert "2 de 3" in body
    assert "Concluído" in body  # WhatsApp marcado como OK


def test_bootstrap_redirects_to_dashboard_when_all_done(client, monkeypatch):
    """Com tudo OK, wizard redireciona pra home (que vira dashboard)."""
    from notify.models import Template
    from channels.models import MailIdentity, WhatsAppNumber
    from accounts.models import Account
    from whatsapp.admin import EvolutionAdminClient
    monkeypatch.setattr(EvolutionAdminClient, "is_configured", True)
    monkeypatch.setattr(EvolutionAdminClient, "get_connect_qr", lambda self, name: (None, "open"))

    acc = Account.objects.first() or Account.objects.create(name="x", slug="x")
    WhatsAppNumber.objects.update_or_create(
        instance_name="default", defaults={"account": acc, "slug": "default", "is_default": True}
    )
    MailIdentity.objects.update_or_create(
        from_email="a@b.c", defaults={"account": acc, "smtp_host": "h", "smtp_port": 587, "is_default": True}
    )
    Template.objects.update_or_create(
        event="default.welcome",
        defaults={"account": acc, "title": "Bem-vindo", "body_md": "Oi {nome}"}
    )

    resp = client.get("/controlpanel/bootstrap/")
    assert resp.status_code == 302
    assert resp.headers["Location"] == "/"
