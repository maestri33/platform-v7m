"""Provisionamento de app — idempotência e falha parcial.

As duas propriedades que estes testes protegem:

- **reprovisionar não estraga o que já roda**: não gera key nova, não troca a
  senha do SMTP, não recria instância (recriar destrói a credencial da sessão);
- **falha de um passo não apaga os outros**: mailcow fora deixa conta e WhatsApp
  prontos e reporta só o e-mail como `failed`.
"""

from __future__ import annotations

import pytest

from accounts.models import Account, ApiKey
from channels.models import DRIVER_GO, MailIdentity, WhatsAppNumber
from notify.provisioning import FAILED, OK, REUSED, SKIPPED, provision_app

pytestmark = pytest.mark.django_db


@pytest.fixture
def evolutions_ok(monkeypatch):
    """GO respondendo; registra o que foi chamado."""
    chamadas: dict[str, list] = {"go": [], "webhook": []}

    def go_ensure(*, instance_name):
        chamadas["go"].append(instance_name)
        return {"name": instance_name, "token": f"tok-{instance_name}"}, True

    monkeypatch.setattr("whatsapp.provisioning.go_ensure_instance", go_ensure)
    monkeypatch.setattr(
        "whatsapp.provisioning.go_set_webhook",
        lambda token, name, url=None: chamadas["webhook"].append(("go", name)),
    )
    return chamadas


@pytest.fixture
def mailcow_ok(monkeypatch):
    class _MC:
        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def list_domains(self):
            return ["v7m.org"]

        def ensure_mailbox(self, *, local_part, domain, name="", rotate_password=False, **kw):
            criada = not getattr(self, "_criada", False)
            type(self)._criada = True
            senha = "senha-forte-de-teste" if (criada or rotate_password) else None
            return {"username": f"{local_part}@{domain}"}, senha, criada

    monkeypatch.setattr("mail.get_admin_client", lambda: _MC())
    yield
    if hasattr(_MC, "_criada"):
        del _MC._criada


# ── caminho feliz ───────────────────────────────────────────────────────────

def test_provisiona_app_completo(evolutions_ok, mailcow_ok):
    report = provision_app(
        slug="meuapp",
        name="Meu App",
        phone_number="554299999999",
        email_local_part="noreply",
        email_domain="v7m.org",
        seed_templates=False,
    )

    assert report.failed == []
    assert report.api_key and len(report.api_key) > 20

    status = {s.name: s.status for s in report.steps}
    assert status["account"] == OK
    assert status["api_key"] == OK
    assert status["evolution_go"] == OK
    assert status["whatsapp_number"] == OK
    assert status["mailcow"] == OK
    assert status["mail_identity"] == OK
    assert status["templates"] == SKIPPED

    account = Account.objects.get(slug="meuapp")
    number = account.whatsapp_numbers.get()
    assert number.phone_number == "554299999999"
    assert number.driver == DRIVER_GO
    assert number.go_api_key() == "tok-meuapp"  # token da instância, não a key global
    assert number.is_default

    identity = account.mail_identities.get()
    assert identity.from_email == "noreply@v7m.org"
    assert identity.smtp_password != "senha-forte-de-teste"  # guardada cifrada


def test_provisiona_instancia_na_go_unica(evolutions_ok, mailcow_ok):
    provision_app(slug="unico-prov", phone_number="554288887777", seed_templates=False)
    assert evolutions_ok["go"] == ["unico-prov"]
    assert ("go", "unico-prov") in evolutions_ok["webhook"]


# ── idempotência ────────────────────────────────────────────────────────────

def test_reprovisionar_nao_gera_key_nova(evolutions_ok, mailcow_ok):
    primeiro = provision_app(slug="idem", seed_templates=False)
    segundo = provision_app(slug="idem", seed_templates=False)

    assert primeiro.api_key is not None
    assert segundo.api_key is None, "reprovisionar não pode invalidar a key em uso"
    assert ApiKey.objects.filter(account__slug="idem", is_active=True).count() == 1
    assert {s.name: s.status for s in segundo.steps}["account"] == REUSED


def test_rotate_api_key_gera_chave_nova(evolutions_ok, mailcow_ok):
    provision_app(slug="rot", seed_templates=False)
    segundo = provision_app(slug="rot", seed_templates=False, rotate_api_key=True)

    assert segundo.api_key is not None
    assert ApiKey.objects.filter(account__slug="rot", is_active=True).count() == 2


