"""Admin do captive portal."""

from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import (
    AccessGrant,
    CaptiveConsent,
    CpfRecord,
    MacBinding,
    PortalEvent,
    PortalSelfie,
    PortalSession,
)


@admin.register(MacBinding)
class MacBindingAdmin(ModelAdmin):
    list_display = ("mac", "profile", "is_active", "last_seen_at", "created_at")
    list_filter = ("is_active",)
    search_fields = ("mac", "profile__full_name", "profile__user__username")
    autocomplete_fields = ("profile",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(PortalSession)
class PortalSessionAdmin(ModelAdmin):
    list_display = ("mac", "status", "kind", "profile", "connected_at", "disconnected_at")
    list_filter = ("status", "kind")
    search_fields = ("mac", "token", "profile__full_name")
    readonly_fields = ("token", "created_at", "updated_at")


@admin.register(AccessGrant)
class AccessGrantAdmin(ModelAdmin):
    list_display = ("mac", "status", "expires_at", "delivered_at", "acked_at", "attempts")
    list_filter = ("status",)
    search_fields = ("mac",)
    readonly_fields = ("credential", "created_at", "updated_at")


@admin.register(PortalEvent)
class PortalEventAdmin(ModelAdmin):
    list_display = ("event", "mac", "session", "created_at")
    list_filter = ("event",)
    search_fields = ("mac",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(CpfRecord)
class CpfRecordAdmin(ModelAdmin):
    list_display = ("profile", "cpf", "enriched_at", "pending_enrichment")
    list_filter = ("pending_enrichment",)
    search_fields = ("cpf", "profile__full_name")
    readonly_fields = ("created_at", "updated_at")


@admin.register(PortalSelfie)
class PortalSelfieAdmin(ModelAdmin):
    """Conferencia das selfies. A imagem NAO e servida pelo /media/ publico."""

    list_display = ("session", "status", "captured_via", "claimed_profile", "created_at")
    list_filter = ("status", "captured_via")
    readonly_fields = ("session", "profile", "claimed_profile", "image", "captured_via", "created_at")
    search_fields = ("session__mac",)


@admin.register(CaptiveConsent)
class CaptiveConsentAdmin(ModelAdmin):
    """Consentimentos LGPD — somente leitura: aceite nao se edita, se registra."""

    list_display = ("profile", "kind", "terms_version", "accepted_at", "mac", "ip")
    list_filter = ("kind", "terms_version")
    search_fields = ("profile__full_name", "mac", "phone")
    readonly_fields = tuple(
        f.name for f in CaptiveConsent._meta.fields if f.name != "id"
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
