"""Testes do fluxo completo do captive portal.

Integrações externas (Evolution, HubCPF, push pro agente local e o envio
real das notificações) são mockadas — o resto roda de ponta a ponta:
session/start → identify → OTP → grant → CPF → culto.
"""

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import Client, TestCase, override_settings

from apps.authentication.services.otp import generate_login_otp
from apps.captive.models import (
    AccessGrant,
    CpfRecord,
    MacBinding,
    PortalEvent,
    PortalSession,
)
from apps.captive.services import (
    ack_grant,
    normalize_mac,
    start_session,
    stop_session,
    submit_cpf,
    verify_credential,
)
from apps.captive.services.grants import build_credential
from apps.profiles.models import Profile
from apps.profiles.services import get_profile_by_phone
from notifications.models import Notification
from services.base import ServiceResponse

User = get_user_model()

AGENT_HEADERS = {"HTTP_X_AGENT_KEY": "test-agent-key"}
VALID_NUMBER = {"success": True, "status_code": 200, "data": {"exists": True, "number": "5542999990000"}}
INVALID_NUMBER = {"success": False, "status_code": 200, "data": {"exists": False}}
MAC = "A4:83:E7:12:34:56"


def _make_profile(phone="5542988887777", full_name="Maria Souza"):
    from apps.profiles.services.creation import create_user_profile_with_contact

    with patch(
        "apps.profiles.services.creation.validate_number",
        return_value={"success": True, "status_code": 200, "data": {"exists": True, "number": phone}},
    ):
        response = create_user_profile_with_contact(contact_number=phone, full_name=full_name)
    return Profile.objects.get(pk=response.data["profile_id"])


class NormalizeMacTests(TestCase):
    def test_normalizes_separators_and_case(self):
        self.assertEqual(normalize_mac("a4-83.e7:12 34 56"), MAC)

    def test_rejects_invalid(self):
        self.assertEqual(normalize_mac("zz:83:e7:12:34:56"), "")
        self.assertEqual(normalize_mac("a4:83:e7"), "")


@override_settings(CAPTIVE_AGENT_KEY="test-agent-key", CAPTIVE_LOCAL_CALLBACK_URL="")
class SessionStartTests(TestCase):
    def test_unknown_mac_redirects_to_portal(self):
        response = start_session(mac=MAC, ssid="IEADPG")
        self.assertTrue(response.success)
        self.assertFalse(response.data["authorized"])
        self.assertIn("/portal/?sid=", response.data["portal_url"])
        session = PortalSession.objects.get(token=response.data["session"])
        self.assertEqual(session.status, PortalSession.Status.PENDING)
        self.assertTrue(
            PortalEvent.objects.filter(event=PortalEvent.Event.REDIRECT_PORTAL, mac=MAC).exists()
        )

    def test_known_mac_authorizes_with_credential(self):
        profile = _make_profile()
        MacBinding.objects.create(mac=MAC, profile=profile)

        response = start_session(mac=MAC)
        self.assertTrue(response.data["authorized"])
        payload = verify_credential(response.data["credential"])
        self.assertTrue(payload.success)
        self.assertEqual(payload.data["mac"], MAC)
        session = PortalSession.objects.get(token=response.data["session"])
        self.assertEqual(session.status, PortalSession.Status.AUTHORIZED)
        self.assertIsNotNone(session.connected_at)

    def test_stop_session_records_disconnect(self):
        start = start_session(mac=MAC)
        response = stop_session(mac=MAC)
        self.assertTrue(response.success)
        session = PortalSession.objects.get(token=start.data["session"])
        self.assertIsNotNone(session.disconnected_at)
        self.assertEqual(session.status, PortalSession.Status.CLOSED)


