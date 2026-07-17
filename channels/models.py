"""Canais por conta — WhatsApp (Evolution), Mail (SMTP), TTS voices."""

from django.db import models


class WhatsAppNumber(models.Model):
    account = models.ForeignKey(
        "accounts.Account", on_delete=models.CASCADE, related_name="whatsapp_numbers"
    )
    instance_name = models.CharField(max_length=100)  # nome na Evolution
    driver = models.CharField(
        max_length=20,
        default="evolution-v2",
        choices=[("evolution-v2", "Evolution v2"), ("evolution-go", "Evolution Go")],
    )
    slug = models.SlugField()
    is_default = models.BooleanField(default=False)
    connection_status = models.CharField(max_length=20, default="unknown")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("account", "slug")

    def __str__(self):
        return f"{self.account.slug}/{self.slug} ({self.instance_name})"


class MailIdentity(models.Model):
    account = models.ForeignKey(
        "accounts.Account", on_delete=models.CASCADE, related_name="mail_identities"
    )
    smtp_host = models.CharField(max_length=200)
    smtp_port = models.IntegerField(default=587)
    smtp_user = models.CharField(max_length=200)
    smtp_password = models.CharField(max_length=500)  # Fernet-encrypted
    from_name = models.CharField(max_length=100)
    from_email = models.EmailField()
    timeout = models.IntegerField(default=10)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.account.slug}/{self.from_email}"


class TtsVoices(models.Model):
    """Vozes TTS por conta — regra CRUZADA (Victor): homem recebe voz feminina e vice-versa."""

    account = models.ForeignKey(
        "accounts.Account", on_delete=models.CASCADE, related_name="tts_voices"
    )
    voice_male = models.CharField(
        max_length=100,
        help_text="Voice ID que o HOMEM recebe (voz feminina — regra cruzada).",
    )
    voice_female = models.CharField(
        max_length=100,
        help_text="Voice ID que a MULHER recebe (voz masculina — regra cruzada).",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.account.slug} TTS voices"

    def voice_for_gender(self, gender: str | None) -> str | None:
        """M/F → voice ID (cruzado). None → None (caller usa default)."""
        if gender == "M":
            return self.voice_male
        if gender == "F":
            return self.voice_female
        return None
