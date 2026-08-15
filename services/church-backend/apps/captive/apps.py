"""Configuração do app captive."""

from django.apps import AppConfig


class CaptiveConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.captive"
    verbose_name = "Captive Portal Wi-Fi"
