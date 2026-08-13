"""Testes enxutos das features novas do dashboard: logo, TemplateRequest, Complaint, smoke test, middleware IP."""
import io
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest


pytestmark = pytest.mark.django_db


# ── Account.logo upload ────────────────────────────────────────────────────


def test_edit_account_saves_color_and_logo(client, account, settings, monkeypatch):
    """POST com color_primary + logo (PNG dummy) atualiza a Account."""
    with tempfile.TemporaryDirectory() as tmp:
        monkeypatch.setattr(settings, "MEDIA_ROOT", tmp)
        monkeypatch.setattr(settings, "MEDIA_URL", "/media/")
        # dummy PNG header
        png_bytes = b"\x89PNG\r\n\x1a\n" + b"fakepng"
        upload = io.BytesIO(png_bytes)
        upload.name = "logo.png"
        resp = client.post(
            f"/controlpanel/account/{account.slug}/edit/",
            {"color_primary": "#FF00AA", "logo": upload},
            follow=False,
        )
        assert resp.status_code == 302
    account.refresh_from_db()
    assert account.color_primary == "#FF00AA"
    assert account.logo
    assert account.logo.name.startswith(f"account_logos/{account.slug}/")


# ── TemplateRequest workflow ──────────────────────────────────────────────


def test_submit_template_request_creates_pending_row(client, account):
    resp = client.post(
        f"/controlpanel/template-request/{account.slug}/submit/",
        {
            "event": "promo.teste",
            "title": "Promo",
            "body_md": "Oi {nome}, aproveite!",
            "channels": "whatsapp",
            "requested_by": "tester",
        },
    )
    assert resp.status_code == 302
    from notify.models import TemplateRequest
    tr = TemplateRequest.objects.get(account=account, event="promo.teste")
    assert tr.status == TemplateRequest.PENDING
    assert tr.requested_by == "tester"


def test_approve_request_creates_active_template_and_marks_approved(client, account):
    from notify.models import Template, TemplateRequest
    tr = TemplateRequest.objects.create(
        account=account, event="promo.aprovada", body_md="Oi!",
        channels="whatsapp,email", requested_by="tester",
    )
    resp = client.post(
        f"/controlpanel/template-request/{tr.pk}/decide/",
        {"action": "approve", "reviewer_notes": "ok"},
    )
    assert resp.status_code == 302
    tr.refresh_from_db()
    assert tr.status == TemplateRequest.APPROVED
    assert tr.reviewed_at is not None
    tpl = Template.objects.get(account=account, event="promo.aprovada")
    assert tpl.active is True
    assert tpl.body_md == "Oi!"


def test_reject_request_marks_rejected_without_template(client, account):
    from notify.models import Template, TemplateRequest
    tr = TemplateRequest.objects.create(
        account=account, event="promo.rejeitada", body_md="X", requested_by="tester",
    )
    resp = client.post(
        f"/controlpanel/template-request/{tr.pk}/decide/",
        {"action": "reject", "reviewer_notes": "ruim"},
    )
    assert resp.status_code == 302
    tr.refresh_from_db()
    assert tr.status == TemplateRequest.REJECTED
    assert not Template.objects.filter(event="promo.rejeitada").exists()


def test_decide_twice_returns_409(client, account):
    from notify.models import TemplateRequest
    tr = TemplateRequest.objects.create(
        account=account, event="once", body_md="x", requested_by="t",
    )
    client.post(f"/controlpanel/template-request/{tr.pk}/decide/", {"action": "approve"})
    resp = client.post(f"/controlpanel/template-request/{tr.pk}/decide/", {"action": "approve"})
    assert resp.status_code == 409


# ── Complaint resolve ──────────────────────────────────────────────────────


def test_resolve_complaint_marks_resolved(client, account):
    from notify.models import Complaint
    c = Complaint.objects.create(
        account=account, channel="whatsapp", category="delivery_failed",
        summary="Falhou", detail="x",
    )
    resp = client.post(f"/controlpanel/complaint/{c.pk}/resolve/")
    assert resp.status_code == 302
    c.refresh_from_db()
    assert c.status == Complaint.RESOLVED


# ── Smoke test cria Complaint quando canal falha ──────────────────────────


def test_smoke_test_creates_complaint_when_dispatch_fails(client, account, monkeypatch, settings):
    """Quando o canal WhatsApp falha no dispatch, uma Complaint é criada.

    Desliga TEST_MODE temporariamente e injeta um driver que explode no send_text.
    """
    from notify.models import Complaint, Notification

    settings.TEST_MODE = False  # sai do dry-run, exercita os canais

    class _BrokenDriver:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return False

        async def resolve_br_number(self, phone):
            return phone

        async def send_text(self, number, body):
            raise RuntimeError("evolution fora do ar")

    monkeypatch.setattr(
        "notify.channels.whatsapp._get_whatsapp_driver",
        lambda notif: _BrokenDriver(),
    )

    resp = client.post(
        "/controlpanel/smoke/",
        {"account_slug": account.slug, "phone": "5511999990000", "email": ""},
    )
    assert resp.status_code == 302
    n = Notification.objects.get(account=account, caller="controlpanel.smoke")
    n.refresh_from_db()
    # O send_text original capturou a exception, marcou FAILED via mark_channel_failed.
    assert n.whatsapp_status == "failed"
    complaint = Complaint.objects.get(account=account, channel="whatsapp", category="delivery_failed")
    assert "WhatsApp" in complaint.summary


# ── LocalOnlyMiddleware ────────────────────────────────────────────────────


def test_local_only_blocks_public_ip_on_dashboard():
    """Request de IP público para /controlpanel/ deve ser bloqueado."""
    from django.test import RequestFactory
    from notify_server.middleware import LocalOnlyMiddleware

    def get_response(request):
        from django.http import HttpResponse
        return HttpResponse("ok")

    mw = LocalOnlyMiddleware(get_response)
    req = RequestFactory().post("/controlpanel/readiness/", REMOTE_ADDR="198.51.100.7")
    resp = mw(req)
    assert resp.status_code == 403


def test_local_only_allows_loopback():
    from django.test import RequestFactory
    from notify_server.middleware import LocalOnlyMiddleware

    def get_response(request):
        from django.http import HttpResponse
        return HttpResponse("ok")

    mw = LocalOnlyMiddleware(get_response)
    req = RequestFactory().get("/controlpanel/", REMOTE_ADDR="127.0.0.1")
    resp = mw(req)
    assert resp.status_code == 200


def test_local_only_allows_public_api():
    """API pública (com auth) não é bloqueada pelo middleware."""
    from django.test import RequestFactory
    from notify_server.middleware import LocalOnlyMiddleware

    def get_response(request):
        from django.http import HttpResponse
        return HttpResponse("ok")

    mw = LocalOnlyMiddleware(get_response)
    req = RequestFactory().get("/v1/health", REMOTE_ADDR="198.51.100.7")
    resp = mw(req)
    assert resp.status_code == 200
