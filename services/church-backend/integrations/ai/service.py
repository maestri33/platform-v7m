"""Interface in-process do app ``ia`` — única superfície pública.

Os outros apps do monólito chamam ESTAS funções (nunca o client direto).
Cada função:
 1. caminha a **cadeia de fallback per-capability** ``(provider, model)``
    (providers.fallback_chain(capability)) — em falha retryável cai pro
    próximo; em erro de input/contrato (4xx) para e erra;
 2. **grava 1 ``AiCall`` por tentativa** (provider+model+status+tokens+
    latência) — auditoria/custo;
 3. devolve o resultado já no formato útil (str/dict/bytes).

Síncrono (não usa ``async_to_sync`` como o supletivo) — o IEADPG é todo
síncrono e casa com django/requests.

Operações:
- ``generate_text`` / ``generate_json`` / ``chat`` / ``summarize`` /
  ``extract`` — cadeia LLM OpenAI-compatible (``IA_TEXT_CHAIN``,
  default DeepSeek → MiniMax).
- ``tts`` — cadeia ``IA_TTS_CHAIN`` (default ElevenLabs → MiniMax). Voz
  masculina fixa (sem clone do dirigente — sem LGPD de biometria vocal).
- ``describe_image`` — cadeia ``IA_VISION_CHAIN`` (default MiniMax → Gemini).
- ``generate_image`` — cadeia ``IA_IMAGE_CHAIN`` (default MiniMax → Gemini).
- ``ocr`` — stub M1.7 (use ``describe_image`` na prática).
- ``grade`` — **NÃO portado** (domínio de educação, fora do escopo IEADPG).

Single source of truth: TROCAR DE PROVIDER = editar ``.env`` (chain CSV),
nunca editar este módulo. Quem chama o service não sabe (e nem deve saber)
qual provider está ativo.
"""

from __future__ import annotations

import json
import logging
import re
import time
import uuid
from pathlib import Path

from django.conf import settings

from . import providers
from .client import ChatResult, LLMClient, LLMClientError
from .models import AiCall

logger = logging.getLogger(__name__)

# Bloco de raciocínio de modelos thinking (<think>...</think>). Removemos
# antes de usar/parsear — robusto p/ qualquer modelo da cadeia.
_THINK_RE = re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE)


def _strip_think(text: str) -> str:
    """Remove blocos ``<think>...</think>`` (raciocínio) e apara."""
    return _THINK_RE.sub("", text or "").strip()


def is_retryable_error(exc: Exception) -> bool:
    """Helper: ``exc`` é retryable (rede/timeout/4xx-inesperado)?"""
    if isinstance(exc, LLMClientError):
        return exc.retryable
    return False


# ---------------------------------------------------------------------------
# Gravação de AiCall
# ---------------------------------------------------------------------------


def _record(
    *,
    operation: str,
    provider: str,
    model: str,
    caller: str,
    status: str,
    latency_ms: int,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    cache_hit_tokens: int = 0,
    cache_miss_tokens: int = 0,
    finish_reason: str = "",
    error_code: str = "",
    error_message: str = "",
    extra: dict | None = None,
) -> AiCall:
    """Grava uma linha ``AiCall`` com as métricas de UMA tentativa.

    ``cost`` fica NULL (tabela de preços não existe — não invento $$).
    """
    return AiCall.objects.create(
        provider=provider,
        operation=operation,
        model=model,
        caller=caller,
        status=status,
        prompt_tokens=prompt_tokens or 0,
        completion_tokens=completion_tokens or 0,
        cache_hit_tokens=cache_hit_tokens or 0,
        cache_miss_tokens=cache_miss_tokens or 0,
        cost=None,
        latency_ms=latency_ms,
        finish_reason=finish_reason or "",
        error_code=error_code or "",
        error_message=error_message or "",
        extra=extra,
    )


