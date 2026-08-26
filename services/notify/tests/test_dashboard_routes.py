"""Testes das novas rotas divididas por área e do Bootstrap de canais."""

import pytest
from accounts.models import Account
from channels.models import DRIVER_GO, MailIdentity, WhatsAppNumber
from notify.dashboard import get_app_readiness


@pytest.mark.django_db
def test_readiness_identifica_canais_desconfigurados(account):
    # App virgem: nada configurado
    r = get_app_readiness(account)
    assert r["wa_ready"] is False
    assert r["mail_ready"] is False
    assert r["is_complete"] is False
    assert r["next_step"] == "whatsapp"

    # Configura WhatsApp
    wa = WhatsAppNumber.objects.create(
        account=account, slug="principal", instance_name="testes", driver=DRIVER_GO, is_default=True
    )
    wa.set_go_token("tok-123")
    wa.save()

    r = get_app_readiness(account)
    assert r["wa_ready"] is True
    assert r["mail_ready"] is False
    assert r["is_complete"] is False
    assert r["next_step"] == "email"

    # Configura E-mail
    MailIdentity.objects.create(
        account=account, from_email="notificacoes@v7m.org", smtp_host="mail.v7m.org", is_default=True
    )

    r = get_app_readiness(account)
    assert r["wa_ready"] is True
    assert r["mail_ready"] is True
    assert r["is_complete"] is True
    assert r["next_step"] == "test"


@pytest.mark.django_db
def test_rotas_das_areas_respondem_200(client, account):
    rotas = [
        f"/?app={account.slug}",
        f"/dashboard/?app={account.slug}",
        f"/dashboard/whatsapp/?app={account.slug}",
        f"/dashboard/email/?app={account.slug}",
        f"/dashboard/messages/?app={account.slug}",
        f"/dashboard/inbox/?app={account.slug}",
        f"/dashboard/webhooks/?app={account.slug}",
        f"/dashboard/webhook/stream",
        f"/dashboard/settings/?app={account.slug}",
        f"/dashboard/setup/?app={account.slug}",
    ]
    for url in rotas:
        resp = client.get(url)
        assert resp.status_code == 200, f"URL {url} falhou com status {resp.status_code}"


@pytest.mark.django_db
def test_inbox_renderiza_eventos_inbound(client, account):
    from notify.models import InboundEvent

    InboundEvent.objects.create(
        account=account,
        from_number="5542999998888",
        instance_name="default",
        preview="Olá, gostaria de informações sobre o curso",
        payload={"msg": "Olá"},
    )
    resp = client.get(f"/dashboard/inbox/?app={account.slug}")
    assert resp.status_code == 200
    html = resp.content.decode()
    assert "5542999998888" in html
    assert "Olá, gostaria de informações sobre o curso" in html

    # Partial /dashboard/app/<slug>/inbox
    resp_part = client.get(f"/dashboard/app/{account.slug}/inbox")
    assert resp_part.status_code == 200
    html_part = resp_part.content.decode()
    assert "5542999998888" in html_part


@pytest.mark.django_db
def test_mail_domains_e_mailboxes_flow(client, account, monkeypatch):
    # Mock do StalwartClient
    class FakeStalwart:
        def __enter__(self):
            return self
        def __exit__(self, *a):
            pass
        def list_domains(self):
            return ["v7m.org", "empresa.com.br"]
        def list_mailboxes(self, domain=None):
            return [
                {"username": "no-reply@v7m.org", "local_part": "no-reply", "domain": "v7m.org", "name": "Notify Default"},
                {"username": "contato@v7m.org", "local_part": "contato", "domain": "v7m.org", "name": "Atendimento"},
            ]

    monkeypatch.setattr("mail.stalwart.get_client", lambda: FakeStalwart())

    # 1. Carrega domínios
    resp_dom = client.get(f"/dashboard/app/{account.slug}/mail/domains")
    assert resp_dom.status_code == 200
    assert '<option value="v7m.org">v7m.org</option>' in resp_dom.content.decode()
    assert '<option value="empresa.com.br">empresa.com.br</option>' in resp_dom.content.decode()

    # 2. Carrega caixas existentes para o domínio v7m.org
    resp_boxes = client.get(f"/dashboard/app/{account.slug}/mail/mailboxes?domain=v7m.org")
    assert resp_boxes.status_code == 200
    boxes_html = resp_boxes.content.decode()
    assert "no-reply@v7m.org" in boxes_html
    assert "contato@v7m.org" in boxes_html
    assert "Vincular Caixa Selecionada" in boxes_html

    # 3. Vincula uma caixa existente
    resp_bind = client.post(f"/dashboard/app/{account.slug}/mail/bind", {"selected_mailbox": "contato@v7m.org"})
    assert resp_bind.status_code == 200
    assert "vinculada com sucesso" in resp_bind.content.decode()

    # Verifica no banco de dados
    ident = account.mail_identities.filter(from_email="contato@v7m.org").first()
    assert ident is not None
    assert ident.is_default is True


