"""URLs do notify-server — Ninja API + admin + media."""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path
from ninja import NinjaAPI

from api.v1 import router as v1_router
from api.staff import router as staff_router

api = NinjaAPI(title="Notify Server", version="v1")
api.add_router("/v1/", v1_router)
api.add_router("/v1/staff/", staff_router)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", api.urls),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