def _run_chain(
    *,
    operation: str,
    caller: str,
    attempt,
    chain: list[tuple[str, str]],
) -> tuple[ChatResult, str, str]:
    """Caminha a cadeia: cada ``(provider, model)`` é tentado, AiCall por
    tentativa gravado, para na 1ª que dá certo. Falha retryável => próximo;
    não-retryável (4xx) => levanta na hora. Cadeia esgotada => última falha.
    """
    last_err: Exception | None = None
    for provider, model in chain:
        try:
            client_cfg = providers.get_client(provider)
        except Exception as exc:  # config ausente — não-retryable
            _record(
                operation=operation,
                provider=provider,
                model=model,
                caller=caller,
                status=AiCall.Status.ERROR,
                latency_ms=0,
                error_code="config",
                error_message=str(exc)[:1000],
            )
            raise
        client = LLMClient(
            base_url=client_cfg["base_url"],
            api_key=client_cfg["api_key"],
        )
        started = time.monotonic()
        try:
            result: ChatResult = attempt(client, model)
        except LLMClientError as exc:
            latency = int((time.monotonic() - started) * 1000)
            _record(
                operation=operation,
                provider=provider,
                model=model,
                caller=caller,
                status=AiCall.Status.ERROR,
                latency_ms=latency,
                error_code=str(exc.status_code or "client_error"),
                error_message=str(exc)[:1000],
            )
            last_err = exc
            if exc.retryable:
                logger.warning(
                    "ai.fallback_next provider=%s model=%s reason=%s",
                    provider,
                    model,
                    str(exc)[:160],
                )
                continue
            raise
        except Exception as exc:
            latency = int((time.monotonic() - started) * 1000)
            _record(
                operation=operation,
                provider=provider,
                model=model,
                caller=caller,
                status=AiCall.Status.ERROR,
                latency_ms=latency,
                error_code="exception",
                error_message=str(exc)[:1000],
            )
            raise
        latency = int((time.monotonic() - started) * 1000)
        _record(
            operation=operation,
            provider=provider,
            model=model,
            caller=caller,
            status=AiCall.Status.SUCCESS,
            latency_ms=latency,
            prompt_tokens=result.prompt_tokens,
            completion_tokens=result.completion_tokens,
            cache_hit_tokens=result.cache_hit_tokens,
            cache_miss_tokens=result.cache_miss_tokens,
            finish_reason=result.finish_reason,
        )
        return result, provider, model
    if last_err is not None:
        raise last_err
    raise LLMClientError("IA_FALLBACK_CHAIN vazia", retryable=False)


# ---------------------------------------------------------------------------
# Capacidades genéricas (LLM — cadeia de fallback)
# ---------------------------------------------------------------------------


