"""Testes do app authentication."""

import json
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import Client, TestCase

from apps.authentication.services import auth_check, login_with_profile_uuid_otp
from apps.profiles.models import Phone, Profile
from apps.visitors.models import Visitor, VisitorStatus


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
        }
        mocked_create_and_send_login_otp.return_value.success = True
        mocked_create_and_send_login_otp.return_value.error = None

        response = auth_check(phone="43 99111-2222")

        self.assertTrue(response.success)
        self.assertEqual(response.data["first_name"], "Victor")
        self.assertEqual(response.data["is_visitor"], "yes")
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

        response = login_with_profile_uuid_otp(profile_uuid=str(self.profile.uuid), otp="999999")

        self.assertFalse(response.success)
        self.assertEqual(response.error, "Codigo de verificacao invalido.")

    def test_returns_tokens_when_otp_is_valid(self):
        self.user.set_password("123456")
        self.user.save(update_fields=["password"])

        response = login_with_profile_uuid_otp(profile_uuid=str(self.profile.uuid), otp="123456")

        self.assertTrue(response.success)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["is_visitor"], "yes")

        self.user.refresh_from_db()
        self.assertFalse(self.user.has_usable_password())


class AuthenticationApiTests(TestCase):
    """Valida os endpoints Ninja de auth."""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="auth_api_user",
            email="auth-api@example.com",
            first_name="Victor",
        )
        self.profile = Profile.objects.create(user=self.user, full_name="Victor Api")
        self.phone = Phone.objects.create(profile=self.profile, number="43995556666")
        Visitor.objects.create(profile=self.profile, status=VisitorStatus.NEW_ONLINE)

    @patch("apps.authentication.services.check.create_and_send_login_otp")
    def test_auth_check_endpoint_returns_payload(self, mocked_create_and_send_login_otp):
        mocked_create_and_send_login_otp.return_value.data = {
            "notification_id": 77,
            "notification_status": "sent",
            "channel_sent": "both",
            "user_id": self.user.id,
        }
        mocked_create_and_send_login_otp.return_value.success = True
        mocked_create_and_send_login_otp.return_value.error = None

        response = self.client.post(
            "/api/auth/check",
            data=json.dumps({"phone": "43 99555-6666"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "message": "Codigo de verificacao enviado com sucesso.",
                "first_name": "Victor",
                "is_visitor": "yes",
            },
        )

    def test_auth_login_endpoint_returns_jwt(self):
        self.user.set_password("123456")
        self.user.save(update_fields=["password"])

        response = self.client.post(
            "/api/auth/login",
            data=json.dumps({"profile_uuid": str(self.profile.uuid), "otp": "123456"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["message"], "Login realizado com sucesso.")
        self.assertIn("access", payload)
        self.assertIn("refresh", payload)
        self.assertEqual(payload["is_visitor"], "yes")

    def test_auth_login_endpoint_returns_401_for_invalid_otp(self):
        self.user.set_password("123456")
        self.user.save(update_fields=["password"])

        response = self.client.post(
            "/api/auth/login",
            data=json.dumps({"profile_uuid": str(self.profile.uuid), "otp": "999999"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json(), {"message": "Codigo de verificacao invalido."})
