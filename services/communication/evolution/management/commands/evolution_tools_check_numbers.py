"""Comando para validar numeros no WhatsApp via Evolution API."""

import json

from django.core.management.base import BaseCommand, CommandError

from services.communication.evolution.requests.tools.check_numbers import check_numbers


class Command(BaseCommand):
    help = "Check if numbers exist on WhatsApp."

    def add_arguments(self, parser):
        parser.add_argument("--numbers", nargs="+", required=True, help="Lista de numeros.")

    def handle(self, *args, **options):
        try:
            result = check_numbers(numbers=options["numbers"])
        except ValueError as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(json.dumps(result, indent=2, ensure_ascii=False))

