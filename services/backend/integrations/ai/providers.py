"""Registry de providers de IA + a cadeia de fallback — montado do .env via settings (CONVENTION §10).

Um provider é só `{base_url, api_key}` (CONVENTION §8). Como todos são OpenAI-compatible, somar um
provider novo é só linhas no `.env` — zero código aqui. A cadeia de fallback (`IA_FALLBACK_CHAIN`) é
uma lista ordenada de `(provider, model)`: o 1º é o default; em falha retryável o service cai pro próximo.
"""

from __future__ import annotations

from django.conf import settings

from .client import LLMClient, LLMError


def get_client(provider: str) -> LLMClient:
    """Instancia o client de um provider habilitado (com base_url/api_key do .env)."""
    cfg = settings.IA_PROVIDERS.get(provider)
    if not cfg:
        raise LLMError(
            f"provider de IA desconhecido ou sem credencial no .env: {provider!r}",
            retryable=False,
        )
    return LLMClient(
        provider=provider,
        base_url=cfg["base_url"],
        api_key=cfg["api_key"],
        temperature=settings.IA_DEFAULT_TEMPERATURE,
        max_tokens=settings.IA_MAX_TOKENS,
        timeout=settings.IA_TIMEOUT,
    )


def fallback_chain(model: str | None = None) -> list[tuple[str, str]]:
    """A cadeia `(provider, model)` a tentar. Sem `model` => a cadeia do .env. Com `model` => só as
    entradas da cadeia com esse model (erra se não houver — não inventa provider)."""
    chain: list[tuple[str, str]] = settings.IA_FALLBACK_CHAIN
    if not model:
        return chain
    filtered = [(p, m) for (p, m) in chain if m == model]
    if not filtered:
        raise LLMError(
            f"model {model!r} não está na IA_FALLBACK_CHAIN", retryable=False
        )
    return filtered


def enabled_providers() -> list[str]:
    return list(settings.IA_PROVIDERS)
