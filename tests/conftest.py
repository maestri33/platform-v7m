"""Fixtures comuns — conta autenticada + client HTTP contra as rotas reais (/v1/...)."""

import pytest
from django.test import Client

from accounts.models import Account, ApiKey

RAW_KEY = "test-key-nao-e-segredo"


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
