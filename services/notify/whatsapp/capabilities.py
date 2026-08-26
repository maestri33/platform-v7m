"""Mapa de capacidades dos provedores de WhatsApp — quem faz o quê.

Com a Evolution GO como único provedor (v2 aposentada em 2026-08-18), este
módulo perdeu o papel de reordenar a cadeia — mas fica de pé pelo desenho:
`WHATSAPP_GO_FIRST_FEATURES` continua documentando os recursos que eram
exclusivos da GO (voice_note/poll/location) e `order_chain` segue sendo o ponto
único de reordenação caso um segundo provedor volte a existir.

Uso: `order_chain(number.driver_chain, feature="voice_note")` devolve a cadeia
na ordem certa para aquele recurso. Sem GO na cadeia, a ordem fica como está —
inventar um provedor sem token cadastrado só trocaria um erro por outro.
"""

from __future__ import annotations

import structlog
from django.conf import settings

logger = structlog.get_logger()

DRIVER_GO = "evolution-go"

FEATURE_VOICE_NOTE = "voice_note"
FEATURE_POLL = "poll"
FEATURE_LOCATION = "location"
FEATURE_PIX_BUTTON = "pix_button"
FEATURE_CAROUSEL = "carousel"
FEATURE_CONTACT = "contact"
FEATURE_LINK = "link"

# Default do código; `.env` sobrescreve via WHATSAPP_GO_FIRST_FEATURES.
DEFAULT_GO_FIRST = (
    FEATURE_VOICE_NOTE,
    FEATURE_POLL,
    FEATURE_LOCATION,
    FEATURE_PIX_BUTTON,
    FEATURE_CAROUSEL,
    FEATURE_CONTACT,
    FEATURE_LINK,
)


def go_first_features() -> set[str]:
    raw = getattr(settings, "WHATSAPP_GO_FIRST_FEATURES", "") or ""
    itens = {f.strip().lower() for f in raw.split(",") if f.strip()}
    return itens or set(DEFAULT_GO_FIRST)


def order_chain(chain: list[str], feature: str | None = None) -> list[str]:
    """Ordena a cadeia de drivers para o recurso pedido.

    - feature GO-first e GO presente → GO na frente, resto mantém a ordem;
    - feature GO-first e GO ausente → cadeia intacta + warning (o operador
      precisa saber que aquele número não tem o caminho ideal);
    - sem feature → cadeia intacta.
    """
    if not feature or feature.lower() not in go_first_features():
        return list(chain)
    if DRIVER_GO not in chain:
        logger.warning(
            "whatsapp.capabilities.go_ausente",
            feature=feature,
            chain=list(chain),
        )
        return list(chain)
    return [DRIVER_GO] + [d for d in chain if d != DRIVER_GO]
