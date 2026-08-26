"""Fixtures comuns — conta autenticada, TestClient do Django Ninja e Django Client."""

import pytest
from django.test import Client
from ninja.testing import TestClient

from accounts.models import Account, ApiKey
from api.instance import api as ninja_api
from notify.interface import templates as _templates

RAW_KEY = "test-key-nao-e-segredo"


@pytest.fixture(autouse=True)
def _clear_template_cache():
    # cache module-level (TTL 30s) vaza entre testes; limpa antes e depois
    _templates.invalidate()
    yield
    _templates.invalidate()


@pytest.fixture(autouse=True)
def _clear_inmemory_guards():
    # breaker e rate limit são estado de processo — vazam entre testes.
    from notify import ratelimit
    from whatsapp import breaker

    breaker.reset()
    ratelimit.reset()
    yield
    breaker.reset()
    ratelimit.reset()


@pytest.fixture
def account(db):
    acc = Account.objects.create(slug="testes", name="Conta de testes", is_active=True, is_setup_complete=True)
    ApiKey.objects.create(account=acc, key_hash=ApiKey.hash_key(RAW_KEY), label="pytest", is_active=True)
    return acc


@pytest.fixture
def inactive_account(db):
    acc = Account.objects.create(slug="inativa", name="Conta Inativa", is_active=False)
    ApiKey.objects.create(account=acc, key_hash=ApiKey.hash_key("key-inativa"), label="pytest-inativa", is_active=True)
    return acc


@pytest.fixture
def auth_headers(account):
    return {"Authorization": f"Bearer {RAW_KEY}"}


@pytest.fixture
def client():
    """Django test client clássico."""
    return Client()


@pytest.fixture
def ninja_client():
    """Ninja TestClient para validar o pipeline real de serialização e validação."""
    return TestClient(ninja_api)


@pytest.fixture
def api_client(ninja_client, auth_headers):
    """Ninja TestClient pré-autenticado."""
    class AuthenticatedNinjaClient:
        def __init__(self, c, headers):
            self._client = c
            self._headers = headers

        def get(self, path, query=None, headers=None, **kw):
            h = {**self._headers, **(headers or {})}
            return self._client.get(path, query=query, headers=h, **kw)

        def post(self, path, json=None, data=None, headers=None, **kw):
            h = {**self._headers, **(headers or {})}
            return self._client.post(path, json=json, data=data, headers=h, **kw)

        def put(self, path, json=None, data=None, headers=None, **kw):
            h = {**self._headers, **(headers or {})}
            return self._client.put(path, json=json, data=data, headers=h, **kw)

        def delete(self, path, query=None, headers=None, **kw):
            h = {**self._headers, **(headers or {})}
            return self._client.delete(path, query=query, headers=h, **kw)

    return AuthenticatedNinjaClient(ninja_client, auth_headers)
