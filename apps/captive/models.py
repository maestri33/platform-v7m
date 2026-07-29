"""Modelos do captive portal Wi-Fi.

Design de referência: "Fluxo Captive Portal IEADPG" (claude.ai/design).
Fases: A conexão/reconhecimento de MAC · B identificação por telefone + OTP ·
C CPF do visitante (pós-liberação) · D contexto de culto.
"""

import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.profiles.models import BaseModel, Profile


class MacBinding(BaseModel):
    """Vínculo MAC ↔ usuário criado na 1ª confirmação de OTP.

    MACs randomizados (iOS/Android) podem gerar re-cadastro — por isso o
    vínculo é N MACs por profile, nunca OneToOne.
    """

    mac = models.CharField("mac", max_length=17, unique=True)
    profile = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name="mac_bindings",
        verbose_name="perfil",
    )
    is_active = models.BooleanField("ativo", default=True)
    last_seen_at = models.DateTimeField("visto por último em", null=True, blank=True)

    class Meta:
        verbose_name = "vínculo de MAC"
        verbose_name_plural = "vínculos de MAC"

    def __str__(self):
        return f"{self.mac} → {self.profile}"


class PortalSession(BaseModel):
    """Sessão de conexão de um dispositivo no Wi-Fi da igreja.

    ``connected_at`` é gravado na liberação; ``disconnected_at`` chega via
    accounting-stop do controlador (repassado pelo agente local).
    """

    class Status(models.TextChoices):
        PENDING = "pending", "No portal"
        AWAITING_OTP = "awaiting_otp", "Aguardando OTP"
        AUTHORIZED = "authorized", "Liberado"
        CLOSED = "closed", "Encerrada"

    class Kind(models.TextChoices):
        MEMBER = "member", "Membro"
        VISITOR = "visitor", "Visitante"

    class IdentityStep(models.TextChoices):
        """Onde a pessoa está na confirmação de quem ela é (Fase C)."""

        AWAITING_CPF = "awaiting_cpf", "Aguardando CPF"
        AWAITING_CONFIRM = "awaiting_confirm", "Confirmando identidade"
        AWAITING_SELFIE = "awaiting_selfie", "Aguardando selfie"
        DONE = "done", "Concluída"

    token = models.UUIDField("token", default=uuid.uuid4, editable=False, unique=True)
    mac = models.CharField("mac", max_length=17, db_index=True)
    ssid = models.CharField("ssid", max_length=64, blank=True, default="")
    ap_mac = models.CharField("mac do ap", max_length=17, blank=True, default="")
    client_ip = models.GenericIPAddressField("ip do cliente", null=True, blank=True)
    profile = models.ForeignKey(
        Profile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="portal_sessions",
        verbose_name="perfil",
    )
    status = models.CharField(
        "status", max_length=20, choices=Status, default=Status.PENDING
    )
    # Identificação em andamento (Fase B) — antes do OTP confirmar.
    pending_profile_uuid = models.CharField(
        "profile uuid pendente", max_length=36, blank=True, default=""
    )
    pending_phone = models.CharField("telefone pendente", max_length=20, blank=True, default="")
    pending_first_name = models.CharField(
        "primeiro nome pendente", max_length=80, blank=True, default=""
    )
    kind = models.CharField("tipo", max_length=10, choices=Kind, blank=True, default="")
    # E1 — controle de tentativas do OTP (3 falhas → bloqueia 10 min).
    otp_attempts = models.PositiveSmallIntegerField("tentativas de otp", default=0)
    otp_locked_until = models.DateTimeField("otp bloqueado até", null=True, blank=True)
    identity_step = models.CharField(
        "etapa de identidade", max_length=20, choices=IdentityStep, blank=True, default=""
    )
    # Cadastro que o CPF apontou e que a pessoa está reivindicando — só vira
    # ``profile`` depois da confirmação + selfie.
    claimed_profile = models.ForeignKey(
        Profile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="portal_identity_claims",
        verbose_name="cadastro reivindicado",
    )
    cpf_completed = models.BooleanField("etapa cpf concluída", default=False)
    connected_at = models.DateTimeField("conectado em", null=True, blank=True)
    disconnected_at = models.DateTimeField("desconectado em", null=True, blank=True)

    class Meta:
        verbose_name = "sessão do portal"
        verbose_name_plural = "sessões do portal"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.mac} [{self.get_status_display()}]"


