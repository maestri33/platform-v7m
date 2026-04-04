"""Testes do fluxo inicial de criacao em profiles."""

import json
from datetime import date
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import Client, TestCase, override_settings
from ninja_jwt.tokens import AccessToken

from apps.authentication.notifications import create_login_otp_notification
from apps.profiles.models import Address, Phone, Profile
from apps.profiles.services import (
    generate_user_otp,
    get_profile_contact_data,
    get_my_profile,
    get_my_profile_address,
    update_my_profile_address,
    update_my_profile_data,
    validate_contact_number_for_new_profile,
    validate_contact_number_for_new_user,
)
from apps.profiles.validators import validate_profile_completion_data
from notifications.models import Notification


class ProfileCreationServicesTests(TestCase):
    """Valida checagens iniciais de telefone para novos cadastros."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="profiles_service_user",
            email="profiles@example.com",
        )
        self.profile = Profile.objects.create(user=self.user, full_name="Profiles Service")
        self.phone = Phone.objects.create(profile=self.profile, number="43996648750")

    @patch("apps.profiles.services.creation.validate_number")
    def test_returns_error_when_phone_already_exists(self, mocked_validate_number):
        response = validate_contact_number_for_new_profile(contact_number="43 99664-8750")

        self.assertFalse(response.success)
        self.assertEqual(response.error, "Numero de contato ja cadastrado no sistema.")
        self.assertEqual(response.meta["phone"], self.phone.number)
        mocked_validate_number.assert_not_called()

    @patch("apps.profiles.services.creation.validate_number")
    def test_returns_error_when_phone_is_not_valid_on_whatsapp(self, mocked_validate_number):
        mocked_validate_number.return_value = {
            "success": False,
            "status_code": 200,
            "data": {"exists": False, "jid": "", "number": "5543999999999"},
        }

        response = validate_contact_number_for_new_user(contact_number="43 99999-9999")

        self.assertFalse(response.success)
        self.assertEqual(response.error, "Numero de contato invalido no WhatsApp.")
        mocked_validate_number.assert_called_once_with("43999999999")

    @patch("apps.profiles.services.creation.validate_number")
    def test_returns_success_when_phone_is_available_and_valid(self, mocked_validate_number):
        mocked_validate_number.return_value = {
            "success": True,
            "status_code": 200,
            "data": {
                "exists": True,
                "jid": "5543988887777@s.whatsapp.net",
                "number": "5543988887777",
                "name": "Contato Teste",
            },
        }

        response = validate_contact_number_for_new_profile(contact_number="(43) 98888-7777")

        self.assertTrue(response.success)
        self.assertEqual(
            response.data,
            {
                "contact_number": "5543988887777",
                "jid": "5543988887777@s.whatsapp.net",
                "display_name": "Contato Teste",
                "exists": True,
            },
        )
        mocked_validate_number.assert_called_once_with("43988887777")


class ProfileValidatorsTests(TestCase):
    """Garante que o validator base do app funciona sem DRF."""

    def test_validate_profile_completion_data_accepts_known_choices(self):
        validate_profile_completion_data(
            profile_data={
                "gender": "male",
                "marital_status": "single",
                "education_level": "complete_high_school",
            }
        )


class ProfileContactsServicesTests(TestCase):
    """Valida a API publica de contato do app profiles."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="contact_user",
            email="contact@example.com",
        )
        self.profile = Profile.objects.create(user=self.user, full_name="Contact User")
        self.phone = Phone.objects.create(profile=self.profile, number="43996640000")

    def test_get_profile_contact_data_accepts_profile(self):
        response = get_profile_contact_data(profile=self.profile)

        self.assertEqual(response["phone"], self.phone.number)
        self.assertEqual(response["email"], self.user.email)
        self.assertEqual(response["profile"], self.profile)
        self.assertEqual(response["user"], self.user)

    def test_get_profile_contact_data_accepts_user(self):
        response = get_profile_contact_data(user=self.user)

        self.assertEqual(response["phone"], self.phone.number)
        self.assertEqual(response["email"], self.user.email)
        self.assertEqual(response["profile_uuid"], str(self.profile.uuid))

    def test_get_profile_contact_data_accepts_profile_uuid(self):
        response = get_profile_contact_data(profile_uuid=str(self.profile.uuid))

        self.assertEqual(response["phone"], self.phone.number)
        self.assertEqual(response["email"], self.user.email)

    def test_get_profile_contact_data_returns_empty_payload_when_not_found(self):
        response = get_profile_contact_data(profile_uuid="6f990b3f-b10b-4499-9542-864ff87a58ff")

        self.assertEqual(
            response,
            {
                "phone": "",
                "email": "",
                "user": None,
                "profile": None,
                "profile_uuid": "",
            },
        )


