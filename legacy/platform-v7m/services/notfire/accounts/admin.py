from django.contrib import admin
from .models import Account, ApiKey


class ApiKeyInline(admin.TabularInline):
    model = ApiKey
    extra = 0


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ("slug", "name", "is_active", "created_at")
    list_filter = ("is_active",)
    inlines = [ApiKeyInline]


@admin.register(ApiKey)
class ApiKeyAdmin(admin.ModelAdmin):
    list_display = ("account", "label", "is_active", "created_at")
    list_filter = ("account", "is_active")
