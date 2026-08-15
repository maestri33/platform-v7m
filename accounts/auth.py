"""Resolução de conta — SEM exigir API key (serviço vive só na VPN).

Decisão do Chefe (2026-08-02): "indiferente se mandar key ou não, mas a partir
de agora é sem key". A ordem de resolução é:

1. `Authorization: Bearer <key>` VÁLIDA → conta da key (compat com apps que já
   mandam; key errada não derruba — cai pro passo seguinte);
2. `account_id` no payload (aceita slug ou id numérico) → aquela conta;
3. nada → conta DEFAULT (`NOTIFY_DEFAULT_ACCOUNT_SLUG`, padrão "default").

Conta inexistente ou inativa → 404/403 com mensagem clara, nunca silêncio.
"""

from __future__ import annotations

from django.conf import settings
from ninja.errors import HttpError

from accounts.models import Account, ApiKey


def _account_by_key(request) -> Account | None:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    key_hash = ApiKey.hash_key(auth[7:])
    api_key = (
        ApiKey.objects.select_related("account")
        .filter(key_hash=key_hash, is_active=True, account__is_active=True)
        .first()
    )
    return api_key.account if api_key else None


def _account_by_id(account_id: str | int) -> Account:
    lookup = {"slug": str(account_id)}
    if str(account_id).isdigit():
        lookup = {"pk": int(account_id)}
    account = Account.objects.filter(**lookup).first()
    if account is None:
        raise HttpError(404, f"Conta '{account_id}' não existe.")
    if not account.is_active:
        raise HttpError(403, f"Conta '{account.slug}' está desativada.")
    return account


def resolve_account(request, account_id: str | int | None = None) -> Account:
    """Conta do request: key válida (se houver) > account_id > default."""
    account = _account_by_key(request)
    if account is not None:
        return account
    if account_id:
        return _account_by_id(account_id)
    default_slug = getattr(settings, "NOTIFY_DEFAULT_ACCOUNT_SLUG", "default")
    account = Account.objects.filter(slug=default_slug).first()
    if account is None:
        raise HttpError(
            404,
            f"Sem account_id e a conta default '{default_slug}' não existe — "
            "informe account_id ou crie a conta default.",
        )
    if not account.is_active:
        raise HttpError(403, f"Conta default '{default_slug}' está desativada.")
    return account


def api_key_auth(request, account_id: str | int | None = None) -> Account:
    """Compat: os call-sites antigos ganham o novo comportamento sem key."""
    return resolve_account(request, account_id)
