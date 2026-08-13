"""Middleware do notify-server.

`LocalOnlyMiddleware` libera o acesso a rotas administrativas e de dashboard só
para IPs locais / privados — implementa a Fase 11 do plano (sem auth, rede local).
"""

from __future__ import annotations

import ipaddress
import logging

from django.conf import settings
from django.http import HttpResponseForbidden

logger = logging.getLogger(__name__)

# Prefixos de URL que ficam restritos à rede local.
LOCAL_ONLY_PREFIXES = (
    "/admin/",
    "/controlpanel/",
    "/v1/staff/",
)

# Caminhos de health e da API pública continuam liberados para qualquer origem
# (são úteis para load balancer / health check externo).
PUBLIC_PREFIXES = (
    "/v1/health",
    "/v1/send",
    "/v1/send-event",
    "/v1/notifications",
    "/v1/incidents",
    "/v1/whatsapp/",
    "/v1/phone/",
    "/static/",
    "/media/",
)


def _is_local(client_ip: str) -> bool:
    """Verifica se o IP é loopback, link-local, ou pertence a uma rede privada RFC1918."""
    if not client_ip:
        return False
    try:
        ip = ipaddress.ip_address(client_ip)
    except ValueError:
        return False
    if ip.is_loopback or ip.is_link_local:
        return True
    if isinstance(ip, ipaddress.IPv4Address):
        return ip in ipaddress.ip_network("10.0.0.0/8") \
            or ip in ipaddress.ip_network("172.16.0.0/12") \
            or ip in ipaddress.ip_network("192.168.0.0/16")
    # IPv6 ULA (fc00::/7) e unique local
    return ip in ipaddress.ip_network("fc00::/7")


def _client_ip(request) -> str:
    """Extrai o IP real do cliente respeitando `X-Forwarded-For` (se configurado)."""
    trusted = getattr(settings, "LOCAL_ONLY_TRUST_XFF", False)
    if trusted:
        xff = request.META.get("HTTP_X_FORWARDED_FOR", "")
        if xff:
            return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


class LocalOnlyMiddleware:
    """Bloqueia rotas admin/dashboard/staff quando o cliente não é de rede local.

    Endpoints da API pública continuam abertos (autenticação via ApiKey é
    responsabilidade do endpoint). Para desativar o bloqueio em dev, defina
    `LOCAL_ONLY_DISABLE=True` no settings.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if getattr(settings, "LOCAL_ONLY_DISABLE", False):
            return self.get_response(request)

        path = request.path
        if not any(path.startswith(p) for p in LOCAL_ONLY_PREFIXES):
            return self.get_response(request)
        if any(path.startswith(p) for p in PUBLIC_PREFIXES):
            return self.get_response(request)

        client_ip = _client_ip(request)
        if not _is_local(client_ip):
            logger.warning("local_only.blocked ip=%s path=%s", client_ip, path)
            return HttpResponseForbidden(
                "Acesso restrito à rede local. Configure LOCAL_ONLY_DISABLE para dev."
            )
        return self.get_response(request)
