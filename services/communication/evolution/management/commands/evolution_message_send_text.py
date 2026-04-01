"""Comando para testar envio de texto na Evolution API."""

import json

from django.core.management.base import BaseCommand, CommandError

from services.communication.evolution.requests.message.send_text import send_text


class Command(BaseCommand):
    help = "Send WhatsApp text message using Evolution API."

    def add_arguments(self, parser):
        parser.add_argument("--number", required=True, help="Numero destino, ex: 5543999999999.")
        parser.add_argument("--text", required=True, help="Texto da mensagem.")
        parser.add_argument("--delay", type=int, default=0, help="Atraso em ms.")
        parser.add_argument("--link-preview", action="store_true", help="Habilita link preview.")

    def handle(self, *args, **options):
        try:
            result = send_text(
                number=options["number"],
                text=options["text"],
                delay=options["delay"],
                link_preview=options["link_preview"],
            )
        except ValueError as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(json.dumps(result, indent=2, ensure_ascii=False))

