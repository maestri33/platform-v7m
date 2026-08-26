"""Config do app de autenticacao."""

from django.apps import AppConfig


class AuthenticationConfig(AppConfig):
    """Config padrao do app de autenticacao."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.authentication"
    verbose_name = "Authentication"
