"""Admin simplificado de notificações com suporte a templates."""

from django.contrib import admin

from .models import Notification, NotificationLog


class NotificationLogInline(admin.TabularInline):
    model = NotificationLog
    extra = 0
    readonly_fields = ["channel", "success", "provider_message_id", "created_at"]
    can_delete = False


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["title", "recipient", "media_type", "use_tts", "template_name", "status", "channel_sent", "scheduled_for", "created_at"]
    list_filter = ["status", "media_type", "use_tts", "template_name", "created_at", "scheduled_for"]
    search_fields = ["title", "content", "recipient__user__email"]
    readonly_fields = ["sent_at", "processed_at", "attempts", "channel_sent", "last_error_message"]
    inlines = [NotificationLogInline]
    fieldsets = (
        (
            "Conteúdo",
            {
                "fields": ("recipient", "title", "content", "template_name"),
            },
        ),
        (
            "Entrega WhatsApp",
            {
                "fields": ("use_tts", "is_media", "media_type", "media_payload", "media_filename", "media_mime_type"),
            },
        ),
        (
            "Controle",
            {
                "fields": ("status", "channel_sent", "scheduled_for", "sent_at", "processed_at", "attempts", "last_error_message"),
            },
        ),
    )


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = ["notification", "channel", "success", "provider_message_id", "created_at"]
    list_filter = ["channel", "success", "created_at"]
    readonly_fields = ["notification", "channel", "success", "provider_message_id", "response_data", "error_message", "created_at"]
