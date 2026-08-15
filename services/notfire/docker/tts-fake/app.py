"""TTS fake — server de mentira pro OmniRoute, só pra teste local.

Dev environment. Retorna um MP3 silencioso curto (7KB) independente do input.
Aceita a mesma shape de POST que o OmniRoute real:
  POST /v1/audio/speech
  Body: {"model": "...", "input": "...", "voice": "..."}
  Auth: Bearer <OMNIROUTER_API_KEY> (opcional aqui, mas validado se setado)
"""
from __future__ import annotations

import base64
import logging
import os
from pathlib import Path

from flask import Flask, jsonify, request, Response

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("tts-fake")

API_KEY = os.environ.get("OMNIROUTER_API_KEY", "")

# MP3 silencioso embedado — gerado uma vez e cacheado em disco
_MP3_PATH = Path(__file__).parent / "silence.mp3"
_B64_PATH = Path(__file__).parent / "silence.mp3.b64"


def _load_mp3() -> bytes:
    """Carrega o MP3 silencioso (decodifica base64 só na primeira chamada)."""
    if _MP3_PATH.exists():
        return _MP3_PATH.read_bytes()
    if _B64_PATH.exists():
        data = base64.b64decode(_B64_PATH.read_text())
        _MP3_PATH.write_bytes(data)
        return data
    # Fallback ridículo: nada. Vai dar 500.
    raise RuntimeError("silence.mp3.b64 não encontrado")


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "tts-fake"})


@app.route("/v1/audio/speech", methods=["POST"])
def speech():
    if API_KEY:
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            log.warning("missing bearer")
            return jsonify({"error": "missing_bearer"}), 401
        token = auth.removeprefix("Bearer ").strip()
        if token != API_KEY:
            log.warning("invalid api key: %s", token[:8])
            return jsonify({"error": "invalid_api_key"}), 401

    body = request.get_json(silent=True) or {}
    text = body.get("input", "")
    voice = body.get("voice", "")
    model = body.get("model", "")
    log.info("tts-fake: model=%s voice=%s input_len=%d", model, voice, len(text))

    try:
        mp3 = _load_mp3()
    except Exception as exc:
        log.exception("failed to load mp3")
        return jsonify({"error": "no_audio_payload", "detail": str(exc)}), 500

    return Response(
        mp3,
        status=200,
        mimetype="audio/mpeg",
        headers={
            "Content-Disposition": "attachment; filename=speech.mp3",
            "X-Tts-Fake-Voice": voice,
        },
    )


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    log.info("tts-fake listening on :%d (api_key_set=%s)", port, bool(API_KEY))
    app.run(host="0.0.0.0", port=port, debug=False)
