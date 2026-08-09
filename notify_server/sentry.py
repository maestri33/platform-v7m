"""Captura de falhas que o dispatch converte em status."""

from __future__ import annotations

import logging
from typing import Any

import sentry_sdk

logger = logging.getLogger(__name__)

def _account_slug(notification: Any) -> str:
    """Slug da conta sem deixar o load da FK derrubar o report."""
    try:
        return notification.account.slug
    except Exception:  # noqa: BLE001 — telemetria não levanta
        return ""


def _capture(
    exc: BaseException,
    *,
    tags: dict[str, Any],
    contexts: dict[str, dict[str, Any]],
) -> None:
    """Manda a exceção pro Sentry em escopo isolado. Nunca levanta.

    No-op quando o SDK não foi inicializado.
    """
    try:
        with sentry_sdk.new_scope() as scope:
            for key, value in tags.items():
                if value:
                    scope.set_tag(key, value)
            for name, data in contexts.items():
                scope.set_context(name, data)
            sentry_sdk.capture_exception(exc)
    except Exception as report_exc:  # noqa: BLE001 — reportar erro não vira erro
        logger.warning("sentry.capture_failed error=%s", str(report_exc)[:200])


def capture_channel_failure(exc: BaseException, *, channel: str, notification: Any) -> None:
    """Falha de canal (WhatsApp / e-mail / TTS) que o dispatch grava como FAILED.

    O dispatch converte essas exceções em `*_status`/`*_error` no banco e segue em
    frente — sem este report elas nunca chegariam ao Sentry. Destinatário
    (telefone e e-mail) fica fora do payload: é PII.
    """
    _capture(
        exc,
        tags={
            "notify.channel": channel,
            "notify.caller": getattr(notification, "caller", ""),
            "notify.account": _account_slug(notification),
        },
        contexts={
            "notification": {
                "external_id": str(getattr(notification, "external_id", "")),
                "attempts": getattr(notification, "attempts", None),
                "mail_template": getattr(notification, "mail_template", ""),
                "has_media": bool(getattr(notification, "media_url", "")),
                "want_tts": bool(getattr(notification, "want_tts", False)),
            }
        },
    )


def capture_task_failure(exc: BaseException, *, task: str, **context: Any) -> None:
    """Erro que escapa de um job do django-q.

    O worker do django-q captura a exceção e guarda só o texto em `Task.result`,
    então sem este report o Sentry não veria nada.
    """
    _capture(
        exc,
        tags={"notify.task": task},
        contexts={"task": {"name": task, **context}},
    )
