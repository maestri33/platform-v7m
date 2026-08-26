"""Comando para testar envio de audio na Evolution API."""

import json

from django.core.management.base import BaseCommand, CommandError

from services.communication.evolution.requests.message.send_audio import send_audio


class Command(BaseCommand):
    help = "Send WhatsApp audio using Evolution API."

    def add_arguments(self, parser):
        parser.add_argument("--number", required=True, help="Numero destino.")
        parser.add_argument("--audio", required=True, help="URL/base64 do audio.")
        parser.add_argument("--delay", type=int, default=0, help="Atraso em ms.")
        parser.add_argument("--ptt", action="store_true", help="Envia como mensagem de voz (ptt).")

    def handle(self, *args, **options):
        try:
            result = send_audio(
                number=options["number"],
                audio=options["audio"],
                delay=options["delay"],
                ptt=options["ptt"],
            )
        except ValueError as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(json.dumps(result, indent=2, ensure_ascii=False))

