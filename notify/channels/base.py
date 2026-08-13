"""Helpers compartilhados entre os canais — extraídos de notify.dispatch.

Concentram o padrão que se repete em cada `_send_*`:
  1. marca FAILED + texto do erro
  2. registra Incident
  3. loga warning
  4. reporta ao Sentry

A parte "try/except + operation" continua em cada canal — só o "depois do
except" virou este helper.
"""

from __future__ import annotations

import logging

from notify.models import Notification, STATUS_FAILED

logger = logging.getLogger(__name__)


def _record_failure(notif: Notification, *, channel: str, category: str, summary: str, detail: str) -> None:
    """Registra a ocorrência sem esconder a falha original se o registro falhar."""
    try:
        from notify.incidents import record_incident

        record_incident(
            notification=notif,
            channel=channel,
            category=category,
            summary=summary,
            detail=detail,
        )
    except Exception:
        logger.exception("notify.incident_record_failed channel=%s", channel)


def mark_channel_failed(
    notif: Notification,
    *,
    status_attr: str,
    error_attr: str,
    channel: str,
    category: str,
    summary: str,
    exc: BaseException,
) -> None:
    """Consolida o que fazer quando uma operação de canal sobe exceção.

    Idempotente em relação a STATUS_FAILED — não reseta outros campos, só os
    dois apontados (status + error_text). O Incident e o Sentry report saem
    daí; o caller não precisa fazer mais nada.
    """
    error_text = f"{type(exc).__name__}: {exc}"
    setattr(notif, status_attr, STATUS_FAILED)
    setattr(notif, error_attr, error_text)
    _record_failure(
        notif,
        channel=channel,
        category=category,
        summary=summary,
        detail=error_text,
    )
    logger.warning(
        "notify.%s_failed external_id=%s error=%s",
        channel,
        notif.external_id,
        str(exc)[:200],
    )
    from notify_server import sentry
    sentry.capture_channel_failure(exc, channel=channel, notification=notif)
