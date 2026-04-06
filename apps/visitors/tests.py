"""Testes do dominio visitors e da API Ninja."""

import json
from datetime import date
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import Client, TestCase
from django.utils import timezone
from ninja_jwt.tokens import AccessToken

from apps.profiles.models import Phone, Profile
from apps.visitors.models import ChristianityTypeChoices, EvangelicalChurchInfo, ReligionChoices, Visitor, VisitorStatus
from apps.visitors.services import create_presential_visitor, create_visitor


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


class VisitorApiTests(TestCase):
    """Valida os endpoints Ninja do app visitors."""

    def setUp(self):
        self.client = Client()

    def _auth_headers(self, user):
        access = AccessToken.for_user(user)
        return {"HTTP_AUTHORIZATION": f"Bearer {str(access)}"}

    @patch("apps.profiles.services.creation.validate_number")
    def test_api_creates_new_online_visitor(self, mocked_validate_number):
        mocked_validate_number.return_value = {
            "success": True,
            "status_code": 200,
            "data": {
                "exists": True,
                "jid": "5543977776666@s.whatsapp.net",
                "number": "5543977776666",
                "name": "Api Visitor",
            },
        }

        response = self.client.post(
            "/api/visitors/register",
            data=json.dumps({"phone": "(43) 97777-6666"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload["message"], "Visitante registrado com sucesso.")
        self.assertIn("profile_uuid", payload)
        self.assertEqual(payload["visitor_status"], 1)
        self.assertEqual(payload["status"]["code"], 1)
        self.assertFalse(payload["reused_existing_profile"])
        self.assertIsNone(Visitor.objects.get(profile__uuid=payload["profile_uuid"]).date_of_visit)

    def test_api_register_returns_allowed_values_for_invalid_is_in_person(self):
        response = self.client.post(
            "/api/visitors/register",
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

    def test_api_register_presential_promotes_existing_online_visitor(self):
        user = User.objects.create_user(username="visitor_online")
        profile = Profile.objects.create(user=user)
        Phone.objects.create(profile=profile, number="5543911112222")
        Visitor.objects.create(profile=profile, status=VisitorStatus.AWAITTING_PRESENTIAL_VISIT)

        response = self.client.post(
            "/api/visitors/register",
            data=json.dumps({"contact_number": "5543911112222", "is_in_person": True}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload["message"], "Visitante presencial registrado com sucesso.")
        self.assertEqual(payload["visitor_status"], 15)
        self.assertEqual(payload["status"]["code"], 15)
        self.assertTrue(payload["reused_existing_profile"])
        self.assertEqual(Visitor.objects.get(profile=profile).date_of_visit, timezone.localdate())

    def test_api_register_accepts_contact_number_alias(self):
        with patch("apps.profiles.services.creation.validate_number") as mocked_validate_number:
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

            response = self.client.post(
                "/api/visitors/register",
                data=json.dumps({"contact_number": "(43) 91234-5678"}),
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["visitor_status"], 1)

    @patch("apps.authentication.services.check.create_and_send_login_otp")
    @patch("apps.profiles.services.creation.validate_number")
    def test_api_auth_registers_visitor_and_dispatches_auth_check(
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
            "/api/visitors/auth",
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
    def test_api_auth_reuses_existing_profile_and_dispatches_auth_check(self, mocked_create_and_send_login_otp):
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
            "/api/visitors/auth",
            data=json.dumps({"contact_number": "55 43 98000-1111"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["profile_uuid"], str(profile.uuid))
        self.assertEqual(payload["first_name"], "Reuse")
        self.assertTrue(payload["is_visitor"])

    @patch("apps.authentication.services.check.create_and_send_login_otp")
    def test_api_auth_supports_presential_register_flow(self, mocked_create_and_send_login_otp):
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
            "/api/visitors/auth",
            data=json.dumps({"phone": "5543911112222", "is_in_person": True}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["profile_uuid"], str(profile.uuid))
        visitor.refresh_from_db()
        self.assertEqual(visitor.status, VisitorStatus.AWAITING_TO_COLLECT_YOUR_GIFT)
        self.assertEqual(visitor.date_of_visit, timezone.localdate())

    @patch("apps.profiles.services.creation.validate_number")
    def test_api_auth_returns_specific_message_when_phone_is_invalid(self, mocked_validate_number):
        mocked_validate_number.return_value = {
            "success": False,
            "status_code": 200,
            "data": {"exists": False, "jid": "", "number": "5543999999999"},
        }

        response = self.client.post(
            "/api/visitors/auth",
            data=json.dumps({"phone": "43 99999-9999"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"message": "O numero informado nao e valido."})

    def test_api_login_returns_jwt_and_visitor_status(self):
        from apps.authentication.models import LoginOtpState

        user = User.objects.create_user(username="visitor_login_user")
        profile = Profile.objects.create(user=user)
        Visitor.objects.create(profile=profile, status=VisitorStatus.NEW_ONLINE)
        user.set_password("123456")
        user.save(update_fields=["password"])
        LoginOtpState.objects.create(user=user, otp_created_at=timezone.now())

        response = self.client.post(
            "/api/visitors/login",
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
            "/api/visitors/login",
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
            "/api/visitors/login",
            data=json.dumps({"profile_uuid": str(profile.uuid), "otp": "123456"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"message": "Visitante nao encontrado."})

    def test_api_register_online_reuses_existing_profile_idempotently(self):
        user = User.objects.create_user(username="visitor_existing")
        profile = Profile.objects.create(user=user)
        Phone.objects.create(profile=profile, number="5543980001111")
        Visitor.objects.create(profile=profile, status=VisitorStatus.NEW_ONLINE)

        response = self.client.post(
            "/api/visitors/register",
            data=json.dumps({"phone": "55 43 98000-1111"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload["profile_uuid"], str(profile.uuid))
        self.assertEqual(payload["visitor_status"], 1)
        self.assertEqual(payload["status"]["code"], 1)
        self.assertTrue(payload["reused_existing_profile"])

    def test_api_returns_only_visitor_status_on_me(self):
        user = User.objects.create_user(username="visitor_me_user")
        profile = Profile.objects.create(user=user)
        Visitor.objects.create(profile=profile, status=VisitorStatus.NEW_ONLINE)

        response = self.client.get("/api/visitors/me", **self._auth_headers(user))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "message": "Status do visitante carregado com sucesso.",
                "status": {
                    "code": 1,
                    "label": "Cadastro online realizado",
                    "description": "Contato captado pela internet com intenção de visitar a igreja.",
                    "required_action": "Completar os dados principais do cadastro.",
                },
            },
        )

    def test_update_endpoint_returns_missing_profile_fields_for_status_1(self):
        user = User.objects.create_user(username="visitor_missing_profile")
        profile = Profile.objects.create(user=user)
        Visitor.objects.create(profile=profile, status=VisitorStatus.NEW_ONLINE)

        response = self.client.post("/api/visitors/update", **self._auth_headers(user))

        self.assertEqual(response.status_code, 400)
        payload = response.json()
        self.assertEqual(payload["message"], "Ainda faltam dados principais do perfil.")
        self.assertEqual(payload["status"]["code"], 1)
        self.assertEqual(payload["required_action"], "Completar os dados principais do cadastro.")
        self.assertEqual(
            payload["missing_fields"],
            ["full_name", "date_of_birth", "gender", "marital_status"],
        )

    def test_update_endpoint_advances_from_1_to_2(self):
        user = User.objects.create_user(username="visitor_step_1")
        profile = Profile.objects.create(
            user=user,
            full_name="Visitante Exemplo",
            date_of_birth=date(1992, 4, 12),
            gender="male",
            marital_status="single",
        )
        Visitor.objects.create(profile=profile, status=VisitorStatus.NEW_ONLINE)

        response = self.client.post("/api/visitors/update", **self._auth_headers(user))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"]["code"], 2)

    def test_update_endpoint_advances_from_2_to_3_when_address_is_complete(self):
        user = User.objects.create_user(username="visitor_step_2")
        profile = Profile.objects.create(user=user)
        profile.address.zipcode = "86000-000"
        profile.address.street = "Rua A"
        profile.address.number = "10"
        profile.address.neighborhood = "Centro"
        profile.address.city = "Londrina"
        profile.address.state = "PR"
        profile.address.country = "Brasil"
        profile.address.save()
        Visitor.objects.create(profile=profile, status=VisitorStatus.DATA_COMPLETED_ONLINE)

        response = self.client.post("/api/visitors/update", **self._auth_headers(user))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"]["code"], 3)

    def test_patch_religious_data_only_saves_without_advancing_status(self):
        user = User.objects.create_user(username="visitor_religion")
        profile = Profile.objects.create(user=user)
        visitor = Visitor.objects.create(profile=profile, status=VisitorStatus.ADDRESS_COMPLETED_ONLINE)

        response = self.client.patch(
            "/api/visitors/religious-data",
            data=json.dumps(
                {
                    "religion": ReligionChoices.CHRISTIANITY,
                    "christianity_type": ChristianityTypeChoices.EVANGELICAL_PROTESTANT,
                    "evangelical_church_name": "Igreja Exemplo",
                    "evangelical_is_in_communion": True,
                }
            ),
            content_type="application/json",
            **self._auth_headers(user),
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"]["code"], 3)
        self.assertEqual(payload["missing_fields"], [])
        self.assertEqual(payload["religious_data"]["religion"], ReligionChoices.CHRISTIANITY)
        self.assertEqual(
            payload["religious_data"]["christianity_type"],
            ChristianityTypeChoices.EVANGELICAL_PROTESTANT,
        )
        visitor.refresh_from_db()
        self.assertEqual(visitor.status, VisitorStatus.ADDRESS_COMPLETED_ONLINE)
        self.assertTrue(
            EvangelicalChurchInfo.objects.filter(
                visitor__profile=profile,
                church_name="Igreja Exemplo",
                is_in_communion=True,
            ).exists()
        )

    def test_patch_religious_data_returns_allowed_values_for_invalid_religion(self):
        user = User.objects.create_user(username="visitor_invalid_religion")
        profile = Profile.objects.create(user=user)
        Visitor.objects.create(profile=profile, status=VisitorStatus.ADDRESS_COMPLETED_ONLINE)

        response = self.client.patch(
            "/api/visitors/religious-data",
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
                "umbanda_candomble",
                "islam",
                "judaism",
                "buddhism",
                "no_religion",
                "other",
            ],
        )

    def test_update_endpoint_advances_from_3_to_4_when_religious_data_is_complete(self):
        user = User.objects.create_user(username="visitor_step_3")
        profile = Profile.objects.create(user=user)
        Visitor.objects.create(
            profile=profile,
            status=VisitorStatus.ADDRESS_COMPLETED_ONLINE,
            religion=ReligionChoices.CHRISTIANITY,
            christianity_type=ChristianityTypeChoices.ROMAN_CATHOLIC,
        )

        response = self.client.post("/api/visitors/update", **self._auth_headers(user))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"]["code"], 4)

    def test_update_endpoint_advances_from_4_to_5(self):
        user = User.objects.create_user(username="visitor_step_4")
        profile = Profile.objects.create(user=user)
        visitor = Visitor.objects.create(
            profile=profile,
            status=VisitorStatus.DATA_RELIGION_COMPLETED_ONLINE,
            religion=ReligionChoices.CHRISTIANITY,
            christianity_type=ChristianityTypeChoices.ROMAN_CATHOLIC,
        )

        response = self.client.post("/api/visitors/update", **self._auth_headers(user))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"]["code"], 5)
        visitor.refresh_from_db()
        self.assertEqual(visitor.status, VisitorStatus.AWAITTING_PRESENTIAL_VISIT)
