"""Superfície pública dos papéis para outros apps.

``apps/worship/services.py`` chama ``active_roles(user)`` e compara o resultado
com "membro"/"congregado"/"visitante". Qualquer exceção aqui vira lista vazia:
indisponibilidade de papel não pode derrubar culto, login ou portal — era esse
o contrato do stub anterior e ele é preservado.
"""


def active_roles(user, *args, **kwargs):
    """Papéis ativos do usuário. Nunca levanta — devolve ``[]`` em qualquer erro."""

    try:
        from apps.profiles.models import Profile

        from .models import ProfileRole

        profile = Profile.objects.filter(user=user).first()
        if profile is None:
            return []
        return list(
            ProfileRole.objects.filter(profile=profile, is_active=True).values_list(
                "role", flat=True
            )
        )
    except Exception:
        return []


def active_role(profile):
    """Papel ativo do perfil ("" quando não há). Nunca levanta."""

    try:
        from .models import ProfileRole

        row = ProfileRole.objects.filter(profile=profile, is_active=True).first()
        return row.role if row else ""
    except Exception:
        return ""
