"""Valida integracoes reais de Groq, Gemini e ElevenLabs."""

from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from PIL import Image

from services.ai.elevenlabs.services import generate_tts_audio
from services.ai.gemini.services import edit_image_from_prompt, generate_image_from_prompt
from services.ai.groq import analyze_image


class Command(BaseCommand):
    help = "Executa verificacoes reais das integracoes de IA configuradas no projeto."

    def handle(self, *args, **options):
        source_image = Path("media/tests/verify-ai-source.png")
        source_image.parent.mkdir(parents=True, exist_ok=True)
        Image.new("RGB", (64, 64), "white").save(source_image)

        checks = [
            (
                "Groq vision",
                lambda: analyze_image(
                    str(source_image),
                    "Responda em portugues e de forma objetiva o que existe na imagem.",
                ),
            ),
            (
                "Gemini image generation",
                lambda: generate_image_from_prompt(
                    prompt="Um quadrado azul minimalista em fundo branco",
                ),
            ),
            (
                "Gemini image editing",
                lambda: edit_image_from_prompt(
                    image_path=str(source_image),
                    prompt="Troque a imagem para azul e mantenha um estilo minimalista.",
                ),
            ),
            (
                "ElevenLabs TTS",
                lambda: generate_tts_audio(
                    text="Teste curto de audio para validar a integracao ElevenLabs.",
                ),
            ),
        ]

        failures = []
        for label, runner in checks:
            self.stdout.write(self.style.NOTICE(f"[start] {label}"))
            result = runner()
            if not result:
                failures.append(f"{label}: {result.error}")
                self.stdout.write(self.style.ERROR(f"[fail] {label}: {result.error}"))
                continue

            payload = result.data
            summary = []
            for attr in ("model", "image_path", "audio_path", "log_id"):
                value = getattr(payload, attr, "")
                if value:
                    summary.append(f"{attr}={value}")
            if not summary and hasattr(payload, "response_text"):
                response_text = getattr(payload, "response_text", "") or ""
                if response_text:
                    summary.append(f"response={response_text[:120]}")
            self.stdout.write(self.style.SUCCESS(f"[ok] {label} {' '.join(summary)}".strip()))

        if failures:
            raise CommandError(" ; ".join(failures))
