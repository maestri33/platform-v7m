"""Builders de magic link para autenticacao."""

from django.conf import settings


def build_magic_login_link(*, profile_uuid, otp):
    """Monta o link do frontend novo com profile_uuid e otp."""

    base_url = str(
        getattr(settings, "URL_FROTEND", getattr(settings, "URL_FRONTEND", "")) or ""
    ).rstrip("/")
    if not base_url:
        return ""
    return f"{base_url}/{profile_uuid}?otp={otp}"
