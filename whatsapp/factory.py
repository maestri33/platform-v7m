"""Seleção explícita do driver de WhatsApp, com rollback por variável de ambiente."""

from django.conf import settings


def get_driver(instance_name: str = "default"):
    driver = getattr(settings, "WHATSAPP_DRIVER", "evolution-v2")
    if driver == "evolution-go":
        from whatsapp.evolution_go import EvolutionGoDriver

        return EvolutionGoDriver()
    if driver == "evolution-v2":
        from whatsapp.evolution_v2 import EvolutionV2Driver

        return EvolutionV2Driver(instance_name)
    raise ValueError(f"WHATSAPP_DRIVER inválido: {driver}")
