"""Account + ApiKey — o tenant do notify-server."""

import hashlib

from django.db import models

# 8 matizes espaçados em S/L constantes — atribuição por ordem de criação
# (id % 8), não por hash do slug: hash colide e gera vizinhos quase idênticos.
ACCOUNT_PALETTE = [
    "#4f7cff",  # azul
    "#00a884",  # verde-água
    "#e0a800",  # âmbar
    "#d9556b",  # framboesa
    "#8a63d2",  # violeta
    "#0fa3b1",  # ciano
    "#c96f3b",  # cobre
    "#5f8a4c",  # oliva
]


class Account(models.Model):
    slug = models.SlugField(unique=True)  # "default", "supletivo", "outro-app"
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    # Identidade visual do tenant no dashboard: ponto na lista, borda e tint do
    # painel. Desvio de propósito dos verdes/vermelhos/amarelos de status para
    # cor de conta nunca parecer "estado do serviço".
    color = models.CharField(max_length=7, default="", blank=True)
    # Logo do app — exibida no WhatsApp (profile pic) e no header dos e-mails
    logo_url = models.CharField(max_length=500, blank=True, default="")
    # IA-first: o conteúdo recebido é adaptado por canal ANTES do despacho
    # (fail-open — OmniRouter fora = envia o original). Ver ai/adapt.py.
    ai_adapt = models.BooleanField(
        default=True, help_text="Adaptar conteúdo por canal com IA no pipeline (fail-open)."
    )
    # Configurações de IA da conta (OmniRouter / LLM)
    ai_url = models.CharField(
        max_length=500, blank=True, default="http://10.0.1.35/v1/chat/completions"
    )
    ai_api_key = models.CharField(
        max_length=500, blank=True, default="sk-d3786a77f7a483da-d7292e-5e7de527"
    )
    # Estado do assistente obrigatório de configuração (Wizard)
    is_setup_complete = models.BooleanField(default=False)
    setup_step = models.IntegerField(default=1)  # 1: WA, 2: Mail, 3: IA, 4: Logo, 5: Template, 6: Done
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        is_new = not self.pk
        if is_new and self.slug == "default":
            self.is_setup_complete = True
            self.setup_step = 6
        super().save(*args, **kwargs)
        if not self.color:
            self.color = ACCOUNT_PALETTE[self.pk % len(ACCOUNT_PALETTE)]
            super().save(update_fields=["color"])

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