class ProfileAuthenticationServicesTests(TestCase):
    """Valida o fluxo simples de OTP para usuario."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="otp_user",
            email="otp@example.com",
            password="senha-antiga",
        )

    def test_generate_user_otp_updates_password_and_returns_six_digits(self):
        response = generate_user_otp(user=self.user)

        self.assertTrue(response.success)
        otp = response.data["otp"]
        self.assertEqual(len(otp), 6)
        self.assertTrue(otp.isdigit())

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(otp))
        self.assertFalse(self.user.check_password("senha-antiga"))

    def test_generate_user_otp_accepts_user_id(self):
        response = generate_user_otp(user=self.user.id)

        self.assertTrue(response.success)
        self.assertEqual(response.data["user_id"], self.user.id)

    def test_generate_user_otp_returns_error_for_missing_user(self):
        response = generate_user_otp(user=999999)

        self.assertFalse(response.success)
        self.assertEqual(response.error, "Usuario nao encontrado.")


class ProfileOtpNotificationsTests(TestCase):
    """Garante a criação da notificação de OTP no domínio de perfis."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="otp_notification_user",
            email="otp-notification@example.com",
        )
        self.profile = Profile.objects.create(user=self.user, full_name="OTP Notification")

    @override_settings(URL_FROTEND="https://app.ieadpg.org")
    def test_create_otp_notification_for_user_creates_notification(self):
        response = create_login_otp_notification(user=self.user, otp="123456")

        self.assertTrue(response.success)
        notification = Notification.objects.get(id=response.data["notification_id"])
        self.assertEqual(notification.recipient, self.profile)
        self.assertEqual(notification.event_key, "auth-login-otp")
        self.assertIn("*123456*", notification.content)
        self.assertIn(f"https://app.ieadpg.org/{self.profile.uuid}?123456", notification.content)
        self.assertEqual(notification.title, "# Código de verificação")

    def test_create_otp_notification_for_user_returns_error_without_profile(self):
        orphan_user = User.objects.create_user(username="sem_profile")

        response = create_login_otp_notification(user=orphan_user, otp="123456")

        self.assertFalse(response.success)
        self.assertEqual(response.error, "Perfil do usuário não encontrado.")

    def test_create_otp_notification_for_user_returns_error_without_otp(self):
        response = create_login_otp_notification(user=self.user.id, otp="")

        self.assertFalse(response.success)
        self.assertEqual(response.error, "OTP obrigatorio.")


