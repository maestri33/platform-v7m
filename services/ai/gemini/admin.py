from django.contrib import admin
from .models import GeminiImageLog


@admin.register(GeminiImageLog)
class GeminiImageLogAdmin(admin.ModelAdmin):
    list_display = ("id", "prompt_text", "image_path", "created_at")
    search_fields = ("prompt_text", "image_path")
    readonly_fields = ("id", "created_at")
