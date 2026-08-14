"""Testes do wizard de template (Step 4)."""
import io
import tempfile

import pytest


pytestmark = pytest.mark.django_db


# ── GET /controlpanel/template/setup/ ──────────────────────────────────────


def test_template_setup_renders_form(client, account):
    """GET renderiza o form com display_name pré-preenchido."""
    resp = client.get("/controlpanel/template/setup/")
    assert resp.status_code == 200
    body = resp.content.decode()
    assert "Configurar Template" in body
    assert "default.welcome" in body
    assert 'name="display_name"' in body
    assert 'name="site_url"' in body
    assert 'name="logo"' in body


def test_template_setup_auto_creates_default_template(client, account):
    """Primeira visita cria o Template(account, event='default.welcome')."""
    from notify.models import Template

    assert Template.objects.filter(account=account, event="default.welcome").count() == 0
    client.get("/controlpanel/template/setup/")
    t = Template.objects.get(account=account, event="default.welcome")
    assert t.active is True
    assert "{nome}" in t.body_md
    assert "{site}" in t.body_md


def test_template_setup_does_not_duplicate_template(client, account):
    """Segunda visita NÃO cria Template duplicado (get_or_create)."""
    from notify.models import Template

    client.get("/controlpanel/template/setup/")
    client.get("/controlpanel/template/setup/")
    assert Template.objects.filter(account=account, event="default.welcome").count() == 1


# ── POST /controlpanel/template/setup/save/ ───────────────────────────────


def test_template_setup_save_persists_account_and_template(client, account, settings, monkeypatch):
    """POST salva logo, display_name, color_primary na Account + Template."""
    from notify.models import Template

    with tempfile.TemporaryDirectory() as tmp:
        monkeypatch.setattr(settings, "MEDIA_ROOT", tmp)
        monkeypatch.setattr(settings, "MEDIA_URL", "/media/")

        png_bytes = b"\x89PNG\r\n\x1a\n" + b"fakepng"
        upload = io.BytesIO(png_bytes)
        upload.name = "logo.png"

        resp = client.post(
            "/controlpanel/template/setup/save/",
            {
                "display_name": "Minha Marca",
                "site_url": "https://app.minhamarca.com",
                "color_primary": "#FF00AA",
                "logo": upload,
            },
            follow=False,
        )
        assert resp.status_code == 302
        assert resp.headers["Location"].endswith("/controlpanel/bootstrap/")

    # Account atualizada
    account.refresh_from_db()
    assert account.name == "Minha Marca"
    assert account.color_primary == "#FF00AA"
    assert account.logo
    assert account.logo.name.startswith(f"account_logos/{account.slug}/")

    # Template criado/atualizado
    t = Template.objects.get(account=account, event="default.welcome")
    assert t.title == "Minha Marca"
    assert t.subject == "Minha Marca"
    assert "https://app.minhamarca.com" in t.body_md
    assert t.active is True


def test_template_setup_save_without_site_url_uses_generic(client, account):
    """Sem site_url, body_md usa a versão genérica (sem placeholder quebrado)."""
    from notify.models import Template

    client.post("/controlpanel/template/setup/save/", {
        "display_name": "Marca Sem Site",
        "color_primary": "",
    })
    t = Template.objects.get(account=account, event="default.welcome")
    assert "Visite nosso site" in t.body_md
    assert "{site}" not in t.body_md  # placeholder resolvido


def test_template_setup_save_without_display_name_returns_400(client, account):
    """display_name vazio é rejeitado com 400."""
    from notify.models import Template

    resp = client.post("/controlpanel/template/setup/save/", {
        "display_name": "",
        "site_url": "https://x.com",
    })
    assert resp.status_code == 400
    assert Template.objects.filter(account=account, event="default.welcome").count() == 0


def test_template_setup_save_shows_success_alert(client, account):
    """Após save, GET mostra alert verde de sucesso (via session)."""
    client.post("/controlpanel/template/setup/save/", {
        "display_name": "Marca X",
    })
    body = client.get("/controlpanel/template/setup/").content.decode()
    assert "Template salvo com sucesso" in body


# ── link no wizard ─────────────────────────────────────────────────────────


def test_bootstrap_has_template_setup_link(client, monkeypatch):
    """Wizard mostra link pro wizard de template (passo 3, quando WhatsApp+e-mail OK)."""
    from controlpanel.models import ControlPanelState
    from channels.models import WhatsAppNumber, MailIdentity
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

    state = ControlPanelState.load()
    ControlPanelState.objects.filter(pk=state.pk).update(completed_at=None)

    resp = client.get("/controlpanel/bootstrap/")
    assert resp.status_code == 200
    body = resp.content.decode()
    assert "Configurar Template" in body
    assert 'href="/controlpanel/template/setup/"' in body
