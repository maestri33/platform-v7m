"""Testes do stub de pairing do WhatsApp fallback (Evolution GO, Step 2)."""
import pytest


pytestmark = pytest.mark.django_db


# ── GET /controlpanel/whatsapp/fallback/pair/ ──────────────────────────────


def test_fallback_pair_returns_200(client):
    """Rota existe, renderiza, não explode."""
    resp = client.get("/controlpanel/whatsapp/fallback/pair/")
    assert resp.status_code == 200
    body = resp.content.decode()
    assert "Parear WhatsApp Fallback" in body
    assert "Evolution GO" in body
    assert "Em construção" in body
    assert "operator + DB" in body
    assert "fica offline" in body


# ── link no dashboard ──────────────────────────────────────────────────────


def test_dashboard_has_fallback_pair_link(client):
    """Dashboard mostra link pra parear o fallback."""
    from django.utils import timezone
    from controlpanel.models import ControlPanelState

    state = ControlPanelState.load()
    ControlPanelState.objects.filter(pk=state.pk).update(completed_at=timezone.now())

    resp = client.get("/")
    assert resp.status_code == 200
    body = resp.content.decode()
    assert "Parear WhatsApp Fallback" in body
    # aponta pra rota certa
    assert 'href="/controlpanel/whatsapp/fallback/pair/"' in body
