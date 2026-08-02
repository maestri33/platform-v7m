"""Mapa de capacidades dos provedores de WhatsApp — quem faz o quê.

Regra da casa: a Evolution v2 é a base e a GO é o fallback. MAS existem
recursos que a v2 não cobre (ou cobre mal) e que a GO faz direito. Para esses,
não faz sentido "tentar a v2 primeiro e cair": a cadeia é REORDENADA e a GO
assume a frente, com a v2 virando o fallback.

Recursos GO-first conhecidos hoje:

- `voice_note` — nota de voz (PTT, o "balãozinho" de áudio com forma de onda).
  A GO baixa o MP3 do TTS e converte para Opus/PTT antes de entregar; pela v2 o
  áudio pode chegar como arquivo comum em vez de nota de voz.

A lista é configurável por `.env` (`WHATSAPP_GO_FIRST_FEATURES`) porque o
conjunto muda conforme as versões dos provedores evoluem — documentar aqui e
ajustar lá, sem deploy de código.

Uso: `order_chain(number.driver_chain, feature="voice_note")` devolve a cadeia
na ordem certa para aquele recurso. Sem GO na cadeia, a ordem fica como está —
inventar um provedor sem token cadastrado só trocaria um erro por outro.
"""

from __future__ import annotations

import structlog
from django.conf import settings

logger = structlog.get_logger()

DRIVER_V2 = "evolution-v2"
DRIVER_GO = "evolution-go"

FEATURE_VOICE_NOTE = "voice_note"
FEATURE_POLL = "poll"          # enquete clicável — só a GO tem /send/poll
FEATURE_LOCATION = "location"  # pin de localização — só a GO tem /send/location

# Default do código; `.env` sobrescreve via WHATSAPP_GO_FIRST_FEATURES.
DEFAULT_GO_FIRST = (FEATURE_VOICE_NOTE, FEATURE_POLL, FEATURE_LOCATION)


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
