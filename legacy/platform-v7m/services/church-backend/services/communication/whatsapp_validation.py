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


DDI_BR = "55"


def _com_ddi(number):
    """Garante o código do país.

    A Evolution clássica NÃO normaliza: mede o que recebe. Verificado em
    03/08/2026 na instância viva —

        43999664875    -> exists: false
        5543999664875  -> exists: true

    O chamador manda o número local (sem DDI), então sem isto a resposta é um
    "não existe" que não é sobre o número, é sobre o formato. O notify-server
    já faz essa normalização sozinho; aqui precisa ser explícito.
    """
    digits = "".join(ch for ch in str(number or "") if ch.isdigit())
    if digits.startswith(DDI_BR) and len(digits) > 11:
        return digits
    return DDI_BR + digits


def _instancia_viva(base_url, api_key, preferidas, timeout):
    """Primeira instância com sessão aberta.

    A instalação tem mais de uma (``ieadpg``, ``default``) e elas caem de forma
    independente. Perguntar para uma instância fechada devolve 428
    "Precondition Required", que o chamador não distingue de "número inválido".
    """
    import requests

    for nome in preferidas:
        if not nome:
            continue
        try:
            resp = requests.get(f"{base_url}/instance/connectionState/{nome}",
                                headers={"apikey": api_key}, timeout=timeout)
            estado = ((resp.json() or {}).get("instance") or {}).get("state")
        except Exception:  # noqa: BLE001
            continue
        if estado == "open":
            return nome
    return ""


def _via_evolution(number):
    import requests

    base_url = str(getattr(settings, "EVOLUTION_API_URL", "") or "").rstrip("/")
    api_key = str(getattr(settings, "EVOLUTION_API_KEY", "") or "")
    timeout = int(getattr(settings, "EVOLUTION_REQUEST_TIMEOUT", 30))
    if not base_url or not api_key:
        return Result(available=False, error="EVOLUTION_API_URL/API_KEY ausentes.")

    preferidas = [str(getattr(settings, "EVOLUTION_INSTANCE", "") or ""), "default"]
    instancia = _instancia_viva(base_url, api_key, preferidas, timeout)
    if not instancia:
        return Result(available=False,
                      error="nenhuma instância da Evolution com sessão aberta")

    alvo = _com_ddi(number)
    try:
        resp = requests.post(f"{base_url}/chat/whatsappNumbers/{instancia}",
                             json={"numbers": [alvo]},
                             headers={"apikey": api_key}, timeout=timeout)
    except Exception as exc:  # noqa: BLE001
        logger.warning("evolution.whatsappNumbers indisponível: %s", exc)
        return Result(available=False, error=str(exc))

    if resp.status_code != 200:
        return Result(available=False, status_code=resp.status_code,
                      error=resp.text[:200])
    try:
        itens = resp.json() or []
    except ValueError:
        return Result(available=False, status_code=resp.status_code,
                      error="resposta não-JSON")

    primeiro = itens[0] if itens else {}
    return Result(
        available=True,
        exists=bool(primeiro.get("exists")),
        normalized=str(primeiro.get("number") or alvo),
        status_code=resp.status_code,
    )


def check_whatsapp_number(number):
    """Devolve um ``Result``. Nunca levanta."""

    provider = str(getattr(settings, "WHATSAPP_PROVIDER", "evolution") or "").lower()
    primario, secundario = ((_via_notify, _via_evolution) if provider == "notify"
                            else (_via_evolution, _via_notify))

    resultado = primario(number)
    if resultado.available:
        return resultado

    # A instalação tem DUAS engines de WhatsApp independentes (evolution-go
    # atrás do notify, e a Evolution clássica), com sessões que caem separado.
    # Sem esta queda para a outra, o portal para inteiro quando qualquer uma
    # cai — foi o que aconteceu em 02 e 03/08/2026.
    logger.warning("verificador primário indisponível (%s); tentando o outro provedor",
                   resultado.error)
    alternativa = secundario(number)
    if alternativa.available:
        return alternativa
    return resultado


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
