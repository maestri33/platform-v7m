"""Client de TTS — OmniRouter (10.1.30.35), OpenAI-compatible.

  POST /v1/audio/speech  {"model": "...", "input": "...", "voice": "..."} → bytes do áudio

**Por que existe uma cadeia e não um provedor só.** Em 2026-07-29 o TTS estava
fora — e não por bug nosso: o MiniMax respondia 502 "Token Plan usage limit
reached" e o ElevenLabs 401 "subscription has a failed or incomplete payment".
Um cliente de provedor único transforma um problema de fatura num canal morto e
num erro que não explica nada. Aqui a lista é tentada em ordem, e quando todos
falham o erro carrega o motivo de cada um — que é o que o painel mostra.

A cadeia vem de `TTS_CHAIN` (settings/.env), no formato:

    modelo|voz_para_M|voz_para_F , modelo|voz_para_M|voz_para_F

Vozes por gênero seguem a regra cruzada da casa: quem é M recebe voz feminina.
`TtsVoices` da conta, quando preenchido, tem precedência sobre a voz da cadeia
para o PRIMEIRO elo (as vozes são específicas de cada provedor; forçar o id do
MiniMax no Deepgram só geraria outro erro).
"""

from __future__ import annotations

from dataclasses import dataclass

import httpx
import structlog
from django.conf import settings

logger = structlog.get_logger()

OMNIROUTER_MODEL = "minimax/speech-2.8-hd"
DEFAULT_VOICE_FEMALE = "Portuguese_SereneWoman"
DEFAULT_VOICE_MALE = "Portuguese_GentleTeacher"

# Elo 1: MiniMax, o único com voz em português de verdade.
# Elo 2: Deepgram Aura 2 — sotaque estrangeiro, mas é voz saindo em vez de
# silêncio enquanto o crédito do MiniMax não volta.
DEFAULT_CHAIN = (
    f"{OMNIROUTER_MODEL}|{DEFAULT_VOICE_FEMALE}|{DEFAULT_VOICE_MALE},"
    "deepgram/aura-2-thalia-en|aura-2-thalia-en|aura-2-apollo-en"
)


class TtsError(Exception):
    def __init__(self, message: str, status_code: int = 0):
        self.status_code = status_code
        super().__init__(message)


class TtsUnavailable(TtsError):
    """Nenhum provedor da cadeia entregou áudio — motivo de cada um no texto."""


@dataclass(frozen=True)
class TtsOption:
    model: str
    voice_male: str    # voz que o destinatário M recebe (feminina — regra cruzada)
    voice_female: str  # voz que o destinatário F recebe (masculina)

    def voice_for(self, gender: str | None) -> str:
        return self.voice_female if gender == "F" else self.voice_male


def chain() -> list[TtsOption]:
    raw = getattr(settings, "TTS_CHAIN", "") or DEFAULT_CHAIN
    out: list[TtsOption] = []
    for item in raw.split(","):
        parts = [p.strip() for p in item.split("|")]
        if not parts or not parts[0]:
            continue
        model = parts[0]
        male = parts[1] if len(parts) > 1 and parts[1] else DEFAULT_VOICE_FEMALE
        female = parts[2] if len(parts) > 2 and parts[2] else DEFAULT_VOICE_MALE
        out.append(TtsOption(model=model, voice_male=male, voice_female=female))
    return out or [TtsOption(OMNIROUTER_MODEL, DEFAULT_VOICE_FEMALE, DEFAULT_VOICE_MALE)]


class TtsClient:
    """HTTP fino pro omnirouter, com cadeia de provedores."""

    def __init__(self, *, base_url: str | None = None, timeout: float = 60.0) -> None:
        self._base_url = (base_url or getattr(settings, "OMNIROUTER_URL", "")).rstrip("/")
        self._timeout = timeout

    def _headers(self) -> dict[str, str]:
        # UA próprio: o gateway penaliza "python-httpx" (ver ai/client._headers).
        headers = {"Content-Type": "application/json", "User-Agent": "notify-server/1.0"}
        key = getattr(settings, "OMNIROUTER_API_KEY", "")
        if key:
            headers["Authorization"] = f"Bearer {key}"
        return headers

    async def _one(self, model: str, text: str, voice: str) -> bytes:
        url = f"{self._base_url}/v1/audio/speech"
        payload = {"model": model, "input": text, "voice": voice}
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            resp = await client.post(url, json=payload, headers=self._headers())
        if resp.status_code >= 400:
            raise TtsError(f"{model}: {resp.text[:160]}", status_code=resp.status_code)
        if not resp.content:
            raise TtsError(f"{model}: resposta vazia", status_code=resp.status_code)
        return resp.content

    async def synthesize(
        self, text: str, voice: str | None = None, *, gender: str | None = None
    ) -> bytes:
        """Gera áudio. Tenta a cadeia inteira antes de desistir.

        `voice` (da conta) só vale para o primeiro elo: id de voz é específico de
        cada provedor.
        """
        motivos: list[str] = []
        for index, option in enumerate(chain()):
            escolhida = (voice or option.voice_for(gender)) if index == 0 else option.voice_for(gender)
            try:
                audio = await self._one(option.model, text, escolhida)
            except Exception as exc:  # noqa: BLE001
                motivos.append(f"{option.model}: {exc}"[:220])
                logger.warning("tts.provider_failed", model=option.model, error=str(exc)[:200])
                continue
            logger.info(
                "tts.synthesized", model=option.model, voice=escolhida,
                text_len=len(text), audio_bytes=len(audio), fallback=index > 0,
            )
            return audio
        raise TtsUnavailable("nenhum provedor de voz respondeu — " + " · ".join(motivos))


def voice_for_gender(gender: str | None) -> str:
    """Gender do DESTINATÁRIO → voz (regra CRUZADA: homem recebe voz feminina)."""
    first = chain()[0]
    return first.voice_for(gender)


def probe(text: str = "Teste de voz do notify.", gender: str | None = None) -> dict:
    """Diagnóstico para o painel: quem respondeu, quem falhou e por quê."""
    from asgiref.sync import async_to_sync

    client = TtsClient()
    resultados = []
    for option in chain():
        voz = option.voice_for(gender)
        try:
            audio = async_to_sync(client._one)(option.model, text, voz)
            resultados.append(
                {"model": option.model, "voice": voz, "ok": True, "bytes": len(audio)}
            )
            break
        except Exception as exc:  # noqa: BLE001
            resultados.append(
                {"model": option.model, "voice": voz, "ok": False, "erro": str(exc)[:240]}
            )
    return {"ok": any(r["ok"] for r in resultados), "tentativas": resultados}