class ProfileSelfServicesTests(TestCase):
    """Valida leitura e edicao do proprio perfil."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="profile_self_user",
            email="profile-self@example.com",
        )
        self.profile = Profile.objects.create(user=self.user, full_name="Profile Self")
        self.phone = Phone.objects.create(profile=self.profile, number="43995550000")

    def test_get_my_profile_returns_only_user_profile(self):
        response = get_my_profile(user=self.user)

        self.assertTrue(response.success)
        self.assertEqual(response.data["profile"]["profile_uuid"], str(self.profile.uuid))
        self.assertEqual(response.data["profile"]["phone"], self.phone.number)
        self.assertIsNone(response.data["profile"]["date_of_birth"])

    @patch("apps.profiles.services.self.validate_number")
    def test_update_my_profile_updates_fields_and_phone(self, mocked_validate_number):
        mocked_validate_number.return_value = {
            "success": True,
            "status_code": 200,
            "data": {"exists": True, "number": "5543998887777"},
        }

        response = update_my_profile_data(
            user=self.user,
            payload={
                "full_name": "Victor Maestri",
                "email": "victor@example.com",
                "phone": "(43) 99888-7777",
                "date_of_birth": date(1990, 5, 20),
                "mother_name": "Maria",
                "gender": "male",
                "marital_status": "single",
                "education_level": "complete_high_school",
            },
        )

        self.assertTrue(response.success)
        self.user.refresh_from_db()
        self.profile.refresh_from_db()
        self.phone.refresh_from_db()
        self.assertEqual(self.user.email, "victor@example.com")
        self.assertEqual(self.profile.full_name, "Victor Maestri")
        self.assertEqual(self.profile.date_of_birth, date(1990, 5, 20))
        self.assertEqual(self.profile.mother_name, "Maria")
        self.assertEqual(self.phone.number, "5543998887777")
        self.assertEqual(self.user.first_name, "Victor")
        self.assertEqual(self.user.last_name, "Maestri")

    def test_update_my_profile_returns_error_for_invalid_choice(self):
        response = update_my_profile_data(
            user=self.user,
            payload={"gender": "invalid"},
        )

        self.assertFalse(response.success)
        self.assertIn("Valor inválido", str(response.error))

    def test_get_my_profile_address_returns_address(self):
        address = Address.objects.create(
            street="Rua A",
            number="100",
            neighborhood="Centro",
            city="Londrina",
            state="PR",
        )
        self.profile.address = address
        self.profile.save(update_fields=["address"])

        response = get_my_profile_address(user=self.user)

        self.assertTrue(response.success)
        self.assertEqual(response.data["address"]["city"], "Londrina")

    def test_update_my_profile_address_creates_address(self):
        response = update_my_profile_address(
            user=self.user,
            payload={
                "street": "Rua A",
                "number": "100",
                "neighborhood": "Centro",
                "city": "Londrina",
                "state": "PR",
                "zipcode": "86000-000",
            },
        )

        self.assertTrue(response.success)
        self.profile.refresh_from_db()
        self.assertIsInstance(self.profile.address, Address)
        self.assertEqual(self.profile.address.city, "Londrina")


class ProfileApiTests(TestCase):
    """Valida os endpoints autenticados do app profiles."""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="profile_api_user",
            email="profile-api@example.com",
        )
        self.profile = Profile.objects.create(user=self.user, full_name="Profile Api")
        self.phone = Phone.objects.create(profile=self.profile, number="43994443333")
        self.access = AccessToken.for_user(self.user)

    def test_get_profile_returns_own_profile(self):
        response = self.client.get(
            "/api/profiles/",
            HTTP_AUTHORIZATION=f"Bearer {str(self.access)}",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["message"], "Perfil carregado com sucesso.")
        self.assertEqual(payload["profile"]["profile_uuid"], str(self.profile.uuid))
        self.assertEqual(payload["profile"]["phone"], self.phone.number)
        self.assertIsNone(payload["profile"]["date_of_birth"])

    @patch("apps.profiles.services.self.validate_number")
    def test_patch_data_updates_own_profile(self, mocked_validate_number):
        mocked_validate_number.return_value = {
            "success": True,
            "status_code": 200,
            "data": {"exists": True, "number": "5543988877665"},
        }

        response = self.client.patch(
            "/api/profiles/data",
            data=json.dumps(
                {
                    "full_name": "Novo Nome",
                    "phone": "(43) 98887-7665",
                    "date_of_birth": "1995-02-10",
                    "mother_name": "Nova Mae",
                }
            ),
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {str(self.access)}",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["message"], "Perfil atualizado com sucesso.")
        self.assertEqual(payload["profile"]["full_name"], "Novo Nome")
        self.assertEqual(payload["profile"]["phone"], "5543988877665")
        self.assertEqual(payload["profile"]["date_of_birth"], "1995-02-10")

    def test_get_address_returns_own_address(self):
        address = Address.objects.create(
            street="Rua B",
            number="200",
            neighborhood="Centro",
            city="Cambé",
            state="PR",
        )
        self.profile.address = address
        self.profile.save(update_fields=["address"])

        response = self.client.get(
            "/api/profiles/address",
            HTTP_AUTHORIZATION=f"Bearer {str(self.access)}",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["message"], "Endereco carregado com sucesso.")
        self.assertEqual(payload["address"]["city"], "Cambé")

    def test_patch_address_updates_own_address(self):
        response = self.client.patch(
            "/api/profiles/address",
            data=json.dumps(
                {
                    "street": "Rua C",
                    "number": "300",
                    "neighborhood": "Centro",
                    "city": "Londrina",
                    "state": "PR",
                }
            ),
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {str(self.access)}",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["message"], "Endereco atualizado com sucesso.")
        self.assertEqual(payload["address"]["city"], "Londrina")
