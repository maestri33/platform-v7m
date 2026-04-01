"""Comando para testar envio de midia na Evolution API."""

import json

from django.core.management.base import BaseCommand, CommandError

from services.communication.evolution.requests.message.send_media import send_media


class Command(BaseCommand):
    help = "Send WhatsApp media message using Evolution API."

    def add_arguments(self, parser):
        parser.add_argument("--number", required=True, help="Numero destino.")
        parser.add_argument("--media", required=True, help="URL/base64 da midia.")
        parser.add_argument("--media-type", default="image", help="Tipo de midia (image/document/video).")
        parser.add_argument("--mime-type", default="image/jpeg", help="Mime type da midia.")
        parser.add_argument("--caption", default="", help="Legenda opcional.")
        parser.add_argument("--file-name", default="media", help="Nome do arquivo.")
        parser.add_argument("--delay", type=int, default=0, help="Atraso em ms.")

    def handle(self, *args, **options):
        try:
            result = send_media(
                number=options["number"],
                media=options["media"],
                media_type=options["media_type"],
                mime_type=options["mime_type"],
                caption=options["caption"],
                file_name=options["file_name"],
                delay=options["delay"],
            )
        except ValueError as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(json.dumps(result, indent=2, ensure_ascii=False))

