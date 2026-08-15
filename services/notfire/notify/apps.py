from django.apps import AppConfig


class NotifyConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "notify"

    def ready(self):
        from notify.interface import templates as _templates
        _templates.connect_signals()
