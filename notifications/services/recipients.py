"""Resolucao de destinatarios para notificacoes."""


def resolve_notification_recipient(profile):
    """Extrai telefone e email do perfil de forma tolerante."""

    user = getattr(profile, "user", None)
    phone = getattr(getattr(profile, "phone", None), "number", "") or ""
    email = getattr(user, "email", "") or ""

    return {
        "phone": phone,
        "email": email,
        "user": user,
        "profile": profile,
    }
