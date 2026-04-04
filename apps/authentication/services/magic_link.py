"""Builders de magic link para autenticacao."""

from django.conf import settings


def build_magic_login_link(*, profile_uuid, otp):
    """Monta o link limpo de login com profile_uuid e otp."""

    base_url = str(getattr(settings, "URL_FROTEND", "") or "").rstrip("/")
    if not base_url:
        return ""
    return f"{base_url}/login/{profile_uuid}?otp={otp}"