def test_reprovisionar_nao_duplica_numero_nem_identidade(evolutions_ok, mailcow_ok):
    for _ in range(3):
        provision_app(
            slug="unico",
            phone_number="554277776666",
            email_local_part="noreply",
            email_domain="v7m.org",
            seed_templates=False,
        )

    account = Account.objects.get(slug="unico")
    assert account.whatsapp_numbers.count() == 1
    assert account.mail_identities.count() == 1


# ── falha parcial ───────────────────────────────────────────────────────────

def test_mailcow_fora_nao_impede_conta_e_whatsapp(evolutions_ok, monkeypatch):
    def explode():
        raise RuntimeError("servidor de e-mail inacessível")

    monkeypatch.setattr("mail.get_admin_client", explode)

    report = provision_app(
        slug="parcial",
        email_local_part="noreply",
        email_domain="v7m.org",
        seed_templates=False,
    )

    status = {s.name: s.status for s in report.steps}
    assert status["mailcow"] == FAILED
    assert status["account"] == OK
    assert status["whatsapp_number"] == OK
    assert report.failed == ["mailcow"]
    assert WhatsAppNumber.objects.filter(account__slug="parcial").exists()


def test_evolution_go_fora_impede_o_numero_mas_nao_a_conta(monkeypatch):
    """GO é o único provedor: se falhar, o número fica sem sessão — mas a conta sobe."""

    def go_explode(*, instance_name):
        raise RuntimeError("go fora do ar")

    monkeypatch.setattr("whatsapp.provisioning.go_ensure_instance", go_explode)

    report = provision_app(slug="sogo", seed_templates=False)
    status = {s.name: s.status for s in report.steps}

    assert status["evolution_go"] == FAILED
    assert status["account"] == OK
    assert status["whatsapp_number"] == OK
    assert "evolution_go" in report.failed
    numero = WhatsAppNumber.objects.get(account__slug="sogo")
    assert numero.driver == DRIVER_GO
    assert numero.go_api_key() == ""


def test_caixa_preexistente_sem_senha_conhecida_reporta_em_vez_de_criar_identidade_quebrada(
    evolutions_ok, monkeypatch
):
    """Sem a senha, uma MailIdentity só falharia no primeiro envio — melhor avisar."""

    class _MC:
        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def list_domains(self):
            return ["v7m.org"]

        def ensure_mailbox(self, **kw):
            return {"username": "noreply@v7m.org"}, None, False

    monkeypatch.setattr("mail.get_admin_client", lambda: _MC())

    report = provision_app(
        slug="semsenha",
        email_local_part="noreply",
        email_domain="v7m.org",
        seed_templates=False,
    )
    status = {s.name: s.status for s in report.steps}

    assert status["mailcow"] == REUSED
    assert status["mail_identity"] == FAILED
    assert not MailIdentity.objects.filter(account__slug="semsenha").exists()


def test_dominio_inexistente_no_mailcow_falha_cedo(evolutions_ok, monkeypatch):
    class _MC:
        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def list_domains(self):
            return ["v7m.org"]

    monkeypatch.setattr("mail.get_admin_client", lambda: _MC())

    report = provision_app(
        slug="domruim",
        email_local_part="noreply",
        email_domain="dominio-que-nao-existe.com",
        seed_templates=False,
    )
    detalhe = next(s.detail for s in report.steps if s.name == "mailcow")
    assert "não existe no servidor de e-mail" in detalhe


# ── API ─────────────────────────────────────────────────────────────────────

def test_endpoint_devolve_207_quando_um_passo_falha(
    client, auth_headers, evolutions_ok, monkeypatch
):
    monkeypatch.setattr(
        "mail.get_admin_client", lambda: (_ for _ in ()).throw(RuntimeError("fora"))
    )

    resp = client.post(
        "/v1/admin/apps",
        data={
            "slug": "viaapi",
            "email_local_part": "noreply",
            "email_domain": "v7m.org",
            "seed_templates": False,
        },
        content_type="application/json",
        headers=auth_headers,
    )

    assert resp.status_code == 207
    body = resp.json()
    assert body["failed"] == ["mailcow"]
    assert body["api_key"]


def test_endpoint_devolve_201_no_caminho_feliz(client, auth_headers, evolutions_ok, mailcow_ok):
    resp = client.post(
        "/v1/admin/apps",
        data={"slug": "feliz", "seed_templates": False},
        content_type="application/json",
        headers=auth_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["failed"] == []


def test_endpoint_rejeita_driver_invalido(client, auth_headers):
    resp = client.post(
        "/v1/admin/apps",
        data={"slug": "x", "driver": "telegram"},
        content_type="application/json",
        headers=auth_headers,
    )
    assert resp.status_code == 400
