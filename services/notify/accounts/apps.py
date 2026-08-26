from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "accounts"

    def ready(self) -> None:
        # O signal roda depois que a tabela existe e também a cada deploy que
        # executa `migrate`; não faz consulta prematura ao banco no import.
        from django.db.models.signals import post_migrate

        from accounts.bootstrap import ensure_default_account_after_migrate

        post_migrate.connect(
            ensure_default_account_after_migrate,
            sender=self,
            dispatch_uid="accounts.ensure_default_account",
        )