@pytest.mark.django_db
def test_mail_shell_ai_and_preview(client, account):
    from channels.models import MailTemplate

    # 1. Teste shell_ai
    resp_ai = client.post(
        f"/dashboard/app/{account.slug}/mailtemplate/ai",
        {"brand_name": "Test Brand", "accent_color": "#ff0000", "instructions": "layout moderno"},
    )
    assert resp_ai.status_code == 200
    ai_html = resp_ai.content.decode()
    assert "Sugestão gerada pela IA" in ai_html
    assert "Aplicar ao Editor" in ai_html

    # 2. Salva um shell customizado
    resp_save = client.post(
        f"/dashboard/app/{account.slug}/mailtemplate",
        {
            "brand_name": "Minha Marca",
            "accent_color": "#123456",
            "html": "<div style='color:red'><h1>{{title}}</h1><h2>{{service_name}}</h2><div>{{content}}</div></div>",
        },
    )
    assert resp_save.status_code == 200
    assert "salvo com sucesso" in resp_save.content.decode().lower()

    # 3. Preview do shell
    resp_prev = client.get(f"/dashboard/app/{account.slug}/mailtemplate/preview")
    assert resp_prev.status_code == 200
    prev_html = resp_prev.content.decode()
    assert "Assunto de Teste" in prev_html
    assert "Minha Marca" in prev_html
    assert "{{content}}" not in prev_html
    assert "{{title}}" not in prev_html
    assert "{{service_name}}" not in prev_html


@pytest.mark.django_db
def test_dashboard_context_has_shell(client, account):
    from channels.models import MailTemplate

    MailTemplate.objects.create(
        account=account,
        brand_name="Custom Brand",
        accent_color="#abcdef",
        html="<div>{{content}}</div>",
    )

    resp = client.get(f"/dashboard/email/?app={account.slug}")
    assert resp.status_code == 200
    html = resp.content.decode()
    assert "Custom Brand" in html
    assert "#abcdef" in html


@pytest.mark.django_db
def test_delete_default_account_blocked(client):
    from accounts.models import Account
    acc, _ = Account.objects.get_or_create(slug="default", defaults={"name": "Default Account"})
    resp = client.post(f"/dashboard/app/default/account/delete")
    assert resp.status_code == 400
    assert "não pode ser excluída" in resp.content.decode()
    assert Account.objects.filter(slug="default").exists()


@pytest.mark.django_db
def test_delete_account_atomic(client):
    from accounts.models import Account, ApiKey
    from channels.models import WhatsAppNumber, MailIdentity, MailTemplate, AppWebhook
    from notify.models import Notification, InboundEvent

    temp_acc = Account.objects.create(slug="temp-app", name="Temp App")
    ApiKey.objects.create(account=temp_acc, key_hash="test-hash-123", label="Key 1")
    WhatsAppNumber.objects.create(account=temp_acc, slug="wa-1", instance_name="temp-instance")
    MailIdentity.objects.create(account=temp_acc, from_email="temp@v7m.org", smtp_host="10.0.1.20", smtp_port=587, smtp_user="temp@v7m.org", smtp_password="pwd")
    MailTemplate.objects.create(account=temp_acc, html="<div>{{content}}</div>")
    AppWebhook.objects.create(account=temp_acc, url="https://example.com/webhook")
    Notification.objects.create(account=temp_acc, text="Test message", recipient_phone="5542999998888")
    InboundEvent.objects.create(account=temp_acc, instance_name="temp-instance", wa_message_id="msg-12345", from_number="5542999998888", payload={"test": True})

    resp = client.post(f"/dashboard/app/{temp_acc.slug}/account/delete")
    assert resp.status_code == 200
    assert resp["HX-Redirect"] == "/dashboard/?app=default"

    # Confirma que a conta e todos os dependentes foram limpos atomicamente em cascata
    assert not Account.objects.filter(slug="temp-app").exists()
    assert not ApiKey.objects.filter(account_id=temp_acc.id).exists()
    assert not WhatsAppNumber.objects.filter(account_id=temp_acc.id).exists()
    assert not MailIdentity.objects.filter(account_id=temp_acc.id).exists()
    assert not MailTemplate.objects.filter(account_id=temp_acc.id).exists()
    assert not AppWebhook.objects.filter(account_id=temp_acc.id).exists()
    assert not Notification.objects.filter(account_id=temp_acc.id).exists()
    assert not InboundEvent.objects.filter(account_id=temp_acc.id).exists()


