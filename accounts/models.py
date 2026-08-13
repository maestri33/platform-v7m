"""Account + ApiKey — o tenant do notify-server."""

import hashlib

from django.db import models


def account_logo_path(instance, filename):
    """Logo da conta vai pra media/account_logos/<slug>/<filename>."""
    return f"account_logos/{instance.slug}/{filename}"


class Account(models.Model):
    slug = models.SlugField(unique=True)  # "default", "supletivo", "outro-app"
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    logo = models.FileField(upload_to=account_logo_path, blank=True, null=True, help_text="Logo da marca. Use PNG ou SVG.")
    color_primary = models.CharField(max_length=7, blank=True, default="", help_text="Hex (#RRGGBB) usado nos templates de e-mail.")
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
