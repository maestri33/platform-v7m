"""Testes das transições de papel (visitante → congregado → membro).

O catálogo real vem de ``settings.ROLE_RULES``; os testes usam o mesmo catálogo
de produção para que uma mudança acidental nele quebre aqui.
"""

from unittest.mock import patch

from django.test import TestCase

from apps.profiles.models import Profile
from apps.roles.interface import active_role, active_roles
from apps.roles.models import ProfileRole, Role
from apps.roles.services import RoleTransitionError, grant_role, revoke_role


def _make_profile(phone="5542977776666", full_name="Joana Lima"):
    from apps.profiles.services.creation import create_user_profile_with_contact

    with patch(
        "apps.profiles.services.creation.validate_number",
        return_value={"success": True, "status_code": 200, "data": {"exists": True, "number": phone}},
    ):
        response = create_user_profile_with_contact(contact_number=phone, full_name=full_name)
    return Profile.objects.get(pk=response.data["profile_id"])


class RoleTransitionTests(TestCase):
    def setUp(self):
        self.profile = _make_profile()

    def test_grants_visitante_from_no_role(self):
        row = grant_role(self.profile, Role.VISITANTE, source="captive_portal")
        self.assertEqual(row.role, "visitante")
        self.assertTrue(row.is_active)
        self.assertEqual(row.source, "captive_portal")
        self.assertIsNone(row.revoked_at)

    def test_grant_is_idempotent(self):
        first = grant_role(self.profile, Role.VISITANTE)
        again = grant_role(self.profile, Role.VISITANTE)
        self.assertEqual(first.pk, again.pk)
        self.assertEqual(ProfileRole.objects.filter(profile=self.profile).count(), 1)

    def test_promotion_replaces_and_keeps_history(self):
        visitante = grant_role(self.profile, Role.VISITANTE)
        congregado = grant_role(self.profile, Role.CONGREGADO)

        visitante.refresh_from_db()
        self.assertFalse(visitante.is_active)
        self.assertIsNotNone(visitante.revoked_at)
        self.assertTrue(congregado.is_active)
        # histórico preservado, mas só um ativo
        self.assertEqual(ProfileRole.objects.filter(profile=self.profile).count(), 2)
        self.assertEqual(
            ProfileRole.objects.filter(profile=self.profile, is_active=True).count(), 1
        )

    def test_full_ladder_to_membro(self):
        grant_role(self.profile, Role.VISITANTE)
        grant_role(self.profile, Role.CONGREGADO)
        grant_role(self.profile, Role.MEMBRO)
        self.assertEqual(active_role(self.profile), "membro")

    def test_skipping_congregado_is_rejected(self):
        grant_role(self.profile, Role.VISITANTE)
        with self.assertRaises(RoleTransitionError):
            grant_role(self.profile, Role.MEMBRO)
        self.assertEqual(active_role(self.profile), "visitante")

    def test_demotion_is_rejected(self):
        grant_role(self.profile, Role.VISITANTE)
        grant_role(self.profile, Role.CONGREGADO)
        with self.assertRaises(RoleTransitionError):
            grant_role(self.profile, Role.VISITANTE)
        self.assertEqual(active_role(self.profile), "congregado")

    def test_unknown_role_is_rejected(self):
        with self.assertRaises(RoleTransitionError):
            grant_role(self.profile, "pastor")

    def test_revoke_leaves_profile_without_role(self):
        grant_role(self.profile, Role.VISITANTE)
        revoke_role(self.profile, reason="teste")
        self.assertEqual(active_role(self.profile), "")
        self.assertEqual(active_roles(self.profile.user), [])


class RolesInterfaceTests(TestCase):
    """A superfície que o worship consome não pode levantar exceção, nunca."""

    def test_active_roles_matches_worship_contract(self):
        profile = _make_profile(phone="5542966665555", full_name="Pedro Alves")
        grant_role(profile, Role.VISITANTE)
        self.assertEqual(active_roles(profile.user), ["visitante"])

    def test_active_roles_without_profile_returns_empty(self):
        from django.contrib.auth import get_user_model

        user = get_user_model().objects.create(username="sem-perfil-roles")
        self.assertEqual(active_roles(user), [])

    def test_active_roles_never_raises(self):
        self.assertEqual(active_roles(None), [])
        self.assertEqual(active_role(None), "")
