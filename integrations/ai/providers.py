"""Registry de providers de IA + cadeias de fallback per-capability.

M1.7 → M1.13: o app NÃO fala mais com um único ``IA_FALLBACK_CHAIN``. Agora
existem 4 cadeias independentes (``TEXT/VISION/IMAGE/TTS``), cada uma lida
de ``settings.IA_<CAP>_CHAIN`` (CSV ``provider:model,provider:model,...``).
Quem chama o service (``integrations.ai.service``) decide qual chain usar
baseado na capability — o código de aplicação não conhece providers.

Um provider é só ``{base_url, api_key}`` (lido de ``settings.IA_<NAME>_BASE_URL``
e ``settings.IA_<NAME>_API_KEY``). Como todos os providers LLM falam OpenAI-
compatible, somar um novo é só config no .env — zero código aqui.

Para capability ``TTS``, o provider ``elevenlabs`` é especial: vive fora do
registry ``IA_*`` (já tem namespace próprio ``ELEVENLABS_*`` legado).
``client_for(elevenlabs, tts)`` retorna o dicionário já montado com
``base_url``/``api_key`` vindos de ``settings.ELEVENLABS_*``.
"""

from __future__ import annotations

from typing import Literal

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured


Capability = Literal["text", "vision", "image", "tts"]

# Providers conhecidos pelo registry. Lista aberta: se aparecer um novo nome
# em qualquer ``IA_<CAP>_CHAIN`` e o .env tiver as credenciais, ele é aceito.
_KNOWN_PROVIDERS = (
    "groq",
    "deepseek",
    "openai",
    "minimax",
)


def _provider_setting(provider: str, suffix: str) -> str:
    """Lê ``settings.IA_<PROVIDER>_<suffix>``. ``provider`` em minúsculas."""
    attr = f"IA_{provider.upper()}_{suffix}"
    return str(getattr(settings, attr, "") or "").strip()


def get_client(provider: str) -> dict:
    """Devolve ``{"base_url": ..., "api_key": ...}`` lendo do settings.

    Levanta ``ImproperlyConfigured`` se faltar credencial — quem chama
    (service) trata como ``retryable=False`` e falha alto (não tenta o
    próximo da cadeia por bug de config).
    """
    # ElevenLabs fica fora do registry ``IA_*`` — namespace legado.
    if provider == "elevenlabs":
        base_url = str(getattr(settings, "ELEVENLABS_BASE_URL", "") or "").strip()
        api_key = str(getattr(settings, "ELEVENLABS_API_KEY", "") or "").strip()
        if not base_url or not api_key:
            raise ImproperlyConfigured(
                "provider de IA 'elevenlabs' sem credencial no .env "
                "(ELEVENLABS_BASE_URL / ELEVENLABS_API_KEY)."
            )
        return {"base_url": base_url, "api_key": api_key}
    # Gemini idem — só image/vision, namespace GEMINI_* legado.
    if provider == "gemini":
        base_url = str(getattr(settings, "GEMINI_API_BASE_URL", "") or "").strip()
        api_key = str(getattr(settings, "GEMINI_API_KEY", "") or "").strip()
        if not base_url or not api_key:
            raise ImproperlyConfigured(
                "provider de IA 'gemini' sem credencial no .env "
                "(GEMINI_API_BASE_URL / GEMINI_API_KEY)."
            )
        return {"base_url": base_url, "api_key": api_key}
    base_url = _provider_setting(provider, "BASE_URL")
    api_key = _provider_setting(provider, "API_KEY")
    if not base_url or not api_key:
        raise ImproperlyConfigured(
            f"provider de IA {provider!r} sem credencial no .env "
            f"(IA_{provider.upper()}_BASE_URL / IA_{provider.upper()}_API_KEY)."
        )
    return {"base_url": base_url, "api_key": api_key}


def enabled_providers() -> list[str]:
    """Lista providers habilitados.

    Se algum ``IA_ENABLED_<NAME>`` estiver setado no .env, retorna só esses
    (filtrado pela lista de providers conhecidos e por quem tem credencial).
    Se nenhum ``IA_ENABLED_*`` estiver setado, retorna todos os providers
    com credencial configurada.
    """
    explicit_flags: dict[str, bool] = {}
    for provider in _KNOWN_PROVIDERS:
        attr = f"IA_ENABLED_{provider.upper()}"
        if hasattr(settings, attr):
            explicit_flags[provider] = bool(getattr(settings, attr))

    has_credential = {
        provider: bool(_provider_setting(provider, "BASE_URL"))
        and bool(_provider_setting(provider, "API_KEY"))
        for provider in _KNOWN_PROVIDERS
    }

    if explicit_flags:
        return [
            provider
            for provider, flag in explicit_flags.items()
            if flag and has_credential.get(provider)
        ]
    return [provider for provider, ok in has_credential.items() if ok]


def _parse_chain(raw: str) -> list[tuple[str, str]]:
    """CSV ``provider:model,provider:model,...`` → ``[(provider, model), ...]``."""
    chain: list[tuple[str, str]] = []
    for item in raw.split(","):
        item = item.strip()
        if not item or ":" not in item:
            continue
        provider, _, model_name = item.partition(":")
        provider = provider.strip()
        model_name = model_name.strip()
        if provider and model_name:
            chain.append((provider, model_name))
    return chain


def fallback_chain(
    capability: Capability = "text",
    model: str | None = None,
) -> list[tuple[str, str]]:
    """Cadeia ``(provider, model)`` a tentar para a capability dada.

    Lê ``settings.IA_<CAP>_CHAIN`` (per-capability). ``capability="text"``
    cai pra ``IA_FALLBACK_CHAIN`` retrocompativel se ``IA_TEXT_CHAIN``
    estiver vazio.

    Com ``model`` setado, filtra só entradas com aquele model; se não houver
    nenhuma, levanta ``ImproperlyConfigured`` (não inventa provider).
    """
    setting_name = f"IA_{capability.upper()}_CHAIN"
    raw = str(getattr(settings, setting_name, "") or "").strip()
    # Retrocompat: text vazio → IA_FALLBACK_CHAIN.
    if capability == "text" and not raw:
        raw = str(getattr(settings, "IA_FALLBACK_CHAIN", "") or "").strip()
    chain = _parse_chain(raw)

    if model is None:
        return chain
    filtered = [(p, m) for (p, m) in chain if m == model]
    if not filtered:
        raise ImproperlyConfigured(
            f"model {model!r} não está em {setting_name}"
        )
    return filtered
