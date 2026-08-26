"""Bootstrap de inicialização: o tenant default nasce pronto para operar.

Rodado no boot do container (compose) antes do gunicorn. Faz três coisas:

1. Espera a Evolution GO ficar alcançável — no compose os containers sobem
   em paralelo e a GO leva dezenas de segundos; provisionar antes disso
   só geraria falso negativo.
2. Chama ``provision_app`` para a conta default: instância na GO com webhook,
   número com token próprio e template de e-mail.
3. Falha parcial NÃO derruba o serviço: se a GO estiver fora, a conta fica no
   ar e o dashboard mostra o passo que faltou.

Idempotente por construção (tudo aqui é ensure/get_or_create) — reiniciar o
container quantas vezes quiser reaproveita instâncias e credenciais.
"""

from __future__ import annotations

import time

from django.conf import settings
from django.core.management.base import BaseCommand

from accounts.bootstrap import ensure_default_account


class Command(BaseCommand):
    help = "Espera a Evolution GO e provisiona o tenant default (idempotente)."

    def add_arguments(self, parser):
        parser.add_argument("--timeout", type=int, default=180, help="segundos aguardando provedor")
        parser.add_argument("--slug", default="", help="slug da conta (default: NOTIFY_DEFAULT_ACCOUNT_SLUG)")

    def handle(self, *args, **options):
        slug = options["slug"] or str(
            getattr(settings, "NOTIFY_DEFAULT_ACCOUNT_SLUG", "default") or "default"
        )
        name = str(getattr(settings, "NOTIFY_DEFAULT_ACCOUNT_NAME", "Notify") or "Notify")

        ensure_default_account()
        self._wait_providers(timeout=options["timeout"])

        from notify.provisioning import provision_app

        report = provision_app(slug=slug, name=name)
        for step in report.steps:
            marker = {"ok": "+", "reused": "=", "skipped": "-", "failed": "!"}.get(step.status, "?")
            self.stdout.write(f"[bootstrap] {marker} {step.name}: {step.status} — {step.detail}")
        if report.failed:
            # Registra, mas não mata o boot: serviço parcialmente pronto é melhor
            # que container em crash-loop por causa de um provedor de fora.
            self.stdout.write(
                self.style.WARNING(
                    f"[bootstrap] passos com falha: {', '.join(report.failed)} (ver dashboard)"
                )
            )
        else:
            self.stdout.write(self.style.SUCCESS(f"[bootstrap] conta '{slug}' pronta"))

        # Executa auto-cura persistente de conexões e instâncias WhatsApp
        self.stdout.write("[bootstrap] Iniciando auto-cura persistente do watchdog...")
        max_attempts = 10
        healed = False
        for attempt in range(1, max_attempts + 1):
            try:
                from notify.watchdog import tick
                res = tick(force_heal=True)
                go_info = res.get("evolution-go", {})
                if go_info.get("ok"):
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"[bootstrap] Auto-cura concluída na tentativa {attempt}/{max_attempts}: {go_info.get('detail')}"
                        )
                    )
                    healed = True
                    break
                self.stdout.write(
                    f"[bootstrap] Tentativa {attempt}/{max_attempts}: {go_info.get('detail')} — aguardando reconexão..."
                )
            except Exception as exc:  # noqa: BLE001
                self.stdout.write(self.style.WARNING(f"[bootstrap] Tentativa {attempt}/{max_attempts} falhou: {exc}"))
            time.sleep(3)

        if not healed:
            self.stdout.write(
                self.style.WARNING(
                    "[bootstrap] Auto-cura não estabilizou todas as instâncias no boot; o watchdog em background continuará tentando."
                )
            )

    # ── espera do provedor ───────────────────────────────────────────────────

    def _wait_providers(self, *, timeout: int) -> None:
        probes = [
            (
                "evolution-go",
                lambda: self._probe_go(),
            ),
        ]
        deadline = time.monotonic() + timeout
        pending = dict(probes)
        while pending and time.monotonic() < deadline:
            for label, probe in list(pending.items()):
                try:
                    if probe():
                        self.stdout.write(f"[bootstrap] {label} respondeu")
                        del pending[label]
                except Exception as exc:  # noqa: BLE001 — ainda subindo, é esperado
                    if "LICENSE_REQUIRED" in str(exc):
                        # Tenta auto-recuperar a licença imediatamente
                        from notify.watchdog import _check_and_heal_license
                        base = (getattr(settings, "EVOLUTION_GO_BASE_URL", "") or "").rstrip("/")
                        if base and _check_and_heal_license(base):
                            self.stdout.write(self.style.SUCCESS(f"[bootstrap] {label} licença auto-recuperada com sucesso"))
                            del pending[label]
                            continue
                        self.stdout.write(
                            self.style.WARNING(
                                f"[bootstrap] {label} sem licença (LICENSE_REQUIRED) — "
                                "seguindo sem ela"
                            )
                        )
                        del pending[label]
            if pending:
                time.sleep(3)
        for label in pending:
            self.stdout.write(
                self.style.WARNING(f"[bootstrap] {label} não respondeu em {timeout}s — seguindo")
            )

    def _probe_go(self) -> bool:
        from notify.watchdog import _check_and_heal_license
        base = (getattr(settings, "EVOLUTION_GO_BASE_URL", "") or "").rstrip("/")
        if base:
            _check_and_heal_license(base)
        from whatsapp import provisioning as wa

        wa.go_find_instance("___probe___")
        return True
