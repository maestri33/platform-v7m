"""Testes do dominio visitors e da API Ninja."""

import json
from datetime import date
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import Client, TestCase
from django.utils import timezone
from ninja_jwt.tokens import AccessToken, RefreshToken

from apps.profiles.models import Phone, Profile
from apps.visitors.messages import CHRISTIANITY_PROMPT_MESSAGE
from apps.visitors.notifications import (
    VISITOR_STATUS_FOLLOWUP_EVENT_KEY,
    create_visitor_14_notification,
    create_visitor_21_notification,
    create_visitor_4_notification,
)
from apps.visitors.models import ChristianityTypeChoices, EvangelicalChurchInfo, ReligionChoices, Visitor, VisitorStatus
from apps.visitors.services import create_presential_visitor, create_visitor
from notifications.models import Notification


class VisitorCreationServicesTests(TestCase):
    """Garante a criacao de visitors reaproveitando profiles."""

    @patch("apps.profiles.services.creation.validate_number")
    def test_create_visitor_creates_user_profile_phone_and_visitor(self, mocked_validate_number):
        mocked_validate_number.return_value = {
            "success": True,
            "status_code": 200,
            "data": {
                "exists": True,
                "jid": "5543988887777@s.whatsapp.net",
                "number": "5543988887777",
                "name": "Novo Visitante",
            },
        }

        response = create_visitor(contact_number="(43) 98888-7777")

        self.assertTrue(response.success)
        profile = Profile.objects.get(id=response.data["profile_id"])
        phone = Phone.objects.get(profile=profile)
        visitor = Visitor.objects.get(profile=profile)

        self.assertEqual(response.data["profile_uuid"], str(profile.uuid))
        self.assertEqual(profile.full_name, "")
        self.assertEqual(phone.number, "5543988887777")
        self.assertEqual(profile.user.email, "")
        self.assertEqual(visitor.status, VisitorStatus.NEW_ONLINE)
        self.assertIsNone(visitor.date_of_visit)
        self.assertIsNotNone(visitor.created_at)
        self.assertIsNotNone(visitor.updated_at)

    @patch("apps.profiles.services.creation.validate_number")
    def test_create_presential_visitor_promotes_existing_online_status(self, mocked_validate_number):
        mocked_validate_number.return_value = {
            "success": True,
            "status_code": 200,
            "data": {
                "exists": True,
                "jid": "5543977776666@s.whatsapp.net",
                "number": "5543977776666",
                "name": "Visitante Online",
            },
        }
        online_response = create_visitor(contact_number="43 97777-6666")
        self.assertTrue(online_response.success)

        visitor = Visitor.objects.get(profile_id=online_response.data["profile_id"])
        visitor.status = VisitorStatus.ADDRESS_COMPLETED_ONLINE
        visitor.save(update_fields=["status"])

        response = create_presential_visitor(contact_number="43 97777-6666")

        self.assertTrue(response.success)
        visitor.refresh_from_db()
        self.assertEqual(visitor.status, VisitorStatus.ADDRESS_COMPLETED_PRESENCIAL)
        self.assertEqual(visitor.date_of_visit, timezone.localdate())

    @patch("apps.profiles.services.creation.validate_number")
    def test_create_presential_visitor_sets_date_when_creating_new_record(self, mocked_validate_number):
        mocked_validate_number.return_value = {
            "success": True,
            "status_code": 200,
            "data": {
                "exists": True,
                "jid": "5543991234567@s.whatsapp.net",
                "number": "5543991234567",
                "name": "Visitante Presencial",
            },
        }

        response = create_presential_visitor(contact_number="43 99123-4567")

        self.assertTrue(response.success)
        visitor = Visitor.objects.get(profile_id=response.data["profile_id"])
        self.assertEqual(visitor.status, VisitorStatus.NEW_PRESENCIAL)
        self.assertEqual(visitor.date_of_visit, timezone.localdate())

    @patch("apps.profiles.services.creation.validate_number")
    def test_create_visitor_returns_error_when_phone_is_not_valid(self, mocked_validate_number):
        mocked_validate_number.return_value = {
            "success": False,
            "status_code": 200,
            "data": {"exists": False, "jid": "", "number": "5543999999999"},
        }

        response = create_visitor(contact_number="43 99999-9999")

        self.assertFalse(response.success)
        self.assertEqual(response.error, "Numero de contato invalido no WhatsApp.")


