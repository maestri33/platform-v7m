"""Construção do driver de WhatsApp a partir da row WhatsAppNumber.

Antes, o provedor era escolhido por uma variável de ambiente GLOBAL — o campo
`driver` do WhatsAppNumber existia mas era ignorado, então todas as contas
falavam pelo mesmo provedor e não havia fallback. Agora a row manda: ela diz o
provedor preferido, o fallback e, no caso da GO, o token da própria instância.

`WHATSAPP_DRIVER` continua valendo como default para chamadas sem row (legado) e
como trava de emergência via `WHATSAPP_FORCE_DRIVER`.
"""

from __future__ import annotations

from typing import Callable

from django.conf import settings

from whatsapp.driver import WhatsAppDriver

DRIVER_V2 = "evolution-v2"
DRIVER_GO = "evolution-go"


def build_driver(
    driver_name: str,
    *,
    instance_name: str = "default",
    go_api_key: str = "",
) -> WhatsAppDriver:
    """Instancia UM driver concreto, sem cascata."""
    if driver_name == DRIVER_GO:
        from whatsapp.evolution_go import EvolutionGoDriver

        return EvolutionGoDriver(api_key=go_api_key or None)
    if driver_name == DRIVER_V2:
        from whatsapp.evolution_v2 import EvolutionV2Driver

        return EvolutionV2Driver(instance_name)
    raise ValueError(f"driver de WhatsApp inválido: {driver_name}")


def _builders_for(number) -> list[tuple[str, Callable[[], WhatsAppDriver]]]:
    instance = number.instance_name or "default"
    go_key = number.go_api_key()
    return [
        (name, (lambda n=name: build_driver(n, instance_name=instance, go_api_key=go_key)))
        for name in number.driver_chain
    ]


def get_driver_for_number(number) -> WhatsAppDriver:
    """Driver (com fallback, se houver) para uma row WhatsAppNumber."""
    forced = getattr(settings, "WHATSAPP_FORCE_DRIVER", "")
    if forced:
        return build_driver(
            forced,
            instance_name=number.instance_name or "default",
            go_api_key=number.go_api_key(),
        )

    builders = _builders_for(number)
    if len(builders) == 1:
        return builders[0][1]()

    from whatsapp.cascade import CascadeDriver

    return CascadeDriver(builders)


def get_driver(target=None):
    """Compatível com o uso antigo `get_driver(instance_name)`.

    - row WhatsAppNumber → cascata conforme a row (caminho novo);
    - string / None → driver único conforme `WHATSAPP_DRIVER` (legado).
    """
    if target is not None and hasattr(target, "driver_chain"):
        return get_driver_for_number(target)

    instance_name = target if isinstance(target, str) and target else "default"
    driver_name = (
        getattr(settings, "WHATSAPP_FORCE_DRIVER", "")
        or getattr(settings, "WHATSAPP_DRIVER", DRIVER_V2)
    )
    return build_driver(driver_name, instance_name=instance_name)
