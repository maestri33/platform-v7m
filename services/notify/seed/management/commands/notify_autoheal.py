"""Comando para acionar a auto-cura (autoheal) e o watchdog do Notify sob demanda.

Verifica a saúde da licença do Evolution GO, restaura caso necessário,
e reconecta todas as instâncias WhatsApp ativas sem necessidade de QR code.
"""

from __future__ import annotations

from django.core.management.base import BaseCommand

from notify.watchdog import tick


class Command(BaseCommand):
    help = "Executa a auto-cura e verificação do watchdog para todos os serviços e instâncias WhatsApp."

    def handle(self, *args, **options):
        self.stdout.write("[watchdog] Executando ciclo de auto-cura (forçado)...")
        res = tick(force_heal=True)
        for svc, info in res.items():
            status = self.style.SUCCESS("OK") if info["ok"] else self.style.ERROR("FALHA")
            self.stdout.write(f"  -> {svc}: [{status}] {info['detail']}")
        self.stdout.write(self.style.SUCCESS("[watchdog] Ciclo de auto-cura finalizado."))
