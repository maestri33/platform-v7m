"""Registro de senders por canal — o ponto de encaixe de canal novo (G1).

WhatsApp e e-mail são canais NATIVOS: os senders deles vivem em
`notify/dispatch.py` porque carregam regra própria (cascata de provedores,
nota de voz, mídia, shell de e-mail). O registry existe para o resto — hoje,
SMS — entrar **sem refatorar o dispatch**:

    from notify import channels_registry

    def send_sms(notif) -> None:
        # falar com o gateway; marcar notif.sms_status/sms_error
        ...

    channels_registry.register("sms", send_sms)

O dispatch consulta este registro na hora de despachar o canal. Canal pedido
sem sender registrado sai como `skipped` com o motivo gravado — visível no log
e no painel, nunca um `sent` de mentira.

Contrato do sender: recebe a `Notification`, faz o envio e escreve
`<canal>_status` (`sent`/`failed`) e `<canal>_error` nela. Não salva — quem
persiste é o dispatch (fase 3). Exceção não capturada vira `failed` com o
erro registrado.
"""

from __future__ import annotations

from typing import Callable

import structlog

logger = structlog.get_logger()

Sender = Callable[["Notification"], None]  # noqa: F821 — import circular evitado

_SENDERS: dict[str, Sender] = {}


def register(channel: str, sender: Sender) -> None:
    """Registra (ou substitui) o sender de um canal plugável."""
    _SENDERS[channel.lower()] = sender
    logger.info("channels.registered", channel=channel)


def unregister(channel: str) -> None:
    _SENDERS.pop(channel.lower(), None)


def get(channel: str) -> Sender | None:
    return _SENDERS.get(channel.lower())


def send(channel: str, notif) -> None:
    """Despacha por um canal plugável; sem sender → skipped com motivo."""
    from notify.models import STATUS_FAILED, STATUS_SKIPPED, STATUS_SENT  # noqa: F401

    status_field = f"{channel}_status"
    error_field = f"{channel}_error"
    sender = get(channel)
    if sender is None:
        setattr(notif, status_field, STATUS_SKIPPED)
        setattr(notif, error_field, f"sem provedor de {channel} registrado")
        logger.info("channels.no_sender", channel=channel, external_id=str(notif.external_id))
        return
    try:
        sender(notif)
    except Exception as exc:  # noqa: BLE001 — sender que estoura não derruba os outros canais
        setattr(notif, status_field, STATUS_FAILED)
        setattr(notif, error_field, f"{type(exc).__name__}: {exc}"[:300])
        logger.warning(
            "channels.sender_failed", channel=channel, error=str(exc)[:200]
        )
