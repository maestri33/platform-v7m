"""Testes do app authentication."""

from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.utils import timezone

from apps.authentication.models import LoginOtpState
from apps.authentication.services import auth_check, create_and_send_login_otp, login_with_profile_uuid_otp, refresh_token_pair
from apps.profiles.models import Phone, Profile
from apps.visitors.models import Visitor, VisitorStatus
from notifications.models import Notification


class AuthenticationCheckTests(TestCase):
    """Valida o fluxo de auth/check."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="auth_check_user",
            email="auth-check@example.com",
            first_name="Victor",
        )
        self.profile = Profile.objects.create(user=self.user, full_name="Victor Auth")
        self.phone = Phone.objects.create(profile=self.profile, number="43991112222")

    def test_returns_error_when_phone_is_unknown(self):
        response = auth_check(phone="43990000000")

        self.assertFalse(response.success)
        self.assertEqual(response.error, "Nao existe nenhum usuario com esse numero de telefone.")

    @patch("apps.authentication.services.check.create_and_send_login_otp")
    def test_returns_error_when_profile_has_no_access_context(self, mocked_create_and_send_login_otp):
        response = auth_check(phone=self.phone.number)

        self.assertFalse(response.success)
        self.assertEqual(response.error, "Perfil encontrado, mas sem contexto de acesso habilitado.")
        mocked_create_and_send_login_otp.assert_not_called()

    @patch("apps.authentication.services.check.create_and_send_login_otp")
    def test_returns_context_and_dispatches_otp_for_visitor(self, mocked_create_and_send_login_otp):
        Visitor.objects.create(profile=self.profile, status=VisitorStatus.NEW_ONLINE)
        mocked_create_and_send_login_otp.return_value.data = {
            "notification_id": 99,
            "notification_status": "sent",
            "channel_sent": "both",
            "user_id": self.user.id,
            "frontend_link": f"https://app.ieadpg.org/{self.profile.uuid}?otp=123456",
        }
        mocked_create_and_send_login_otp.return_value.success = True
        mocked_create_and_send_login_otp.return_value.error = None

        response = auth_check(phone="43 99111-2222")

        self.assertTrue(response.success)
        self.assertEqual(response.data["first_name"], "Victor")
        self.assertEqual(response.data["profile_uuid"], str(self.profile.uuid))
        self.assertEqual(
            response.data["magic_link"],
            f"https://app.ieadpg.org/{self.profile.uuid}?otp=123456",
        )
        self.assertTrue(response.data["is_visitor"])
        mocked_create_and_send_login_otp.assert_called_once_with(user=self.user)


class AuthenticationLoginTests(TestCase):
    """Valida login com OTP e emissao de JWT."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="auth_login_user",
            email="auth-login@example.com",
            first_name="Victor",
        )
        self.profile = Profile.objects.create(user=self.user, full_name="Victor Login")
        self.phone = Phone.objects.create(profile=self.profile, number="43993334444")
        Visitor.objects.create(profile=self.profile, status=VisitorStatus.NEW_ONLINE)

    def test_returns_error_when_otp_is_invalid(self):
        self.user.set_password("123456")
        self.user.save(update_fields=["password"])
        LoginOtpState.objects.create(user=self.user, otp_created_at=timezone.now())

        response = login_with_profile_uuid_otp(profile_uuid=str(self.profile.uuid), otp="999999")

        self.assertFalse(response.success)
        self.assertEqual(response.error, "Codigo de verificacao invalido.")

    def test_returns_tokens_when_otp_is_valid(self):
        self.user.set_password("123456")
        self.user.save(update_fields=["password"])
        LoginOtpState.objects.create(user=self.user, otp_created_at=timezone.now())

        response = login_with_profile_uuid_otp(profile_uuid=str(self.profile.uuid), otp="123456")

        self.assertTrue(response.success)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertTrue(response.data["is_visitor"])

        self.user.refresh_from_db()
        self.assertFalse(self.user.has_usable_password())

    @override_settings(AUTH_LOGIN_OTP_TTL_SECONDS=600)
    def test_returns_error_when_otp_is_expired(self):
        self.user.set_password("123456")
        self.user.save(update_fields=["password"])
        LoginOtpState.objects.create(
            user=self.user,
            otp_created_at=timezone.now() - timedelta(seconds=601),
        )

        response = login_with_profile_uuid_otp(profile_uuid=str(self.profile.uuid), otp="123456")

        self.assertFalse(response.success)
        self.assertEqual(response.error, "Codigo de verificacao expirado.")

    def test_refresh_token_pair_returns_new_access_token(self):
        self.user.set_password("123456")
        self.user.save(update_fields=["password"])
        LoginOtpState.objects.create(user=self.user, otp_created_at=timezone.now())

        login_response = login_with_profile_uuid_otp(profile_uuid=str(self.profile.uuid), otp="123456")
        response = refresh_token_pair(refresh=login_response.data["refresh"])

        self.assertTrue(response.success)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_refresh_token_pair_returns_error_for_invalid_token(self):
        response = refresh_token_pair(refresh="token-invalido")

        self.assertFalse(response.success)
        self.assertEqual(response.error, "Refresh token invalido ou expirado.")


class AuthenticationOtpDeliveryTests(TestCase):
    """Garante que o OTP cria a notificação sem bloquear a transação."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="auth_otp_delivery_user",
            email="auth-otp@example.com",
        )
        self.profile = Profile.objects.create(user=self.user, full_name="OTP Delivery")

    @patch("notifications.signals.enqueue_notification")
    def test_create_and_send_login_otp_returns_notification_state_after_creation(self, mocked_enqueue_notification):
        with self.captureOnCommitCallbacks(execute=True):
            response = create_and_send_login_otp(user=self.user)

        self.assertTrue(response.success)
        self.assertEqual(response.data["notification_status"], Notification.Status.PENDING)
        self.assertEqual(response.data["channel_sent"], "")
        self.assertTrue(response.data["frontend_link"])
        self.assertTrue(LoginOtpState.objects.filter(user=self.user, otp_created_at__isnull=False).exists())
        mocked_enqueue_notification.assert_called_once()
