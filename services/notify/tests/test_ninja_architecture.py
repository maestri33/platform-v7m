"""Testes de conformidade arquitetural do Django Ninja, Schemas Pydantic v2 e N+1."""

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext

from accounts.models import Account, ApiKey
from channels.models import AppWebhook, MailIdentity, WhatsAppNumber
from notify.models import Notification, Template, Trigger

pytestmark = pytest.mark.django_db


# ── 1. OpenAPI & Schemas Declarativos ────────────────────────────────────────

def test_openapi_schema_declarativo(ninja_client):
    """Garante que /openapi.json é gerado com BearerAuth e servidores sem monkey-patch."""
    resp = ninja_client.get("/openapi.json")
    assert resp.status_code == 200
    schema = resp.json()

    assert schema["info"]["title"] == "Notify Server"
    assert schema["info"]["version"] == "v1"
    assert any(s["url"] == "http://10.1.30.114" for s in schema.get("servers", []))

    components = schema.get("components", {})
    security_schemes = components.get("securitySchemes", {})
    assert "VpnBearerAuth" in security_schemes or "BearerAuth" in security_schemes
    auth_scheme = security_schemes.get("VpnBearerAuth") or security_schemes.get("BearerAuth")
    assert auth_scheme["type"] == "http"
    assert auth_scheme["scheme"] == "bearer"


# ── 2. Validação Pydantic v2 & HTTP 422 ─────────────────────────────────────

def test_pydantic_validation_error_retorna_422(ninja_client, account):
    """Payload com tipos incompatíveis deve retornar 422 com detalhes estruturados."""
    resp = ninja_client.post(
        "/notify",
        json={
            "content": "oi",
            "whatsapp": "5542999990000",
            "account_id": account.slug,
            "options": {"run_sync": "tipo_invalido_nao_booleano"},
        },
    )
    assert resp.status_code == 422
    data = resp.json()
    assert "detail" in data
    assert any(err.get("loc", [])[-1] == "run_sync" for err in data["detail"])


def test_phone_check_payload_invalido_retorna_422(api_client):
    """Enviar string em vez de lista de telefones gera 422."""
    resp = api_client.post("/v1/phone/check", json={"numbers": "5542999990000"})
    assert resp.status_code == 422
    assert "detail" in resp.json()


# ── 3. Autenticação & Autorização (HTTP 403 / 404) ──────────────────────────

def test_conta_desativada_retorna_403(ninja_client, inactive_account):
    """Requisições direcionadas para contas desativadas devem retornar 403."""
    resp = ninja_client.post(
        "/notify",
        json={
            "content": "Mensagem de teste",
            "whatsapp": "5542999990000",
            "account_id": inactive_account.slug,
        },
    )
    assert resp.status_code == 403
    assert "desativada" in resp.json()["detail"]


def test_conta_inexistente_retorna_404(ninja_client):
    """account_id inexistente deve retornar 404 claro."""
    resp = ninja_client.post(
        "/notify",
        json={
            "content": "Mensagem",
            "whatsapp": "5542999990000",
            "account_id": "conta-fantasma-xyz",
        },
    )
    assert resp.status_code == 404
    assert "não existe" in resp.json()["detail"]


# ── 4. Regras de Comandos Ricos no /notify (HTTP 400) ──────────────────────

def test_multiplos_rich_commands_simultaneos_retorna_400(api_client):
    """Não é permitido enviar mais de um rich command (poll + pix) na mesma mensagem."""
    resp = api_client.post(
        "/notify",
        json={
            "content": "Escolha ou pague",
            "whatsapp": "5542999990000",
            "options": {
                "poll": {"question": "Opção?", "options": ["A", "B"]},
                "pix": {"payload": "00020126580014BR.GOV.BCB.PIX..."},
            },
        },
    )
    assert resp.status_code == 400
    assert "apenas um comando" in resp.json()["detail"]


def test_rich_command_sem_whatsapp_retorna_400(api_client):
    """Comandos ricos exigem destino WhatsApp, não funcionam apenas com e-mail."""
    resp = api_client.post(
        "/notify",
        json={
            "content": "Pague via Pix",
            "email": "cliente@example.com",
            "options": {"pix": {"payload": "00020126580014BR.GOV.BCB.PIX..."}},
        },
    )
    assert resp.status_code == 400
    assert "exigem um destino whatsapp" in resp.json()["detail"]


# ── 5. Verificação de Performance e Prevenção de N+1 Queries ────────────────

