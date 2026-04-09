"""Testes do fluxo principal de notificacoes."""

import base64
from datetime import timedelta
from unittest.mock import AsyncMock, patch

from django.contrib.auth.models import User
from django.core import mail
from django.test import TestCase, override_settings
from django.utils import timezone

from apps.profiles.models import Phone, Profile
from apps.visitors.models import Visitor, VisitorStatus
from notifications.models import Notification, NotificationLog
from notifications.send import send_notification
from notifications.services.domain import build_delivery_bundle, resolve_whatsapp_delivery_mode
from notifications.services.queue import enqueue_notification, process_due_notifications
from notifications.services.recipients import resolve_notification_recipient
from notifications.services.rendering import (
    build_tts_input,
    build_whatsapp_markdown_message,
    decode_media_payload,
    ensure_media_filename,
    markdown_to_html,
    markdown_to_text,
)
from services.base import ServiceResponse


class NotificationSupportTests(TestCase):
    """Garante consistencia dos utilitarios auxiliares."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="notify_user",
            email="notify@example.com",
        )
        self.profile = Profile.objects.create(user=self.user, full_name="Teste Notify")
        self.phone = Phone.objects.create(profile=self.profile, number="11999990011")

    def test_resolve_notification_recipient_reads_profile_contacts(self):
        recipient = resolve_notification_recipient(self.profile)

        self.assertEqual(recipient["phone"], self.phone.number)
        self.assertEqual(recipient["email"], self.user.email)

    def test_markdown_helpers_return_expected_outputs(self):
        title = "# Boas-vindas"
        content = "**Texto** com *ênfase*."

        self.assertEqual(markdown_to_text(title), "Boas-vindas")
        self.assertIn("<strong>Texto</strong>", markdown_to_html(content))
        self.assertEqual(
            build_whatsapp_markdown_message(title, content),
            "**Boas-vindas**\n\n**Texto** com *ênfase*.",
        )
        self.assertEqual(
            build_tts_input(title, content),
            "Texto com ênfase.",
        )

    def test_build_tts_input_removes_raw_urls_and_normalizes_for_speech(self):
        title = "Alerta"
        content = "- Acesse [nosso site](https://example.com)\n\nFale com a recepção"

        self.assertEqual(
            build_tts_input(title, content),
            "Acesse nosso site Fale com a recepção.",
        )

    def test_media_helpers_decode_and_name_payload(self):
        payload = base64.b64encode(b"hello").decode("ascii")

        self.assertEqual(decode_media_payload(payload), b"hello")
        self.assertEqual(ensure_media_filename("", "document", "application/pdf"), "media.pdf")

    def test_build_delivery_bundle_keeps_channel_specific_variants(self):
        notification = Notification(
            title="# Alerta",
            content="**Texto** com [link](https://example.com).",
            recipient=self.profile,
        )

        bundle = build_delivery_bundle(notification)

        self.assertEqual(bundle.subject_text, "Alerta")
        self.assertEqual(bundle.whatsapp_text, "**Alerta**\n\n**Texto** com [link](https://example.com).")
        self.assertEqual(bundle.email_text, "Alerta\n\nTexto com link (https://example.com).")
        self.assertIn("<strong>Texto</strong>", bundle.content_html)
        self.assertEqual(
            bundle.tts_text,
            "Texto com link.",
        )
        self.assertEqual(bundle.tts_context, {"title": "Alerta"})
        self.assertEqual(bundle.template_name, "email_notification.html")


class NotificationDispatchTests(TestCase):
    """Valida orquestracao de WhatsApp, email, TTS e media."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="dispatch_user",
            email="dispatch@example.com",
        )
        self.profile = Profile.objects.create(user=self.user, full_name="Dispatch Notify")
        self.phone = Phone.objects.create(profile=self.profile, number="11999990021")

    @patch("notifications.services.dispatch.send_text_message")
    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_send_notification_dispatches_text_and_email(self, mocked_send_text):
        mocked_send_text.return_value = {
            "success": True,
            "status_code": 201,
            "data": {"key": {"id": "wa-text-1"}},
        }
        notification = Notification.objects.create(
            title="# Titulo",
            content="**Mensagem** em markdown.",
            recipient=self.profile,
        )

        send_notification(notification.id)

        mocked_send_text.assert_called_once()
        notification.refresh_from_db()
        self.assertEqual(notification.status, Notification.Status.SENT)
        self.assertEqual(notification.channel_sent, Notification.Channel.BOTH)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(NotificationLog.objects.filter(notification=notification).count(), 2)

    @patch("notifications.services.dispatch.send_audio_message")
    @patch("notifications.services.dispatch.generate_tts_audio")
    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_send_notification_dispatches_tts_audio_and_email(self, mocked_tts, mocked_send_audio):
        mocked_tts.return_value = ServiceResponse.ok(
            data=type(
                "TTS",
                (),
                {
                    "audio_base64": base64.b64encode(b"audio").decode("ascii"),
                    "audio_url": "",
                    "log_id": "tts-log-1",
                },
            )()
        )
        mocked_send_audio.return_value = {
            "success": True,
            "status_code": 201,
            "data": {"key": {"id": "wa-audio-1"}},
        }
        notification = Notification.objects.create(
            title="## Titulo falado",
            content="Mensagem para virar áudio.",
            recipient=self.profile,
            use_tts=True,
        )

        send_notification(notification.id)

        mocked_tts.assert_called_once()
        self.assertEqual(
            mocked_tts.call_args.kwargs,
            {
                "text": "Mensagem para virar áudio.",
                "context": {"title": "Titulo falado"},
            },
        )
        mocked_send_audio.assert_called_once()
        notification.refresh_from_db()
        self.assertEqual(notification.status, Notification.Status.SENT)
        self.assertEqual(notification.channel_sent, Notification.Channel.BOTH)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(resolve_whatsapp_delivery_mode(notification), "tts")

    @patch("notifications.services.dispatch.send_media_message")
    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_send_notification_dispatches_media_and_attaches_email(self, mocked_send_media):
        mocked_send_media.return_value = {
            "success": True,
            "status_code": 201,
            "data": {"key": {"id": "wa-media-1"}},
        }
        notification = Notification.objects.create(
            title="Titulo imagem",
            content="Texto com anexo.",
            recipient=self.profile,
            is_media=True,
            media_type="image",
            media_payload=base64.b64encode(b"image-bytes").decode("ascii"),
            media_filename="foto.jpg",
            media_mime_type="image/jpeg",
        )

        send_notification(notification.id)

        mocked_send_media.assert_called_once_with(
            number=self.phone.number,
            media_payload=notification.media_payload,
            media_type="image",
            caption="**Titulo imagem**\n\nTexto com anexo.",
            filename="foto.jpg",
            mime_type="image/jpeg",
        )
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(len(mail.outbox[0].attachments), 1)
        self.assertIn("Imagem anexada ao e-mail.", mail.outbox[0].alternatives[0][0])
        self.assertIn("foto.jpg", mail.outbox[0].alternatives[0][0])
        notification.refresh_from_db()
        self.assertEqual(notification.status, Notification.Status.SENT)
        self.assertEqual(notification.channel_sent, Notification.Channel.BOTH)
        self.assertEqual(resolve_whatsapp_delivery_mode(notification), "media")

    def test_send_notification_skips_future_scheduled_notification(self):
        notification = Notification.objects.create(
            title="# Agendada",
            content="so depois",
            recipient=self.profile,
            scheduled_for=timezone.now() + timedelta(hours=1),
        )

        send_notification(notification.id)

        notification.refresh_from_db()
        self.assertEqual(notification.status, Notification.Status.PENDING)
        self.assertEqual(notification.attempts, 0)


