"""
Integracao com o Sentry (erros + performance).

``init_sentry()`` e chamado uma unica vez no fim do ``core.settings``, entao
cobre todos os entrypoints do projeto -- web (WSGI/ASGI), ``manage.py``,
worker e scheduler do Taskiq --, ja que todos carregam as settings do Django.

Sem ``SENTRY_DSN`` no ambiente o modulo e no-op: dev, CI e testes seguem
funcionando sem enviar nada. O SDK tambem e opcional em tempo de import
(mesmo criterio dos SDKs de IA em ``core.settings``): se ``sentry-sdk`` nao
estiver instalado o boot nao quebra, apenas emite warning.

LGPD: ``send_default_pii`` e ``False`` por padrao e ``_scrub_event`` remove
campos sensiveis do dominio (CPF, senha, OTP, tokens) do payload -- inclusive
das variaveis locais que o SDK anexa a cada frame do stacktrace.
"""

import logging
from typing import Any

# Chaves cujo valor nunca sobe pro Sentry. Casamento por substring e
# case-insensitive: "cpf" pega ``cpf``, ``cpf_digits``, ``CPFHUB_API_KEY``.
_SENSITIVE_KEY_PARTS = frozenset(
    {
        "api_key",
        "apikey",
        "authorization",
        "cpf",
        "credit_card",
        "csrftoken",
        "otp",
        "passwd",
        "password",
        "secret",
        "senha",
        "sessionid",
        "token",
    }
)

_SCRUBBED = "[Filtered]"

# Profundidade maxima ao varrer o evento. Evita custo/recursao infinita em
# payloads patologicos -- o SDK ja trunca em ~10 niveis.
_MAX_DEPTH = 10


def _is_sensitive(key: Any) -> bool:
    """True se o nome da chave sugere dado sensivel."""
    if not isinstance(key, str):
        return False
    normalized = key.lower()
    return any(part in normalized for part in _SENSITIVE_KEY_PARTS)


def _scrub(value: Any, depth: int = 0) -> Any:
    """Substitui recursivamente valores de chaves sensiveis por ``[Filtered]``."""
    if depth >= _MAX_DEPTH:
        return value
    if isinstance(value, dict):
        return {
            key: _SCRUBBED if _is_sensitive(key) else _scrub(item, depth + 1)
            for key, item in value.items()
        }
    if isinstance(value, (list, tuple)):
        scrubbed = [_scrub(item, depth + 1) for item in value]
        return tuple(scrubbed) if isinstance(value, tuple) else scrubbed
    return value


def _scrub_frames(container: Any, depth: int = 0) -> None:
    """Limpa ``vars`` dos frames de stacktrace, in-place.

    O SDK anexa as variaveis locais de cada frame por padrao
    (``include_local_variables``); num fluxo como ``submit_cpf`` isso levaria
    o CPF em claro pro Sentry mesmo com ``send_default_pii=False``.
    """
    if depth >= _MAX_DEPTH:
        return
    if isinstance(container, dict):
        for key, item in container.items():
            if key == "frames" and isinstance(item, list):
                for frame in item:
                    if isinstance(frame, dict) and isinstance(frame.get("vars"), dict):
                        frame["vars"] = _scrub(frame["vars"])
            else:
                _scrub_frames(item, depth + 1)
    elif isinstance(container, list):
        for item in container:
            _scrub_frames(item, depth + 1)


def _scrub_event(event: dict, hint: dict) -> dict:
    """``before_send``: tira dado sensivel antes de qualquer envio."""
    request = event.get("request")
    if isinstance(request, dict):
        for section in ("data", "headers", "cookies", "env"):
            if isinstance(request.get(section), dict):
                request[section] = _scrub(request[section])

    for section in ("extra", "contexts", "tags", "user"):
        if isinstance(event.get(section), dict):
            event[section] = _scrub(event[section])

    _scrub_frames(event.get("exception"))
    _scrub_frames(event.get("stacktrace"))
    _scrub_frames(event.get("threads"))

    return event


def init_sentry(
    *,
    dsn: str,
    environment: str,
    release: str = "",
    traces_sample_rate: float = 0.0,
    profile_session_sample_rate: float = 0.0,
    send_default_pii: bool = False,
    enable_logs: bool = False,
    debug: bool = False,
) -> bool:
    """Inicializa o SDK do Sentry. Retorna ``True`` se ficou ativo.

    No-op silencioso quando ``dsn`` esta vazio (dev/CI). Quando o pacote
    ``sentry-sdk`` nao esta instalado mas ha DSN configurado, emite warning
    em vez de derrubar o boot.
    """
    if not str(dsn or "").strip():
        return False

    try:
        import sentry_sdk
        from sentry_sdk.integrations.django import DjangoIntegration
        from sentry_sdk.integrations.logging import LoggingIntegration
    except ImportError:
        import warnings

        warnings.warn(
            "SENTRY_DSN configurado mas o pacote 'sentry-sdk' nao esta "
            "instalado -- monitoramento desativado. Rode: "
            "pip install -r requirements.txt",
            stacklevel=2,
        )
        return False

    options: dict[str, Any] = {
        "dsn": dsn,
        "environment": environment,
        "integrations": [
            DjangoIntegration(
                # Transacao nomeada pela rota (ex: "/api/visitors/{id}") em vez
                # da URL crua, senao cada id vira uma transacao diferente.
                transaction_style="url",
                middleware_spans=True,
                signals_spans=True,
                cache_spans=True,
            ),
            # Defaults do SDK, explicitos de proposito: INFO+ vira breadcrumb
            # e ERROR+ vira issue. O projeto loga-e-engole erro em varios
            # pontos (envio de WhatsApp, e-mail, consentimento LGPD), e sem
            # event_level=ERROR essas falhas ficariam invisiveis -- elas nunca
            # sobem como excecao pro ciclo de request.
            LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
        ],
        "send_default_pii": send_default_pii,
        "traces_sample_rate": traces_sample_rate,
        "before_send": _scrub_event,
        "debug": debug,
    }

    if release:
        options["release"] = release

    if enable_logs:
        options["enable_logs"] = True

    if profile_session_sample_rate > 0:
        options["profile_session_sample_rate"] = profile_session_sample_rate
        # Perfila apenas enquanto houver span ativo -- sem trace nao ha custo.
        options["profile_lifecycle"] = "trace"

    sentry_sdk.init(**options)
    return True


def is_enabled() -> bool:
    """True se ha um client do Sentry ativo no processo."""
    try:
        import sentry_sdk
    except ImportError:
        return False
    return sentry_sdk.get_client().is_active()
