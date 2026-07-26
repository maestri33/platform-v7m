"""URLs das telas HTMX do captive portal."""

from django.urls import path

from apps.captive import views

app_name = "captive"

urlpatterns = [
    path("", views.portal, name="portal"),
    path("htmx/identify", views.htmx_identify, name="htmx-identify"),
    path("htmx/otp/verify", views.htmx_otp_verify, name="htmx-otp-verify"),
    path("htmx/otp/resend", views.htmx_otp_resend, name="htmx-otp-resend"),
    path("htmx/cpf", views.htmx_cpf, name="htmx-cpf"),
    path("htmx/status", views.htmx_status, name="htmx-status"),
]
