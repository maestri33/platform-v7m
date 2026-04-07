"""Config do app visitors."""

from django.apps import AppConfig


class VisitorsConfig(AppConfig):
    """Config padrao do app visitors."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.visitors"
    verbose_name = "Visitors"

    def ready(self):
        """Registra os signals do app."""

        from . import signals  # noqa: F401
