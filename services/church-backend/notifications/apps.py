"""Configuração do app notifications."""

from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "notifications"
    verbose_name = "Notificações"
    
    def ready(self):
        """Importa signals quando o app estiver pronto."""
        import notifications.signals  # noqa: F401
