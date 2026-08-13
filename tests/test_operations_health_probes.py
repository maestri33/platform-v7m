from pathlib import Path

import httpx
import pytest
from django.test import override_settings

from accounts.models import Account
from channels.models import MailIdentity, WhatsAppNumber
from operations.health import Status, SystemHealthProbes, check_readiness


pytestmark = pytest.mark.django_db


def test_database_and_django_q_broker_are_readable_without_enqueuing_tasks():
    probes = SystemHealthProbes()

    assert probes.run("database").status is Status.HEALTHY
    queue = probes.run("django_q")
    assert queue.status is Status.HEALTHY
    assert queue.metadata["queued"] == 0


@override_settings(
    WHATSAPP_API_BASE_URL="",
    WHATSAPP_GLOBAL_API_KEY="",
    EVOLUTION_GO_BASE_URL="",
    EVOLUTION_GO_API_KEY="",
)
def test_evolution_probes_report_missing_configuration_without_network_access():
    def reject_network(request):
        raise AssertionError(f"network access was attempted: {request.method}")

    probes = SystemHealthProbes(http_transport=httpx.MockTransport(reject_network))

    assert probes.run("evolution_v2").status is Status.MISCONFIGURED
    assert probes.run("evolution_go").status is Status.MISCONFIGURED


@override_settings(
    WHATSAPP_API_BASE_URL="https://v2.private.invalid",
    WHATSAPP_GLOBAL_API_KEY="top-secret-v2",
    EVOLUTION_GO_BASE_URL="https://go.private.invalid",
    EVOLUTION_GO_API_KEY="top-secret-go",
)
def test_evolution_probes_only_read_connection_state_and_hide_identifiers():
    account = Account.objects.create(slug="private-account", name="Private")
    WhatsAppNumber.objects.create(
        account=account,
        instance_name="private-instance",
        slug="main",
        is_default=True,
    )
    requests = []

    def connection_states(request):
        requests.append(request)
        if request.url.host == "go.private.invalid":
            return httpx.Response(200, json={"data": [{"state": "connected"}]})
        return httpx.Response(200, json={"instance": {"state": "open"}})

    report = check_readiness(
        SystemHealthProbes(http_transport=httpx.MockTransport(connection_states))
    )

    assert report.checks["evolution_v2"].status is Status.HEALTHY
    assert report.checks["evolution_go"].status is Status.HEALTHY
    assert all(request.method == "GET" for request in requests)
    rendered = repr(report)
    assert "private-instance" not in rendered
    assert "top-secret" not in rendered
    assert "private.invalid" not in rendered


@override_settings(OMNIROUTER_URL="not-a-url")
def test_smtp_and_tts_report_configuration_quality_without_connecting():
    account = Account.objects.create(slug="mail", name="Mail")
    MailIdentity.objects.create(
        account=account,
        smtp_host="smtp.private.invalid",
        smtp_port=587,
        smtp_user="sender",
        smtp_password="encrypted-secret",
        from_name="Sender",
        from_email="sender@example.invalid",
        is_default=True,
    )
    probes = SystemHealthProbes()

    smtp = probes.run("smtp")
    tts = probes.run("tts")

    assert smtp.status is Status.HEALTHY
    assert smtp.metadata == {"configured": 1, "invalid": 0}
    assert tts.status is Status.MISCONFIGURED
    assert "smtp.private.invalid" not in repr(smtp)
    assert "encrypted-secret" not in repr(smtp)


def test_storage_probe_verifies_a_real_write_and_removes_the_probe_file(tmp_path):
    media_root = tmp_path / "media"
    media_root.mkdir()

    with override_settings(MEDIA_ROOT=str(media_root)):
        result = SystemHealthProbes().run("storage")

    assert result.status is Status.HEALTHY
    assert list(Path(media_root).iterdir()) == []


def test_unknown_component_is_rejected_without_running_any_probe():
    with pytest.raises(ValueError, match="unknown health component"):
        SystemHealthProbes().run("other")
