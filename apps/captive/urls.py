"""URLs das telas HTMX do captive portal."""

from django.urls import path

from apps.captive import views

app_name = "captive"

urlpatterns = [
    path("", views.portal, name="portal"),
    path("htmx/identify", views.htmx_identify, name="htmx-identify"),
    path("htmx/otp/verify", views.htmx_otp_verify, name="htmx-otp-verify"),
    path("htmx/otp/resend", views.htmx_otp_resend, name="htmx-otp-resend"),
    path("htmx/trocar-numero", views.htmx_trocar_numero, name="htmx-trocar-numero"),
    path("htmx/cpf", views.htmx_cpf, name="htmx-cpf"),
    path(
        "htmx/identity/confirm",
        views.htmx_identity_confirm,
        name="htmx-identity-confirm",
    ),
    path("htmx/selfie", views.htmx_selfie, name="htmx-selfie"),
    path("htmx/selfie/skip", views.htmx_selfie_skip, name="htmx-selfie-skip"),
    path("htmx/status", views.htmx_status, name="htmx-status"),
]
