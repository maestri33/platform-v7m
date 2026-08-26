"""Configuração do app interno de perfis."""

from django.apps import AppConfig


class ProfilesConfig(AppConfig):
    """Configuração do app de perfis."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.profiles"
    verbose_name = "Perfis"

    def ready(self):
        """Registra os signals do app."""
        from . import signals  # noqa: F401
