"""api/instance.py — Instância central padronizada do Django Ninja e agregação de routers."""

from __future__ import annotations

from ninja import NinjaAPI

from accounts.auth import VpnBearerAuth
from api.errors import register_exception_handlers
from api.v1 import router as v1_router
from api.admin import router as admin_router
from api.notify import router as notify_router
from api.staff import router as staff_router
from api.webhook import router as webhook_router

# Instância central configurada declarativamente
api = NinjaAPI(
    title="Notify Server",
    version="v1",
    description="Serviço centralizado de envio de notificações e mensageria multi-tenant.",
    servers=[
        {"url": "http://10.1.30.114", "description": "LAN/VPN (IP-only)"}
    ],
    auth=VpnBearerAuth(),
    docs_url="/docs",
    openapi_url="/openapi.json",
)

# Registro de Handlers Globais de Erro
register_exception_handlers(api)

# Registro Modular de Routers
api.add_router("/v1/", v1_router)
api.add_router("/v1/admin/", admin_router)
api.add_router("/v1/staff/", staff_router)
api.add_router("/v1/webhook/", webhook_router)
api.add_router("/notify", notify_router)
