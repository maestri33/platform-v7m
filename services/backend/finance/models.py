"""Models do app finance — motor de comissão (`Commission`) + solicitação de pagamento (`PaymentRequest`).

Convenções (CONVENTION §4/§6/§8/§12):
 - PK = BigAutoField interno; nunca exposto. `external_id` (UUID) = handle de borda.
 - **`payee` = FK real pro `users.User`** (decisão Victor 2026-06-01; `users` existe). A chave PIX do
   destino sai de `payee.profile.pix_key`, resolvida no fechamento (snapshot na PaymentRequest).
 - Dinheiro em **REAIS (Decimal, 2 casas)**, igual ao asaas — NUNCA float.
 - Idempotência no banco: `unique(source_type, source_external_id)` no crédito (à prova de corrida,
   corrige o bug do legado que só checava em Python); `unique(external_reference)` na solicitação.
 - `source_external_id` é UUID puro: lead/student (§4-8/9) não existem ainda → sem FK pra eles.
"""

from django.conf import settings
from django.db import models

from core.models import ExternalIdModel


class Commission(ExternalIdModel):
    """Uma comissão creditada a um beneficiário, aguardando o fechamento semanal."""

    class Role(models.TextChoices):
        PROMOTER = "promoter", "promotor"
        COORDINATOR = "coordinator", "coordenador"

    class Source(models.TextChoices):
        LEAD = "lead", "lead pagou"  # comissão direta pro promotor que indicou
        VETERAN = "veteran", "student→veteran"  # comissão pro coordenador do hub
        BONUS = "bonus", "bônus de meta"  # >= threshold indicações na semana (flat)

    class Status(models.TextChoices):
        PENDING = "pending", "pendente"  # creditada, aguardando o fechamento
        PROCESSED = "processed", "processada"  # entrou numa PaymentRequest
        PAID = "paid", "paga"  # o PIX da PaymentRequest saiu (reconciliado)
        FAILED = "failed", "falhou"  # o PIX falhou em definitivo

    payee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="commissions",
    )
    payee_role = models.CharField(max_length=12, choices=Role.choices, db_index=True)
    source_type = models.CharField(max_length=10, choices=Source.choices, db_index=True)
    # lead/student que disparou; bônus = UUID determinístico (uuid5 da semana+promotor).
    source_external_id = models.UUIDField(db_index=True)
    # reais; lido do .env no credit (corrige o bug do legado: valor vinha do caller).
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    payment_request = models.ForeignKey(
        "PaymentRequest",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="commissions",
    )
    external_reference = models.CharField(
        max_length=128, null=True, blank=True, db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["source_type", "source_external_id"],
                name="uniq_commission_source",
            ),
        ]

    def __str__(self):
        return f"Commission({self.payee_role}/{self.source_type} R${self.amount} {self.status})"


class PaymentRequest(ExternalIdModel):
    """A "solicitação de pagamento" do fechamento: 1 por beneficiário/semana → 1 PIX.

    Idempotência do payout = `unique(external_reference)` (= o `payment_id` que mandamos ao asaas).
    `awaiting_pix`/`awaiting_balance` são NÃO-terminais: esperam na fila, não falham (não perde
    dinheiro). O PIX-out real é executado pelo `integrations.bank.asaas.payout` (provado no 1a-vi).
    """

    class Status(models.TextChoices):
        QUEUED = "queued", "na fila"  # pronta pra enviar
        AWAITING_PIX = (
            "awaiting_pix",
            "sem chave PIX",
        )  # junta o valor, espera a chave do profile
        SUBMITTED = (
            "submitted",
            "enviada",
        )  # PIX submetido ao asaas, aguarda reconciliação
        AWAITING_BALANCE = (
            "awaiting_balance",
            "sem saldo",
        )  # asaas sem saldo, espera (não falha)
        PAID = "paid", "paga"  # reconciliada como PAID
        FAILED = "failed", "falhou"

    class Kind(models.TextChoices):
        COMMISSION = (
            "commission",
            "comissão",
        )  # paga promotor/coordenador (default; Fatia 1)
        FEE = "fee", "despesa"  # paga fornecedor/instituição (Fatia 2)
        MANUAL = (
            "manual",
            "avulso",
        )  # pagamento avulso do staff a terceiro (PIX/boleto; Victor 2026-06-29)

    class Method(models.TextChoices):
        PIX_KEY = "pix_key", "PIX por chave"  # comissão → asaas.payout
        PIX_QRCODE = "pix_qrcode", "PIX por QR code"  # fee → asaas.qrpay
        BOLETO = "boleto", "boleto"  # avulso → asaas.billpay (linha digitável)

    class SourceType(models.TextChoices):
        # a que entidade de domínio esta saída se relaciona (espelha o par source do Commission).
        ENROLLMENT = (
            "enrollment",
            "matrícula",
        )  # fee da taxa do credenciador → a matrícula do aluno

    # {ordinal-sexta-no-mês}_{MM}_{AAAA}_{payee.external_id} (commission) ou fee_<uuid> (fee).
    external_reference = models.CharField(max_length=128, unique=True, db_index=True)
    # fila de saída GENÉRICA: é tudo dinheiro saindo da mesma conta Asaas (palavra do Victor).
    kind = models.CharField(
        max_length=12, choices=Kind.choices, default=Kind.COMMISSION, db_index=True
    )
    method = models.CharField(
        max_length=12, choices=Method.choices, default=Method.PIX_KEY
    )
    # payee/payee_role/week_of só existem pra commission (fee não tem User payee nem semana).
    payee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="payment_requests",
        null=True,
        blank=True,
    )
    payee_role = models.CharField(
        max_length=12,
        choices=Commission.Role.choices,
        db_index=True,
        null=True,
        blank=True,
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)  # reais
    week_of = models.DateField(
        db_index=True, null=True, blank=True
    )  # segunda-feira (só commission)
    # fee: destino do PIX QR code (copia-e-cola) + fornecedor (texto até modelar instituição) + agendamento.
    qrcode_payload = models.TextField(null=True, blank=True)
    supplier_name = models.CharField(max_length=200, null=True, blank=True)
    scheduled_for = models.DateTimeField(null=True, blank=True)  # null = imediato
    # relação da saída com a entidade de origem (mesma convenção do Commission: soft-ref por external_id,
    # SEM FK pra domínio — a fila é genérica). Hoje: fee da taxa → a matrícula (source_type=enrollment).
    source_type = models.CharField(
        max_length=20, choices=SourceType.choices, null=True, blank=True, db_index=True
    )
    source_external_id = models.UUIDField(null=True, blank=True, db_index=True)
    # snapshot de payee.profile.pix_key resolvido no fechamento (auditável/estável).
    pix_key = models.CharField(max_length=140, null=True, blank=True)
    # avulso (kind=manual, method=boleto): linha digitável + comprovante opcional (recibo).
    boleto_line = models.CharField(max_length=64, null=True, blank=True)
    receipt = models.CharField(
        max_length=255, null=True, blank=True
    )  # path relativo (anexo)
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.QUEUED, db_index=True
    )
    asaas_payment_id = models.CharField(max_length=128, null=True, blank=True)
    asaas_status = models.CharField(max_length=32, null=True, blank=True)
    attempts = models.PositiveSmallIntegerField(default=0)  # só falhas de envio
    max_attempts = models.PositiveSmallIntegerField(default=7)
    next_attempt_at = models.DateTimeField(null=True, blank=True, db_index=True)
    last_error = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return (
            f"PaymentRequest({self.external_reference} R${self.amount} {self.status})"
        )
