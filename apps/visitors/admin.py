"""Admin do app visitors."""

from django.contrib import admin

from .models import EvangelicalChurchInfo, Visitor, VisitorApiLog


@admin.register(Visitor)
class VisitorAdmin(admin.ModelAdmin):
    list_display = ("profile", "status", "date_of_visit", "religion", "christianity_type", "created_at")
    search_fields = ("profile__user__username", "profile__full_name")
    list_filter = ("status",)


@admin.register(EvangelicalChurchInfo)
class EvangelicalChurchInfoAdmin(admin.ModelAdmin):
    list_display = ("visitor", "church_name", "is_in_communion", "created_at")
    search_fields = ("visitor__profile__full_name", "church_name")


@admin.register(VisitorApiLog)
class VisitorApiLogAdmin(admin.ModelAdmin):
    list_display = (
        "created_at",
        "operation",
        "request_method",
        "path",
        "authenticated_user_id",
        "success",
        "status_code",
        "duration_ms",
    )
    list_filter = ("success", "request_method", "operation", "created_at")
    search_fields = ("operation", "path", "authenticated_profile_uuid", "error_message", "response_text")
    readonly_fields = (
        "id",
        "operation",
        "request_method",
        "path",
        "authenticated_user_id",
        "authenticated_profile_uuid",
        "success",
        "status_code",
        "duration_ms",
        "request_data",
        "response_data",
        "response_text",
        "error_message",
        "created_at",
    )
    ordering = ("-created_at",)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
