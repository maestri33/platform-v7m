from django.contrib import admin
from .models import WhatsAppNumber, MailIdentity, TtsVoices


@admin.register(WhatsAppNumber)
class WhatsAppNumberAdmin(admin.ModelAdmin):
    list_display = ("account", "slug", "instance_name", "is_default")
    list_filter = ("account",)


@admin.register(MailIdentity)
class MailIdentityAdmin(admin.ModelAdmin):
    list_display = ("account", "from_email", "smtp_host", "is_default")
    list_filter = ("account",)


@admin.register(TtsVoices)
class TtsVoicesAdmin(admin.ModelAdmin):
    list_display = ("account", "voice_male", "voice_female")
