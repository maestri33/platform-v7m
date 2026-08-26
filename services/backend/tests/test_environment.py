import pytest
from django.core.exceptions import ImproperlyConfigured

from core.environment import resolve_environment, resolve_external_fakes


def test_prod_nunca_aceita_test_mode_legado():
    with pytest.raises(ImproperlyConfigured):
        resolve_environment(
            app_env="prod",
            legacy_test_mode=True,
            hostname="prod-1",
            allowed_test_hosts=[],
        )


def test_non_prod_exige_hostname_explicito():
    with pytest.raises(ImproperlyConfigured):
        resolve_environment(
            app_env="preview",
            legacy_test_mode=False,
            hostname="preview-1",
            allowed_test_hosts=[],
        )


def test_preview_habilita_test_mode_no_host_autorizado():
    result = resolve_environment(
        app_env="preview",
        legacy_test_mode=False,
        hostname="preview-1",
        allowed_test_hosts=["preview-1"],
    )
    assert result.app_env == "preview"
    assert result.test_mode is True


def test_prod_nunca_aceita_adaptadores_externos_sinteticos():
    with pytest.raises(ImproperlyConfigured):
        resolve_external_fakes(app_env="prod", requested=True)
