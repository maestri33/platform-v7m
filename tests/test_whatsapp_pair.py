"""Testes do skeleton de pairing WhatsApp (Fase 2 do plano)."""
import pytest


pytestmark = pytest.mark.django_db


# ── Helpers ────────────────────────────────────────────────────────────────


class _FakeAdmin:
    """Stand-in para EvolutionAdminClient. Configurável."""

    def __init__(self, *, configured=True, instances=None, raise_on=None, qr="", state="connecting"):
        self.is_configured = configured
        self._instances = instances or []
        self._raise_on = raise_on or set()
        self._qr = qr
        self._state = state
        self.created: list[str] = []
        self.deleted: list[str] = []

    def list_instances(self):
        if "list" in self._raise_on:
            from whatsapp.admin import EvolutionAdminError
            raise EvolutionAdminError("boom")
        return self._instances

    def create_instance(self, name, phone=None):
        if "create" in self._raise_on:
            from whatsapp.admin import EvolutionAdminError
            raise EvolutionAdminError("create failed")
        self.created.append(name)
        self._instances.append({"name": name})
        return {"instance": {"instanceName": name}}

    def get_connect_qr(self, name):
        if "qr" in self._raise_on:
            from whatsapp.admin import EvolutionAdminError
            raise EvolutionAdminError("qr failed")
        return (self._qr or None), self._state

    def get_connection_state(self, name):
        return self._state

    def delete_instance(self, name):
        if "delete" in self._raise_on:
            from whatsapp.admin import EvolutionAdminError
            raise EvolutionAdminError("delete failed")
        self.deleted.append(name)
        self._instances = [i for i in self._instances if i.get("name") != name]


@pytest.fixture
def fake_admin(monkeypatch):
    """Substitui EvolutionAdminClient() por um _FakeAdmin configurável via dict."""
    instances = {"value": []}
    flag = {"configured": True, "qr": "", "state": "connecting", "raise_on": set()}

    class _Factory:
        def __new__(cls, *args, **kwargs):
            return _FakeAdmin(
                configured=flag["configured"],
                instances=instances["value"],
                raise_on=flag["raise_on"],
                qr=flag["qr"],
                state=flag["state"],
            )

    from whatsapp import admin
    monkeypatch.setattr(admin, "EvolutionAdminClient", _Factory)
    return instances, flag


# ── whatsapp_pair (GET) ────────────────────────────────────────────────────


def test_pair_shows_config_error_when_unconfigured(client, fake_admin):
    """Sem URL no .env, mostra mensagem clara em vez de explodir."""
    instances, flag = fake_admin
    flag["configured"] = False
    resp = client.get("/controlpanel/whatsapp/pair/")
    assert resp.status_code == 200
    body = resp.content.decode()
    assert "Evolution v2 indisponível" in body
    assert "WHATSAPP_API_BASE_URL" in body


def test_pair_lists_instances_and_creates(client, account, fake_admin):
    """Lista instâncias e tem form de criar."""
    instances, flag = fake_admin
    instances["value"] = [{"name": "v7m-oficial"}]
    resp = client.get("/controlpanel/whatsapp/pair/")
    assert resp.status_code == 200
    body = resp.content.decode()
    assert "v7m-oficial" in body
    assert "Criar" in body


def test_pair_swallows_list_error(client, fake_admin):
    """Erro de comunicação com Evolution vira alert, não 500."""
    instances, flag = fake_admin
    flag["raise_on"] = {"list"}
    resp = client.get("/controlpanel/whatsapp/pair/")
    assert resp.status_code == 200
    body = resp.content.decode()
    assert "boom" in body


# ── whatsapp_pair_create (POST) ────────────────────────────────────────────


def test_pair_create_redirects_on_success(client, account, fake_admin):
    """POST cria instância e volta pra tela de pairing."""
    resp = client.post("/controlpanel/whatsapp/pair/create/", {"instance_name": "v7m-novo", "phone": "5511999990000"})
    assert resp.status_code == 302
    assert resp.headers["Location"].endswith("/controlpanel/whatsapp/pair/")


def test_pair_create_returns_400_when_name_empty(client, account, fake_admin):
    resp = client.post("/controlpanel/whatsapp/pair/create/", {"instance_name": ""})
    assert resp.status_code == 400


