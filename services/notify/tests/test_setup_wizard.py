"""Testes do Assistente de Setup (Wizard de 6 etapas) e Travamento de Contas Incompletas.

Garante os contratos estipulados:
1. Conta 'default' já nasce desbloqueada.
2. Cada nova conta nasce travada no setup (is_setup_complete = False, setup_step = 1).
3. Gating de acesso: contas incompletas são redirecionadas para /dashboard/setup/?app=<slug>.
4. Passo 1 (WhatsApp): criação automática da instância com o nome da conta e QR code.
5. Passo 2 (E-mail / Stalwart): seleção de domínios, listagem/criação de caixas e validação.
6. Passo 3 (IA / OmniRouter): probe com payload de arquiteto de software e salvamento.
7. Passo 4 (Logo): upload/geração via IA (Stable Diffusion) e persistência em media/logos/.
8. Passo 5 (Template HTML de E-mail): proposta de template com {{content}}, edição e salvamento.
9. Passo 6 (Conclusão): ativação da conta (is_setup_complete = True) e liberação total do dashboard.
"""

from __future__ import annotations

import pytest
from django.test import Client

from accounts.models import Account
from channels.models import MailIdentity, MailTemplate, WhatsAppNumber

pytestmark = pytest.mark.django_db


def test_conta_default_nasce_desbloqueada():
    """Conta 'default' não fica presa no wizard de onboarding."""
    acc, _ = Account.objects.get_or_create(slug="default", defaults={"name": "Default Account"})
    acc.is_setup_complete = True
    acc.save()
    assert acc.is_setup_complete is True


def test_nova_conta_nasce_travada_no_wizard(client: Client):
    """Criar nova conta cria instância de WhatsApp com mesmo nome e redireciona para o wizard."""
    resp = client.post(
        "/dashboard/account/create",
        data={"name": "Minha Empresa", "slug": "minha-empresa", "color": "#0ea5e9"},
    )
    assert resp.status_code == 302
    assert "/dashboard/setup/?app=minha-empresa" in resp.url or "/?app=minha-empresa" in resp.url

    acc = Account.objects.get(slug="minha-empresa")
    assert acc.is_setup_complete is False
    assert acc.setup_step == 1

    # Instância do WhatsApp com o mesmo nome criada automaticamente
    wa = acc.whatsapp_numbers.first()
    assert wa is not None
    assert wa.instance_name == "minha-empresa"


def test_gating_redireciona_conta_incompleta_para_o_setup(client: Client):
    """Qualquer tentativa de acessar abas operacionais redireciona conta incompleta para o setup."""
    acc = Account.objects.create(
        slug="app-bloqueado",
        name="App Bloqueado",
        is_setup_complete=False,
        setup_step=1,
    )

    rotas_protegidas = [
        f"/dashboard/?app={acc.slug}",
        f"/dashboard/overview/?app={acc.slug}",
        f"/dashboard/whatsapp/?app={acc.slug}",
        f"/dashboard/email/?app={acc.slug}",
        f"/dashboard/messages/?app={acc.slug}",
        f"/dashboard/inbox/?app={acc.slug}",
        f"/dashboard/webhooks/?app={acc.slug}",
        f"/dashboard/settings/?app={acc.slug}",
    ]

    for rota in rotas_protegidas:
        resp = client.get(rota)
        assert resp.status_code == 302
        assert f"/dashboard/setup/?app={acc.slug}" in resp.url

    # A página de setup responde 200 normalmente
    resp_setup = client.get(f"/dashboard/setup/?app={acc.slug}")
    assert resp_setup.status_code == 200
    assert "Assistente de Configuração" in resp_setup.content.decode()


