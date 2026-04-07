"""Admin do app Evolution."""

from django.contrib import admin

from .models import EvolutionApiLog


@admin.register(EvolutionApiLog)
class EvolutionApiLogAdmin(admin.ModelAdmin):
    list_display = [
        "created_at",
        "operation",
        "request_method",
        "target_number",
        "success",
        "status_code",
        "duration_ms",
        "instance",
    ]
    list_filter = ["success", "request_method", "operation", "instance", "created_at"]
    search_fields = ["operation", "target_number", "endpoint", "error_message", "response_text"]
    readonly_fields = [
        "id",
        "operation",
        "request_method",
        "endpoint",
        "instance",
        "target_number",
        "success",
        "status_code",
        "duration_ms",
        "request_data",
        "response_data",
        "response_text",
        "error_message",
        "created_at",
    ]
    ordering = ["-created_at"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
