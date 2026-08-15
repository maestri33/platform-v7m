"""Cadeia de TTS — um provedor sem crédito não pode matar o canal de voz."""

import pytest
from asgiref.sync import async_to_sync

from tts.client import TtsClient, TtsUnavailable, chain, voice_for_gender


def test_cadeia_le_a_configuracao(settings):
    settings.TTS_CHAIN = "a/m1|vozM|vozF, b/m2|xM|xF"
    opcoes = chain()
    assert [o.model for o in opcoes] == ["a/m1", "b/m2"]
    assert opcoes[0].voice_for("M") == "vozM"
    assert opcoes[0].voice_for("F") == "vozF"


def test_cadeia_vazia_cai_no_default(settings):
    settings.TTS_CHAIN = ""
    assert chain()[0].model.startswith("minimax/")


def test_regra_cruzada_preservada(settings):
    """M recebe voz feminina; F recebe voz masculina."""
    settings.TTS_CHAIN = ""
    assert voice_for_gender("M") == "Portuguese_SereneWoman"
    assert voice_for_gender("F") == "Portuguese_GentleTeacher"


def test_cai_para_o_segundo_provedor_quando_o_primeiro_falha(settings, monkeypatch):
    settings.TTS_CHAIN = "sem-credito/m|vm|vf, funciona/m|vm2|vf2"
    chamados = []

    async def _one(self, model, text, voice):
        chamados.append(model)
        if model.startswith("sem-credito"):
            raise RuntimeError("Token Plan usage limit reached")
        return b"audio-bytes"

    monkeypatch.setattr(TtsClient, "_one", _one)
    assert async_to_sync(TtsClient().synthesize)("oi", gender="M") == b"audio-bytes"
    assert chamados == ["sem-credito/m", "funciona/m"]


def test_todos_falhando_levanta_com_o_motivo_de_cada_um(settings, monkeypatch):
    settings.TTS_CHAIN = "a/m|v|v, b/m|v|v"

    async def _one(self, model, text, voice):
        raise RuntimeError(f"{model} sem credito")

    monkeypatch.setattr(TtsClient, "_one", _one)
    with pytest.raises(TtsUnavailable) as exc:
        async_to_sync(TtsClient().synthesize)("oi")
    assert "a/m" in str(exc.value) and "b/m" in str(exc.value)


def test_voz_da_conta_so_vale_para_o_primeiro_elo(settings, monkeypatch):
    """Id de voz é específico do provedor: reusar no fallback só geraria outro erro."""
    settings.TTS_CHAIN = "a/m|padraoM|padraoF, b/m|bM|bF"
    vistos = []

    async def _one(self, model, text, voice):
        vistos.append((model, voice))
        if model.startswith("a/"):
            raise RuntimeError("fora")
        return b"ok"

    monkeypatch.setattr(TtsClient, "_one", _one)
    async_to_sync(TtsClient().synthesize)("oi", "voz-da-conta", gender="M")
    assert vistos == [("a/m", "voz-da-conta"), ("b/m", "bM")]
