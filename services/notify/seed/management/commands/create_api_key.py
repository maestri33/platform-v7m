"""Management command — cria Account + ApiKey e imprime a chave (mostra só UMA vez)."""

from __future__ import annotations

import secrets

from django.core.management.base import BaseCommand

from accounts.models import Account, ApiKey


class Command(BaseCommand):
    help = "Cria uma Account + ApiKey (a chave é mostrada só uma vez)."

    def add_arguments(self, parser):
        parser.add_argument("--account", required=True, help="Slug da conta")
        parser.add_argument("--name", default="", help="Nome da conta (default = slug)")
        parser.add_argument("--label", default="default", help="Label da api-key")

    def handle(self, *args, **options):
        slug = options["account"]
        name = options["name"] or slug
        label = options["label"]

        account, created = Account.objects.get_or_create(
            slug=slug, defaults={"name": name}
        )
        if not created:
            self.stdout.write(f"Conta '{slug}' já existe.")

        raw_key = secrets.token_urlsafe(32)
        key_hash = ApiKey.hash_key(raw_key)

        ApiKey.objects.create(
            account=account,
            key_hash=key_hash,
            label=label,
        )

        self.stdout.write(self.style.SUCCESS(f"\nConta: {account.slug} ({account.name})"))
        self.stdout.write(self.style.SUCCESS(f"Label: {label}"))
        self.stdout.write(self.style.WARNING(f"\nChave (mostrada só UMA vez):\n{raw_key}\n"))
        self.stdout.write("Guarde em segurança — não será exibida novamente.")
