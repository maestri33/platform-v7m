"""Expurgo de dados pessoais antigos (M3/LGPD) — retenção configurável.

Apaga Notification, InboundEvent e WebhookDelivery mais antigos que
`NOTIFY_RETENTION_DAYS` (default 90). Roda semanalmente via Schedule
(`notify_schedules` cria) ou manualmente com `--days N` / `--dry-run`.
"""

from __future__ import annotations

from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone


def purge(days: int | None = None, dry_run: bool = False) -> dict[str, int]:
    """Callable também usado pela Schedule da Django-Q."""
    days = days or int(getattr(settings, "NOTIFY_RETENTION_DAYS", 90))
    corte = timezone.now() - timedelta(days=days)

    from channels.models import WebhookDelivery
    from notify.models import InboundEvent, Notification

    alvos = {
        "notifications": Notification.objects.filter(created_at__lt=corte),
        "inbound_events": InboundEvent.objects.filter(received_at__lt=corte),
        "webhook_deliveries": WebhookDelivery.objects.filter(created_at__lt=corte),
    }
    out: dict[str, int] = {}
    for nome, qs in alvos.items():
        if dry_run:
            out[nome] = qs.count()
        else:
            out[nome], _ = qs.delete()
    return out


class Command(BaseCommand):
    help = "Expurga registros com dados pessoais além da retenção (LGPD)."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=None)
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        out = purge(options["days"], options["dry_run"])
        modo = "apagaria" if options["dry_run"] else "apagou"
        for nome, n in out.items():
            self.stdout.write(f"{modo} {n} de {nome}")
