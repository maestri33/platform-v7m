"""Account + ApiKey — o tenant do notify-server."""

import hashlib

from django.db import models


class Account(models.Model):
    slug = models.SlugField(unique=True)  # "default", "supletivo", "outro-app"
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    # IA-first: o conteúdo recebido é adaptado por canal ANTES do despacho
    # (fail-open — OmniRouter fora = envia o original). Ver ai/adapt.py.
    ai_adapt = models.BooleanField(
        default=True, help_text="Adaptar conteúdo por canal com IA no pipeline (fail-open)."
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.slug


class ApiKey(models.Model):
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name="api_keys")
    key_hash = models.CharField(max_length=64, unique=True)  # sha256 hex
    label = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.account.slug}/{self.label}"

    @staticmethod
    def hash_key(raw: str) -> str:
        return hashlib.sha256(raw.encode()).hexdigest()
