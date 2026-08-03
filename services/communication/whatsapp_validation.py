"""Validação de número de WhatsApp, ciente do provedor configurado.

Existe porque o backend perguntava "esse número tem WhatsApp?" DIRETO para a
Evolution clássica (10.1.20.200:80), enquanto o envio já ia pelo notify-server
— que fala com outra engine (evolution-go, :4000). Duas sessões de WhatsApp
independentes, e o portal quebrava se qualquer uma caísse.

Em 02/08/2026 a sessão da Evolution clássica estava `close`, e o visitante via
"o número inserido não existe" — acusação ao número dele quando a verdade era
"não consegui perguntar".

Dois ganhos além de usar a engine viva:

* **Normalização.** O chamador manda o número local (``43999664875``); o Notify
  devolve o JID real (``554399664875``), aplicando o código do país e a regra
  brasileira do nono dígito. A Evolution clássica recebia o número cru e não
  casaria nem estando de pé.
* **Distinção de falha.** ``available=False`` quer dizer "não consegui
  perguntar" (retentável); ``exists=False`` quer dizer "esse número não tem
  WhatsApp" (resposta final). O notify-server já devolve 503 nesse primeiro
  caso — quem escreveu ele acertou a distinção.
"""

import logging

from django.conf import settings

logger = logging.getLogger(__name__)


class Result:
    """Resultado da checagem.

    ``available`` é o campo que importa: sem ele o chamador não distingue
    "número inválido" de "verificador fora do ar", que foi exatamente o bug.
    """

    def __init__(self, *, available, exists=False, normalized="", status_code=None, error=""):
        self.available = available
        self.exists = exists
        self.normalized = normalized
        self.status_code = status_code
        self.error = error

    def __repr__(self):
        return (f"Result(available={self.available}, exists={self.exists}, "
                f"normalized={self.normalized!r}, status={self.status_code})")


def _via_notify(number):
    import requests

    base_url = str(getattr(settings, "NOTIFY_SERVER_URL", "") or "").rstrip("/")
    api_key = str(getattr(settings, "NOTIFY_API_KEY", "") or "")
    timeout = int(getattr(settings, "NOTIFY_REQUEST_TIMEOUT", 15))
    if not base_url or not api_key:
        return Result(available=False, error="NOTIFY_SERVER_URL/NOTIFY_API_KEY ausentes.")

    try:
        response = requests.post(
            f"{base_url}/v1/phone/check",
            json={"numbers": [str(number)]},
            headers={"Authorization": f"Bearer {api_key}",
                     "Content-Type": "application/json"},
            timeout=timeout,
        )
    except Exception as exc:  # noqa: BLE001 — rede é falha esperada aqui
        logger.warning("notify.phone_check indisponível: %s", exc)
        return Result(available=False, error=str(exc))

    # 503 = whatsapp_session_down. É retentável, e NÃO é resposta sobre o
    # número: tratar como inválido aqui foi a origem do bug.
    if response.status_code != 200:
        logger.warning("notify.phone_check HTTP %s: %s",
                       response.status_code, response.text[:200])
        return Result(available=False, status_code=response.status_code,
                      error=response.text[:200])

    try:
        items = response.json() or []
    except ValueError:
        return Result(available=False, status_code=response.status_code,
                      error="resposta não-JSON")

    first = items[0] if items else {}
    return Result(
        available=True,
        exists=bool(first.get("exists")),
        normalized=str(first.get("number") or ""),
        status_code=response.status_code,
    )


def _via_evolution(number):
    from services.communication.evolution.messages import validate_number

    try:
        payload = validate_number(number)
    except Exception as exc:  # noqa: BLE001
        logger.warning("evolution.validate_number indisponível: %s", exc)
        return Result(available=False, error=str(exc))

    status = payload.get("status_code")
    # A Evolution não levanta em erro de HTTP: devolve dict sem "data", e o
    # validate_number transforma isso em success=False — indistinguível de
    # "número não existe". Por isso o status é checado aqui.
    if status is not None and not 200 <= int(status) < 300:
        return Result(available=False, status_code=status,
                      error=f"HTTP {status}")

    data = payload.get("data") or {}
    return Result(
        available=True,
        exists=bool(payload.get("success")),
        normalized=str(data.get("number") or ""),
        status_code=status,
    )


def check_whatsapp_number(number):
    """Devolve um ``Result``. Nunca levanta."""

    provider = str(getattr(settings, "WHATSAPP_PROVIDER", "evolution") or "").lower()
    if provider == "notify":
        return _via_notify(number)
    return _via_evolution(number)


def validate_number(number):
    """Assinatura antiga, para quem já chamava a versão da Evolution.

    Devolve ``{"success", "status_code", "data"}`` como antes. Quem usa esta
    forma NÃO consegue distinguir "não tem WhatsApp" de "não consegui
    perguntar" — é a limitação que motivou o ``check_whatsapp_number``. Ao
    mexer nesses chamadores, prefira o novo.
    """

    result = check_whatsapp_number(number)
    return {
        "success": bool(result.available and result.exists),
        "status_code": result.status_code,
        "available": result.available,
        "data": {"number": result.normalized, "exists": result.exists},
    }
