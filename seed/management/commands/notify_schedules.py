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

        # DAILY em vez de CRON: cron exigiria croniter (dep nova). O canário é
        # diário no horário de CANARY_HOUR — DAILY + next_run resolve igual.
        from datetime import time as dtime

        from django.utils import timezone

        hour = int(getattr(settings, "CANARY_HOUR", 8))
        now = timezone.localtime()
        alvo = now.replace(hour=hour, minute=0, second=0, microsecond=0)
        if alvo <= now:
            alvo += timezone.timedelta(days=1)
        Schedule.objects.update_or_create(
            name="notify-canary",
            defaults={
                "func": "notify.watchdog.canary",
                "schedule_type": Schedule.DAILY,
                "next_run": alvo,
                "repeats": -1,
            },
        )
        self.stdout.write(f"canário: diário às {hour:02d}h (próximo: {alvo:%d/%m %H:%M})")

        Schedule.objects.update_or_create(
            name="notify-purge",
            defaults={
                "func": "seed.management.commands.notify_purge.purge",
                "schedule_type": Schedule.WEEKLY,
                "repeats": -1,
            },
        )
        self.stdout.write(
            f"expurgo: semanal (retenção {getattr(settings, 'NOTIFY_RETENTION_DAYS', 90)} dias)"
        )
