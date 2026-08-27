"""E2E Browser Tests using Playwright & Django LiveServer.

Tests the full hypermedia dashboard workflow in a real headless Chromium browser:
- Navigation & Topbar
- WhatsApp QR code auto-load & polling
- Email & Stalwart domain selector
- Messages active search with debounce
- Inbound Inbox & payload modal
- Settings & OmniRouter AI Health
- Tenant creation modal (+ Nova Conta)
"""

import os
from pathlib import Path
import pytest

pytest.importorskip("playwright")
from playwright.sync_api import sync_playwright

from accounts.models import Account, ApiKey
from channels.models import MailIdentity, WhatsAppNumber
from notify.models import InboundEvent, Notification

pytestmark = pytest.mark.django_db(transaction=True)

SCREENSHOTS_DIR = Path(os.getenv("SCREENSHOTS_DIR", str(Path(__file__).parent / "screenshots")))
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)


@pytest.fixture(scope="function")
def seed_dashboard_data(db):
    """Seed base account and test entities for browser navigation."""
    acc, _ = Account.objects.get_or_create(
        slug="default",
        defaults={"name": "Conta Padrão", "color": "#3b82f6", "is_active": True},
    )
    ApiKey.objects.get_or_create(
        account=acc,
        label="Key Default",
        defaults={"key_hash": ApiKey.hash_key("test-key-playwright")},
    )
    wn, _ = WhatsAppNumber.objects.get_or_create(
        account=acc,
        slug="principal",
        defaults={
            "instance_name": "default",
            "phone_number": "5542999990000",
            "connection_status": "open",
            "is_default": True,
        },
    )
    MailIdentity.objects.get_or_create(
        account=acc,
        from_email="no-reply@v7m.org",
        defaults={
            "from_name": "Notify Default",
            "smtp_host": "10.0.1.20",
            "smtp_port": 587,
            "smtp_user": "no-reply@v7m.org",
            "is_default": True,
        },
    )
    # Seed sample notifications for active search testing
    Notification.objects.create(
        account=acc,
        caller="playwright-test",
        recipient_phone="5542999991111",
        text="Notificação de Teste Alfa",
        whatsapp_status="sent",
        want_whatsapp=True,
    )
    Notification.objects.create(
        account=acc,
        caller="playwright-test",
        recipient_phone="5542999992222",
        text="Aviso de Teste Beta",
        whatsapp_status="failed",
        whatsapp_error="Timeout de rede",
        want_whatsapp=True,
    )
    # Seed inbound message
    InboundEvent.objects.create(
        account=acc,
        from_number="5542999993333",
        instance_name="default",
        preview="Olá, gostaria de saber mais sobre o pedido #12345",
        wa_message_id="wa-playwright-inbound-1",
        forwarded=True,
    )
    return acc


