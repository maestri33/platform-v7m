"""Testes simulados da integração Gemini."""

from pathlib import Path
from unittest.mock import patch

from django.conf import settings
from django.test import TestCase
from PIL import Image

from services.ai.gemini.models import GeminiImageLog
from services.ai.gemini.services import edit_image_from_prompt, generate_image_from_prompt


class FakeResponse:
    def __init__(self, image):
        import base64
        from io import BytesIO

        buf = BytesIO()
        image.save(buf, format="JPEG")
        self.payload = {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {
                                "inlineData": {
                                    "mimeType": "image/jpeg",
                                    "data": base64.b64encode(buf.getvalue()).decode("ascii"),
                                }
                            }
                        ]
                    }
                }
            ]
        }


class GeminiServicesTests(TestCase):
    """Valida interface pública do Gemini com mocks."""

    @patch("services.ai.gemini.services.generation.get_gemini_client")
    def test_generate_image_from_prompt_returns_standardized_payload(
        self,
        mocked_client_factory,
    ):
        mocked_client = mocked_client_factory.return_value
        mocked_client.generate_content.return_value = {
            "ok": True,
            "status_code": 200,
            "data": FakeResponse(Image.new("RGB", (10, 10), "white")).payload,
        }

        result = generate_image_from_prompt(prompt="Uma praça ao amanhecer")

        self.assertTrue(result.success)
        self.assertEqual(result.data.operation, "generate")
        self.assertEqual(result.data.prompt, "Uma praça ao amanhecer")
        self.assertTrue(result.data.image_path)
        self.assertTrue(result.data.image_url)
        self.assertEqual(GeminiImageLog.objects.count(), 1)

    @patch("services.ai.gemini.services.generation.get_gemini_client")
    def test_edit_image_from_prompt_returns_standardized_payload(
        self,
        mocked_client_factory,
    ):
        source_path = Path(settings.MEDIA_ROOT) / "tests/source.jpg"
        source_path.parent.mkdir(parents=True, exist_ok=True)
        Image.new("RGB", (10, 10), "blue").save(source_path)

        mocked_client = mocked_client_factory.return_value
        mocked_client.generate_content.return_value = {
            "ok": True,
            "status_code": 200,
            "data": FakeResponse(Image.new("RGB", (10, 10), "green")).payload,
        }

        result = edit_image_from_prompt(image_path=str(source_path), prompt="Trocar para verde")

        self.assertTrue(result.success)
        self.assertEqual(result.data.operation, "edit")
        self.assertTrue(result.data.image_path)

    @patch("services.ai.gemini.services.generation.get_gemini_client")
    def test_generate_image_from_prompt_logs_failures(
        self,
        mocked_client_factory,
    ):
        mocked_client_factory.side_effect = RuntimeError("Falha no provider")

        result = generate_image_from_prompt(prompt="Uma capa de livro futurista")

        self.assertFalse(result.success)
        self.assertEqual(result.data.operation, "generate")
        self.assertEqual(result.data.error, "Falha no provider")
        self.assertEqual(GeminiImageLog.objects.count(), 1)
