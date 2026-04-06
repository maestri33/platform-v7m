"""Rotas HTML simples do frontend de contato."""

from django.urls import path

from apps.visitors import views

urlpatterns = [
    path("", views.contact_home, name="contact-home"),
    path("modal/blank/", views.contact_modal_blank, name="contact-modal-blank"),
    path("authentication/", views.contact_authentication, name="contact-authentication"),
    path("login/", views.contact_login, name="contact-login"),
    path("login/<uuid:profile_uuid>", views.contact_magic_login, name="contact-magic-login"),
    path("logout/", views.contact_logout, name="contact-logout"),
    path("data/", views.contact_profile_data, name="contact-data"),
    path("address/lookup/", views.contact_address_lookup, name="contact-address-lookup"),
    path("address/save/", views.contact_address_save, name="contact-address-save"),
    path("religion/prepare/", views.contact_religion_prepare, name="contact-religion-prepare"),
    path("religion/christianity/", views.contact_religion_christianity, name="contact-religion-christianity"),
    path("religion/evangelical/", views.contact_religion_evangelical, name="contact-religion-evangelical"),
    path("restart/", views.contact_restart, name="contact-restart"),
]