@override_settings(CAPTIVE_AGENT_KEY="test-agent-key", CAPTIVE_LOCAL_CALLBACK_URL="")
class PortalFlowTests(TestCase):
    """Fluxo HTMX ponta a ponta com Client()."""

    def setUp(self):
        self.client = Client()
        self.enqueue_patcher = patch("notifications.signals.enqueue_notification", return_value="test")
        self.enqueue_patcher.start()
        self.addCleanup(self.enqueue_patcher.stop)
        started = start_session(mac=MAC)
        self.session = PortalSession.objects.get(token=started.data["session"])
        self.sid = str(self.session.token)

    def _identify(self, phone="42988887777"):
        return self.client.post(
            "/portal/htmx/identify", {"sid": self.sid, "phone": phone}
        )

    def test_portal_entry_renders_phone_screen(self):
        response = self.client.get(f"/portal/?sid={self.sid}")
        self.assertContains(response, "Bem-vindo ao Wi-Fi")
        self.assertContains(response, "Informe seu WhatsApp")

    def test_portal_entry_by_mac_reuses_open_session(self):
        # Probes de captive (Android/iOS) batem várias vezes com ?mac= —
        # não podem criar uma PortalSession por acesso.
        mac2 = "A4:83:E7:99:99:99"
        self.client.get(f"/portal/?mac={mac2}")
        self.client.get(f"/portal/?mac={mac2}")
        self.client.get(f"/portal/?mac={mac2.lower()}")
        self.assertEqual(PortalSession.objects.filter(mac=mac2).count(), 1)

    def test_member_identify_shows_named_otp_screen(self):
        _make_profile(phone="5542988887777", full_name="Maria Souza")
        response = self._identify()
        self.assertContains(response, "Olá,")
        self.assertContains(response, "Maria")
        self.session.refresh_from_db()
        self.assertEqual(self.session.status, PortalSession.Status.AWAITING_OTP)
        self.assertEqual(self.session.kind, PortalSession.Kind.MEMBER)

    def test_unknown_number_without_whatsapp_shows_modal(self):
        with patch("apps.captive.services.identify.validate_number", return_value=INVALID_NUMBER):
            response = self._identify("42911112222")
        self.assertContains(response, "Número sem WhatsApp")
        self.assertTrue(
            PortalEvent.objects.filter(event=PortalEvent.Event.WHATSAPP_INVALID).exists()
        )

    def test_evolution_offline_returns_friendly_error(self):
        # E4 — Evolution fora do ar não pode virar 500 nem liberar internet.
        with patch(
            "apps.captive.services.identify.validate_number",
            side_effect=ConnectionError("evolution down"),
        ):
            response = self._identify("42911112222")
        self.assertContains(response, "Tente novamente em instantes")
        self.session.refresh_from_db()
        self.assertEqual(self.session.status, PortalSession.Status.PENDING)

    def test_unknown_number_with_whatsapp_creates_visitor(self):
        with (
            patch("apps.captive.services.identify.validate_number", return_value=VALID_NUMBER),
            patch(
                "apps.profiles.services.creation.validate_number",
                return_value=VALID_NUMBER,
            ),
        ):
            response = self._identify("42999990000")
        self.assertContains(response, "bem-vindo!")
        self.session.refresh_from_db()
        self.assertEqual(self.session.kind, PortalSession.Kind.VISITOR)
        profile = get_profile_by_phone(phone="5542999990000")
        self.assertIsNotNone(getattr(profile, "visitor", None))
        self.assertTrue(
            Notification.objects.filter(event_key="captive-visitor-welcome").exists()
        )
        self.assertTrue(
            PortalEvent.objects.filter(event=PortalEvent.Event.VISITOR_CREATED).exists()
        )

    def test_member_otp_verify_releases_and_binds_mac(self):
        profile = _make_profile()
        self._identify()
        otp = generate_login_otp(user=profile.user).data["otp"]

        response = self.client.post(
            "/portal/htmx/otp/verify",
            {"sid": self.sid, **{f"d{i + 1}": d for i, d in enumerate(otp)}},
        )
        self.assertContains(response, "Você está conectado")
        self.session.refresh_from_db()
        self.assertEqual(self.session.status, PortalSession.Status.AUTHORIZED)
        binding = MacBinding.objects.get(mac=MAC)
        self.assertEqual(binding.profile, profile)
        self.assertEqual(self.session.grants.count(), 1)

    def test_wrong_otp_three_times_locks_for_ten_minutes(self):
        profile = _make_profile()
        self._identify()
        generate_login_otp(user=profile.user)

        response = None
        for _attempt in range(3):
            response = self.client.post(
                "/portal/htmx/otp/verify",
                {"sid": self.sid, **{f"d{i + 1}": "0" for i in range(6)}},
            )
        self.assertContains(response, "Muitas tentativas")
        self.session.refresh_from_db()
        self.assertIsNotNone(self.session.otp_locked_until)
        self.assertEqual(
            PortalEvent.objects.filter(event=PortalEvent.Event.OTP_FAILED).count(), 3
        )


