from django.contrib import admin
from .models import GroqVisionLog

@admin.register(GroqVisionLog)
class GroqVisionLogAdmin(admin.ModelAdmin):
    list_display = ("id", "image_path", "created_at")
    search_fields = ("prompt_text", "response_text", "image_path")
    readonly_fields = ("created_at",)