def generate_text(
    *,
    prompt: str,
    caller: str,
    model: str | None = None,
    system: str | None = None,
    temperature: float | None = None,
    max_tokens: int | None = None,
) -> str:
    """Gera texto natural. Devolve a string já limpa (sem bloco ``<think>``)."""

    def attempt(client, m):
        return client.text(
            prompt,
            model=m,
            system=system,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    result, _p, _m = _run_chain(
        operation=AiCall.Operation.TEXT,
        caller=caller,
        attempt=attempt,
        chain=providers.fallback_chain("text", model),
    )
    return _strip_think(result.text).strip('"')


def generate_json(
    *,
    prompt: str,
    caller: str,
    schema: dict | None = None,
    model: str | None = None,
    system: str | None = None,
    temperature: float | None = None,
    max_tokens: int | None = None,
) -> dict:
    """Gera JSON estruturado. Devolve o dict já parseado."""

    def attempt(client, m):
        return client.json(
            prompt,
            model=m,
            system=system,
            schema=schema,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    result, _p, _m = _run_chain(
        operation=AiCall.Operation.JSON,
        caller=caller,
        attempt=attempt,
        chain=providers.fallback_chain("text", model),
    )
    try:
        return json.loads(_strip_think(result.text))
    except json.JSONDecodeError as exc:
        raise LLMClientError(
            f"resposta não é JSON válido: {exc}", retryable=False
        ) from exc


def chat(
    *,
    messages: list[dict],
    caller: str,
    model: str | None = None,
    temperature: float | None = None,
    max_tokens: int | None = None,
) -> str:
    """Chat multi-turn. Devolve o conteúdo da resposta do assistente."""

    def attempt(client, m):
        return client.chat(
            messages,
            model=m,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    result, _p, _m = _run_chain(
        operation=AiCall.Operation.CHAT,
        caller=caller,
        attempt=attempt,
        chain=providers.fallback_chain("text", model),
    )
    return _strip_think(result.text)


def summarize(
    *,
    text: str,
    caller: str,
    kind: str = "paragraph",
    model: str | None = None,
) -> str:
    """Resume um texto. ``kind`` ∈ ``{paragraph, bullets, headline}``."""
    prompts = {
        "paragraph": "Resuma o texto em um unico paragrafo coeso e direto:",
        "bullets": "Resuma o texto em topicos com marcadores, um por linha:",
        "headline": "Resuma o texto em uma unica manchete impactante (max 120 chars):",
    }
    instruction = prompts.get(kind, prompts["paragraph"])
    full_prompt = f"{instruction}\n\n{text}"

    def attempt(client, m):
        return client.text(full_prompt, model=m, temperature=0.3)

    result, _p, _m = _run_chain(
        operation=AiCall.Operation.SUMMARIZE,
        caller=caller,
        attempt=attempt,
        chain=providers.fallback_chain("text", model),
    )
    return _strip_think(result.text)


def extract(
    *,
    text: str,
    schema: dict,
    caller: str,
    model: str | None = None,
) -> dict:
    """Extrai dados estruturados do texto conforme um JSON Schema."""

    def attempt(client, m):
        return client.json(
            text,
            model=m,
            schema=schema,
            temperature=0.1,
        )

    result, _p, _m = _run_chain(
        operation=AiCall.Operation.EXTRACT,
        caller=caller,
        attempt=attempt,
        chain=providers.fallback_chain("text", model),
    )
    try:
        return json.loads(_strip_think(result.text))
    except json.JSONDecodeError as exc:
        raise LLMClientError(
            f"resposta não é JSON válido na extração: {exc}",
            retryable=False,
        ) from exc


# ---------------------------------------------------------------------------
# Mídia — TTS tem fallback (ElevenLabs primário + MiniMax); demais são stubs M1.7
# ---------------------------------------------------------------------------


def _save_media(subdir: str, ext: str, data: bytes) -> str:
    """Salva bytes em ``MEDIA_ROOT/ai/<subdir>/<uuid>.<ext>``. Devolve o
    caminho RELATIVO ao MEDIA_ROOT (ex.: ``"ai/audio/abc.mp3"``)."""
    folder = Path(settings.MEDIA_ROOT) / "ai" / subdir
    folder.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}.{ext}"
    target = folder / name
    target.write_bytes(data)
    return f"ai/{subdir}/{name}"


def _media_call(
    *,
    operation: str,
    provider: str,
    model: str,
    caller: str,
    fn,
) -> bytes:
    """Roda uma chamada de mídia síncrona (``fn() -> bytes``), grava AiCall,
    devolve o resultado."""
    started = time.monotonic()
    try:
        result = fn()
    except Exception as exc:
        latency = int((time.monotonic() - started) * 1000)
        _record(
            operation=operation,
            provider=provider,
            model=model,
            caller=caller,
            status=AiCall.Status.ERROR,
            latency_ms=latency,
            error_code=type(exc).__name__,
            error_message=str(exc)[:1000],
        )
        raise
    latency = int((time.monotonic() - started) * 1000)
    _record(
        operation=operation,
        provider=provider,
        model=model,
        caller=caller,
        status=AiCall.Status.SUCCESS,
        latency_ms=latency,
    )
    return result


def _voice_for_gender(gender: str | None) -> str | None:
    """Voz do TTS pelo gênero do DESTINATÁRIO (regra cruzada do Victor).

    Homem recebe voz feminina (``ELEVENLABS_VOICE_MALE`` guarda o voice-id
    que o HOMEM recebe — feminino) e mulher recebe voz masculina
    (``ELEVENLABS_VOICE_FEMALE`` guarda o voice-id masculino). A inversão
    é de PROPÓSITO — NÃO "corrigir".
    """
    if not gender:
        return None
    g = gender.strip().upper()
    if g == "M":
        return str(getattr(settings, "ELEVENLABS_VOICE_MALE", "") or "") or None
    if g == "F":
        return str(getattr(settings, "ELEVENLABS_VOICE_FEMALE", "") or "") or None
    return None


def _minimax_voice_for_gender(gender: str | None) -> str | None:
    """Voz MiniMax pelo gênero do destinatário — CRUZADA (igual ElevenLabs).

    Destinatário HOMEM recebe voz FEMININA (``MINIMAX_VOICE_FEMALE``) e a
    MULHER recebe voz MASCULINA (``MINIMAX_VOICE_MALE``). Sem gênero =>
    feminina (padrão).
    """
    g = (gender or "").strip().upper()
    if g == "M":
        return str(getattr(settings, "MINIMAX_VOICE_FEMALE", "") or "") or None
    if g == "F":
        return str(getattr(settings, "MINIMAX_VOICE_MALE", "") or "") or None
    return str(getattr(settings, "MINIMAX_VOICE_FEMALE", "") or "") or None


def tts(
    *,
    text: str,
    caller: str,
    gender: str = "male",
    voice_id: str | None = None,
    model: str | None = None,
) -> dict:
    """TTS: gera áudio a partir do texto. Salva em ``media/ai/audio/``.

    Cadeia vem de ``settings.IA_TTS_CHAIN`` (default: ElevenLabs → MiniMax).
    Aplica fallback automático em erro retryable — sem hardcode de provider
    no código (single source of truth = .env). Voz masculina fixa — sem clone
    do dirigente nesta fase (sem LGPD de biometria vocal).

    Devolve ``{"audio_path": str, "audio_url": str, "duration_ms": int}``.
    ``duration_ms`` é 0 nesta fase (calcular exige ffprobe — M1.10).
    """
    from .elevenlabs import ElevenLabsClient, ElevenLabsError
    from .minimax import MiniMaxClient, MiniMaxError

    chain = providers.fallback_chain("tts", model)
    if not chain:
        raise LLMClientError("IA_TTS_CHAIN vazia", retryable=False)

    last_err: Exception | None = None
    started = time.monotonic()
    audio: bytes | None = None
    used_provider = ""
    used_model = ""
    for provider, m in chain:
        try:
            if provider == "elevenlabs":
                el_voice = voice_id or _voice_for_gender(gender)
                el_model = m or str(getattr(settings, "ELEVENLABS_MODEL_ID", "eleven_v3"))
                audio = _media_call(
                    operation=AiCall.Operation.TTS,
                    provider="elevenlabs",
                    model=el_model,
                    caller=caller,
                    fn=lambda: ElevenLabsClient().tts(
                        text, voice_id=el_voice, model_id=el_model
                    ),
                )
                used_provider, used_model = "elevenlabs", el_model
                break
            if provider == "minimax":
                mm_voice = voice_id or _minimax_voice_for_gender(gender)
                mm_model = m or str(
                    getattr(settings, "MINIMAX_TTS_MODEL", "speech-2.8-hd")
                )
                audio = _media_call(
                    operation=AiCall.Operation.TTS,
                    provider="minimax",
                    model=mm_model,
                    caller=caller,
                    fn=lambda: MiniMaxClient().tts(
                        text, voice_id=mm_voice, model=mm_model
                    ),
                )
                used_provider, used_model = "minimax", mm_model
                break
            # Provider desconhecido na chain — pula (config inválida).
            logger.warning("ai.tts_skip_unknown_provider=%s", provider)
            continue
        except (ElevenLabsError, MiniMaxError) as exc:
            logger.warning(
                "ai.tts_fallback provider=%s error=%s", provider, str(exc)[:160]
            )
            last_err = exc
            continue
    if audio is None:
        elapsed = int((time.monotonic() - started) * 1000)
        _record(
            operation=AiCall.Operation.TTS,
            provider=used_provider or (chain[-1][0] if chain else "unknown"),
            model=used_model or (chain[-1][1] if chain else "unknown"),
            caller=caller,
            status=AiCall.Status.ERROR,
            latency_ms=elapsed,
            error_code=type(last_err).__name__ if last_err else "no_provider",
            error_message=str(last_err)[:1000] if last_err else "IA_TTS_CHAIN vazia",
        )
        raise LLMClientError(
            f"TTS falhou em todos os providers da chain ({len(chain)}): "
            f"{last_err or 'chain vazia'}",
            retryable=False,
        )

    rel_path = _save_media("audio", "mp3", audio)
    audio_url = f"{getattr(settings, 'APP_BASE_URL', '')}{settings.MEDIA_URL}{rel_path}"
    return {
        "audio_path": rel_path,
        "audio_url": audio_url,
        "duration_ms": 0,
    }


def _describe_with(provider: str, model: str, image_path: str, prompt: str) -> str:
    """Provider-dispatch para ``describe_image``. Cada provider tem cliente próprio.

    Vision legado em ``services.ai.minimax.vision`` (provider primario
    desde 2026-06-23) já recebe bytes ou path — adaptamos a chamada para
    a interface existente.
    """
    import base64

    if provider == "minimax":
        from services.ai.minimax.vision import analyze_document_selfie_base64

        with open(image_path, "rb") as fh:
            image_base64 = base64.b64encode(fh.read()).decode("ascii")
        result = analyze_document_selfie_base64(
            image_base64=image_base64,
            filename=Path(image_path).name or "image.jpg",
        )
        if not getattr(result, "success", False):
            error = getattr(result, "error", None) or "MiniMax vision falhou"
            raise LLMClientError(str(error), retryable=True)
        data = getattr(result, "data", None) or {}
        if isinstance(data, dict):
            return (
                data.get("notes")
                or data.get("description")
                or data.get("text")
                or str(data)
            )
        return str(data)
    raise LLMClientError(
        f"provider {provider!r} não tem adapter de vision na nova surface",
        retryable=False,
    )


def describe_image(
    image_path: str,
    *,
    caller: str,
    prompt: str = "",
    model: str | None = None,
) -> str:
    """Visão: descreve uma imagem via cadeia ``IA_VISION_CHAIN``.

    Default: MiniMax → Gemini. App não conhece providers — single source of
    truth em ``.env`` (decisão 2026-06-24). ``caller`` é o módulo que pediu
    (vai pra ``AiCall.caller``).
    """
    chain = providers.fallback_chain("vision", model)
    if not chain:
        raise LLMClientError("IA_VISION_CHAIN vazia", retryable=False)
    last_err: Exception | None = None
    started = time.monotonic()
    for provider, m in chain:
        try:
            text = _describe_with(provider, m, image_path, prompt)
            latency = int((time.monotonic() - started) * 1000)
            _record(
                operation=AiCall.Operation.VISION,
                provider=provider,
                model=m,
                caller=caller,
                status=AiCall.Status.SUCCESS,
                latency_ms=latency,
            )
            return _strip_think(text)
        except Exception as exc:
            latency = int((time.monotonic() - started) * 1000)
            _record(
                operation=AiCall.Operation.VISION,
                provider=provider,
                model=m,
                caller=caller,
                status=AiCall.Status.ERROR,
                latency_ms=latency,
                error_code=type(exc).__name__,
                error_message=str(exc)[:1000],
            )
            # Provider de visão não tem fallback automático de exception
            # type — quem configura a chain assume o risco. Subimos pra
            # evitar mascarar bug de contrato.
            raise
    raise LLMClientError("IA_VISION_CHAIN vazia após iteração", retryable=False)


def _generate_with(provider: str, model: str, prompt: str) -> bytes:
    """Provider-dispatch para ``generate_image``.

    Gemini legado (``services.ai.gemini.services.generation.generate_image_from_prompt``)
    já retorna ``ServiceResponse`` com path da imagem em disco; lemos os bytes.
    """
    if provider == "gemini":
        from services.ai.gemini.services.generation import (
            generate_image_from_prompt,
        )

        result = generate_image_from_prompt(prompt=prompt, model=model)
        if not getattr(result, "success", False):
            raise LLMClientError(
                getattr(result, "error", None) or "Gemini generate_image falhou",
                retryable=True,
            )
        data = getattr(result, "data", None) or {}
        rel_path = data.get("saved_path") or data.get("rel_path") or ""
        if not rel_path:
            raise LLMClientError(
                "Gemini retornou sem path de imagem", retryable=False
            )
        abs_path = Path(settings.MEDIA_ROOT) / rel_path
        return abs_path.read_bytes()
    raise LLMClientError(
        f"provider {provider!r} não tem adapter de image generation na nova surface",
        retryable=False,
    )


def generate_image(
    *,
    prompt: str,
    caller: str,
    model: str | None = None,
) -> bytes:
    """Geração de imagem via cadeia ``IA_IMAGE_CHAIN``.

    Default: MiniMax → Gemini. Salva em ``media/ai/image/`` e devolve bytes
    (caller grava no destino final se quiser).
    """
    chain = providers.fallback_chain("image", model)
    if not chain:
        raise LLMClientError("IA_IMAGE_CHAIN vazia", retryable=False)
    last_err: Exception | None = None
    started = time.monotonic()
    for provider, m in chain:
        try:
            data = _generate_with(provider, m, prompt)
            latency = int((time.monotonic() - started) * 1000)
            _record(
                operation=AiCall.Operation.IMAGE,
                provider=provider,
                model=m,
                caller=caller,
                status=AiCall.Status.SUCCESS,
                latency_ms=latency,
            )
            return data
        except Exception as exc:
            latency = int((time.monotonic() - started) * 1000)
            _record(
                operation=AiCall.Operation.IMAGE,
                provider=provider,
                model=m,
                caller=caller,
                status=AiCall.Status.ERROR,
                latency_ms=latency,
                error_code=type(exc).__name__,
                error_message=str(exc)[:1000],
            )
            last_err = exc
            continue
    raise LLMClientError(
        f"image generation falhou em todos os providers: {last_err}",
        retryable=False,
    )


def ocr(
    image_path: str,
    *,
    caller: str,
    model: str | None = None,
) -> str:
    """OCR: stub. Sem credencial Google Vision configurada por padrão.
    Mantido como stub até M1.10 — a ``IA_VISION_CHAIN`` (MiniMax) já lê
    texto de imagens na prática, então OCR dedicado não é prioridade agora.
    """
    raise NotImplementedError(
        "integrations.ai.service.ocr stub M1.7 — "
        "use integrations.ai.service.describe_image para extrair texto de imagens"
    )
