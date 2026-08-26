"""Management command — envia notificação real (inline, run_sync)."""

from __future__ import annotations

from django.core.management.base import BaseCommand

from accounts.models import Account


class Command(BaseCommand):
    help = "Envia uma notificação real (WhatsApp + email) inline."

    def add_arguments(self, parser):
        parser.add_argument("--account", default="default", help="Slug da conta")
        parser.add_argument("--phone", required=True, help="Telefone (5543...)")
        parser.add_argument("--text", required=True, help="Texto da mensagem")
        parser.add_argument("--email", default=None, help="E-mail (opcional)")
        parser.add_argument("--event", default=None, help="Evento (usa send_event em vez de send)")

    def handle(self, *args, **options):
        try:
            account = Account.objects.get(slug=options["account"])
        except Account.DoesNotExist:
            self.stderr.write(self.style.ERROR(f"Conta '{options['account']}' não encontrada."))
            return

        if options["event"]:
            from notify.interface.events import send_event
            ext = send_event(
                account, options["event"],
                phone=options["phone"],
                email=options["email"],
                run_sync=True,
            )
        else:
            from notify.interface.send import send
            ext = send(
                account=account,
                text=options["text"],
                caller="management.notify_send",
                phone=options["phone"],
                email=options["email"],
                email_channel=bool(options["email"]),
                whatsapp=True,
                run_sync=True,
            )

        from notify.models import Notification
        notif = Notification.objects.filter(external_id=ext).first()
        if notif:
            import json
            self.stdout.write(json.dumps({
                "external_id": str(notif.external_id),
                "whatsapp_status": notif.whatsapp_status,
                "email_status": notif.email_status,
                "whatsapp_error": notif.whatsapp_error,
                "email_error": notif.email_error,
            }, indent=2))
        else:
            self.stdout.write(f"external_id: {ext}")