def test_browser_e2e_full_workflow(live_server, seed_dashboard_data, monkeypatch):
    """Executa o ciclo completo de navegação e interatividade em um browser real."""
    acc = seed_dashboard_data
    base_url = live_server.url

    # Mock do StalwartClient para carregar domínios e caixas sem depender de servidor externo
    class FakeStalwart:
        def __enter__(self):
            return self
        def __exit__(self, *a):
            pass
        def list_domains(self):
            return ["v7m.org", "supletivo.net.br"]
        def list_mailboxes(self, domain=None):
            dom = domain or "v7m.org"
            return [
                {"username": f"no-reply@{dom}", "local_part": "no-reply", "domain": dom, "name": "Notify Default"},
                {"username": f"contato@{dom}", "local_part": "contato", "domain": dom, "name": "Atendimento"},
                {"username": f"suporte@{dom}", "local_part": "suporte", "domain": dom, "name": "Suporte Técnico"},
            ]
        def ensure_mailbox(self, local_part, domain, name=""):
            return ({"local_part": local_part, "domain": domain}, "generated-secret-pwd", True)

    monkeypatch.setattr("mail.stalwart.get_client", lambda: FakeStalwart())

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 850})
        page = context.new_page()

        # ── 1. Overview / Home ──────────────────────────────────────────────
        page.goto(f"{base_url}/dashboard/?app={acc.slug}")
        page.wait_for_selector(".app-sidebar")
        assert "Notify" in page.title()
        assert page.locator("#app-select").input_value() == "default"
        page.screenshot(path=str(SCREENSHOTS_DIR / "01_overview.png"))

        # ── 2. Navegação com Mouse para E-mail ──────────────────────────────
        # Clica no item de menu "E-mail" da sidebar usando o mouse
        email_nav = page.locator(".sidebar-nav a:has-text('E-mail')")
        email_nav.hover()
        email_nav.click()
        page.wait_for_url("**/dashboard/email/**")
        page.wait_for_selector("text=Configurações de Envio SMTP")
        page.screenshot(path=str(SCREENSHOTS_DIR / "02_email_loaded.png"))

        # ── 3. Formulário de Envio SMTP (Digitação + Clique com Mouse) ─────
        page.fill("input[name='from_email']", "contato@v7m.org")
        page.fill("input[name='from_name']", "V7M Notificações")
        page.fill("input[name='smtp_host']", "mail.v7m.org")
        page.fill("input[name='smtp_port']", "587")
        page.fill("input[name='smtp_user']", "contato@v7m.org")
        page.fill("input[name='smtp_password']", "senha-smtp-segura")

        # Clica no botão "Salvar Credenciais SMTP" com o mouse
        save_btn = page.locator("button:has-text('Salvar Credenciais SMTP')")
        save_btn.hover()
        save_btn.click()
        page.wait_for_selector("#mail-save-result :has-text('salvas')")
        page.screenshot(path=str(SCREENSHOTS_DIR / "03_email_smtp_saved.png"))

        # ── 4. Stalwart Mailboxes & Vínculo com Botão e Mouse ───────────────
        page.wait_for_selector("#domain-select")
        page.wait_for_selector("#mailboxes-container select[name='selected_mailbox']")
        
        # Seleciona uma caixa existente no select e clica em Vincular Caixa
        page.select_option("#mailboxes-container select[name='selected_mailbox']", "suporte@v7m.org")
        bind_btn = page.locator("button:has-text('Vincular Caixa Selecionada')")
        bind_btn.hover()
        bind_btn.click()
        page.wait_for_selector("#mailbox-action-result :has-text('vinculada com sucesso')")
        page.screenshot(path=str(SCREENSHOTS_DIR / "04_email_mailbox_bound.png"))

        # ── 5. Criar Nova Caixa no Servidor via Mouse ───────────────────────
        page.fill("input[name='local_part']", "financeiro")
        new_box_btn = page.locator("button:has-text('Criar Nova Caixa')")
        new_box_btn.hover()
        new_box_btn.click()
        page.wait_for_selector("#mailbox-action-result :has-text('criada')")
        page.screenshot(path=str(SCREENSHOTS_DIR / "05_email_new_mailbox_created.png"))

        # ── 6. Salvar Shell Template de E-mail ──────────────────────────────
        page.fill("input[name='brand_name']", "Plataforma V7M")
        page.fill("input[name='accent_color']", "#6366f1")
        shell_save_btn = page.locator("button:has-text('Salvar Template Shell')")
        shell_save_btn.hover()
        shell_save_btn.click()
        page.wait_for_selector("#shell-result :has-text('salvo com sucesso')")
        page.screenshot(path=str(SCREENSHOTS_DIR / "06_email_shell_saved.png"))

        # ── 7. Visualizar Preview do Template em Nova Aba ───────────────────
        with context.expect_page() as new_page_info:
            page.locator("a:has-text('Abrir Preview em Nova Aba')").click()
        preview_page = new_page_info.value
        preview_page.wait_for_load_state()
        preview_page.screenshot(path=str(SCREENSHOTS_DIR / "07_email_preview_tab.png"))
        preview_page.close()

        # ── 8. Messages Outbound & Active Search com Debounce ───────────────
        page.locator(".sidebar-nav a:has-text('Envios')").click()
        page.wait_for_url("**/dashboard/messages/**")
        page.wait_for_selector("#messages-table-container")
        assert page.locator("text=Notificação de Teste Alfa").is_visible()
        assert page.locator("text=Aviso de Teste Beta").is_visible()

        # Digita na busca ativa (com debounce 350ms)
        search_input = page.locator("#search-form input[type='search']")
        search_input.fill("Alfa")
        page.locator("text=Aviso de Teste Beta").wait_for(state="detached", timeout=5000)
        assert page.locator("text=Notificação de Teste Alfa").is_visible()
        page.screenshot(path=str(SCREENSHOTS_DIR / "08_messages_search.png"))

        # ── 9. Inbound Inbox ────────────────────────────────────────────────
        page.locator(".sidebar-nav a:has-text('Recebidas')").click()
        page.wait_for_url("**/dashboard/inbox/**")
        page.wait_for_selector("#inbox-table-container")
        assert page.locator("text=Olá, gostaria de saber mais").is_visible()
        page.screenshot(path=str(SCREENSHOTS_DIR / "09_inbox.png"))

        # ── 10. WhatsApp Screen ─────────────────────────────────────────────
        page.locator(".sidebar-nav a:has-text('WhatsApp')").click()
        page.wait_for_url("**/dashboard/whatsapp/**")
        page.wait_for_selector("#qr-output")
        page.screenshot(path=str(SCREENSHOTS_DIR / "10_whatsapp.png"))

        # ── 11. Settings Screen ─────────────────────────────────────────────
        page.locator(".sidebar-nav a:has-text('Configurações')").click()
        page.wait_for_url("**/dashboard/settings/**")
        page.wait_for_selector("text=Configurações & Chaves de API")
        page.screenshot(path=str(SCREENSHOTS_DIR / "11_settings.png"))

        # ── 12. Criação de Nova Conta via Modal Topbar ──────────────────────
        page.locator("button:has-text('Nova Conta')").click()
        page.wait_for_selector("#modal-new-account", state="visible")
        page.fill("#modal-new-account input[name='name']", "Loja Playwright")
        page.fill("#modal-new-account input[name='slug']", "loja-playwright")
        page.click("#modal-new-account button[type='submit']")

        # Redireciona para o novo tenant
        page.wait_for_url(lambda url: "loja-playwright" in url, timeout=10000)
        page.screenshot(path=str(SCREENSHOTS_DIR / "12_new_tenant_created.png"))

        browser.close()
