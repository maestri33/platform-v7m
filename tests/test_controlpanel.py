"""Testes legados do controlpanel — só os que ainda se aplicam."""
import pytest


@pytest.mark.django_db
def test_control_actions_reject_get_requests(client):
    """Endpoints POST-only rejeitam GET com 405."""
    for path in (
        "/controlpanel/readiness/",
        "/controlpanel/complete/",
        "/controlpanel/reopen/",
    ):
        assert client.get(path).status_code == 405


@pytest.mark.django_db
def test_readiness_is_a_persistent_singleton(client):
    """ControlPanelState é singleton (pk fixo)."""
    from controlpanel.models import ControlPanelState

    first = ControlPanelState.load()
    second = ControlPanelState.load()

    assert first.pk == ControlPanelState.SINGLETON_PK
    assert second.pk == first.pk
    assert ControlPanelState.objects.count() == 1
