"""Auth middleware para Ninja — Bearer token → Account."""

from __future__ import annotations

from ninja.errors import HttpError

from accounts.models import ApiKey


def api_key_auth(request) -> "Account":
    """Authorization: Bearer <key> → Account. Levanta 401/403 se inválido."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HttpError(401, "Missing API key")
    raw_key = auth[7:]
    key_hash = ApiKey.hash_key(raw_key)
    api_key = (
        ApiKey.objects.select_related("account")
        .filter(key_hash=key_hash, is_active=True, account__is_active=True)
        .first()
    )
    if not api_key:
        raise HttpError(403, "Invalid API key")
    return api_key.account
