from django.contrib import admin
from .models import Template, Trigger, Notification, InboundEvent


class TriggerInline(admin.StackedInline):
    model = Trigger
    extra = 0
    fk_name = "template"


@admin.register(Template)
class TemplateAdmin(admin.ModelAdmin):
    list_display = ("account", "event", "storytelling", "channels", "updated_at")
    list_filter = ("account", "storytelling")
    search_fields = ("event", "body_md")
    inlines = [TriggerInline]


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("external_id", "account", "caller", "whatsapp_status", "email_status", "created_at")
    list_filter = ("account", "caller", "whatsapp_status", "email_status")
    search_fields = ("external_id", "caller", "recipient_phone", "recipient_email")
    readonly_fields = ("external_id",)


@admin.register(InboundEvent)
class InboundEventAdmin(admin.ModelAdmin):
    list_display = ("account", "instance_name", "wa_message_id", "received_at")
    list_filter = ("account",)
