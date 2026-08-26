"""Admin Unfold do app ``ia`` (telemetria de chamadas de IA)."""

from django.contrib import admin
from django.utils.html import format_html
from unfold.admin import ModelAdmin

from .models import AiCall


def _badge(text, color):
    return format_html(
        '<span style="background-color: {}; color: white; padding: 2px 6px; '
        'border-radius: 3px; font-size: 11px;">{}</span>',
        color,
        text,
    )


@admin.register(AiCall)
class AiCallAdmin(ModelAdmin):
    """Telemetria de cada chamada a um provider de IA."""

    list_display = [
        "created_at",
        "provider",
        "model",
        "operation",
        "caller",
        "get_status_badge",
        "latency_ms",
        "prompt_tokens",
        "completion_tokens",
    ]
    list_filter = [
        "status",
        "operation",
        "provider",
        "caller",
        "created_at",
    ]
    search_fields = [
        "caller",
        "error_message",
        "model",
        "provider",
    ]
    readonly_fields = [
        "provider",
        "operation",
        "model",
        "caller",
        "status",
        "prompt_tokens",
        "completion_tokens",
        "cache_hit_tokens",
        "cache_miss_tokens",
        "cost",
        "latency_ms",
        "finish_reason",
        "error_code",
        "error_message",
        "extra",
        "created_at",
    ]
    ordering = ("-created_at",)
    date_hierarchy = "created_at"

    def has_add_permission(self, request):
        return False

    @admin.display(description="Status")
    def get_status_badge(self, obj):
        if obj.status == AiCall.Status.SUCCESS:
            return _badge("OK", "green")
        return _badge("ERRO", "red")
