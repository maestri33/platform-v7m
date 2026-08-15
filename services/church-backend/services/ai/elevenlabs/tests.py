"""Testes da integração ElevenLabs."""

import base64
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from services.ai.elevenlabs.services.generation import generate_tts_audio


class _FakeRawResponse:
    def __init__(self, *, body, request_id, character_count):
        self.headers = {
            "request-id": request_id,
            "x-character-count": str(character_count),
        }
        self.data = [body]

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


class _FakeRawTextToSpeech:
    def __init__(self):
        self.calls = []

    def convert(
        self,
        *,
        text,
        voice_id,
        model_id,
        language_code=None,
        output_format,
        voice_settings=None,
        previous_text=None,
        next_text=None,
        apply_text_normalization,
    ):
        index = len(self.calls) + 1
        body = f"audio-{index}".encode("ascii")
        self.calls.append(
            {
                "text": text,
                "voice_id": voice_id,
                "model_id": model_id,
                "language_code": language_code,
                "output_format": output_format,
                "voice_settings": voice_settings.__dict__ if voice_settings is not None else None,
                "previous_text": previous_text,
                "next_text": next_text,
                "apply_text_normalization": apply_text_normalization,
            }
        )
        return _FakeRawResponse(body=body, request_id=f"req-{index}", character_count=len(text))


class _FakeTextToSpeech:
    def __init__(self):
        self.with_raw_response = _FakeRawTextToSpeech()


class _FakeClient:
    def __init__(self):
        self.text_to_speech = _FakeTextToSpeech()


