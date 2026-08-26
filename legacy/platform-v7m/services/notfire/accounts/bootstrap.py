"""Bootstrap idempotente da conta padrão do notify-server."""

from __future__ import annotations

from django.conf import settings

from accounts.models import Account


def ensure_default_account() -> tuple[Account, bool]:
    """Garante o tenant usado quando o caller não informa ``account_id``.

    O bootstrap cria somente a conta. Canais, chaves e credenciais continuam
    sendo provisionados explicitamente, porque inventar segredos no boot
    deixaria o serviço aparentemente pronto, mas impossível de operar.
    """

    slug = str(getattr(settings, "NOTIFY_DEFAULT_ACCOUNT_SLUG", "default") or "default")
    name = str(getattr(settings, "NOTIFY_DEFAULT_ACCOUNT_NAME", "Notify") or "Notify")
    return Account.objects.get_or_create(slug=slug, defaults={"name": name})


def ensure_default_account_after_migrate(**_kwargs) -> None:
    ensure_default_account()
