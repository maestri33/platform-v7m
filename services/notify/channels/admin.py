from django.contrib import admin
from .models import WhatsAppNumber, MailIdentity


@admin.register(WhatsAppNumber)
class WhatsAppNumberAdmin(admin.ModelAdmin):
    list_display = ("account", "slug", "instance_name", "driver", "is_default", "connection_status")
    list_filter = ("account", "driver")


@admin.register(MailIdentity)
class MailIdentityAdmin(admin.ModelAdmin):
    list_display = ("account", "from_email", "smtp_host", "is_default")
    list_filter = ("account",)
