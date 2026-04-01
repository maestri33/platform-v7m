from django.contrib import admin
from .models import ElevenLabsTTSLog


@admin.register(ElevenLabsTTSLog)
class ElevenLabsTTSLogAdmin(admin.ModelAdmin):
    list_display = ("id", "text", "voice_id", "audio_path", "created_at")
    search_fields = ("text", "voice_id", "audio_path")
    readonly_fields = ("id", "created_at")
