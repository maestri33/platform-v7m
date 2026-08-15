"""Circuit breaker por provedor de WhatsApp (I5).

Sessão fora N vezes seguidas → o circuito ABRE por um cooldown e a cascata nem
bate naquele provedor: pula direto pro fallback. Evita o pior cenário do
retry/backoff — cada envio esperando o timeout inteiro de um serviço que está
comprovadamente morto. Meio-aberto: passado o cooldown, a PRÓXIMA chamada
testa o provedor de verdade; sucesso fecha o circuito, falha reabre.

Estado em memória de processo (worker) — deliberado: breaker é proteção de
latência, não contabilidade distribuída.
"""

from __future__ import annotations

import threading
import time

import structlog
from django.conf import settings

logger = structlog.get_logger()

_state: dict[str, dict] = {}  # name -> {fails, opened_at}
_lock = threading.Lock()


def _threshold() -> int:
    return int(getattr(settings, "BREAKER_FAIL_THRESHOLD", 5))


def _cooldown_s() -> float:
    return float(getattr(settings, "BREAKER_COOLDOWN_S", 60))


def is_open(name: str) -> bool:
    with _lock:
        s = _state.get(name)
        if not s or s["opened_at"] is None:
            return False
        if time.monotonic() - s["opened_at"] >= _cooldown_s():
            # meio-aberto: libera UMA tentativa de sondagem
            s["opened_at"] = None
            s["fails"] = _threshold() - 1  # próxima falha reabre na hora
            logger.info("whatsapp.breaker.half_open", provider=name)
            return False
        return True


def record_ok(name: str) -> None:
    with _lock:
        _state[name] = {"fails": 0, "opened_at": None}


def record_fail(name: str) -> None:
    with _lock:
        s = _state.setdefault(name, {"fails": 0, "opened_at": None})
        s["fails"] += 1
        if s["fails"] >= _threshold() and s["opened_at"] is None:
            s["opened_at"] = time.monotonic()
            logger.warning(
                "whatsapp.breaker.open", provider=name, fails=s["fails"],
                cooldown_s=_cooldown_s(),
            )


def reset() -> None:  # para testes
    with _lock:
        _state.clear()