class NotificationQueueTests(TestCase):
    """Valida o processamento em lote das notificações agendadas."""

    @override_settings(TASKIQ_ENABLED=False, TASKIQ_EAGER=True)
    @patch("notifications.services.queue.send_notification")
    def test_enqueue_notification_uses_eager_mode_when_taskiq_is_disabled(self, mocked_send_notification):
        mode = enqueue_notification(123)

        self.assertEqual(mode, "eager")
        mocked_send_notification.assert_called_once_with(123)

    @override_settings(TASKIQ_ENABLED=True, TASKIQ_EAGER=True)
    @patch("notifications.services.queue.send_notification")
    @patch("notifications.services.queue.logger")
    @patch("notifications.tasks.process_notification_async.kiq", new_callable=AsyncMock)
    def test_enqueue_notification_uses_sync_fallback_when_taskiq_fails(
        self,
        mocked_kiq,
        mocked_logger,
        mocked_send_notification,
    ):
        mocked_kiq.side_effect = RuntimeError("broker down")

        mode = enqueue_notification(321)

        self.assertEqual(mode, "eager_fallback")
        mocked_send_notification.assert_called_once_with(321)

    @patch("notifications.services.queue.send_notification")
    def test_process_due_notifications_processes_only_due_records(self, mocked_send_notification):
        user = User.objects.create_user(username="queue_user")
        profile = Profile.objects.create(user=user, full_name="Queue User")

        due = Notification.objects.create(
            title="Due",
            content="ready",
            recipient=profile,
            scheduled_for=timezone.now() - timedelta(minutes=5),
        )
        Notification.objects.create(
            title="Future",
            content="later",
            recipient=profile,
            scheduled_for=timezone.now() + timedelta(minutes=5),
        )
        Notification.objects.create(
            title="Immediate",
            content="unscheduled",
            recipient=profile,
        )

        processed = process_due_notifications()

        self.assertEqual(processed, 1)
        mocked_send_notification.assert_called_once_with(due.id)
