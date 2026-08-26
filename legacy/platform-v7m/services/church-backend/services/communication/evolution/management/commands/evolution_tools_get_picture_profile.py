"""Comando para buscar foto de perfil via Evolution API."""

import json

from django.core.management.base import BaseCommand, CommandError

from services.communication.evolution.requests.tools.get_picture_profile import (
    get_picture_profile,
)


class Command(BaseCommand):
    help = "Get profile picture URL from WhatsApp number."

    def add_arguments(self, parser):
        parser.add_argument("--number", required=True, help="Numero alvo.")

    def handle(self, *args, **options):
        try:
            result = get_picture_profile(number=options["number"])
        except ValueError as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(json.dumps(result, indent=2, ensure_ascii=False))

