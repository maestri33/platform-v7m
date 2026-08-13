from django.contrib import admin
from .models import Complaint, Notification, Template, TemplateRequest


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


@admin.register(TemplateRequest)
class TemplateRequestAdmin(admin.ModelAdmin):
    list_display = ("account", "event", "status", "requested_by", "submitted_at", "reviewed_at")
    list_filter = ("status", "account")
    search_fields = ("event", "body_md", "requested_by")
    readonly_fields = ("submitted_at",)


@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = ("account", "channel", "category", "summary", "status", "occurrences", "updated_at")
    list_filter = ("status", "channel", "account")
    search_fields = ("summary", "detail", "category")
    readonly_fields = ("created_at",)
