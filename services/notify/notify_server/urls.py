"""URLs do notify-server — dashboard operacional na raiz, rotas por área, API Ninja e MCP."""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path

from api import mcp
from api.instance import api
from notify import dashboard

_dashboard_urls = [
    # Visão Geral & Rotas Dedicadas por Área
    path("", dashboard.home),
    path("dashboard/", dashboard.home),
    path("dashboard/overview/", dashboard.home),
    path("dashboard/whatsapp/", dashboard.view_whatsapp),
    path("dashboard/email/", dashboard.view_email),
    path("dashboard/messages/", dashboard.view_messages),
    path("dashboard/inbox/", dashboard.view_inbox),
    path("dashboard/webhooks/", dashboard.view_webhooks),
    path("dashboard/settings/", dashboard.view_settings),
    path("dashboard/setup/", dashboard.view_setup),

    # Feeds e Status
    path("dashboard/notifications/", dashboard.notifications),
    path("dashboard/status", dashboard.services_status),
    path("dashboard/webhook/stream", dashboard.webhook_stream),
    path("webhook/stream", dashboard.webhook_stream),

    # Ações por App (compatibilidade total e operações específicas)
    path("dashboard/app/<slug:slug>/", dashboard.app_detail),
    path("dashboard/app/<slug:slug>/account", dashboard.save_account),
    path("dashboard/app/<slug:slug>/account/toggle", dashboard.toggle_account),
    path("dashboard/app/<slug:slug>/account/delete", dashboard.delete_account),
    path("dashboard/app/<slug:slug>/key", dashboard.new_key),
    path("dashboard/app/<slug:slug>/key/<int:key_id>/revoke", dashboard.revoke_key),
    path("dashboard/app/<slug:slug>/test-send", dashboard.test_send),
    path("dashboard/app/<slug:slug>/msg/<str:external_id>", dashboard.notification_detail),
    path("dashboard/app/<slug:slug>/msg/<str:external_id>/requeue", dashboard.requeue_notification),
    path("dashboard/app/<slug:slug>/in/<uuid:external_id>", dashboard.inbound_detail),
    path("dashboard/app/<slug:slug>/sent", dashboard.sent),
    path("dashboard/app/<slug:slug>/inbox", dashboard.inbox),
    path("dashboard/app/<slug:slug>/whatsapp", dashboard.save_whatsapp),
    path("dashboard/app/<slug:slug>/whatsapp/check", dashboard.check_whatsapp),
    path("dashboard/app/<slug:slug>/whatsapp/qr", dashboard.qr_code),
    path("dashboard/app/<slug:slug>/whatsapp/reconnect", dashboard.reconnect_instance),
    path("dashboard/app/<slug:slug>/whatsapp/provision", dashboard.provision_instance),
    path("dashboard/app/<slug:slug>/whatsapp/<slug:number_slug>/activate", dashboard.activate_number),
    path("dashboard/app/<slug:slug>/pair", dashboard.pairing_code),
    path("dashboard/app/<slug:slug>/mail", dashboard.save_mail),
    path("dashboard/app/<slug:slug>/mailbox", dashboard.mailbox),
    path("dashboard/app/<slug:slug>/mailtemplate", dashboard.save_shell),
    path("dashboard/app/<slug:slug>/mailtemplate/preview", dashboard.shell_preview),
    path("dashboard/app/<slug:slug>/mailtemplate/ai", dashboard.shell_ai),
    path("dashboard/app/<slug:slug>/webhook", dashboard.save_webhook),
    path("dashboard/app/<slug:slug>/ai/adapt-test", dashboard.ai_adapt_test),
    path("dashboard/omnirouter/test", dashboard.omnirouter_test),
    path("dashboard/account/create", dashboard.create_account),
    path("dashboard/app/<slug:slug>/mail/domains", dashboard.mail_domains),
    path("dashboard/app/<slug:slug>/mail/mailboxes", dashboard.mail_mailboxes),
    path("dashboard/app/<slug:slug>/mail/bind", dashboard.bind_mailbox),
    path("dashboard/app/<slug:slug>/settings/ai-url", dashboard.set_ai_url),
    path("dashboard/app/<slug:slug>/setup/step/whatsapp", dashboard.setup_step_whatsapp),
    path("dashboard/app/<slug:slug>/setup/step/email", dashboard.setup_step_email),
    path("dashboard/app/<slug:slug>/setup/step/email-probe", dashboard.setup_step_email_probe),
    path("dashboard/app/<slug:slug>/setup/step/ai-probe", dashboard.setup_step_ai_probe),
    path("dashboard/app/<slug:slug>/setup/step/ai-save", dashboard.setup_step_ai_save),
    path("dashboard/app/<slug:slug>/setup/step/logo-upload", dashboard.setup_step_logo_upload),
    path("dashboard/app/<slug:slug>/setup/step/logo-generate", dashboard.setup_step_logo_generate),
    path("dashboard/app/<slug:slug>/setup/step/logo-confirm", dashboard.setup_step_logo_confirm),
    path("dashboard/app/<slug:slug>/setup/step/template-propose", dashboard.setup_step_template_propose),
    path("dashboard/app/<slug:slug>/setup/step/template-save", dashboard.setup_step_template_save),
    path("dashboard/app/<slug:slug>/setup/finish", dashboard.setup_finish),
    path("dashboard/htmx.js", dashboard.htmx_js),
    path("dashboard/alpine.js", dashboard.alpine_js),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("mcp", mcp.endpoint),
    *_dashboard_urls,
    path("", api.urls),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
