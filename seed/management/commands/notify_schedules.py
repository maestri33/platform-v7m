"""Cria/atualiza as Schedules do watchdog e do canário — idempotente.

Rodar no deploy (setup.sh chama). Sem isto, o watchdog não bate e o canário
não voa — e ninguém fica sabendo que a GO caiu até o cliente reclamar.
"""

from __future__ import annotations

from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Garante as Schedules do watchdog (N min) e do canário (cron)."

    def handle(self, *args, **options):
        from django_q.models import Schedule

        interval = int(getattr(settings, "WATCHDOG_INTERVAL_MIN", 5))
        Schedule.objects.update_or_create(
            name="notify-watchdog",
            defaults={
                "func": "notify.watchdog.tick",
                "schedule_type": Schedule.MINUTES,
                "minutes": interval,
                "repeats": -1,
            },
        )
        self.stdout.write(f"watchdog: a cada {interval} min")

        Schedule.objects.update_or_create(
            name="notify-canary",
            defaults={
                "func": "notify.watchdog.canary",
                "schedule_type": Schedule.CRON,
                "cron": getattr(settings, "CANARY_CRON", "0 8 * * *"),
                "repeats": -1,
            },
        )
        self.stdout.write(f"canário: cron '{getattr(settings, 'CANARY_CRON', '0 8 * * *')}'")