class AccessGrant(BaseModel):
    """Liberação de internet para um MAC, entregue ao agente local.

    A ``credential`` é assinada (HMAC) com ``CAPTIVE_AGENT_SECRET`` e
    identifica o MAC autorizado + validade. O agente local valida a
    assinatura antes de aplicar a liberação no controlador.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pendente"
        DELIVERED = "delivered", "Entregue (push)"
        ACKED = "acked", "Aplicada no controlador"
        FAILED = "failed", "Falhou"

    session = models.ForeignKey(
        PortalSession,
        on_delete=models.CASCADE,
        related_name="grants",
        verbose_name="sessão",
    )
    mac = models.CharField("mac", max_length=17, db_index=True)
    credential = models.TextField("credencial", unique=True)
    status = models.CharField(
        "status", max_length=20, choices=Status, default=Status.PENDING
    )
    duration_seconds = models.PositiveIntegerField("duração (s)", default=43200)
    expires_at = models.DateTimeField("expira em")
    delivered_at = models.DateTimeField("entregue em", null=True, blank=True)
    acked_at = models.DateTimeField("aplicada em", null=True, blank=True)
    attempts = models.PositiveSmallIntegerField("tentativas de push", default=0)
    last_error = models.TextField("último erro", blank=True, default="")

    class Meta:
        verbose_name = "liberação de acesso"
        verbose_name_plural = "liberações de acesso"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.mac} [{self.get_status_display()}]"


class PortalEvent(BaseModel):
    """Evento auditável do fluxo (seção "Eventos registrados" do design)."""

    class Event(models.TextChoices):
        CONNECTED = "connected", "Conectado (MAC conhecido)"
        REDIRECT_PORTAL = "redirect_portal", "Redirect pro portal"
        OTP_SENT = "otp_sent", "OTP enviado"
        OTP_VERIFIED = "otp_verified", "OTP confirmado"
        OTP_FAILED = "otp_failed", "OTP incorreto/expirado"
        WHATSAPP_INVALID = "whatsapp_invalid", "Número sem WhatsApp"
        VISITOR_CREATED = "visitor_created", "Visitante criado"
        CPF_ENRICHED = "cpf_enriched", "CPF enriquecido"
        CPF_CONFLICT = "cpf_conflict", "CPF duplicado"
        IDENTITY_CONFIRM_ASKED = "identity_confirm_asked", "Confirmação de identidade pedida"
        IDENTITY_CONFIRMED = "identity_confirmed", "Identidade confirmada"
        IDENTITY_DENIED = "identity_denied", "Identidade negada"
        SELFIE_SUBMITTED = "selfie_submitted", "Selfie enviada"
        SELFIE_SKIPPED = "selfie_skipped", "Selfie pulada"
        PROFILE_MERGED = "profile_merged", "Cadastros fundidos"
        ROLE_ASSIGNED = "role_assigned", "Papel concedido"
        LGPD_ACCEPTED = "lgpd_accepted", "Termos LGPD aceitos"
        WELCOME_SCHEDULED = "welcome_scheduled", "Boas-vindas agendadas"
        GRANT_PUSH_FAILED = "grant_push_failed", "Push de liberação falhou"
        INTERNET_RELEASED = "internet_released", "Internet liberada"
        DISCONNECTED = "disconnected", "Desconectado"

    event = models.CharField("evento", max_length=30, choices=Event)
    mac = models.CharField("mac", max_length=17, blank=True, default="", db_index=True)
    session = models.ForeignKey(
        PortalSession,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="events",
        verbose_name="sessão",
    )
    payload = models.JSONField("dados", default=dict, blank=True)

    class Meta:
        verbose_name = "evento do portal"
        verbose_name_plural = "eventos do portal"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_event_display()} · {self.mac}"


class CpfRecord(BaseModel):
    """CPF verificado do profile + enriquecimento HubCPF (cacheado)."""

    profile = models.OneToOneField(
        Profile,
        on_delete=models.CASCADE,
        related_name="cpf_record",
        verbose_name="perfil",
    )
    cpf = models.CharField("cpf", max_length=11, unique=True)
    enriched = models.JSONField("enriquecimento", default=dict, blank=True)
    enriched_at = models.DateTimeField("enriquecido em", null=True, blank=True)
    # E4 — HubCPF fora do ar é adiável: cadastro segue e um job re-tenta.
    pending_enrichment = models.BooleanField("enriquecimento pendente", default=False)

    class Meta:
        verbose_name = "registro de CPF"
        verbose_name_plural = "registros de CPF"

    def __str__(self):
        return f"CPF de {self.profile}"


def selfie_upload_path(instance, filename):
    """Nome opaco: jamais CPF, telefone ou nome no caminho do arquivo (LGPD)."""

    return f"captive/selfie/{uuid.uuid4().hex}.jpg"


def selfie_storage():
    """Storage privado — fica FORA do ``MEDIA_ROOT`` servido pelo nginx.

    Selfie de rosto é dado biométrico (LGPD art. 11); o arquivo só sai daqui
    pela view do admin, autenticada.
    """

    from django.core.files.storage import FileSystemStorage

    return FileSystemStorage(location=str(settings.CAPTIVE_PRIVATE_MEDIA_ROOT))


class PortalSelfie(BaseModel):
    """Selfie da confirmação de identidade, aceita automaticamente por ora.

    O ``status`` já nasce ``auto_approved`` porque ainda não há conferência
    facial — quando ela existir, o registro e a conferência manual do admin já
    estarão prontos. FK (e não OneToOne) porque a pessoa pode tentar de novo.
    """

    class Status(models.TextChoices):
        AUTO_APPROVED = "auto_approved", "Aceita automaticamente"
        APPROVED = "approved", "Aprovada na conferência"
        REJECTED = "rejected", "Rejeitada na conferência"
        SKIPPED = "skipped", "Pulada"

    session = models.ForeignKey(
        PortalSession,
        on_delete=models.CASCADE,
        related_name="selfies",
        verbose_name="sessão",
    )
    profile = models.ForeignKey(
        Profile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="portal_selfies",
        verbose_name="quem enviou",
    )
    claimed_profile = models.ForeignKey(
        Profile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="portal_selfie_claims",
        verbose_name="cadastro reivindicado",
    )
    image = models.ImageField(
        "foto",
        storage=selfie_storage,
        upload_to=selfie_upload_path,
        null=True,
        blank=True,
    )
    status = models.CharField(
        "situação", max_length=20, choices=Status, default=Status.AUTO_APPROVED
    )
    # "camera" (câmera do celular) · "skipped"
    captured_via = models.CharField("origem", max_length=16, blank=True, default="")
    decided_at = models.DateTimeField("conferida em", null=True, blank=True)
    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="selfies_conferidas",
        verbose_name="conferida por",
    )

    class Meta:
        verbose_name = "selfie do portal"
        verbose_name_plural = "selfies do portal"
        ordering = ["-created_at"]

    def __str__(self):
        return f"selfie {self.get_status_display().lower()} · {self.session.mac}"


class CaptiveConsent(BaseModel):
    """Registro auditável do aceite dos termos (LGPD).

    O aceite acontece no envio do CPF: a pessoa lê o texto na tela e o ato de
    enviar é a manifestação de vontade. Sem guardar quem, quando e de onde, o
    consentimento não se prova — e é isso que este modelo existe para fazer.

    A selfie tem registro SEPARADO (``Kind.BIOMETRIC``) porque dado biométrico
    exige consentimento específico e destacado (LGPD art. 11).
    """

    class Kind(models.TextChoices):
        TERMS = "terms", "Termos de uso e privacidade"
        BIOMETRIC = "biometric", "Dado biométrico (selfie)"

    profile = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name="captive_consents",
        verbose_name="perfil",
    )
    session = models.ForeignKey(
        PortalSession,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consents",
        verbose_name="sessão",
    )
    kind = models.CharField("tipo", max_length=20, choices=Kind, default=Kind.TERMS)
    terms_version = models.CharField("versão dos termos", max_length=20, blank=True, default="")
    accepted_at = models.DateTimeField("aceito em", default=timezone.now)
    mac = models.CharField("mac", max_length=17, blank=True, default="", db_index=True)
    ip = models.GenericIPAddressField("ip", null=True, blank=True)
    phone = models.CharField("telefone", max_length=20, blank=True, default="")
    user_agent = models.CharField("user agent", max_length=300, blank=True, default="")
    # O texto exato exibido, para provar o que a pessoa leu. Em TextField e
    # não no JSON: o banco é SQL_ASCII e recusa escapes \uXXXX dentro de JSON.
    terms_text = models.TextField("texto aceito", blank=True, default="")
    # Metadados estruturados — só ASCII, pela mesma razão.
    evidence = models.JSONField("evidência", default=dict, blank=True)

    class Meta:
        verbose_name = "consentimento LGPD"
        verbose_name_plural = "consentimentos LGPD"
        ordering = ["-accepted_at"]

    def __str__(self):
        return f"{self.get_kind_display()} · {self.profile} · {self.accepted_at:%d/%m/%Y %H:%M}"
