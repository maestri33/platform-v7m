"""Testes para transcrição de áudio (STT) e entrega de áudio direto."""

from __future__ import annotations

import httpx
import pytest
from django.test import override_settings

from ai import client as ai_client


def test_transcribe_success(monkeypatch):
    def _mock_post(url, files=None, data=None, headers=None, timeout=None):
        assert "/v1/audio/transcriptions" in url
        assert "file" in files
        assert data.get("model") == "whisper-1"
        return httpx.Response(200, json={"text": "Olá Victor, seu relatório está pronto."})

    monkeypatch.setattr(httpx, "post", _mock_post)
    text = ai_client.transcribe(b"fake-mp3-bytes", filename="audio.mp3", model="whisper-1")
    assert text == "Olá Victor, seu relatório está pronto."


def test_transcribe_missing_url():
    with override_settings(OMNIROUTER_URL=""):
        with pytest.raises(ai_client.AiError, match="OMNIROUTER_URL não configurada"):
            ai_client.transcribe(b"fake-bytes")


def test_transcribe_timeout(monkeypatch):
    def _mock_post(*a, **kw):
        raise httpx.TimeoutException("timeout")

    monkeypatch.setattr(httpx, "post", _mock_post)
    with pytest.raises(ai_client.AiUnavailable, match="não respondeu"):
        ai_client.transcribe(b"fake-bytes")


def test_omnirouter_test_endpoint(client, db):
    resp = client.post("/dashboard/omnirouter/test")
    assert resp.status_code == 200
    assert "OmniRouter" in resp.content.decode("utf-8")