class ElevenLabsGenerationTests(SimpleTestCase):
    @override_settings(
        ELEVENLABS_API_KEY="test-key",
        ELEVENLABS_VOICE_ID="voice-123",
        ELEVENLABS_MODEL_ID="eleven_v3",
        ELEVENLABS_LANGUAGE_CODE="pt",
        ELEVENLABS_OUTPUT_FORMAT="mp3_44100_128",
        ELEVENLABS_CONTEXT_PROFILE="",
        ELEVENLABS_V3_PREFIX_TAGS="",
        ELEVENLABS_VOICE_STABILITY=None,
        ELEVENLABS_VOICE_SIMILARITY_BOOST=None,
        ELEVENLABS_VOICE_STYLE=None,
        ELEVENLABS_VOICE_SPEED=None,
        ELEVENLABS_VOICE_USE_SPEAKER_BOOST=None,
        APP_BASE_URL="http://localhost:8000",
        MEDIA_URL="/media/",
    )
    @patch("services.ai.elevenlabs.services.generation._create_tts_log", return_value="log-1")
    @patch("services.ai.elevenlabs.services.generation.get_elevenlabs_client")
    def test_generate_tts_audio_uses_eleven_v3_by_default(self, mocked_client_factory, mocked_log):
        fake_client = _FakeClient()
        mocked_client_factory.return_value = fake_client

        with TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                response = generate_tts_audio(text="Mensagem curta para audio.")

        self.assertTrue(response.success)
        self.assertEqual(response.data.model, "eleven_v3")
        self.assertEqual(len(fake_client.text_to_speech.with_raw_response.calls), 1)
        self.assertEqual(
            fake_client.text_to_speech.with_raw_response.calls[0],
            {
                "text": "Mensagem curta para audio.",
                "voice_id": "voice-123",
                "model_id": "eleven_v3",
                "language_code": "pt",
                "output_format": "mp3_44100_128",
                "voice_settings": None,
                "previous_text": None,
                "next_text": None,
                "apply_text_normalization": "auto",
            },
        )
        self.assertTrue(response.data.audio_path.endswith(".mp3"))
        self.assertEqual(response.data.audio_base64, base64.b64encode(b"audio-1").decode("ascii"))
        mocked_log.assert_called_once()

    @override_settings(
        ELEVENLABS_API_KEY="test-key",
        ELEVENLABS_VOICE_ID="voice-123",
        ELEVENLABS_MODEL_ID="eleven_v3",
        ELEVENLABS_LANGUAGE_CODE="pt",
        ELEVENLABS_OUTPUT_FORMAT="mp3_44100_128",
        ELEVENLABS_CONTEXT_PROFILE="",
        ELEVENLABS_V3_PREFIX_TAGS="",
        APP_BASE_URL="http://localhost:8000",
        MEDIA_URL="/media/",
    )
    @patch("services.ai.elevenlabs.services.generation._create_tts_log", return_value="log-2")
    @patch("services.ai.elevenlabs.services.generation.get_elevenlabs_client")
    def test_generate_tts_audio_splits_long_text_for_eleven_v3(self, mocked_client_factory, mocked_log):
        fake_client = _FakeClient()
        mocked_client_factory.return_value = fake_client
        long_text = ("A" * 3000) + "\n\n" + ("B" * 3000)

        with TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                response = generate_tts_audio(text=long_text)

        self.assertTrue(response.success)
        self.assertEqual(response.data.model, "eleven_v3")
        self.assertEqual(len(fake_client.text_to_speech.with_raw_response.calls), 2)
        self.assertEqual(fake_client.text_to_speech.with_raw_response.calls[0]["text"], "A" * 3000)
        self.assertEqual(fake_client.text_to_speech.with_raw_response.calls[1]["text"], "B" * 3000)
        self.assertEqual(fake_client.text_to_speech.with_raw_response.calls[0]["language_code"], "pt")
        self.assertIsNone(fake_client.text_to_speech.with_raw_response.calls[0]["previous_text"])
        self.assertEqual(fake_client.text_to_speech.with_raw_response.calls[0]["next_text"], "B" * 3000)
        self.assertEqual(fake_client.text_to_speech.with_raw_response.calls[1]["previous_text"], "A" * 3000)
        self.assertIsNone(fake_client.text_to_speech.with_raw_response.calls[1]["next_text"])
        self.assertEqual(
            response.data.audio_base64,
            base64.b64encode(b"audio-1audio-2").decode("ascii"),
        )
        mocked_log.assert_called_once()

    @override_settings(
        ELEVENLABS_API_KEY="test-key",
        ELEVENLABS_VOICE_ID="voice-123",
        ELEVENLABS_MODEL_ID="eleven_v3",
        ELEVENLABS_LANGUAGE_CODE="pt",
        ELEVENLABS_OUTPUT_FORMAT="mp3_44100_128",
        ELEVENLABS_CONTEXT_PROFILE="",
        ELEVENLABS_V3_PREFIX_TAGS="",
        ELEVENLABS_VOICE_STABILITY=0.45,
        ELEVENLABS_VOICE_SIMILARITY_BOOST=0.8,
        ELEVENLABS_VOICE_STYLE=0.15,
        ELEVENLABS_VOICE_SPEED=1.0,
        ELEVENLABS_VOICE_USE_SPEAKER_BOOST=True,
        APP_BASE_URL="http://localhost:8000",
        MEDIA_URL="/media/",
    )
    @patch("services.ai.elevenlabs.services.generation._create_tts_log", return_value="log-settings")
    @patch("services.ai.elevenlabs.services.generation.get_elevenlabs_client")
    def test_generate_tts_audio_applies_voice_settings_from_settings(self, mocked_client_factory, mocked_log):
        fake_client = _FakeClient()
        mocked_client_factory.return_value = fake_client

        with TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                response = generate_tts_audio(text="Mensagem com voice settings.")

        self.assertTrue(response.success)
        self.assertEqual(
            fake_client.text_to_speech.with_raw_response.calls[0]["voice_settings"],
            {
                "stability": 0.45,
                "use_speaker_boost": True,
                "similarity_boost": 0.8,
                "style": 0.15,
                "speed": 1.0,
            },
        )
        self.assertEqual(fake_client.text_to_speech.with_raw_response.calls[0]["language_code"], "pt")
        mocked_log.assert_called_once()

    @override_settings(
        ELEVENLABS_API_KEY="test-key",
        ELEVENLABS_VOICE_ID="voice-123",
        ELEVENLABS_MODEL_ID="eleven_v3",
        ELEVENLABS_LANGUAGE_CODE="pt",
        ELEVENLABS_OUTPUT_FORMAT="mp3_44100_128",
        ELEVENLABS_CONTEXT_PROFILE="",
        ELEVENLABS_V3_PREFIX_TAGS="",
        APP_BASE_URL="http://localhost:8000",
        MEDIA_URL="/media/",
    )
    @patch("services.ai.elevenlabs.services.generation._create_tts_log", return_value="log-override")
    @patch("services.ai.elevenlabs.services.generation.get_elevenlabs_client")
    def test_generate_tts_audio_allows_voice_settings_override(self, mocked_client_factory, mocked_log):
        fake_client = _FakeClient()
        mocked_client_factory.return_value = fake_client

        with TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                response = generate_tts_audio(
                    text="Mensagem com override.",
                    voice_settings={
                        "stability": 0.2,
                        "similarity_boost": 0.9,
                        "style": 0.05,
                        "speed": 1.1,
                        "use_speaker_boost": False,
                    },
                )

        self.assertTrue(response.success)
        self.assertEqual(
            fake_client.text_to_speech.with_raw_response.calls[0]["voice_settings"],
            {
                "stability": 0.2,
                "use_speaker_boost": False,
                "similarity_boost": 0.9,
                "style": 0.05,
                "speed": 1.1,
            },
        )
        self.assertEqual(fake_client.text_to_speech.with_raw_response.calls[0]["language_code"], "pt")
        mocked_log.assert_called_once()

    @override_settings(
        ELEVENLABS_API_KEY="test-key",
        ELEVENLABS_VOICE_ID="voice-123",
        ELEVENLABS_MODEL_ID="eleven_v3",
        ELEVENLABS_LANGUAGE_CODE="pt",
        ELEVENLABS_OUTPUT_FORMAT="mp3_44100_128",
        ELEVENLABS_CONTEXT_PROFILE="church_brazil_male",
        ELEVENLABS_V3_PREFIX_TAGS="[warmly] [thoughtful]",
        APP_BASE_URL="http://localhost:8000",
        MEDIA_URL="/media/",
    )
    @patch("services.ai.elevenlabs.services.generation._create_tts_log", return_value="log-context")
    @patch("services.ai.elevenlabs.services.generation.get_elevenlabs_client")
    def test_generate_tts_audio_enhances_text_for_church_context(self, mocked_client_factory, mocked_log):
        fake_client = _FakeClient()
        mocked_client_factory.return_value = fake_client

        with TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                response = generate_tts_audio(
                    text="Olá, seja muito bem-vindo à nossa igreja. Estamos felizes com a sua presença.",
                    context={"title": "Boas-vindas"},
                )

        self.assertTrue(response.success)
        self.assertEqual(
            fake_client.text_to_speech.with_raw_response.calls[0]["text"],
            "[warmly] [thoughtful] Olá... seja muito bem-vindo à nossa igreja. ... Estamos felizes com a sua presença.",
        )
        mocked_log.assert_called_once()

    @override_settings(
        ELEVENLABS_API_KEY="test-key",
        ELEVENLABS_VOICE_ID="voice-123",
        ELEVENLABS_MODEL_ID="eleven_v3",
        ELEVENLABS_LANGUAGE_CODE="pt",
        ELEVENLABS_OUTPUT_FORMAT="wav_44100",
        ELEVENLABS_CONTEXT_PROFILE="",
        ELEVENLABS_V3_PREFIX_TAGS="",
        APP_BASE_URL="http://localhost:8000",
        MEDIA_URL="/media/",
    )
    @patch("services.ai.elevenlabs.services.generation._create_tts_log", return_value="log-3")
    @patch("services.ai.elevenlabs.services.generation.get_elevenlabs_client")
    def test_generate_tts_audio_returns_error_for_non_mp3_chunk_merge(self, mocked_client_factory, mocked_log):
        fake_client = _FakeClient()
        mocked_client_factory.return_value = fake_client
        long_text = ("A" * 3000) + "\n\n" + ("B" * 3000)

        with TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                response = generate_tts_audio(text=long_text)

        self.assertFalse(response.success)
        self.assertIn("merge automatico", response.error)
        self.assertEqual(response.data.model, "eleven_v3")
        self.assertEqual(len(fake_client.text_to_speech.with_raw_response.calls), 2)
        mocked_log.assert_called_once()
