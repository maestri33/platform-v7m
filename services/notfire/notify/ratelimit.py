"""Rate limit dos endpoints de envio — por conta e global (H2).

Janela deslizante de 60s em memória de processo. Com 2 workers gunicorn o
limite efetivo é ~2× o configurado — suficiente para o objetivo real, que é
proteger os PROVIDERS (Evolution/mailcow) de um app cliente em loop, não fazer
contabilidade exata. Zero dependência nova, zero I/O no caminho quente.

Limites via `.env`: RATE_LIMIT_PER_MIN_ACCOUNT (default 120) e
RATE_LIMIT_PER_MIN_GLOBAL (default 600). 0 = desligado.
"""

from __future__ import annotations

import threading
import time
from collections import deque

from django.conf import settings
from ninja.errors import HttpError

_WINDOW_S = 60.0
_hits: dict[str, deque] = {}
_lock = threading.Lock()


def _limit(name: str, default: int) -> int:
    return int(getattr(settings, name, default))


def _hit(key: str, limit: int) -> bool:
    """Registra um hit; devolve False se estourou a janela."""
    now = time.monotonic()
    with _lock:
        q = _hits.setdefault(key, deque())
        while q and now - q[0] > _WINDOW_S:
            q.popleft()
        if len(q) >= limit:
            return False
        q.append(now)
        return True


def check_rate(account_slug: str) -> None:
    """Levanta 429 claro quando a conta (ou o serviço) passa do limite."""
    per_account = _limit("RATE_LIMIT_PER_MIN_ACCOUNT", 120)
    global_limit = _limit("RATE_LIMIT_PER_MIN_GLOBAL", 600)

    if global_limit and not _hit("__global__", global_limit):
        raise HttpError(429, f"Limite global de {global_limit} envios/min atingido — aguarde.")
    if per_account and not _hit(f"acct:{account_slug}", per_account):
        raise HttpError(
            429,
            f"Conta '{account_slug}' passou de {per_account} envios/min — aguarde ou ajuste o limite.",
        )


def reset() -> None:  # para testes
    with _lock:
        _hits.clear()