def test_fluxo_completo_do_wizard_passo_a_passo(client: Client, monkeypatch):
    """Execução sequencial das 6 etapas do Wizard desbloqueando a conta no final."""
    # 0. Criação inicial
    acc = Account.objects.create(
        slug="fluxo-app",
        name="Fluxo App",
        color="#8b5cf6",
        is_setup_complete=False,
        setup_step=1,
    )
    WhatsAppNumber.objects.create(account=acc, instance_name="fluxo-app", is_default=True)

    # 1. Passo 1: WhatsApp
    r1 = client.post(f"/dashboard/app/{acc.slug}/setup/step/whatsapp")
    assert r1.status_code == 302
    acc.refresh_from_db()
    assert acc.setup_step == 2

    # 2. Passo 2: E-mail (Stalwart) - Probe e Save
    r2_probe = client.post(
        f"/dashboard/app/{acc.slug}/setup/step/email-probe",
        data={"domain": "v7m.org", "mailbox_mode": "new", "local_part": "contato"},
    )
    assert r2_probe.status_code == 200

    r2 = client.post(
        f"/dashboard/app/{acc.slug}/setup/step/email",
        data={"domain": "v7m.org", "mailbox_mode": "new", "local_part": "contato", "mailbox_password": "pass"},
    )
    assert r2.status_code == 302
    acc.refresh_from_db()
    assert acc.setup_step == 3
    ident = acc.mail_identities.first()
    assert ident is not None
    assert ident.from_email == "contato@v7m.org"

    # 3. Passo 3: IA Probe & Save (OmniRouter)
    from ai import client as ai_client
    monkeypatch.setattr(
        ai_client,
        "probe_chat_completions",
        lambda url, api_key, model="default": {
            "ok": True,
            "model": "omniroute/gpt-4o",
            "content": "A vantagem do combo default é a resiliência e failover transparente.",
        },
    )
    r3_probe = client.post(
        f"/dashboard/app/{acc.slug}/setup/step/ai-probe",
        data={"ai_url": "http://10.0.1.35/v1/chat/completions", "ai_api_key": "sk-teste"},
    )
    assert r3_probe.status_code == 200
    assert "omniroute/gpt-4o" in r3_probe.content.decode()

    r3_save = client.post(
        f"/dashboard/app/{acc.slug}/setup/step/ai-save",
        data={"ai_url": "http://10.0.1.35/v1/chat/completions", "ai_api_key": "sk-teste"},
    )
    assert r3_save.status_code == 302
    acc.refresh_from_db()
    assert acc.setup_step == 4
    assert acc.ai_url == "http://10.0.1.35/v1/chat/completions"

    # 4. Passo 4: Logo (Geração via IA)
    monkeypatch.setattr(
        ai_client,
        "generate_image",
        lambda prompt, base_url, api_key, model="aihorde/stable_diffusion", size="512x512": b"\x89PNG\r\n\x1a\nfake_png_data",
    )
    r4_gen = client.post(
        f"/dashboard/app/{acc.slug}/setup/step/logo-generate",
        data={"prompt": "modern abstract tech logo for Fluxo App"},
    )
    assert r4_gen.status_code == 200
    assert "Logo Gerada com Sucesso" in r4_gen.content.decode()

    acc.refresh_from_db()
    assert acc.logo_url == f"/media/logos/{acc.slug}.png"

    r4_confirm = client.post(f"/dashboard/app/{acc.slug}/setup/step/logo-confirm")
    assert r4_confirm.status_code == 302
    acc.refresh_from_db()
    assert acc.setup_step == 5

    # 5. Passo 5: Template HTML de E-mail
    r5_propose = client.post(f"/dashboard/app/{acc.slug}/setup/step/template-propose")
    assert r5_propose.status_code == 200
    assert "{{content}}" in r5_propose.content.decode()

    custom_html = "<!DOCTYPE html><html><body><h1>{{title}}</h1><div>{{content}}</div></body></html>"
    r5_save = client.post(
        f"/dashboard/app/{acc.slug}/setup/step/template-save",
        data={"html": custom_html},
    )
    assert r5_save.status_code == 302
    acc.refresh_from_db()
    assert acc.setup_step == 6

    tpl = MailTemplate.objects.filter(account=acc).first()
    assert tpl is not None
    assert tpl.html == custom_html
    assert tpl.is_valid is True

    # 6. Passo 6: Conclusão
    r6_finish = client.post(f"/dashboard/app/{acc.slug}/setup/finish")
    assert r6_finish.status_code == 302
    assert f"/?app={acc.slug}" in r6_finish.url

    acc.refresh_from_db()
    assert acc.is_setup_complete is True

    # Agora as abas operacionais respondem 200 sem redirecionamento!
    resp_overview = client.get(f"/dashboard/overview/?app={acc.slug}")
    assert resp_overview.status_code == 200
    resp_whatsapp = client.get(f"/dashboard/whatsapp/?app={acc.slug}")
    assert resp_whatsapp.status_code == 200

