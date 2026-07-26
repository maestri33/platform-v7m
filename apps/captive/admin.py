"""Admin do captive portal."""

from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import AccessGrant, CpfRecord, MacBinding, PortalEvent, PortalSession


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
