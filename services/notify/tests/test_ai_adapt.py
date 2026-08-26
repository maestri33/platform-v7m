"""Adaptação IA por canal — fail-open sempre (D2).

O que estes testes travam:
- OmniRouter fora/JSON inválido/placeholder perdido → conteúdo ORIGINAL segue;
- adaptação válida troca o texto do canal e sugere assunto;
- TEST_MODE nunca chama IA;
- no dispatch, o texto adaptado vai pro e-mail sem tocar o notif.text salvo.
"""

from __future__ import annotations

import json

import pytest
from django.test import override_settings

from ai import adapt as adapt_mod
from ai.client import AiUnavailable


def _ok_response(**kw):
    data = {"whatsapp": "", "email": "", "subject": ""}
    data.update(kw)
    return json.dumps(data)


# ── unidade: adapt() ────────────────────────────────────────────────────────

def test_gateway_fora_devolve_original(monkeypatch):
    def _boom(*a, **kw):
        raise AiUnavailable("timeout")

    monkeypatch.setattr(adapt_mod, "complete", _boom)
    out = adapt_mod.adapt("Olá {nome}", channels=["whatsapp", "email"])

    assert out == {"whatsapp": "Olá {nome}", "email": "Olá {nome}", "subject": "", "adapted": False}


def test_json_invalido_devolve_original(monkeypatch):
    monkeypatch.setattr(adapt_mod, "complete", lambda *a, **kw: "claro! aqui está: ...")
    out = adapt_mod.adapt("Olá", channels=["whatsapp"])
    assert out["adapted"] is False and out["whatsapp"] == "Olá"


def test_adaptacao_valida_troca_texto_e_sugere_assunto(monkeypatch):
    monkeypatch.setattr(
        adapt_mod,
        "complete",
        lambda *a, **kw: _ok_response(
            whatsapp="*Oi {nome}!* Aprovado.", email="Olá {nome}, aprovado.", subject="Cadastro aprovado"
        ),
    )
    out = adapt_mod.adapt("{nome}, seu cadastro foi aprovado", channels=["whatsapp", "email"])

    assert out["adapted"] is True
    assert out["whatsapp"].startswith("*Oi {nome}")
    assert out["email"].startswith("Olá {nome}")
    assert out["subject"] == "Cadastro aprovado"


def test_placeholder_perdido_descarta_o_canal(monkeypatch):
    monkeypatch.setattr(
        adapt_mod,
        "complete",
        lambda *a, **kw: _ok_response(whatsapp="Oi! Aprovado.", email="Olá {nome}, aprovado."),
    )
    out = adapt_mod.adapt("{nome}, aprovado", channels=["whatsapp", "email"])

    assert out["whatsapp"] == "{nome}, aprovado"  # descartado: perdeu {nome}
    assert out["email"] == "Olá {nome}, aprovado."


def test_cerca_de_markdown_no_json_e_tolerada(monkeypatch):
    raw = "```json\n" + _ok_response(whatsapp="Oi") + "\n```"
    monkeypatch.setattr(adapt_mod, "complete", lambda *a, **kw: raw)
    assert adapt_mod.adapt("Oi", channels=["whatsapp"])["adapted"] is True


# ── liga/desliga ────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_test_mode_nunca_chama_ia(account):
    account.ai_adapt = True
    assert adapt_mod.enabled_for(account) is False  # tests/settings.py: TEST_MODE=1


@pytest.mark.django_db
@override_settings(TEST_MODE=False)
def test_liga_por_conta_e_por_env(account):
    account.ai_adapt = True
    assert adapt_mod.enabled_for(account) is True

    account.ai_adapt = False
    assert adapt_mod.enabled_for(account) is False

    account.ai_adapt = True
    with override_settings(AI_ADAPT_ENABLED=False):
        assert adapt_mod.enabled_for(account) is False


# ── integração: dispatch usa o texto adaptado ───────────────────────────────

class _FakeMailClient:
    def __init__(self):
        self.sent: list[dict] = []

    async def send_email(self, to_email, subject, *, html_body, plain_body=None):
        self.sent.append({"subject": subject, "html": html_body, "plain": plain_body})
        return {}


@pytest.mark.django_db
@override_settings(TEST_MODE=False)
def test_dispatch_envia_email_com_texto_adaptado(account, monkeypatch):
    from notify import dispatch as dispatch_mod
    from notify.models import Notification

    client = _FakeMailClient()
    monkeypatch.setattr(dispatch_mod, "_get_mail_client", lambda notif: client)
    monkeypatch.setattr(
        adapt_mod,
        "complete",
        lambda *a, **kw: _ok_response(email="Prezado, sua fatura venceu.", subject="Fatura vencida"),
    )

    notif = Notification.objects.create(
        account=account,
        caller="pytest",
        recipient_email="x@example.com",
        text="fatura venceu, paga aí",
        want_email=True,
        want_whatsapp=False,
        whatsapp_status="skipped",
        email_status="pending",
    )
    dispatch_mod.dispatch(notif.id)

    assert client.sent[0]["plain"] == "Prezado, sua fatura venceu."
    assert client.sent[0]["subject"] == "Fatura vencida"

    notif.refresh_from_db()
    assert notif.text == "fatura venceu, paga aí"  # original intocado no DB
    assert notif.email_status == "sent"
