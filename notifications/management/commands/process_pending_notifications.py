"""Processa notificações agendadas já vencidas."""

from django.core.management.base import BaseCommand

from notifications.services.queue import process_due_notifications


class Command(BaseCommand):
    help = "Processa notificações pendentes com scheduled_for menor ou igual a agora."

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Quantidade maxima de notificacoes a processar.",
        )

    def handle(self, *args, **options):
        processed = process_due_notifications(limit=options.get("limit"))
        self.stdout.write(self.style.SUCCESS(f"{processed} notificacao(oes) processada(s)."))
