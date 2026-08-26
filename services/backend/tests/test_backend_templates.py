"""Testes do motor local de templates de notificação e endpoints do Staff no backend."""

import pytest
from django.db import transaction
from django_q import tasks

from notify.interface import templates as tpl_iface
from notify.interface.events import send_event
from notify.models import Template, Trigger
from users.auth.models import User
from users.profiles.models import Profile


@pytest.mark.django_db
def test_template_crud_and_cache_invalidation():
    tpl = Template.objects.create(
        event="custom.welcome",
        title="Bem-vindo!",
        body_md="Olá, {nome}! Seu link é {link}.",
        channels="whatsapp",
    )
    Trigger.objects.create(template=tpl, fires_on="Ao criar conta", active=True)

    loaded = tpl_iface.get("custom.welcome")
    assert loaded is not None
    assert loaded.title == "Bem-vindo!"
    assert loaded.body_md == "Olá, {nome}! Seu link é {link}."

    rendered = tpl_iface.render(loaded.body_md, {"nome": "Victor", "link": "https://v7m.org"})
    assert rendered == "Olá, Victor! Seu link é https://v7m.org."

    # Update template and verify cache is invalidated
    tpl.body_md = "Oi, {nome}! Link: {link}."
    tpl.save()

    updated = tpl_iface.get("custom.welcome")
    assert updated.body_md == "Oi, {nome}! Link: {link}."


@pytest.mark.django_db
def test_send_event_renders_local_template_and_dispatches_via_send(monkeypatch):
    user = User.objects.create_user()
    profile = Profile.objects.create(user=user, name="Carlos Souza", phone="5543999998888")

    Template.objects.create(
        event="auth.otp",
        title="Código OTP",
        body_md="Seu código é *{codigo}*, expira em *{ttl_minutos}* min.",
        channels="whatsapp",
    )

    queued = []
    monkeypatch.setattr(transaction, "on_commit", lambda fn: fn())
    monkeypatch.setattr(tasks, "async_task", lambda *args: queued.append(args))

    ext_id = send_event(
        "auth.otp",
        profile=profile,
        ctx={"codigo": "654321", "ttl_minutos": "15"},
    )
    assert ext_id is not None
    assert len(queued) == 1
    task, payload = queued[0]
    assert task == "notify.sdk.push.push_send"
    assert payload["caller"] == "event:auth.otp"
    assert payload["phone"] == "5543999998888"
    assert payload["whatsapp"] is True
    assert "Seu código é *654321*, expira em *15* min." in payload["text"]


@pytest.mark.django_db
def test_send_event_respects_inactive_trigger(monkeypatch):
    user = User.objects.create_user()
    profile = Profile.objects.create(user=user, name="Carlos Souza", phone="5543999998888")

    tpl = Template.objects.create(
        event="lead.captured",
        title="Lead",
        body_md="Olá {nome}",
        channels="whatsapp",
    )
    Trigger.objects.create(template=tpl, active=False)

    queued = []
    monkeypatch.setattr(transaction, "on_commit", lambda fn: fn())
    monkeypatch.setattr(tasks, "async_task", lambda *args: queued.append(args))

    result = send_event("lead.captured", profile=profile)
    assert result is None
    assert len(queued) == 0


@pytest.fixture
def staff_headers():
    from users.auth.jwt import service as jwt_service
    user = User.objects.create_superuser(password="secret")
    tokens = jwt_service.issue(str(user.external_id), [])
    return {"HTTP_AUTHORIZATION": f"Bearer {tokens['access_token']}"}


@pytest.mark.django_db
def test_staff_notify_router_endpoints(client, staff_headers):
    tpl = Template.objects.create(
        event="lead.captured",
        title="Inscrição Iniciada",
        body_md="Olá, {nome}! Acesse {link}.",
        channels="whatsapp,email",
    )
    Trigger.objects.create(template=tpl, fires_on="Formulário preenchido", active=True)

    # 1. list_templates
    resp = client.get("/api/v1/staff/notify/templates", **staff_headers)
    assert resp.status_code == 200, resp.content
    data = resp.json()
    assert any(item["event"] == "lead.captured" for item in data)

    # 2. get_template
    resp = client.get("/api/v1/staff/notify/templates/lead.captured", **staff_headers)
    assert resp.status_code == 200
    assert resp.json()["event"] == "lead.captured"
    assert resp.json()["body_md"] == "Olá, {nome}! Acesse {link}."

    # 3. patch_template
    resp = client.patch(
        "/api/v1/staff/notify/templates/lead.captured",
        data={"body_md": "Olá, {nome}! Novo link: {link}."},
        content_type="application/json",
        **staff_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["body_md"] == "Olá, {nome}! Novo link: {link}."
    tpl.refresh_from_db()
    assert tpl.body_md == "Olá, {nome}! Novo link: {link}."

    # 4. preview_template
    resp = client.post(
        "/api/v1/staff/notify/templates/lead.captured/preview",
        data={"ctx": {"nome": "Victor", "link": "https://v7m.org/teste"}},
        content_type="application/json",
        **staff_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["rendered"] == "Olá, Victor! Novo link: https://v7m.org/teste."

    # 5. template_stats
    resp = client.get("/api/v1/staff/notify/templates/stats", **staff_headers)
    assert resp.status_code == 200
    stats = resp.json()
    assert stats["total"] >= 1
    assert stats["active"] >= 1

    # 6. ai_assist
    resp = client.post(
        "/api/v1/staff/notify/templates/ai-assist",
        data={"text": "Ola {nome}, seu codigo e {codigo}", "action": "improve"},
        content_type="application/json",
        **staff_headers,
    )
    assert resp.status_code == 200
    ai_data = resp.json()
    assert "{nome}" in ai_data["text"]
    assert "{codigo}" in ai_data["text"]


def test_tts_clean_text_and_synthesis(monkeypatch):
    from integrations.ai import tts

    cleaned = tts.clean_text_for_speech("Olá *{nome}*! Acesse o link: https://v7m.org/xyz")
    assert "*" not in cleaned
    assert "https://v7m.org/xyz" not in cleaned
    assert "pelo link enviado" in cleaned

    # Test synthesis with storage
    class MockResp:
        status_code = 200
        content = b"OggS-fake-audio-bytes"

    import httpx
    monkeypatch.setattr(httpx.Client, "post", lambda self, url, **kwargs: MockResp())
    monkeypatch.setattr(tts, "_get_omniroute_base_url", lambda: "http://omnirouter.internal")

    url = tts.synthesize_voice_note("Olá Victor, seu pagamento foi confirmado.")
    assert url is not None
    assert "/media/ai/tts/" in url


