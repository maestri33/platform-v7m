"""URLs do notify-server — dashboard na raiz, API Ninja, MCP e mídia.

A raiz agora é o painel: quem abre o IP no navegador quer operar, não ler o
contrato. O contrato continua a um clique, em `/skill.md` (servido pelo Caddy) e
em `/openapi.json` para quem gera cliente.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.shortcuts import redirect
from django.urls import path
from ninja import NinjaAPI

from api.v1 import router as v1_router
from api.admin import router as admin_router
from api.staff import router as staff_router
from api.webhook import router as webhook_router
from api import mcp
from notify import dashboard

api = NinjaAPI(title="Notify Server", version="v1")
api.add_router("/v1/", v1_router)
api.add_router("/v1/admin/", admin_router)
api.add_router("/v1/staff/", staff_router)
api.add_router("/v1/webhook/", webhook_router)


# ── OpenAPI: documentar server + auth Bearer ─────────────────────────────────
# Pós-processa o schema gerado pelo Ninja SEM alterar o runtime de auth (que é
# feito manualmente via accounts.auth.api_key_auth dentro de cada view). Assim,
# um agente que gera cliente a partir de /openapi.json já sabe a base URL e que
# precisa mandar `Authorization: Bearer <key>`. Health e webhook ficam públicos.
_orig_get_openapi_schema = api.get_openapi_schema


def _get_openapi_schema(path_prefix=None, path_params=None):
    schema = _orig_get_openapi_schema(path_prefix=path_prefix, path_params=path_params)
    schema["servers"] = [
        {"url": "http://10.1.30.114", "description": "LAN/VPN (IP-only)"}
    ]
    components = schema.setdefault("components", {})
    components.setdefault("securitySchemes", {})["BearerAuth"] = {
        "type": "http",
        "scheme": "bearer",
        "description": "Authorization: Bearer <api-key>",
    }
    for _path, _ops in schema.get("paths", {}).items():
        needs_auth = (
            _path.startswith("/v1/")
            and not _path.startswith("/v1/webhook/")
            and _path != "/v1/health"
        )
        if not needs_auth:
            continue
        for _op in _ops.values():
            if isinstance(_op, dict):
                _op.setdefault("security", [{"BearerAuth": []}])
    return schema


api.get_openapi_schema = _get_openapi_schema


# ── Dashboard ───────────────────────────────────────────────────────────────
# Sem login de propósito: quem tranca a porta é o Caddy (bind privado + recusa de
# origem pública). Ver o docstring de notify/dashboard.py.
_dashboard_urls = [
    path("", dashboard.home),
    path("dashboard/", lambda r: redirect("/", permanent=False)),
    path("dashboard/notifications/", dashboard.notifications),
    path("dashboard/app/new", dashboard.app_new),
    path("dashboard/app/<slug:slug>/", dashboard.app_detail),
    path("dashboard/app/<slug:slug>/inbox", dashboard.inbox),
    path("dashboard/app/<slug:slug>/sent", dashboard.sent),
    path("dashboard/app/<slug:slug>/msg/<str:external_id>", dashboard.notification_detail),
    path("dashboard/app/<slug:slug>/in/<uuid:external_id>", dashboard.inbound_detail),
    path("dashboard/app/<slug:slug>/whatsapp/provision", dashboard.provision_instance),
    path("dashboard/app/<slug:slug>/whatsapp/webhooks", dashboard.register_webhooks),
    path("dashboard/app/<slug:slug>/whatsapp/qr", dashboard.qr_code),
    path("dashboard/app/<slug:slug>/whatsapp/reconnect", dashboard.reconnect_instance),
    path("dashboard/app/<slug:slug>/whatsapp/<slug:number_slug>/activate", dashboard.activate_number),
    path("dashboard/app/<slug:slug>/tts/probe", dashboard.tts_probe),
    path("dashboard/app/<slug:slug>/whatsapp", dashboard.save_whatsapp),
    path("dashboard/app/<slug:slug>/whatsapp/check", dashboard.check_whatsapp),
    path("dashboard/app/<slug:slug>/pair", dashboard.pairing_code),
    path("dashboard/app/<slug:slug>/mail", dashboard.save_mail),
    path("dashboard/app/<slug:slug>/mailbox", dashboard.mailbox),
    path("dashboard/app/<slug:slug>/mailtemplate", dashboard.save_shell),
    path("dashboard/app/<slug:slug>/mailtemplate/ai", dashboard.shell_ai),
    path("dashboard/app/<slug:slug>/mailtemplate/preview", dashboard.shell_preview),
    path("dashboard/app/<slug:slug>/tts", dashboard.save_tts),
    path("dashboard/app/<slug:slug>/webhook", dashboard.save_webhook),
    path("dashboard/app/<slug:slug>/webhook/test", dashboard.test_webhook),
    path("dashboard/app/<slug:slug>/key", dashboard.new_key),
    path("dashboard/app/<slug:slug>/test-send", dashboard.test_send),
    path("dashboard/app/<slug:slug>/templates/<slug:event>", dashboard.save_template),
    path("dashboard/app/<slug:slug>/templates/<slug:event>/ai", dashboard.template_ai),
    path("dashboard/htmx.js", dashboard.htmx_js),
    path("dashboard/alpine.js", dashboard.alpine_js),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    # MCP: mesmo host, mesma porta, mesma API key. Ver api/mcp.py.
    path("mcp", mcp.endpoint),
    *_dashboard_urls,
    path("", api.urls),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