def test_pair_create_returns_502_when_evolution_fails(client, account, fake_admin):
    """Erro da Evolution vira 502 com mensagem."""
    instances, flag = fake_admin
    flag["raise_on"] = {"create"}
    resp = client.post("/controlpanel/whatsapp/pair/create/", {"instance_name": "v7m-fail"})
    assert resp.status_code == 502
    assert "create failed" in resp.content.decode()


# ── whatsapp_pair_status (GET JSON) ────────────────────────────────────────


def test_pair_status_returns_qr(client, account, fake_admin):
    """Endpoint JSON devolve state + qr (base64)."""
    instances, flag = fake_admin
    flag["qr"] = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAAA1BMVEX///+nxBvIAAAAC0lEQVQI12NgAAIAAAUAAeImBZsAAAAASUVORK5CYII="
    flag["state"] = "connecting"
    resp = client.get("/controlpanel/whatsapp/pair/v7m-oficial/status/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["state"] == "connecting"
    assert data["qr"].startswith("iVBORw0")


def test_pair_status_returns_open_state_without_qr(client, account, fake_admin):
    """Já conectado: state=open, qr=null."""
    instances, flag = fake_admin
    flag["qr"] = ""
    flag["state"] = "open"
    resp = client.get("/controlpanel/whatsapp/pair/v7m-oficial/status/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["state"] == "open"
    assert data["qr"] is None


def test_pair_status_returns_503_when_misconfigured(client, fake_admin):
    """Sem URL configurada, 503 com mensagem de erro (não 500)."""
    instances, flag = fake_admin
    flag["configured"] = False
    resp = client.get("/controlpanel/whatsapp/pair/v7m-oficial/status/")
    assert resp.status_code == 503
    data = resp.json()
    assert data["state"] == "misconfigured"
    assert "ausentes" in data["error"]


# ── whatsapp_pair_register (POST) ──────────────────────────────────────────


def test_pair_register_creates_whatsapp_number(client, account, fake_admin):
    """Registra instância conectada como WhatsAppNumber na conta."""
    from channels.models import WhatsAppNumber
    resp = client.post(
        "/controlpanel/whatsapp/pair/register/",
        {"instance_name": "v7m-oficial", "account_slug": account.slug, "is_default": "on"},
    )
    assert resp.status_code == 302
    wn = WhatsAppNumber.objects.get(account=account, instance_name="v7m-oficial")
    assert wn.is_default is True
    assert wn.slug == "v7m-oficial"


def test_pair_register_updates_existing_whatsapp_number(client, account, fake_admin):
    """Segunda chamada com mesmo instance_name atualiza o row (não duplica)."""
    from channels.models import WhatsAppNumber
    WhatsAppNumber.objects.create(account=account, slug="v7m-oficial", instance_name="old", is_default=False)
    client.post(
        "/controlpanel/whatsapp/pair/register/",
        {"instance_name": "v7m-oficial", "account_slug": account.slug, "is_default": "on"},
    )
    assert WhatsAppNumber.objects.filter(account=account, instance_name="v7m-oficial").count() == 1


def test_pair_register_404_when_account_missing(client, account, fake_admin):
    resp = client.post(
        "/controlpanel/whatsapp/pair/register/",
        {"instance_name": "x", "account_slug": "no-such-account"},
    )
    assert resp.status_code == 404


# ── whatsapp_pair_delete (POST) ────────────────────────────────────────────


def test_pair_delete_redirects_on_success(client, account, fake_admin):
    """Delete com sucesso redireciona."""
    resp = client.post("/controlpanel/whatsapp/pair/v7m-oficial/delete/")
    assert resp.status_code == 302


def test_pair_delete_returns_502_when_evolution_fails(client, account, fake_admin):
    """Erro da Evolution vira 502."""
    instances, flag = fake_admin
    flag["raise_on"] = {"delete"}
    resp = client.post("/controlpanel/whatsapp/pair/v7m-oficial/delete/")
    assert resp.status_code == 502


# ── EvolutionAdminClient direto ────────────────────────────────────────────


def test_admin_client_raises_when_misconfigured(settings):
    """Sem URL+key no settings, qualquer chamada raise EvolutionAdminError."""
    from whatsapp.admin import EvolutionAdminClient, EvolutionAdminError
    settings.WHATSAPP_API_BASE_URL = ""
    settings.WHATSAPP_GLOBAL_API_KEY = ""
    client = EvolutionAdminClient()
    assert client.is_configured is False
    with pytest.raises(EvolutionAdminError) as exc:
        client.list_instances()
    assert "WHATSAPP_API_BASE_URL" in str(exc.value)