class VisitorNotificationsTests(TestCase):
    """Garante a criação das notificações do domínio de visitantes."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="visitor_notification_user",
            first_name="Samuel",
            email="samuel@example.com",
        )
        self.profile = Profile.objects.create(user=self.user, full_name="Samuel Oliveira")
        self.visitor = Visitor.objects.create(profile=self.profile, status=VisitorStatus.NEW_ONLINE)

    def _assert_notification(self, *, response, expected_event_key, expected_title):
        self.assertTrue(response.success)
        notification = Notification.objects.get(id=response.data["notification_id"])
        self.assertEqual(notification.recipient, self.profile)
        self.assertEqual(notification.event_key, expected_event_key)
        self.assertEqual(notification.title, expected_title)
        self.assertTrue(notification.use_tts)
        self.assertIn("Samuel", notification.content)
        return notification

    def test_create_visitor_4_notification_creates_tts_notification(self):
        response = create_visitor_4_notification(visitor=self.visitor)

        notification = self._assert_notification(
            response=response,
            expected_event_key="visitor-status-4",
            expected_title="# Cadastro concluído",
        )
        self.assertIn("visita presencial", notification.content)

    def test_create_visitor_14_notification_creates_tts_notification(self):
        response = create_visitor_14_notification(visitor=self.visitor.id)

        notification = self._assert_notification(
            response=response,
            expected_event_key="visitor-status-14",
            expected_title="# Procure a recepção",
        )
        self.assertIn("recepcao", notification.content)

    def test_create_visitor_21_notification_creates_tts_notification(self):
        response = create_visitor_21_notification(visitor=self.visitor)

        notification = self._assert_notification(
            response=response,
            expected_event_key="visitor-status-21",
            expected_title="# Acompanhamento da recepção",
        )
        self.assertIn("contato", notification.content)

    def test_create_visitor_notification_returns_error_for_missing_visitor(self):
        response = create_visitor_4_notification(visitor=999999)

        self.assertFalse(response.success)
        self.assertEqual(response.error, "Visitante nao encontrado.")


class VisitorNotificationSignalsTests(TestCase):
    """Garante as automações de notificação baseadas em mudança de status."""

    @patch("apps.visitors.signals.send_notification")
    def test_status_4_creates_and_dispatches_notification_automatically(self, mocked_send_notification):
        user = User.objects.create_user(username="visitor_signal_status_4", first_name="Joao")
        profile = Profile.objects.create(user=user, full_name="Joao da Silva")

        with self.captureOnCommitCallbacks(execute=True):
            visitor = Visitor.objects.create(
                profile=profile,
                status=VisitorStatus.AWAITTING_PRESENTIAL_VISIT,
            )

        notification = Notification.objects.get(
            recipient=profile,
            event_key="visitor-status-4",
        )
        self.assertIn("Joao", notification.content)
        mocked_send_notification.assert_called_once_with(notification.id)
        self.assertEqual(visitor.status, VisitorStatus.AWAITTING_PRESENTIAL_VISIT)

    @patch("apps.visitors.signals.send_notification")
    def test_status_14_creates_scheduled_followup_for_21h(self, mocked_send_notification):
        user = User.objects.create_user(username="visitor_signal_status_14", first_name="Maria")
        profile = Profile.objects.create(user=user, full_name="Maria Oliveira")

        Visitor.objects.create(
            profile=profile,
            status=VisitorStatus.AWAITING_TO_COLLECT_YOUR_GIFT,
        )

        notification = Notification.objects.get(
            recipient=profile,
            event_key=VISITOR_STATUS_FOLLOWUP_EVENT_KEY,
        )
        self.assertEqual(notification.status, Notification.Status.PENDING)
        self.assertIsNotNone(notification.scheduled_for)
        self.assertEqual(timezone.localtime(notification.scheduled_for).hour, 21)
        mocked_send_notification.assert_not_called()

    @patch("apps.visitors.signals.send_notification")
    def test_unchanged_status_does_not_create_duplicate_notifications(self, mocked_send_notification):
        user = User.objects.create_user(username="visitor_signal_no_duplicate", first_name="Ana")
        profile = Profile.objects.create(user=user, full_name="Ana Souza")
        visitor = Visitor.objects.create(
            profile=profile,
            status=VisitorStatus.AWAITING_TO_COLLECT_YOUR_GIFT,
        )

        visitor.religion = ReligionChoices.CHRISTIANITY
        visitor.save(update_fields=["religion"])

        self.assertEqual(
            Notification.objects.filter(
                recipient=profile,
                event_key=VISITOR_STATUS_FOLLOWUP_EVENT_KEY,
            ).count(),
            1,
        )
        mocked_send_notification.assert_not_called()


class VisitorApiTests(TestCase):
    """Valida os endpoints Ninja do app visitors."""

    def setUp(self):
        self.client = Client()

    def _auth_headers(self, user):
        access = AccessToken.for_user(user)
        return {"HTTP_AUTHORIZATION": f"Bearer {str(access)}"}

    def test_api_authentication_returns_allowed_values_for_invalid_is_in_person(self):
        response = self.client.post(
            "/visitors/authentication",
            data=json.dumps({"contact_number": "5543977776666", "is_in_person": "maybe"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 422)
        self.assertEqual(
            response.json(),
            {
                "message": "Alguns campos possuem valores invalidos.",
                "allowed_values": {
                    "is_in_person": [True, False],
                },
            },
        )

    @patch("apps.authentication.services.check.create_and_send_login_otp")
    @patch("apps.profiles.services.creation.validate_number")
    def test_api_authentication_registers_visitor_and_dispatches_auth_check(
        self,
        mocked_validate_number,
        mocked_create_and_send_login_otp,
    ):
        mocked_validate_number.return_value = {
            "success": True,
            "status_code": 200,
            "data": {
                "exists": True,
                "jid": "5543912345678@s.whatsapp.net",
                "number": "5543912345678",
                "name": "Api Auth Visitor",
            },
        }
        mocked_create_and_send_login_otp.return_value.data = {
            "notification_id": 88,
            "notification_status": "sent",
            "channel_sent": "both",
            "user_id": 1,
            "frontend_link": "",
        }
        mocked_create_and_send_login_otp.return_value.success = True
        mocked_create_and_send_login_otp.return_value.error = None

        response = self.client.post(
            "/visitors/authentication",
            data=json.dumps({"phone": "(43) 91234-5678"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["message"], "Codigo de verificacao enviado com sucesso.")
        self.assertTrue(payload["is_visitor"])
        self.assertIn("profile_uuid", payload)
        self.assertTrue(Profile.objects.filter(uuid=payload["profile_uuid"]).exists())
        self.assertTrue(Visitor.objects.filter(profile__uuid=payload["profile_uuid"]).exists())

    @patch("apps.authentication.services.check.create_and_send_login_otp")
    def test_api_authentication_reuses_existing_profile_and_dispatches_auth_check(self, mocked_create_and_send_login_otp):
        user = User.objects.create_user(username="visitor_auth_existing", first_name="Reuse")
        profile = Profile.objects.create(user=user, full_name="Reuse Existing")
        Phone.objects.create(profile=profile, number="5543980001111")
        Visitor.objects.create(profile=profile, status=VisitorStatus.NEW_ONLINE)
        mocked_create_and_send_login_otp.return_value.data = {
            "notification_id": 89,
            "notification_status": "sent",
            "channel_sent": "both",
            "user_id": user.id,
            "frontend_link": f"https://app.ieadpg.org/login/{profile.uuid}?otp=123456",
        }
        mocked_create_and_send_login_otp.return_value.success = True
        mocked_create_and_send_login_otp.return_value.error = None

        response = self.client.post(
            "/visitors/authentication",
            data=json.dumps({"contact_number": "55 43 98000-1111"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["profile_uuid"], str(profile.uuid))
        self.assertEqual(payload["first_name"], "Reuse")
        self.assertTrue(payload["is_visitor"])

    @patch("apps.authentication.services.check.create_and_send_login_otp")
    def test_api_authentication_supports_presential_register_flow(self, mocked_create_and_send_login_otp):
        user = User.objects.create_user(username="visitor_auth_presential", first_name="Presencial")
        profile = Profile.objects.create(user=user, full_name="Presencial Existing")
        Phone.objects.create(profile=profile, number="5543911112222")
        visitor = Visitor.objects.create(profile=profile, status=VisitorStatus.AWAITTING_PRESENTIAL_VISIT)
        mocked_create_and_send_login_otp.return_value.data = {
            "notification_id": 90,
            "notification_status": "sent",
            "channel_sent": "both",
            "user_id": user.id,
            "frontend_link": f"https://app.ieadpg.org/login/{profile.uuid}?otp=123456",
        }
        mocked_create_and_send_login_otp.return_value.success = True
        mocked_create_and_send_login_otp.return_value.error = None

        response = self.client.post(
            "/visitors/authentication",
            data=json.dumps({"phone": "5543911112222", "is_in_person": True}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["profile_uuid"], str(profile.uuid))
        visitor.refresh_from_db()
        self.assertEqual(visitor.status, VisitorStatus.AWAITING_TO_COLLECT_YOUR_GIFT)
        self.assertEqual(visitor.date_of_visit, timezone.localdate())

    @patch("apps.profiles.services.creation.validate_number")
    def test_api_authentication_returns_specific_message_when_phone_is_invalid(self, mocked_validate_number):
        mocked_validate_number.return_value = {
            "success": False,
            "status_code": 200,
            "data": {"exists": False, "jid": "", "number": "5543999999999"},
        }

        response = self.client.post(
            "/visitors/authentication",
            data=json.dumps({"phone": "43 99999-9999"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"message": "O numero informado nao e valido."})

    @patch("apps.authentication.services.check.create_and_send_login_otp")
    @patch("apps.profiles.services.creation.validate_number")
    def test_api_authentication_accepts_contact_number_alias(self, mocked_validate_number, mocked_create_and_send_login_otp):
        mocked_validate_number.return_value = {
            "success": True,
            "status_code": 200,
            "data": {
                "exists": True,
                "jid": "5543912345678@s.whatsapp.net",
                "number": "5543912345678",
                "name": "Api Alias Visitor",
            },
        }
        mocked_create_and_send_login_otp.return_value.data = {
            "notification_id": 91,
            "notification_status": "sent",
            "channel_sent": "both",
            "user_id": 1,
            "frontend_link": "",
        }
        mocked_create_and_send_login_otp.return_value.success = True
        mocked_create_and_send_login_otp.return_value.error = None

        response = self.client.post(
            "/visitors/authentication",
            data=json.dumps({"contact_number": "(43) 91234-5678"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(Visitor.objects.filter(profile__uuid=response.json()["profile_uuid"]).exists())

    def test_api_login_returns_jwt_and_visitor_status(self):
        from apps.authentication.models import LoginOtpState

        user = User.objects.create_user(username="visitor_login_user")
        profile = Profile.objects.create(user=user)
        Visitor.objects.create(profile=profile, status=VisitorStatus.NEW_ONLINE)
        user.set_password("123456")
        user.save(update_fields=["password"])
        LoginOtpState.objects.create(user=user, otp_created_at=timezone.now())

        response = self.client.post(
            "/visitors/login",
            data=json.dumps({"profile_uuid": str(profile.uuid), "otp": "123456"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["message"], "Login realizado com sucesso.")
        self.assertIn("access", payload)
        self.assertIn("refresh", payload)
        self.assertTrue(payload["is_visitor"])
        self.assertEqual(
            payload["status"],
            {
                "code": 1,
                "label": "Cadastro online realizado",
                "description": "Contato captado pela internet com intenção de visitar a igreja.",
                "required_action": "Completar os dados principais do cadastro.",
            },
        )

    def test_api_login_returns_401_for_invalid_otp(self):
        from apps.authentication.models import LoginOtpState

        user = User.objects.create_user(username="visitor_login_invalid_user")
        profile = Profile.objects.create(user=user)
        Visitor.objects.create(profile=profile, status=VisitorStatus.NEW_ONLINE)
        user.set_password("123456")
        user.save(update_fields=["password"])
        LoginOtpState.objects.create(user=user, otp_created_at=timezone.now())

        response = self.client.post(
            "/visitors/login",
            data=json.dumps({"profile_uuid": str(profile.uuid), "otp": "999999"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json(), {"message": "Codigo de verificacao invalido."})

    def test_api_login_returns_404_when_profile_is_not_a_visitor(self):
        from apps.authentication.models import LoginOtpState

        user = User.objects.create_user(username="visitor_login_non_visitor")
        profile = Profile.objects.create(user=user)
        user.set_password("123456")
        user.save(update_fields=["password"])
        LoginOtpState.objects.create(user=user, otp_created_at=timezone.now())

        response = self.client.post(
            "/visitors/login",
            data=json.dumps({"profile_uuid": str(profile.uuid), "otp": "123456"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"message": "Visitante nao encontrado."})

    def test_api_refresh_returns_new_access_token(self):
        user = User.objects.create_user(username="visitor_refresh_user")
        profile = Profile.objects.create(user=user)
        Visitor.objects.create(profile=profile, status=VisitorStatus.NEW_ONLINE)
        refresh = RefreshToken.for_user(user)
        refresh["profile_uuid"] = str(profile.uuid)
        refresh["is_visitor"] = True

        response = self.client.post(
            "/visitors/refresh",
            data=json.dumps({"refresh": str(refresh)}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["message"], "Token atualizado com sucesso.")
        self.assertIn("access", payload)
        self.assertIn("refresh", payload)
        self.assertTrue(payload["refresh"])

    def test_api_refresh_returns_401_when_token_is_invalid(self):
        response = self.client.post(
            "/visitors/refresh",
            data=json.dumps({"refresh": "token-invalido"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json(), {"message": "Refresh token invalido ou expirado."})

    @patch("apps.authentication.services.check.create_and_send_login_otp")
    def test_api_authentication_reuses_existing_profile_idempotently(self, mocked_create_and_send_login_otp):
        user = User.objects.create_user(username="visitor_existing")
        profile = Profile.objects.create(user=user)
        Phone.objects.create(profile=profile, number="5543980001111")
        Visitor.objects.create(profile=profile, status=VisitorStatus.NEW_ONLINE)
        mocked_create_and_send_login_otp.return_value.data = {
            "notification_id": 92,
            "notification_status": "sent",
            "channel_sent": "both",
            "user_id": user.id,
            "frontend_link": "",
        }
        mocked_create_and_send_login_otp.return_value.success = True
        mocked_create_and_send_login_otp.return_value.error = None

        response = self.client.post(
            "/visitors/authentication",
            data=json.dumps({"phone": "55 43 98000-1111"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["profile_uuid"], str(profile.uuid))
        self.assertTrue(payload["is_visitor"])

    def test_get_profile_data_returns_context_message_and_missing_fields(self):
        user = User.objects.create_user(username="visitor_missing_profile")
        profile = Profile.objects.create(user=user)
        Visitor.objects.create(profile=profile, status=VisitorStatus.NEW_ONLINE)

        response = self.client.get("/visitors/data", **self._auth_headers(user))

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(
            payload["message"],
            "Dados principais carregados. Ja recebemos parte do seu cadastro e ainda faltam: nome completo, data de nascimento, genero, estado civil.",
        )
        self.assertEqual(payload["status"]["code"], 1)
        self.assertEqual(payload["required_action"], "Completar os dados principais do cadastro.")
        self.assertEqual(
            payload["missing_fields"],
            ["full_name", "date_of_birth", "gender", "marital_status"],
        )
        self.assertEqual(
            payload["profile"],
            {
                "full_name": "",
                "email": "",
                "date_of_birth": None,
                "gender": "",
                "marital_status": "",
            },
        )

    def test_post_profile_data_advances_from_1_to_2(self):
        user = User.objects.create_user(username="visitor_step_1")
        profile = Profile.objects.create(user=user)
        Visitor.objects.create(profile=profile, status=VisitorStatus.NEW_ONLINE)

        response = self.client.post(
            "/visitors/data",
            data=json.dumps(
                {
                    "full_name": "Visitante Exemplo",
                    "email": "visitante@example.com",
                    "date_of_birth": "1992-04-12",
                    "gender": "male",
                    "marital_status": "single",
                }
            ),
            content_type="application/json",
            **self._auth_headers(user),
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(
            payload["message"],
            "Parabens! Seus dados principais foram salvos com sucesso. Proximo passo: Completar o endereço.",
        )
        self.assertEqual(payload["status"]["code"], 2)
        self.assertEqual(payload["required_action"], "Completar o endereço.")
        profile.refresh_from_db()
        self.assertEqual(profile.full_name, "Visitante Exemplo")
        self.assertEqual(profile.user.email, "visitante@example.com")
        self.assertEqual(profile.date_of_birth, date(1992, 4, 12))
        self.assertEqual(profile.gender, "male")
        self.assertEqual(profile.marital_status, "single")
        self.assertEqual(profile.visitor.status, VisitorStatus.DATA_COMPLETED_ONLINE)

    def test_post_profile_data_advances_from_11_to_12(self):
        user = User.objects.create_user(username="visitor_step_11")
        profile = Profile.objects.create(user=user)
        Visitor.objects.create(profile=profile, status=VisitorStatus.NEW_PRESENCIAL)

        response = self.client.post(
            "/visitors/data",
            data=json.dumps(
                {
                    "full_name": "Visitante Presencial",
                    "email": "",
                    "date_of_birth": "1990-01-10",
                    "gender": "male",
                    "marital_status": "married",
                }
            ),
            content_type="application/json",
            **self._auth_headers(user),
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"]["code"], 12)
        profile.visitor.refresh_from_db()
        self.assertEqual(profile.visitor.status, VisitorStatus.DATA_COMPLETED_PRESENCIAL)

    def test_get_address_returns_context_message_and_missing_fields(self):
        user = User.objects.create_user(username="visitor_step_2")
        profile = Profile.objects.create(user=user)
        Visitor.objects.create(profile=profile, status=VisitorStatus.DATA_COMPLETED_ONLINE)

        response = self.client.get("/visitors/address", **self._auth_headers(user))

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(
            payload["message"],
            "Endereco carregado. Ja recebemos parte desta etapa e ainda faltam: CEP, rua, numero, bairro, cidade, estado.",
        )
        self.assertEqual(payload["status"]["code"], 2)
        self.assertEqual(
            payload["missing_fields"],
            ["zipcode", "street", "number", "neighborhood", "city", "state"],
        )
        self.assertEqual(
            payload["address"],
            {
                "zipcode": "",
                "street": "",
                "number": "",
                "complement": "",
                "neighborhood": "",
                "city": "",
                "state": "",
                "country": "Brasil",
            },
        )

    def test_post_address_advances_from_2_to_3_when_address_is_complete(self):
        user = User.objects.create_user(username="visitor_step_2_post")
        profile = Profile.objects.create(user=user)
        visitor = Visitor.objects.create(profile=profile, status=VisitorStatus.DATA_COMPLETED_ONLINE)

        response = self.client.post(
            "/visitors/address",
            data=json.dumps(
                {
                    "zipcode": "86000-000",
                    "street": "Rua A",
                    "number": "10",
                    "complement": "",
                    "neighborhood": "Centro",
                    "city": "Londrina",
                    "state": "PR",
                    "country": "Brasil",
                }
            ),
            content_type="application/json",
            **self._auth_headers(user),
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"]["code"], 3)
        self.assertEqual(
            payload["message"],
            "Parabens! Seu endereco foi salvo com sucesso. Proximo passo: Informar os dados religiosos.",
        )
        self.assertEqual(payload["missing_fields"], [])
        visitor.refresh_from_db()
        self.assertEqual(visitor.status, VisitorStatus.ADDRESS_COMPLETED_ONLINE)
        self.assertEqual(payload["address"]["city"], "Londrina")

    def test_post_address_advances_from_12_to_13(self):
        user = User.objects.create_user(username="visitor_step_12")
        profile = Profile.objects.create(user=user)
        visitor = Visitor.objects.create(profile=profile, status=VisitorStatus.DATA_COMPLETED_PRESENCIAL)

        response = self.client.post(
            "/visitors/address",
            data=json.dumps(
                {
                    "zipcode": "86000-000",
                    "street": "Rua B",
                    "number": "20",
                    "neighborhood": "Centro",
                    "city": "Londrina",
                    "state": "PR",
                    "country": "Brasil",
                }
            ),
            content_type="application/json",
            **self._auth_headers(user),
        )

        self.assertEqual(response.status_code, 200)
        visitor.refresh_from_db()
        self.assertEqual(visitor.status, VisitorStatus.ADDRESS_COMPLETED_PRESENCIAL)
        self.assertEqual(response.json()["status"]["code"], 13)

    def test_post_religious_data_returns_allowed_values_for_invalid_religion(self):
        user = User.objects.create_user(username="visitor_invalid_religion")
        profile = Profile.objects.create(user=user)
        Visitor.objects.create(profile=profile, status=VisitorStatus.ADDRESS_COMPLETED_ONLINE)

        response = self.client.post(
            "/visitors/religious-data",
            data=json.dumps({"religion": "invalid"}),
            content_type="application/json",
            **self._auth_headers(user),
        )

        self.assertEqual(response.status_code, 422)
        payload = response.json()
        self.assertEqual(payload["message"], "Alguns campos possuem valores invalidos.")
        self.assertEqual(
            payload["allowed_values"]["religion"],
            [
                "christianity",
                "spiritism",
                "african_origin",
                "islam",
                "judaism",
                "buddhism",
                "no_religion",
                "other",
            ],
        )

    def test_post_religious_data_advances_from_3_to_4_when_religious_data_is_complete(self):
        user = User.objects.create_user(username="visitor_step_3")
        profile = Profile.objects.create(user=user)
        visitor = Visitor.objects.create(
            profile=profile,
            status=VisitorStatus.ADDRESS_COMPLETED_ONLINE,
        )

        response = self.client.post(
            "/visitors/religious-data",
            data=json.dumps(
                {
                    "religion": ReligionChoices.CHRISTIANITY,
                    "christianity_type": ChristianityTypeChoices.ROMAN_CATHOLIC,
                }
            ),
            content_type="application/json",
            **self._auth_headers(user),
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"]["code"], 4)
        self.assertEqual(
            payload["message"],
            "Parabens! Seus dados religiosos foram salvos com sucesso. Proximo passo: Registrar a visita presencial na igreja.",
        )
        visitor.refresh_from_db()
        self.assertEqual(visitor.status, VisitorStatus.AWAITTING_PRESENTIAL_VISIT)

    def test_post_religious_data_advances_from_13_to_14_when_religious_data_is_complete(self):
        user = User.objects.create_user(username="visitor_step_13")
        profile = Profile.objects.create(user=user)
        visitor = Visitor.objects.create(
            profile=profile,
            status=VisitorStatus.ADDRESS_COMPLETED_PRESENCIAL,
        )

        response = self.client.post(
            "/visitors/religious-data",
            data=json.dumps(
                {
                    "religion": ReligionChoices.CHRISTIANITY,
                    "christianity_type": ChristianityTypeChoices.ROMAN_CATHOLIC,
                }
            ),
            content_type="application/json",
            **self._auth_headers(user),
        )

        self.assertEqual(response.status_code, 200)
        visitor.refresh_from_db()
        self.assertEqual(visitor.status, VisitorStatus.AWAITING_TO_COLLECT_YOUR_GIFT)
        self.assertEqual(response.json()["status"]["code"], 14)


class VisitorContactFrontendTests(TestCase):
    """Valida o frontend HTML simples baseado em HTMX."""

    def setUp(self):
        self.client = Client()

    def test_root_redirects_to_main_site(self):
        response = self.client.get("/")

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], "https://ieadpg.org")

    def test_contact_home_renders_online_authentication_partial(self):
        response = self.client.get("/contato/")

        self.assertEqual(response.status_code, 200)
        content = response.content.decode()
        self.assertIn('id="contact-modal"', content)
        self.assertIn("Obrigado por acessar a IEADPG.", content)
        self.assertIn('hx-post="/contato/authentication/"', content)
        self.assertIn('src="https://amalia.ieadpg.org/logo.png"', content)

    def test_modal_blank_returns_placeholder_container(self):
        response = self.client.get("/contato/modal/blank/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content.decode().strip(), '<div id="contact-modal"></div>')

    def test_contact_without_trailing_slash_redirects_preserving_query_string(self):
        response = self.client.get("/contato?p=1")

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], "/contato/?p=1")

    def test_contact_home_with_p_query_renders_presential_authentication_partial(self):
        response = self.client.get("/contato/?p=1")

        self.assertEqual(response.status_code, 200)
        content = response.content.decode()
        self.assertIn("Obrigado por participar do culto.", content)
        self.assertIn('name="is_in_person" value="true"', content)

    @patch("apps.authentication.services.check.create_and_send_login_otp")
    @patch("apps.profiles.services.creation.validate_number")
    def test_authentication_post_returns_login_partial_and_modal(self, mocked_validate_number, mocked_create_and_send_login_otp):
        mocked_validate_number.return_value = {
            "success": True,
            "status_code": 200,
            "data": {
                "exists": True,
                "jid": "5543991234567@s.whatsapp.net",
                "number": "5543991234567",
                "name": "Frontend Visitor",
            },
        }
        mocked_create_and_send_login_otp.return_value.data = {
            "notification_id": 1,
            "notification_status": "sent",
            "channel_sent": "both",
            "user_id": 1,
            "frontend_link": "https://app.ieadpg.org/login/teste?otp=123456",
        }
        mocked_create_and_send_login_otp.return_value.success = True
        mocked_create_and_send_login_otp.return_value.error = None

        response = self.client.post(
            "/contato/authentication/",
            {"phone": "(43) 99123-4567"},
        )

        self.assertEqual(response.status_code, 200)
        content = response.content.decode()
        self.assertIn("Confirme seu código", content)
        self.assertIn("Codigo de verificacao enviado com sucesso.", content)
        self.assertTrue(self.client.session.get("contact_profile_uuid"))

    def test_login_post_routes_to_data_partial(self):
        from apps.authentication.models import LoginOtpState

        user = User.objects.create_user(username="contact_login_user")
        profile = Profile.objects.create(user=user)
        Visitor.objects.create(profile=profile, status=VisitorStatus.NEW_ONLINE)
        user.set_password("123456")
        user.save(update_fields=["password"])
        LoginOtpState.objects.create(user=user, otp_created_at=timezone.now())

        session = self.client.session
        session["contact_profile_uuid"] = str(profile.uuid)
        session.save()

        response = self.client.post(
            "/contato/login/",
            {
                "profile_uuid": str(profile.uuid),
                "otp": "123456",
            },
        )

        self.assertEqual(response.status_code, 200)
        content = response.content.decode()
        self.assertIn("Dados principais", content)
        self.assertIn("Login realizado com sucesso.", content)
        self.assertTrue(self.client.session.get("contact_access"))
        self.assertIn('hx-post="/contato/logout/"', content)

    def test_magic_login_get_routes_to_data_partial(self):
        from apps.authentication.models import LoginOtpState

        user = User.objects.create_user(username="contact_magic_login_user")
        profile = Profile.objects.create(user=user)
        Visitor.objects.create(profile=profile, status=VisitorStatus.NEW_ONLINE)
        user.set_password("123456")
        user.save(update_fields=["password"])
        LoginOtpState.objects.create(user=user, otp_created_at=timezone.now())

        response = self.client.get(
            f"/contato/login/{profile.uuid}?otp=123456",
            follow=True,
        )

        self.assertEqual(response.status_code, 200)
        content = response.content.decode()
        self.assertIn("Dados principais", content)
        self.assertIn("Login realizado com sucesso.", content)
        self.assertTrue(self.client.session.get("contact_access"))
        self.assertIn('hx-post="/contato/logout/"', content)

    def test_magic_login_get_with_invalid_otp_falls_back_to_manual_login(self):
        from apps.authentication.models import LoginOtpState

        user = User.objects.create_user(username="contact_magic_login_invalid_user")
        profile = Profile.objects.create(user=user)
        Visitor.objects.create(profile=profile, status=VisitorStatus.NEW_ONLINE)
        user.set_password("123456")
        user.save(update_fields=["password"])
        LoginOtpState.objects.create(user=user, otp_created_at=timezone.now())

        response = self.client.get(
            f"/contato/login/{profile.uuid}?otp=999999",
            follow=True,
        )

        self.assertEqual(response.status_code, 200)
        content = response.content.decode()
        self.assertIn("Confirme seu código", content)
        self.assertIn("Codigo de verificacao invalido.", content)
        self.assertEqual(self.client.session.get("contact_profile_uuid"), str(profile.uuid))
        self.assertFalse(self.client.session.get("contact_access"))

    def test_logout_returns_public_contact_screen_and_clears_session(self):
        user = User.objects.create_user(username="contact_logout_user")
        profile = Profile.objects.create(user=user)
        Visitor.objects.create(profile=profile, status=VisitorStatus.NEW_ONLINE)
        self.client.force_login(user)

        session = self.client.session
        session["contact_profile_uuid"] = str(profile.uuid)
        session["contact_access"] = "access-token"
        session["contact_refresh"] = "refresh-token"
        session["contact_status_code"] = 1
        session.save()

        response = self.client.post("/contato/logout/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["HX-Replace-Url"], "/contato/")
        content = response.content.decode()
        self.assertIn("Obrigado por acessar a IEADPG.", content)
        self.assertIn("Voce saiu com sucesso.", content)
        updated_session = self.client.session
        self.assertFalse(updated_session.get("contact_profile_uuid"))
        self.assertFalse(updated_session.get("contact_access"))
        self.assertFalse(updated_session.get("contact_refresh"))

    @patch("apps.visitors.views.urlopen")
    def test_address_lookup_returns_prefilled_form(self, mocked_urlopen):
        user = User.objects.create_user(username="contact_address_user")
        profile = Profile.objects.create(user=user)
        Visitor.objects.create(profile=profile, status=VisitorStatus.DATA_COMPLETED_ONLINE)
        self.client.force_login(user)

        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, tb):
                return False

            def read(self):
                return json.dumps(
                    {
                        "logradouro": "Rua Exemplo",
                        "bairro": "Centro",
                        "localidade": "Ponta Grossa",
                        "uf": "PR",
                    }
                ).encode("utf-8")

        mocked_urlopen.return_value = FakeResponse()

        response = self.client.post(
            "/contato/address/lookup/",
            {"zipcode": "84000-000"},
        )

        self.assertEqual(response.status_code, 200)
        content = response.content.decode()
        self.assertIn("CEP localizado com sucesso.", content)
        self.assertIn("Rua Exemplo", content)
        self.assertIn('id="address-form-slot"', content)

    def test_religion_prepare_returns_inline_prompt_and_message_modal_for_christianity(self):
        user = User.objects.create_user(username="contact_religion_user")
        profile = Profile.objects.create(user=user)
        Visitor.objects.create(profile=profile, status=VisitorStatus.ADDRESS_COMPLETED_ONLINE)
        self.client.force_login(user)

        response = self.client.post(
            "/contato/religion/prepare/",
            {"religion": "christianity"},
        )

        self.assertEqual(response.status_code, 200)
        content = response.content.decode()
        self.assertIn(CHRISTIANITY_PROMPT_MESSAGE, content)
        self.assertIn('id="contact-religion-detail"', content)
        self.assertIn('name="christianity_type"', content)
        self.assertIn('hx-swap-oob="outerHTML"', content)
