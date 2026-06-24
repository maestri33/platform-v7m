"""AppConfig da integração IA (engine multi-provider)."""

from django.apps import AppConfig
from django.core.checks import register


class AiConfig(AppConfig):
    """Configura o app no projeto Django e registra o system check no boot."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "integrations.ai"
    label = "ai"
    verbose_name = "IA (multi-provider)"

    def ready(self):
        from . import checks

        register(checks.check_ai)
