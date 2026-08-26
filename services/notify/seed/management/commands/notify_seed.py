"""Management command — carrega templates.md → Template + Trigger por conta."""

from __future__ import annotations

from pathlib import Path

from django.core.management.base import BaseCommand

from accounts.models import Account
from notify.models import Template, Trigger
from seed import io as seed_io


class Command(BaseCommand):
    help = "Carrega seed/templates.md → Template+Trigger para uma conta."

    def add_arguments(self, parser):
        parser.add_argument("--account", default="default", help="Slug da conta (default: 'default')")
        parser.add_argument("--force", action="store_true", help="Sobrescreve templates existentes")
        parser.add_argument("--dry-run", action="store_true", help="Mostra o que faria sem salvar")
        parser.add_argument("--active-only", action="store_true", help="Só processa eventos ativos no seed")

    def handle(self, *args, **options):
        account_slug = options["account"]
        force = options["force"]
        dry_run = options["dry_run"]
        active_only = options["active_only"]

        try:
            account = Account.objects.get(slug=account_slug)
        except Account.DoesNotExist:
            self.stderr.write(self.style.ERROR(f"Conta '{account_slug}' não encontrada."))
            return

        path = Path(__file__).resolve().parents[2] / "templates.md"
        if not path.exists():
            self.stderr.write(self.style.ERROR(f"Seed file não encontrado: {path}"))
            return

        specs = seed_io.parse(path.read_text(encoding="utf-8"))
        created, updated, skipped = 0, 0, 0

        for spec in specs:
            if active_only and not spec.active:
                skipped += 1
                continue

            existing = Template.objects.filter(account=account, event=spec.event).first()
            if existing and not force:
                skipped += 1
                continue

            fields = dict(
                body_md=spec.body_md,
                storytelling=spec.storytelling,
                channels=spec.channels,
                title=spec.title,
                subject=spec.subject,
                media_url=spec.media_url,
                media_type=spec.media_type,
                mail_template=spec.mail_template,
                story_prompt=spec.story_prompt,
            )

            if dry_run:
                action = "UPDATE" if existing else "CREATE"
                self.stdout.write(f"  {action} {account.slug}/{spec.event}")
                continue

            tpl, was_created = Template.objects.update_or_create(
                account=account, event=spec.event, defaults=fields
            )
            Trigger.objects.update_or_create(
                template=tpl,
                defaults=dict(
                    fires_on=spec.fires_on or "",
                    source=spec.source,
                    delay_minutes=spec.delay_minutes,
                    active=spec.active,
                ),
            )
            if was_created:
                created += 1
            else:
                updated += 1

        # invalida cache
        from notify.interface import templates as _cache
        _cache.invalidate(account.id)

        self.stdout.write(self.style.SUCCESS(
            f"Seed [{account.slug}]: {created} criados, {updated} atualizados, {skipped} ignorados."
        ))
