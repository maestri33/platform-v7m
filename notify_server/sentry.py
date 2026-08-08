"""Sentry — observabilidade opt-in do notify-server.

`SENTRY_DSN` vazio deixa tudo desligado: dev e testes rodam sem rede e sem SDK.
O init acontece uma vez no `settings.py`, então vale para os três entrypoints —
gunicorn (web), `manage.py qcluster` (django-q) e `manage.py` avulso.

O django-q forka os workers. O BackgroundWorker do SDK compara o PID dono da
thread com o `os.getpid()` atual, então o filho sobe uma thread nova sozinho —
não é preciso reinicializar o SDK por worker.
"""

from __future__ import annotations

from typing import Any

import sentry_sdk
import structlog

logger = structlog.get_logger()


# ── Init ────────────────────────────────────────────────────────────────────

def init(
    *,
    dsn: str,
    environment: str,
    release: str = "",
    traces_sample_rate: float = 0.0,
    profiles_sample_rate: float = 0.0,
    send_default_pii: bool = False,
    include_local_variables: bool = False,
    **init_kwargs: Any,
) -> bool:
    """Inicializa o SDK. Devolve False — sem tocar em nada — quando não há DSN.

    Dois defaults valem explicação, os dois desligados de propósito:

    - `send_default_pii`: este serviço trafega telefone e e-mail de destinatário,
      que não devem sair daqui para o Sentry.
    - `include_local_variables`: o SDK liga isto por padrão e manda as locais de
      cada frame do traceback. Nos frames do dispatch as locais são justamente o
      destinatário (`number`), o corpo da mensagem e o objeto `Notification` —
      ou seja, `send_default_pii=False` sozinho não seguraria a PII. Ligue só
      para depurar, ciente do que vai junto.

    `init_kwargs` é escape hatch (os testes injetam `transport`).
    """
    if not dsn:
        return False

    # Import tardio: sem DSN não se paga o custo de puxar a integração do Django.
    from sentry_sdk.integrations.django import DjangoIntegration

    sentry_sdk.init(
        dsn=dsn,
        environment=environment,
        release=release or None,
        integrations=[DjangoIntegration()],
        traces_sample_rate=traces_sample_rate,
        profiles_sample_rate=profiles_sample_rate,
        send_default_pii=send_default_pii,
        include_local_variables=include_local_variables,
        **init_kwargs,
    )
    return True


def disable() -> None:
    """Desliga o SDK já inicializado (testes: `.env` local com DSN não vaza evento)."""
    sentry_sdk.init(dsn=None)


# ── Report ──────────────────────────────────────────────────────────────────

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
        logger.warning("sentry.capture_failed", error=str(report_exc)[:200])


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
