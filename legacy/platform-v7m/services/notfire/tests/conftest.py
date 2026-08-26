"""Fixtures comuns — conta autenticada + client HTTP contra as rotas reais (/v1/...)."""

import pytest
from django.test import Client

from accounts.models import Account, ApiKey
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
    acc = Account.objects.create(slug="testes", name="Conta de testes")
    ApiKey.objects.create(account=acc, key_hash=ApiKey.hash_key(RAW_KEY), label="pytest")
    return acc


@pytest.fixture
def auth_headers(account):
    return {"Authorization": f"Bearer {RAW_KEY}"}


@pytest.fixture
def client():
    return Client()
