"""Canais por conta — WhatsApp (Evolution), Mail (SMTP)."""

from django.db import models


DRIVER_GO = "evolution-go"
DRIVER_CHOICES = [(DRIVER_GO, "Evolution Go")]


class WhatsAppNumber(models.Model):
    """Um número de WhatsApp de uma conta, com instância na Evolution GO.

    A GO é o único provedor (v2 aposentada em 2026-08-18). Os campos de cadeia
    (`driver`/`fallback_driver`) ficam de pé pelo desenho — hoje a cadeia é um
    caminho só, mas um segundo provedor futuro reaproveita a maquinaria de
    fallback da cascata.
    """

    account = models.ForeignKey(
        "accounts.Account", on_delete=models.CASCADE, related_name="whatsapp_numbers"
    )
    instance_name = models.CharField(max_length=100)  # nome na Evolution GO
    phone_number = models.CharField(
        max_length=20,
        blank=True,
        default="",
        help_text="E.164 sem '+', ex.: 554220181533. Dono da instância.",
    )
    driver = models.CharField(max_length=20, default=DRIVER_GO, choices=DRIVER_CHOICES)
    fallback_driver = models.CharField(
        max_length=20,
        blank=True,
        default="",
        choices=DRIVER_CHOICES,
        help_text="Para onde cair quando a sessão do driver preferido estiver fora. Vazio = sem fallback.",
    )
    go_token = models.CharField(
        max_length=500,
        blank=True,
        default="",
        help_text="Token da instância na Evolution GO (Fernet). Vazio = usa a key global.",
    )
    slug = models.SlugField()
    is_default = models.BooleanField(default=False)
    connection_status = models.CharField(max_length=20, default="unknown")
    status_checked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("account", "slug")

    def __str__(self):
        return f"{self.account.slug}/{self.slug} ({self.instance_name})"

    @property
    def driver_chain(self) -> list[str]:
        """Ordem de tentativa: preferido primeiro, fallback depois (sem repetir)."""
        chain = [self.driver]
        if self.fallback_driver and self.fallback_driver != self.driver:
            chain.append(self.fallback_driver)
        return chain

    def go_api_key(self) -> str:
        """Token da instância na GO em texto claro (ou "" para cair na key global)."""
        if not self.go_token:
            return ""
        from mail import crypto

        return crypto.decrypt(self.go_token)

    def set_go_token(self, raw: str) -> None:
        from mail import crypto

        self.go_token = crypto.encrypt(raw) if raw else ""


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

    def save(self, *args, **kwargs):
        if not self.smtp_user and self.from_email:
            self.smtp_user = self.from_email
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.account.slug}/{self.from_email}"


class MailTemplate(models.Model):
    """Shell HTML do e-mail — UM por conta, editável no dashboard (e pela IA).

    Antes, a marca do e-mail vinha de um arquivo em `mail/templates/<slug>.html`
    e o remetente era decidido por um `if` com o slug dentro do dispatch. Isso
    obrigava deploy para trocar uma cor e amarrava o produto a duas marcas
    conhecidas. Agora a conta é dona do próprio shell: um registro, editável em
    runtime, com fallback para o arquivo `default.html` de quem não personalizou.

    Contrato do HTML: precisa conter `{{content}}`. `{{title}}` e
    `{{service_name}}` são opcionais.
    """

    account = models.OneToOneField(
        "accounts.Account", on_delete=models.CASCADE, related_name="mail_template"
    )
    html = models.TextField(help_text="Shell HTML com {{title}}, {{content}} e {{service_name}}.")
    # Assunto default da conta — usado quando o envio não traz subject próprio.
    # Aceita {{title}} e {{service_name}} como placeholders.
    subject = models.CharField(max_length=255, blank=True, default="")
    brand_name = models.CharField(max_length=80, blank=True, default="")
    accent_color = models.CharField(max_length=9, blank=True, default="#172033")
    logo_url = models.CharField(max_length=500, blank=True, default="")
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "template de e-mail"
        verbose_name_plural = "templates de e-mail"

    def __str__(self):
        return f"{self.account.slug} mail template"

    @property
    def is_valid(self) -> bool:
        return "{{content}}" in (self.html or "")


class AppWebhook(models.Model):
    """Para onde o notify devolve o que aconteceu com a mensagem do app.

    O notify é relay, não caixa postal: quem guarda conversa é o app. Por isso
    todo evento relevante — mudança de status de entrega e mensagem recebida no
    número da conta — é empurrado para cá em vez de ficar esperando alguém fazer
    polling.

    `secret` assina o corpo em HMAC-SHA256 (header `X-Notify-Signature`). Dentro
    da VPN é opcional; deixar vazio simplesmente não assina.
    """

    EVENT_STATUS = "status"
    EVENT_INBOUND = "inbound"
    _ALL_EVENTS = (EVENT_STATUS, EVENT_INBOUND)

    account = models.OneToOneField(
        "accounts.Account", on_delete=models.CASCADE, related_name="webhook"
    )
    url = models.CharField(max_length=500)
    secret = models.CharField(max_length=200, blank=True, default="")
    events = models.CharField(max_length=100, default="status,inbound")
    active = models.BooleanField(default=True)

    last_status = models.IntegerField(null=True, blank=True)
    last_error = models.TextField(blank=True, default="")
    last_delivery_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "webhook do app"
        verbose_name_plural = "webhooks dos apps"

    def __str__(self):
        return f"{self.account.slug} → {self.url}"

    @property
    def event_list(self) -> list[str]:
        raw = self.events or ""
        return [e.strip() for e in raw.split(",") if e.strip() in self._ALL_EVENTS]

    def wants(self, event: str) -> bool:
        return self.active and event in self.event_list


class SuppressedEmail(models.Model):
    """Destino de e-mail que o servidor RECUSOU (bounce) — não insistir (L2).

    Insistir num endereço que devolve 550 queima a reputação do IP inteiro.
    A supressão é por conta; remover é gesto manual (admin/painel) de quem
    souber que o endereço voltou a existir.
    """

    account = models.ForeignKey(
        "accounts.Account", on_delete=models.CASCADE, related_name="suppressed_emails"
    )
    email = models.EmailField(db_index=True)
    reason = models.CharField(max_length=300, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("account", "email")
        verbose_name = "e-mail suprimido (bounce)"
        verbose_name_plural = "e-mails suprimidos (bounce)"

    def __str__(self):
        return f"{self.account.slug}/{self.email}"


class WebhookDelivery(models.Model):
    """UMA tentativa de entrega ao webhook do app — o rastro que P2 exige.

    `AppWebhook.last_*` responde "como está agora"; esta tabela responde "o que
    aconteceu em cada tentativa" — sem isso, um webhook intermitente é
    indiagnosticável. Expurgo via retenção de logs (M3).
    """

    account = models.ForeignKey(
        "accounts.Account", on_delete=models.CASCADE, related_name="webhook_deliveries"
    )
    event = models.CharField(max_length=20)  # status | inbound | service
    url = models.CharField(max_length=500)
    attempt = models.PositiveIntegerField(default=1)
    status_code = models.IntegerField(null=True, blank=True)  # None = transporte falhou
    error = models.TextField(blank=True, default="")
    payload_preview = models.CharField(max_length=280, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "entrega de webhook"
        verbose_name_plural = "entregas de webhook"

    def __str__(self):
        return f"{self.account.slug}/{self.event}#{self.attempt} → {self.status_code}"