def test_list_apps_sem_n_plus_one(api_client):
    """GET /v1/admin/apps deve executar queries fixas independente do número de contas."""
    for i in range(5):
        acc = Account.objects.create(slug=f"tenant-{i}", name=f"Tenant {i}")
        ApiKey.objects.create(account=acc, key_hash=ApiKey.hash_key(f"key-{i}"), label="test")
        WhatsAppNumber.objects.create(account=acc, slug="principal", instance_name=f"inst-{i}", phone_number="55119999")
        MailIdentity.objects.create(account=acc, smtp_host="smtp.ex.com", from_name="Test", from_email=f"t{i}@ex.com")
        AppWebhook.objects.create(account=acc, url="https://webhook.ex.com")
        Template.objects.create(account=acc, event="boas-vindas", body_md="Oi")

    with CaptureQueriesContext(connection) as ctx:
        resp = api_client.get("/v1/admin/apps")
        assert resp.status_code == 200
        assert len(resp.json()) >= 5

    # Deve executar poucas queries (Accounts com aggregate + prefetches de tabelas relacionadas)
    # Sem N+1, a contagem de queries fica em <= 6, ao invés de 5 * 6 + 1 = 31 queries
    assert len(ctx.captured_queries) <= 6


def test_list_templates_sem_n_plus_one(api_client, account):
    """GET /v1/staff/templates deve carregar todos os templates e seus triggers sem N+1."""
    for i in range(10):
        t = Template.objects.create(account=account, event=f"evento-{i}", body_md="Texto")
        Trigger.objects.create(template=t, fires_on="order.created", delay_minutes=5)

    with CaptureQueriesContext(connection) as ctx:
        resp = api_client.get("/v1/staff/templates")
        assert resp.status_code == 200
        assert len(resp.json()) >= 10

    # 1 query de auth (ApiKey) + 1 query de templates (select_related trigger e account) = 2 queries no total
    assert len(ctx.captured_queries) == 2


def test_template_stats_com_agregacao_unica(api_client, account):
    """GET /v1/staff/templates/stats deve executar agregação SQL com FILTER."""
    Template.objects.create(account=account, event="ev-normal", body_md="Texto")
    Template.objects.create(account=account, event="ev-story", body_md="Texto", storytelling=True)

    with CaptureQueriesContext(connection) as ctx:
        resp = api_client.get("/v1/staff/templates/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 2
        assert data["with_storytelling"] >= 1

    # 1 query de auth (ApiKey) + 1 query de agregação SQL = 2 queries no total
    assert len(ctx.captured_queries) == 2


# ── 6. Django Frontend & HDA Patterns (HTMX & Stop Polling 286) ────────────

def test_htmx_active_search_bifurcation(client, account):
    """GET /dashboard/messages/ com header HX-Request retorna apenas o partial da tabela."""
    Notification.objects.create(account=account, caller="test", text="Alerta Crítico Alpha", recipient_phone="5542999990001")
    Notification.objects.create(account=account, caller="test", text="Mensagem Beta", recipient_phone="5542999990002")

    # Requisição HTMX com filtro
    resp = client.get(
        f"/dashboard/messages/?app={account.slug}&q=Alpha",
        headers={"HX-Request": "true"},
    )
    assert resp.status_code == 200
    content = resp.content.decode("utf-8")
    assert "<table" in content
    assert "Alerta Crítico Alpha" in content
    assert "Mensagem Beta" not in content
    # Garante que não renderizou o layout completo (base.html)
    assert "<!doctype html>" not in content
    assert "app-sidebar" not in content


def test_htmx_inbox_search_bifurcation(client, account):
    """GET /dashboard/inbox/ com header HX-Request retorna apenas o partial do inbox."""
    from notify.models import InboundEvent

    InboundEvent.objects.create(account=account, from_number="5542999990001", instance_name="default", preview="Olá suporte", wa_message_id="wa-msg-1")
    InboundEvent.objects.create(account=account, from_number="5542999990002", instance_name="default", preview="Pedido cancelado", wa_message_id="wa-msg-2")

    resp = client.get(
        f"/dashboard/inbox/?app={account.slug}&q=cancelado",
        headers={"HX-Request": "true"},
    )
    assert resp.status_code == 200
    content = resp.content.decode("utf-8")
    assert "Pedido cancelado" in content
    assert "Olá suporte" not in content
    assert "<!doctype html>" not in content


def test_htmx_qr_code_returns_286_when_connected(client, account, monkeypatch):
    """Quando o WhatsApp está conectado, /whatsapp/qr deve retornar HTTP 286 (HX-Stop-Polling)."""
    wn = WhatsAppNumber.objects.create(account=account, slug="principal", instance_name=account.slug, phone_number="5542999990000")

    class FakeResp:
        status_code = 200
        def json(self):
            return {"data": {"LoggedIn": True, "JID": "5542999990000@s.whatsapp.net", "Name": "WhatsApp Test"}}

    import httpx
    monkeypatch.setattr(httpx, "get", lambda *args, **kwargs: FakeResp())

    resp = client.get(f"/dashboard/app/{account.slug}/whatsapp/qr")
    assert resp.status_code == 286
    assert "Conectado" in resp.content.decode("utf-8")