@override_settings(CAPTIVE_AGENT_KEY="test-agent-key", CAPTIVE_LOCAL_CALLBACK_URL="")
class CpfStepTests(TestCase):
    CPF_OK = "52998224725"  # dígitos verificadores válidos

    def setUp(self):
        self.enqueue_patcher = patch("notifications.signals.enqueue_notification", return_value="test")
        self.enqueue_patcher.start()
        self.addCleanup(self.enqueue_patcher.stop)

    def _authorized_visitor_session(self, phone="5542999990000"):
        profile = _make_profile(phone=phone, full_name="")
        from apps.visitors.models import Visitor

        Visitor.objects.create(profile=profile)
        started = start_session(mac=MAC)
        session = PortalSession.objects.get(token=started.data["session"])
        session.profile = profile
        session.kind = PortalSession.Kind.VISITOR
        session.status = PortalSession.Status.AUTHORIZED
        session.save()
        return session, profile

    def test_cpf_enriches_profile_via_hubcpf(self):
        session, profile = self._authorized_visitor_session()
        enrichment = ServiceResponse.ok(
            data={"name": "Ana Lima", "gender": "female", "birth_date": None, "raw": {}}
        )
        with patch("apps.captive.services.cpf.lookup_cpf", return_value=enrichment):
            response = submit_cpf(session=session, cpf=self.CPF_OK)

        self.assertTrue(response.success)
        self.assertFalse(response.data["conflict"])
        profile.refresh_from_db()
        self.assertEqual(profile.full_name, "Ana Lima")
        self.assertEqual(profile.gender, "female")
        record = CpfRecord.objects.get(profile=profile)
        self.assertEqual(record.cpf, self.CPF_OK)
        self.assertIsNotNone(record.enriched_at)
        self.assertTrue(
            PortalEvent.objects.filter(event=PortalEvent.Event.CPF_ENRICHED).exists()
        )
        # Fase D — sempre agenda/dispara uma mensagem de boas-vindas.
        self.assertTrue(
            PortalEvent.objects.filter(event=PortalEvent.Event.WELCOME_SCHEDULED).exists()
        )

    def test_hubcpf_offline_defers_enrichment(self):
        session, profile = self._authorized_visitor_session()
        with patch(
            "apps.captive.services.cpf.lookup_cpf",
            return_value=ServiceResponse.fail("HubCPF indisponível"),
        ):
            response = submit_cpf(session=session, cpf=self.CPF_OK)
        self.assertTrue(response.success)
        record = CpfRecord.objects.get(profile=profile)
        self.assertTrue(record.pending_enrichment)

    def test_duplicate_cpf_rebinds_mac_and_deletes_visitor(self):
        existing = _make_profile(phone="5542911110000", full_name="João Pereira")
        CpfRecord.objects.create(profile=existing, cpf=self.CPF_OK)
        session, visitor_profile = self._authorized_visitor_session()
        MacBinding.objects.create(mac=MAC, profile=visitor_profile)
        visitor_user_id = visitor_profile.user_id

        response = submit_cpf(session=session, cpf=self.CPF_OK)
        self.assertTrue(response.success)
        self.assertTrue(response.data["conflict"])
        binding = MacBinding.objects.get(mac=MAC)
        self.assertEqual(binding.profile, existing)
        self.assertFalse(Profile.objects.filter(pk=visitor_profile.pk).exists())
        self.assertFalse(User.objects.filter(pk=visitor_user_id).exists())
        self.assertTrue(
            PortalEvent.objects.filter(event=PortalEvent.Event.CPF_CONFLICT).exists()
        )

    def test_invalid_cpf_digits_rejected(self):
        session, _profile = self._authorized_visitor_session()
        response = submit_cpf(session=session, cpf="111.111.111-11")
        self.assertFalse(response.success)


@override_settings(CAPTIVE_AGENT_KEY="test-agent-key", CAPTIVE_LOCAL_CALLBACK_URL="")
class AgentApiTests(TestCase):
    def test_requires_agent_key(self):
        response = self.client.post(
            "/portal/session/start", {"mac": MAC}, content_type="application/json"
        )
        self.assertEqual(response.status_code, 401)

    def test_session_start_and_grant_ack_roundtrip(self):
        profile = _make_profile()
        MacBinding.objects.create(mac=MAC, profile=profile)

        response = self.client.post(
            "/portal/session/start",
            {"mac": MAC, "ssid": "IEADPG"},
            content_type="application/json",
            **AGENT_HEADERS,
        )
        self.assertEqual(response.status_code, 200)
        credential = response.json()["credential"]

        pending = self.client.get("/portal/agent/grants", **AGENT_HEADERS)
        macs = [grant["mac"] for grant in pending.json()["grants"]]
        self.assertIn(MAC, macs)

        ack = self.client.post(
            "/portal/agent/grants/ack",
            {"credential": credential},
            content_type="application/json",
            **AGENT_HEADERS,
        )
        self.assertEqual(ack.status_code, 200)
        grant = AccessGrant.objects.get(credential=credential)
        self.assertEqual(grant.status, AccessGrant.Status.ACKED)
        self.assertTrue(
            PortalEvent.objects.filter(event=PortalEvent.Event.INTERNET_RELEASED).exists()
        )

    def test_credential_signature_tamper_detected(self):
        from django.utils import timezone

        credential = build_credential(
            mac=MAC,
            session_token="0" * 32,
            expires_at=timezone.now() + timezone.timedelta(hours=1),
        )
        encoded, signature = credential.rsplit(".", 1)
        tampered = f"{encoded}.{'0' * len(signature)}"
        self.assertFalse(verify_credential(tampered).success)
        self.assertTrue(verify_credential(credential).success)
