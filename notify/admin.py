from django.contrib import admin
from .models import Template, Notification


@admin.register(Template)
class TemplateAdmin(admin.ModelAdmin):
    list_display = ("account", "event", "active", "is_tts", "channels", "updated_at")
    list_filter = ("account", "active", "is_tts")
    search_fields = ("event", "body_md")


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("external_id", "account", "caller", "whatsapp_status", "email_status", "tts_status", "created_at")
    list_filter = ("account", "caller", "whatsapp_status", "email_status")
    search_fields = ("external_id", "caller", "recipient_phone", "recipient_email")
    readonly_fields = ("external_id",)
