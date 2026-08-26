"""Testes E2E ponta a ponta: Bootstrap, Onboarding, Dashboard, MCP, e Despacho."""

import json
import pytest
from django.test import Client
from accounts.models import Account, ApiKey
from channels.models import DRIVER_GO, MailIdentity, WhatsAppNumber
from notify.dashboard import get_app_readiness


@pytest.mark.django_db
def test_e2e_completo_onboarding_e_dashboard(client: Client):
    # 1. Health
    r_health = client.get("/v1/health")
    assert r_health.status_code == 200
    assert r_health.json()["status"] == "ok"

    # 2. Criar nova conta pelo dashboard
    r_create = client.post(
        "/dashboard/account/create",
        data={"name": "Empresa Alpha", "slug": "alpha"},
    )
    assert r_create.status_code == 302
    assert "/?app=alpha" in r_create.url

    acc = Account.objects.get(slug="alpha")
    assert acc.name == "Empresa Alpha"

    # 3. Verificar que WhatsApp foi provisionado para o novo app e conta travada no setup
    wa = acc.whatsapp_numbers.first()
    assert wa is not None
    assert wa.instance_name == "alpha"
    assert acc.is_setup_complete is False

    # 4. Executar os 6 passos do Setup Wizard
    # Passo 1: WhatsApp
    r_step1 = client.post(f"/dashboard/app/{acc.slug}/setup/step/whatsapp")
    assert r_step1.status_code == 302

    # Passo 2: E-mail (configurar identidade)
    r_step2 = client.post(
        f"/dashboard/app/{acc.slug}/setup/step/email",
        data={"domain": "v7m.org", "action_type": "create", "new_account_name": "no-reply", "new_secret": "pass123"},
    )
    assert r_step2.status_code == 302

    mail = acc.mail_identities.first()
    assert mail is not None
    assert mail.from_email == "no-reply@v7m.org"

    # Passo 3: IA Probe & Save
    r_step3 = client.post(
        f"/dashboard/app/{acc.slug}/setup/step/ai-save",
        data={"ai_url": "http://10.0.1.35/v1/chat/completions", "ai_api_key": "sk-test"},
    )
    assert r_step3.status_code == 302

    # Passo 4: Logo
    r_step4 = client.post(f"/dashboard/app/{acc.slug}/setup/step/logo-confirm")
    assert r_step4.status_code == 302

    # Passo 5: Template
    r_step5 = client.post(
        f"/dashboard/app/{acc.slug}/setup/step/template-save",
        data={"html": "<div>{{title}}</div><div>{{content}}</div>"},
    )
    assert r_step5.status_code == 302

    # Passo 6: Conclusão do Setup (libera acesso operacional)
    r_step6 = client.post(f"/dashboard/app/{acc.slug}/setup/finish")
    assert r_step6.status_code == 302

    acc.refresh_from_db()
    assert acc.is_setup_complete is True

    # 5. Verificar rotas do Dashboard para o app desbloqueado
    routes = [
        f"/?app={acc.slug}",
        f"/dashboard/whatsapp/?app={acc.slug}",
        f"/dashboard/email/?app={acc.slug}",
        f"/dashboard/messages/?app={acc.slug}",
        f"/dashboard/inbox/?app={acc.slug}",
        f"/dashboard/webhooks/?app={acc.slug}",
        f"/dashboard/settings/?app={acc.slug}",
        f"/dashboard/setup/?app={acc.slug}",
    ]
    for route in routes:
        resp = client.get(route)
        assert resp.status_code == 200, f"Falha na rota {route}"

    # 6. Testar endpoints HTMX de auto-discovery
    r_domains = client.get(f"/dashboard/app/{acc.slug}/mail/domains")
    assert r_domains.status_code == 200
    assert "<option" in r_domains.content.decode()

    # 7. Testar servidor MCP JSON-RPC
    mcp_init = client.post(
        "/mcp",
        data=json.dumps({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "e2e-tester", "version": "1.0"},
            },
        }),
        content_type="application/json",
    )
    assert mcp_init.status_code == 200
    assert mcp_init.json()["result"]["serverInfo"]["name"] == "notify"

    mcp_tools = client.post(
        "/mcp",
        data=json.dumps({"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}}),
        content_type="application/json",
    )
    assert mcp_tools.status_code == 200
    tools = mcp_tools.json()["result"]["tools"]
    tool_names = {t["name"] for t in tools}
    assert "notify_send" in tool_names
    assert "notify_send_event" in tool_names
    assert "notify_channels" in tool_names

    # 7. Testar envio de notificação com IA e Pix
    raw_secret = "test-secret-alpha-key"
    ApiKey.objects.create(account=acc, key_hash=ApiKey.hash_key(raw_secret), label="Test E2E")
    auth_header = {"HTTP_AUTHORIZATION": f"Bearer {raw_secret}"}

    r_notify = client.post(
        "/notify",
        data=json.dumps({
            "whatsapp": "5542999998888",
            "email": "cliente@exemplo.com",
            "subject": "Fatura Aberta",
            "content": "Olá! Sua fatura está disponível para pagamento via Pix.",
            "options": {
                "ai_adapt": False,
                "pix": {
                    "key": "financeiro@v7m.org",
                    "key_type": "email",
                    "name": "Empresa Alpha",
                },
            },
        }),
        content_type="application/json",
        **auth_header,
    )
    assert r_notify.status_code == 200
    res_body = r_notify.json()
    assert "external_id" in res_body
    assert res_body["account"] == "alpha"
    assert "whatsapp" in res_body["channels"]
    assert "email" in res_body["channels"]

    # 8. Testar envio de enquete / botões interativos
    r_poll = client.post(
        "/notify",
        data=json.dumps({
            "whatsapp": "5542999998888",
            "content": "Como você avalia nosso atendimento?",
            "options": {
                "poll": {
                    "question": "Como você avalia nosso atendimento?",
                    "options": ["⭐ Excelente", "👍 Bom", "👎 Regular"],
                    "selectable_count": 1,
                },
            },
        }),
        content_type="application/json",
        **auth_header,
    )
    assert r_poll.status_code == 200
    poll_body = r_poll.json()
    assert "external_id" in poll_body
    assert "whatsapp" in poll_body["channels"]
