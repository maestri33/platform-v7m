"""Busca pública de e-mail a partir do perfil."""

from apps.profiles.models import Profile


def get_email(*, profile):
    """Retorna o e-mail do usuário relacionado ao perfil.

    Aceita:
    - instância de Profile
    - id do Profile
    """
    if isinstance(profile, Profile):
        instance = profile
    else:
        instance = Profile.objects.select_related("user").filter(pk=profile).first()

    if not instance or not instance.user:
        return None

    email = (instance.user.email or "").strip()
    return email or None
