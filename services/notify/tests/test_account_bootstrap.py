import pytest

from accounts.bootstrap import ensure_default_account
from accounts.models import Account
from accounts.auth import resolve_account


pytestmark = pytest.mark.django_db


def test_bootstrap_cria_tenant_default_e_e_idempotente(settings):
    settings.NOTIFY_DEFAULT_ACCOUNT_SLUG = "automatico"
    settings.NOTIFY_DEFAULT_ACCOUNT_NAME = "Tenant Automático"

    first, created = ensure_default_account()
    second, created_again = ensure_default_account()

    assert created is True
    assert created_again is False
    assert first.pk == second.pk
    assert first.name == "Tenant Automático"
    assert Account.objects.filter(slug="automatico").count() == 1


def test_request_sem_conta_recupera_tenant_default_ausente(rf, settings):
    settings.NOTIFY_DEFAULT_ACCOUNT_SLUG = "default-novo"
    settings.NOTIFY_DEFAULT_ACCOUNT_NAME = "Default Novo"

    account = resolve_account(rf.get("/notify"))

    assert account.slug == "default-novo"
    assert account.name == "Default Novo"
