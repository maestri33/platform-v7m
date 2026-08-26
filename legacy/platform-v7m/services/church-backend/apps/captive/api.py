"""API machine-to-machine do captive portal — consumida pelo agente local.

Fluxo (design "Fluxo Captive Portal IEADPG"):
1. agente local → cloud: ``POST /portal/session/start {mac}`` quando um
   dispositivo associa ao SSID. Resposta diz se libera direto (MAC
   conhecido, credencial junto) ou pra onde redirecionar (portal_url).
2. cloud → agente local: push assinado no ``CAPTIVE_LOCAL_CALLBACK_URL``
   após o OTP — ou o agente puxa em ``GET /portal/agent/grants``.
3. agente local → cloud: ``POST /portal/agent/grants/ack`` confirma que a
   liberação foi aplicada no controlador.

Auth: header ``X-Agent-Key`` = ``CAPTIVE_AGENT_KEY``.
"""

import hmac

from django.conf import settings
from ninja import Router, Schema

from apps.captive.services import ack_grant, pending_grants, start_session, stop_session

router = Router(tags=["captive-portal"])


class SessionStartIn(Schema):
    mac: str
    ssid: str = ""
    ap_mac: str = ""
    client_ip: str = ""


class SessionStopIn(Schema):
    mac: str


class GrantAckIn(Schema):
    credential: str


def _agent_authorized(request):
    expected = str(getattr(settings, "CAPTIVE_AGENT_KEY", "") or "")
    provided = str(request.headers.get("X-Agent-Key", "") or "")
    return bool(expected) and hmac.compare_digest(expected, provided)


def _as_response(service_response, ok_status=200):
    if service_response.success:
        return ok_status, service_response.data
    status = int(service_response.meta.get("status_code") or 400)
    return status, {"detail": service_response.error}


@router.post("/session/start", response={200: dict, 401: dict, 422: dict})
def session_start(request, payload: SessionStartIn):
    """Passo 02 — controlador informa o MAC que associou ao SSID."""

    if not _agent_authorized(request):
        return 401, {"detail": "X-Agent-Key ausente ou inválido."}
    return _as_response(
        start_session(
            mac=payload.mac,
            ssid=payload.ssid,
            ap_mac=payload.ap_mac,
            client_ip=payload.client_ip or None,
        )
    )


@router.post("/session/stop", response={200: dict, 401: dict, 404: dict, 422: dict})
def session_stop(request, payload: SessionStopIn):
    """Accounting-stop — grava ``disconnected_at`` da sessão."""

    if not _agent_authorized(request):
        return 401, {"detail": "X-Agent-Key ausente ou inválido."}
    return _as_response(stop_session(mac=payload.mac))


@router.get("/agent/grants", response={200: dict, 401: dict})
def agent_grants(request):
    """Liberações pendentes de aplicar no controlador (modo polling)."""

    if not _agent_authorized(request):
        return 401, {"detail": "X-Agent-Key ausente ou inválido."}
    return _as_response(pending_grants())


@router.post("/agent/grants/ack", response={200: dict, 401: dict, 404: dict})
def agent_grants_ack(request, payload: GrantAckIn):
    """Agente confirma: internet liberada pro MAC da credencial."""

    if not _agent_authorized(request):
        return 401, {"detail": "X-Agent-Key ausente ou inválido."}
    return _as_response(ack_grant(credential=payload.credential))


@router.get("/agent/ping", response={200: dict, 401: dict})
def agent_ping(request):
    """Health-check do vínculo agente ↔ cloud."""

    if not _agent_authorized(request):
        return 401, {"detail": "X-Agent-Key ausente ou inválido."}
    return 200, {"pong": True}
