"""Declaração do AppConfig da integração Evolution API."""

from django.apps import AppConfig


class EvolutionConfig(AppConfig):
    """Configura o app no projeto Django."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "services.communication.evolution"
    label = "evolution"

