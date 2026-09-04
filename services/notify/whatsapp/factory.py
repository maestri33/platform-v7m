"""Construção do driver de WhatsApp a partir da row WhatsAppNumber.

Evolution GO é o driver canônico e único do serviço.
`WHATSAPP_DRIVER` continua valendo como default para chamadas sem row (legado) e
como trava de emergência via `WHATSAPP_FORCE_DRIVER`.
"""

from __future__ import annotations

from django.conf import settings

from whatsapp.driver import WhatsAppDriver

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
    raise ValueError(f"driver de WhatsApp inválido: {driver_name}")


def get_driver_for_number(number, *, feature: str | None = None) -> WhatsAppDriver:
    """Driver (com fallback se houver múltiplos) para uma row WhatsAppNumber."""
    forced = getattr(settings, "WHATSAPP_FORCE_DRIVER", "")
    if forced:
        return build_driver(
            forced,
            instance_name=number.instance_name or "default",
            go_api_key=number.go_api_key(),
        )

    chain = number.driver_chain
    if feature:
        from whatsapp.capabilities import order_chain

        chain = order_chain(chain, feature=feature)

    if len(chain) == 1:
        return build_driver(
            chain[0],
            instance_name=number.instance_name or "default",
            go_api_key=number.go_api_key(),
        )

    from whatsapp.cascade import CascadeDriver

    instance = number.instance_name or "default"
    go_key = number.go_api_key()
    builders = [
        (name, (lambda n=name: build_driver(n, instance_name=instance, go_api_key=go_key)))
        for name in chain
    ]
    return CascadeDriver(builders)


def get_driver(target=None, *, feature: str | None = None):
    """Compatível com o uso antigo `get_driver(instance_name)`.

    - row WhatsAppNumber → driver conforme a row;
    - string / None → driver único conforme `WHATSAPP_DRIVER` (legado).
    """
    if target is not None and hasattr(target, "driver_chain"):
        return get_driver_for_number(target, feature=feature)

    instance_name = target if isinstance(target, str) and target else "default"
    driver_name = (
        getattr(settings, "WHATSAPP_FORCE_DRIVER", "")
        or getattr(settings, "WHATSAPP_DRIVER", DRIVER_GO)
    )
    return build_driver(driver_name, instance_name=instance_name)
