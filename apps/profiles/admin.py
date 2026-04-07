"""Admin do app profiles."""

from django.contrib import admin

from .models import Address, AddressProof, Phone, Profile


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ("street", "number", "city", "state", "zipcode")
    search_fields = ("street", "city", "zipcode")
    list_filter = ("state",)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "full_name", "uuid", "gender", "marital_status", "education_level")
    search_fields = ("user__username", "user__first_name", "user__last_name", "full_name", "mother_name")
    list_filter = ("gender", "marital_status", "education_level")
    ordering = ("user__first_name", "user__last_name")


@admin.register(Phone)
class PhoneAdmin(admin.ModelAdmin):
    list_display = ("profile", "number")
    search_fields = ("number", "profile__user__username")


@admin.register(AddressProof)
class AddressProofAdmin(admin.ModelAdmin):
    list_display = ("profile", "description", "created_at")
    search_fields = ("profile__user__username",)
