from django.urls import path

from . import views


app_name = "controlpanel"

urlpatterns = [
    # Bootstrap
    path("readiness/", views.update_readiness, name="readiness"),
    path("complete/", views.complete_bootstrap, name="complete"),
    path("reopen/", views.reopen_bootstrap, name="reopen"),
    # Edit de canais (form posts do dashboard)
    path("account/<slug:slug>/edit/", views.edit_account, name="edit_account"),
    path("whatsapp/<int:pk>/edit/", views.edit_whatsapp, name="edit_whatsapp"),
    path("mail/<int:pk>/edit/", views.edit_mail, name="edit_mail"),
    path("tts/<int:pk>/edit/", views.edit_tts, name="edit_tts"),
    # Template request workflow
    path("template-request/<slug:slug>/submit/", views.submit_template_request, name="submit_template_request"),
    path("template-request/<int:pk>/decide/", views.decide_template_request, name="decide_template_request"),
    # Complaints
    path("complaint/<int:pk>/resolve/", views.resolve_complaint, name="resolve_complaint"),
    # Smoke test + autodestruição
    path("smoke/", views.smoke_test, name="smoke_test"),
    path("finalize/", views.finalize, name="finalize"),
    # Pairing WhatsApp (Fase 2)
    path("whatsapp/pair/", views.whatsapp_pair, name="whatsapp_pair"),
    path("whatsapp/pair/create/", views.whatsapp_pair_create, name="whatsapp_pair_create"),
    path("whatsapp/pair/<str:name>/status/", views.whatsapp_pair_status, name="whatsapp_pair_status"),
    path("whatsapp/pair/register/", views.whatsapp_pair_register, name="whatsapp_pair_register"),
    path("whatsapp/pair/<str:name>/delete/", views.whatsapp_pair_delete, name="whatsapp_pair_delete"),
    # Fallback WhatsApp (Evolution GO) — STUB
    path("whatsapp/fallback/pair/", views.whatsapp_fallback_pair, name="whatsapp_fallback_pair"),
    # Wizard de e-mail (Step 3)
    path("email/pair/", views.email_pair, name="email_pair"),
    path("email/pair/test/", views.email_pair_test, name="email_pair_test"),
    path("email/pair/save/", views.email_pair_save, name="email_pair_save"),
    # Wizard de template (Step 4)
    path("template/setup/", views.template_setup, name="template_setup"),
    path("template/setup/save/", views.template_setup_save, name="template_setup_save"),
]
