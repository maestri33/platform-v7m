"""Template de e-mail por conta — a marca deixa de ser um `if` no despacho."""

import pytest

from accounts.models import Account
from channels.models import MailIdentity, MailTemplate
from mail import crypto, templates as mail_templates
from notify.models import Notification


@pytest.mark.django_db
def test_conta_sem_shell_cai_no_arquivo_default(account):
    html = mail_templates.render_for_account(account, "default", title="T", content="corpo")
    assert "corpo" in html
    assert "<html" in html.lower()


@pytest.mark.django_db
def test_shell_da_conta_tem_precedencia_sobre_o_arquivo(account):
    MailTemplate.objects.create(
        account=account,
        html="<html><body data-marca='X'>{{title}}|{{content}}|{{service_name}}</body></html>",
        brand_name="Marca da Conta",
    )
    html = mail_templates.render_for_account(account, "v7m", title="Assunto", content="corpo")
    assert "data-marca='X'" in html
    assert "Marca da Conta" in html
    assert "Assunto" in html


@pytest.mark.django_db
def test_shell_invalido_e_ignorado_em_vez_de_quebrar_o_envio(account):
    """HTML sem {{content}} não pode virar e-mail em branco: cai no default."""
    MailTemplate.objects.create(account=account, html="<html>esqueci o marcador</html>")
    html = mail_templates.render_for_account(account, "default", title="T", content="corpo-unico")
    assert "corpo-unico" in html
    assert "esqueci o marcador" not in html


@pytest.mark.django_db
def test_conteudo_markdown_vira_html_seguro(account):
    MailTemplate.objects.create(account=account, html="<html>{{content}}</html>")
    html = mail_templates.render_for_account(
        account, None, title="T", content="**forte** e <script>alert(1)</script>"
    )
    assert "<strong>forte</strong>" in html
    assert "<script>" not in html


@pytest.mark.django_db
def test_remetente_usa_a_marca_da_conta(account):
    """Antes, `mail_template == 'v7m'` forçava o from_name 'V7M' em qualquer conta."""
    from notify.dispatch import _get_mail_client

    MailIdentity.objects.create(
        account=account, from_email="noreply@v7m.org", from_name="Identidade Padrão",
        smtp_host="h", smtp_port=587, smtp_user="u", smtp_password=crypto.encrypt("p"),
        is_default=True,
    )
    MailTemplate.objects.create(
        account=account, html="<html>{{content}}</html>", brand_name="Marca da Conta"
    )
    notif = Notification.objects.create(
        account=account, caller="t", recipient_email="a@b.com", text="oi", mail_template="v7m"
    )
    assert _get_mail_client(notif).from_header.startswith("Marca da Conta <")


@pytest.mark.django_db
def test_shell_e_por_conta_e_nao_vaza_para_a_outra(account):
    outra = Account.objects.create(slug="outro-app", name="Outro")
    MailTemplate.objects.create(account=account, html="<html>SO-DA-PRIMEIRA {{content}}</html>")
    html = mail_templates.render_for_account(outra, "default", title="T", content="corpo")
    assert "SO-DA-PRIMEIRA" not in html


@pytest.mark.django_db
def test_provisionamento_da_shell_propria_ao_app_novo():
    from notify.provisioning import provision_app

    report = provision_app(slug="app-novo", name="App Novo", seed_templates=False)
    passos = {s.name: s.status for s in report.steps}
    assert passos["mail_template"] == "ok"
    shell = MailTemplate.objects.get(account__slug="app-novo")
    assert shell.is_valid
    assert shell.brand_name == "App Novo"


@pytest.mark.django_db
def test_provisionamento_registra_webhook_do_app():
    from channels.models import AppWebhook
    from notify.provisioning import provision_app

    provision_app(
        slug="app-hook", webhook_url="http://app.invalid/hook", webhook_secret="s",
        seed_templates=False,
    )
    hook = AppWebhook.objects.get(account__slug="app-hook")
    assert hook.url == "http://app.invalid/hook"
    assert hook.event_list == ["status", "inbound"]
