"""URLs do notify-server — Ninja API + admin + dashboard + media."""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path
from ninja import NinjaAPI

from api.v1 import router as v1_router
from api.staff import router as staff_router
from api.webhook import router as webhook_router
from notify import dashboard

api = NinjaAPI(title="Notify Server", version="v1")
api.add_router("/v1/", v1_router)
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


urlpatterns = [
    path("admin/", admin.site.urls),
    # Dashboard operacional (HTMX, read-only, gate por API key)
    path("dashboard/", dashboard.home),
    path("dashboard/login/", dashboard.login),
    path("dashboard/logout/", dashboard.logout),
    path("dashboard/account/<slug:slug>/", dashboard.account_detail),
    path("dashboard/notifications/", dashboard.notifications),
    path("dashboard/htmx.js", dashboard.htmx_js),
    path("", api.urls),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
