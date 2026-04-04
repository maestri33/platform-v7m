"""Admin do app visitors."""

from django.contrib import admin

from .models import EvangelicalChurchInfo, Visitor


@admin.register(Visitor)
class VisitorAdmin(admin.ModelAdmin):
    list_display = ("profile", "status", "date_of_visit", "religion", "christianity_type", "created_at")
    search_fields = ("profile__user__username", "profile__full_name")
    list_filter = ("status",)


@admin.register(EvangelicalChurchInfo)
class EvangelicalChurchInfoAdmin(admin.ModelAdmin):
    list_display = ("visitor", "church_name", "is_in_communion", "created_at")
    search_fields = ("visitor__profile__full_name", "church_name")
