"""System check do app ``ia`` — avisa no boot quando a config está incompleta.

Roda em todo ``runserver``/``manage.py`` (framework de checks do Django),
então fica "printando" vermelho até o .env ser preenchido. Padrão do
dono (igual Evolution): integração não sobe silenciosa sem credencial real.

- ``ai.E001`` (Error): nenhum provider habilitado com ``base_url + api_key``
  → o engine LLM não fala com IA.
- ``ai.E002`` (Error): provider habilitado mas sem API key no .env.
- ``ai.W001`` (Warning): Gemini sem credencial — mídia imagem/visão
  fica indisponível (as demais funcionam).
- ``ai.W002`` (Warning): ElevenLabs sem credencial — TTS primário
  indisponível (MiniMax fallback pode assumir).
- ``ai.W003`` (Warning): Google Vision sem credencial — OCR indisponível.

Os E* TRAVAM o ``manage.py`` (padrão Evolution/Asaas). W* só AVISAM.

Em modo de teste (``settings.TESTING = True``), os E* viram W* — os
testes rodam com credenciais mocaadas e o engine não deve quebrar
``manage.py test`` por causa de config ausente.
"""

from django.conf import settings
from django.core.checks import Error, Warning


def _ia_setting(name: str, suffix: str) -> str:
    return str(getattr(settings, f"{name}_{suffix}", "") or "").strip()


def _is_testing() -> bool:
    return bool(getattr(settings, "TESTING", False))


def check_ai(app_configs, **kwargs):
    errors = []
    testing = _is_testing()

    enabled = providers_enabled()
    chain = fallback_chain_raw()

    if not enabled:
        msg = (
            "Nenhum provider de IA configurado — o engine LLM não fala "
            "com nenhuma IA."
        )
        hint = (
            "No .env: IA_ENABLED_OMNIROUTER=true + IA_OMNIROUTER_BASE_URL + "
            "IA_OMNIROUTER_API_KEY."
        )
        if testing:
            errors.append(Warning(msg, hint=hint, id="ai.E001"))
        else:
            errors.append(Error(msg, hint=hint, id="ai.E001"))

    for provider in enabled:
        api_key = _ia_setting(f"IA_{provider.upper()}", "API_KEY")
        base_url = _ia_setting(f"IA_{provider.upper()}", "BASE_URL")
        if not api_key or not base_url:
            msg = (
                f"Provider {provider!r} habilitado mas sem credencial completa "
                f"(IA_{provider.upper()}_API_KEY / IA_{provider.upper()}_BASE_URL)."
            )
            hint = (
                f"Preencha IA_{provider.upper()}_API_KEY e "
                f"IA_{provider.upper()}_BASE_URL no .env."
            )
            if testing:
                errors.append(Warning(msg, hint=hint, id="ai.E002"))
            else:
                errors.append(Error(msg, hint=hint, id="ai.E002"))

    # Modalidades de mídia — opcionais: avisam (não travam) se a key faltar.
    if not str(getattr(settings, "GEMINI_API_KEY", "") or "").strip():
        errors.append(
            Warning(
                "GEMINI_API_KEY ausente — modalidade imagem/visão fica "
                "indisponível (as demais funcionam).",
                hint="Opcional: cole GEMINI_API_KEY=... no .env quando for usar.",
                id="ai.W001",
            )
        )
    if not str(getattr(settings, "ELEVENLABS_API_KEY", "") or "").strip():
        errors.append(
            Warning(
                "ELEVENLABS_API_KEY ausente — TTS primário fica indisponível "
                "(MiniMax fallback assume se configurado).",
                hint="Opcional: cole ELEVENLABS_API_KEY=... no .env quando for usar.",
                id="ai.W002",
            )
        )
    if not str(getattr(settings, "GOOGLE_VISION_API_KEY", "") or "").strip():
        errors.append(
            Warning(
                "GOOGLE_VISION_API_KEY ausente — modalidade OCR fica "
                "indisponível (as demais funcionam).",
                hint="Opcional: cole GOOGLE_VISION_API_KEY=... no .env quando for usar.",
                id="ai.W003",
            )
        )

    return errors


def providers_enabled() -> list[str]:
    """Mirror leve de ``providers.enabled_providers()`` — evita import cíclico
    no check (o check roda no boot antes de tudo)."""
    from .providers import enabled_providers

    return enabled_providers()


def fallback_chain_raw() -> list[tuple[str, str]]:
    """Mirror leve de ``providers.fallback_chain()`` — mesma razão."""
    from .providers import fallback_chain

    return fallback_chain()
