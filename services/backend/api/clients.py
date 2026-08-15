"""Grupo `clients` (PLACEHOLDER) — público do funil do ALUNO (**$$ ENTRA**):
lead → enrollment → student → veteran.

Fatia 6a (LEAD): captação pública (cria lead + checkout, devolve o pagamento na hora), check/login
por OTP. Casca fina (CONVENTION §3): valida a borda e chama o `interface/` in-process; zero regra aqui.
O funil autenticado da matrícula (enrollment) entra na 6b.
"""

from __future__ import annotations

from typing import Literal

from ninja import Field, File, Router, Schema
from ninja.files import UploadedFile

from api.auth import require_roles
from api.base import (
    COMMON_ERROR_REGISTRY,
    add_auth_refresh,
    add_funnel_login,
    build_group,
    resolve_rg_slot,
)
from api.schemas import (
    AddressCepIn,
    AddressDataIn,
    CheckIn,
    CheckOut,
    PublicAddressOut,
    StudentPlatformFields,
)
from core.net import source_ip
from users.auth import service as auth_iface
from users.blocks import service as blocks_svc
from users.consent import STUDENT_CONTRACT
from users.documents import service as documents_iface
from users.exceptions import NotFound
from users.roles.enrollment import service as enrollment_iface
from users.roles.lead import service as lead_iface
from users.roles.student import service as student_iface

# Registry de `code` de erro (proposta API #5): TODO 4xx sai `{detail, code, …extra}` — o front
# roteia por `switch(code)`, nunca parseando `detail`. Vai na descrição do grupo → OpenAPI.
# ponytail: códigos comuns ficaram em `api.base.COMMON_ERROR_REGISTRY` (era duplicado 4×).
_ERROR_REGISTRY = (
    COMMON_ERROR_REGISTRY
    + """
### Códigos específicos do aluno (clients)

| code | quando | extras |
|---|---|---|
| `WRONG_STATUS` | ação fora da etapa do wizard (409) | `expected_status` (etapa a abrir), `missing_fields` (se faltam campos do RG/perfil) |
| `SLOT_INVALID` | slot de foto desconhecido (422) | — |
| `CPF_EXISTS` / `PHONE_EXISTS` / `EMAIL_EXISTS` | cadastro duplicado (409) | — |
| `CPF_CONFLICT` | CPF já é de OUTRA conta no passo 3 do funil v2 (409) — notifica o titular e APAGA a conta da tentativa | — |
| `CPF_ALREADY_SET` | a conta já confirmou um CPF (409) — trocar é com o suporte | — |
| `EMAIL_CONFLICT` | e-mail já é de outra conta no passo 5 (409) | — |
| `EMAIL_INVALID` | e-mail malformado no passo 5 (422) | — |
| `PROFILE_INCOMPLETE` | checkout sem cpf/e-mail confirmados (409) | `missing_fields` |
| `ALREADY_PAID` | troca de pagamento após confirmação (409) | — |
| `CPF_INVALID` / `PHONE_INVALID` / `CPF_NOT_FOUND` | dado rejeitado na validação (422) | — |
| `CPF_SERVICE_DOWN` / `PHONE_SERVICE_DOWN` / `CEP_SERVICE_DOWN` | serviço externo fora (502) | — |
| `CEP_NOT_FOUND` / `STATE_INVALID` | endereço inválido (422) | — |
| `CHECKOUT_NOT_FOUND` / `STUDENT_NOT_FOUND` / `ENROLLMENT_NOT_FOUND` | recurso específico do aluno (404) | — |
| `BLOCK_NOT_FOUND` | bloco inválido/expirado (404) | — |
"""
)

api = build_group(
    "clients",
    "Funil do aluno: lead, enrollment, student, veteran.\n" + _ERROR_REGISTRY,
)

# roles do funil do aluno, mais avançada primeiro (login emite JWT com TODAS as ativas).
_FUNNEL_ROLES = ("veteran", "student", "enrollment", "lead")


# ── schemas ──────────────────────────────────────────────────────────────
class LeadCreateIn(Schema):
    cpf: str
    phone: str
    email: str
    payment_method: str | None = None  # default cartão (resolvido no service)
    ref: str | None = None  # external_id do promotor (landing ?ref=)


class CheckoutOut(Schema):
    payment_method: str
    provider: str
    amount: str
    is_paid: bool
    checkout_url: str | None = None
    short_url: str | None = None  # link curto no nosso domínio (manda por WhatsApp)
    qrcode_payload: str | None = None
    qrcode_image: str | None = None
    due_date: str | None = None


class LeadOut(Schema):
    external_id: str = Field(
        description="external_id do LEAD (≠ do user — proposta #8)"
    )
    user_external_id: str = Field(
        description="external_id do USER — é o que o POST /auth/login espera (proposta #8). "
        "O register cria o lead E o user na mesma transação; o login é por USER, não por lead."
    )
    status: str
    checkout: CheckoutOut | None = None


class CardPriceOut(Schema):
    installments: int
    installment: str  # valor da parcela em reais (string), ex.: "99.00"
    total: str  # valor cheio em reais (string), ex.: "1188.00"


class PricingOut(Schema):
    pix: str  # valor cheio do PIX em reais (string), ex.: "999.00"
    card: CardPriceOut


class UrlOut(Schema):
    url: str


class LeadCustomerOut(Schema):
    name: str | None = None
    phone: str | None = None
    email: str | None = None
    cpf: str | None = None


class LeadPromoterOut(Schema):
    external_id: str = Field(
        description="external_id do USER do promotor (o mesmo do `?ref=` da landing — proposta #8)"
    )
    name: str | None = None


class LeadSelfCheckoutOut(Schema):
    payment_method: str
    provider: str
    amount: str
    is_paid: bool
    checkout_url: str | None = None
    url: str | None = None  # ✦ URL única: checkout se não pagou, recibo se pagou
    receipt_url: str | None = None
    qrcode_payload: str | None = None
    qrcode_image: str | None = None
    due_date: str | None = None


class LeadMeOut(Schema):
    external_id: str = Field(
        description="external_id do LEAD (≠ do user — proposta #8)"
    )
    status: str = Field(description="pending | paid | failed")
    failed_reason: str | None = None
    created_at: str
    customer: LeadCustomerOut
    promoter: LeadPromoterOut
    checkout: LeadSelfCheckoutOut | None = None


class AddressOut(PublicAddressOut):
    pass


class AddressProofSectionOut(Schema):
    """Bloco do comprovante de endereço no /me (F1): status da validação IA + parentesco."""

    exists: bool = False
    photo: str | None = None
    status: str | None = None  # pending|approved|rejected|review|needs_kinship
    reason: str | None = Field(
        None,
        description="Orientação PÚBLICA (o que fazer). O critério — titular X, endereço "
        "divergente, justificativa rejeitada — fica interno (hub/staff).",
    )
    needs_kinship: bool = False
    kinship_kind: str | None = Field(
        None,
        description="Com needs_kinship: 'confirm' = sobrenome em comum, só confirmar o grau "
        "de parentesco · 'justify' = titular sem relação aparente, justificar o vínculo.",
    )
    kinship_relation: str | None = None
    needs_new_proof: bool = Field(
        False,
        description="Coordenador rejeitou a justificativa: a tela trava no comprovante "
        "pedindo outro documento (de preferência no nome do aluno) até novo upload.",
    )


class StudentPlatformOut(StudentPlatformFields):
    pass


class StudentDocumentOut(Schema):
    doc_type: str
    validation_status: str
    has_photo: bool
    analysis_status: AnalysisStatus | None = Field(
        None,
        description="pending (analisando) | approved | rejected (refazer — motivo em analysis_reason) "
        "| review (coordenador vai decidir)",
    )
    analysis_reason: str | None = None
    expires_at: str | None = Field(
        None, description="Até quando o `pending` vale; depois vira `review` (TTL)."
    )


class PendencyOut(Schema):
    external_id: str = Field(description="external_id da PENDÊNCIA (proposta #8)")
    kind: str
    description: str | None = None
    amount_cents: int | None = None


class StudentPendencyOut(PendencyOut):
    resolved: bool


class BlockOut(Schema):
    external_id: str
    source_type: str
    title: str
    description: str
    action_label: str
    action_route: str
    created_at: str


class StudentDiplomaOut(Schema):
    issued_at: str | None = None
    picked_up: bool


class StudentMeOut(Schema):
    external_id: str = Field(
        description="external_id do STUDENT (≠ do user, ≠ da matrícula — proposta #8)"
    )
    status: str = Field(
        description="awaiting_documents | documents_under_review | exam_released | exam_scheduled "
        "| exam_failed | awaiting_documentation_dispatch | pending | awaiting_diploma_issuance "
        "| awaiting_pickup | veteran"
    )
    hub_external_id: str
    blood_type: str | None = None
    platform: StudentPlatformOut
    documents: list[StudentDocumentOut]
    pendencies: list[StudentPendencyOut]
    diploma: StudentDiplomaOut | None = None


# Erros de domínio (`DomainError`, incl. os XxxError dos services) NÃO são capturados aqui:
# sobem pro handler central da fábrica (`api/base.py`) → JSON `{detail, code, …extra}` no status certo.


# ── preço de vitrine (público) — o front exibe na landing ────────────────────
@api.get("/pricing", response=PricingOut, auth=None, tags=["pricing"])
def pricing(request):
    """Preço de VITRINE público (sem login): PIX (valor cheio) + cartão em 12x. ≠ a cobrança real."""
    return lead_iface.pricing()


class ReferralOut(Schema):
    name: str | None = Field(
        None,
        description="PRIMEIRO nome do promotor ativo, ou null se o ref não vale (front esconde o selo)",
    )


@api.get("/referral/{ref}", response=ReferralOut, auth=None, tags=["pricing"])
def referral(request, ref: str):
    """`?ref=` da landing → nome pro selo "Indicado por …" (funil v2, tela 1). Público e magro.

    Só o PRIMEIRO nome: o `ref` (external_id do promotor) circula em link compartilhável, então
    esta rota não pode virar consulta de cadastro. Sempre **200** — ref malformado/inexistente/
    suspenso devolve `name:null` e o front simplesmente não desenha o selo (não é erro: link velho
    de promotor desligado continua abrindo o funil normal, atribuído ao promotor padrão)."""
    return {"name": lead_iface.referral_name(ref)}


# ── clients/auth — entrada do cliente (pública): cadastro + login por OTP ─────
# Victor 2026-06-07: captação/login são ENTRADA → vivem em /auth. TODO cliente entra como `lead`.
auth_router = Router(tags=["auth"])
lead_router = Router(tags=["lead"])


@auth_router.post("/register", response={201: LeadOut}, auth=None)
def register(request, payload: LeadCreateIn):
    """Cadastro do cliente: **TODO cliente entra OBRIGATORIAMENTE como `lead`.** Cria o lead (cpf/phone/
    email + método) + o checkout e devolve o pagamento na hora.

    **APOSENTADO no funil v2 (protótipo 2026-07-18):** a conta nasce no `POST /auth/check` (telefone)
    e cpf/e-mail/checkout entram nos passos 3/5/6. Mantido para consumidores externos."""
    result = lead_iface.create_lead(
        cpf=payload.cpf,
        phone=payload.phone,
        email=payload.email,
        payment_method=payload.payment_method,
        ref=payload.ref,
    )
    return 201, result


@auth_router.post("/check", response=CheckOut, auth=None)
def check(request, payload: CheckIn):
    """**O check NORMAL: dispara OTP** por cpf/phone e **VAZA existência** (CONVENTION §5): devolve
    `found`+`roles` honestos — o front decide login × captura e pra qual fase do funil mandar.

    **Funil v2 (protótipo 2026-07-18): o check também CRIA a conta.** Número novo + WhatsApp
    confirmado → nasce User+Profile(phone)+role `lead`+Lead (promotor do `?ref=`) e o OTP sai no
    mesmo passo — resposta ganha `created:true`+`external_id` (o front segue direto pro OTP).
    WhatsApp negado/indisponível → NÃO cria (`whatsapp:false|null`, front bloqueia/avisa).

    `send_otp=false` = o antigo `/auth/check-bot` integrado aqui: mesma função SEM disparar OTP,
    devolvendo o `token` (JWT) direto — o canal do chamador é a prova de identidade."""
    from core.webhook_auth import service_secret_ok

    return lead_iface.check_or_capture(
        cpf=payload.cpf,
        phone=payload.phone,
        external_id=payload.external_id,
        send_otp=payload.send_otp,
        service_authed=service_secret_ok(request),
        ref=payload.ref,
    )


add_funnel_login(
    auth_router,
    funnel_roles=_FUNNEL_ROLES,
    not_in_funnel_msg="Usuário não faz parte do funil do aluno.",
)
add_auth_refresh(auth_router)


# ── clients/lead — a fase LEAD do funil: estado + a URL (leitura do PRÓPRIO dado) ─
def _lead_guard(request):
    """Devolve o lead do usuário logado (404 se não houver). Aceita QUALQUER role do funil do aluno:
    pós-promoção (lead→enrollment→…) o cliente continua vendo o próprio checkout/recibo — antes dava
    403 e quem pagou não via o recibo (auditoria do front 2026-06-10)."""
    require_roles(request.auth, *_FUNNEL_ROLES)
    lead = lead_iface.get_for_user_external_id(request.auth.external_id)
    if lead is None:
        raise NotFound("Lead não encontrado.", code="LEAD_NOT_FOUND")
    return lead


@lead_router.get("/me", response=LeadMeOut)
def lead_me(request):
    """TODOS os dados do lead do cliente logado, incl. a URL (✦ checkout se não pagou / recibo se pagou)."""
    return lead_iface.lead_self_dict(_lead_guard(request))


@lead_router.get("/checkout-url", response=UrlOut)
def lead_checkout_url(request):
    """Só a URL de pagamento/recibo do lead (link único ✦ que redireciona checkout↔recibo)."""
    url = lead_iface.checkout_url_for(_lead_guard(request))
    if url is None:
        raise NotFound("Checkout não encontrado.", code="CHECKOUT_NOT_FOUND")
    return {"url": url}


# ── funil do lead v2 (protótipo 2026-07-18): CPF → e-mail → checkout, autenticados ──
# Caminho canônico: [1] telefone (check cria a conta) → [2] OTP → [3] CPF (identidade →
# pergaminho) → [4/5] e-mail → [6] escolha/troca do pagamento. Os passos 3-6 exigem a role
# `lead` (quem já avançou no funil não refaz identidade/pagamento por aqui).


class IdentityIn(Schema):
    cpf: str


class IdentityOut(Schema):
    cpf: str
    name: str | None = None
    birth_date: str | None = Field(
        None, description="ISO YYYY-MM-DD — o front calcula a idade"
    )
    sex: str | None = Field(
        None, description='"M" | "F" — decide "matriculado/a" no pergaminho'
    )
    photo: str | None = Field(
        None,
        description=(
            "Foto de perfil do WhatsApp (capturada em task async quando a conta nasce no "
            "passo 1). Sem foto no zap → null e o front desenha o monograma; nunca é erro. "
            "NÃO é prova de identidade — o CPFHub, que é a autoridade, não entrega foto."
        ),
    )


class EmailIn(Schema):
    email: str


class EmailOut(Schema):
    email: str
    already_yours: bool = Field(
        False,
        description=(
            "True quando este e-mail JÁ era o desta conta (chamada idempotente). O front "
            "diferencia a celebração: novo → “Excelente!”; o próprio → “Perfeito, já é o "
            "seu e-mail”."
        ),
    )


class CheckoutSetIn(Schema):
    payment_method: str = Field(description='"pix" | "card"')


@lead_router.post("/identity", response=IdentityOut)
def lead_identity(request, payload: IdentityIn):
    """Passo 3 — confirma o CPF e devolve a identidade (pergaminho). DV inválido → 422
    `CPF_INVALID`; CPF de outra conta → **409 `CPF_CONFLICT`** (notifica o titular + APAGA a
    conta recém-criada desta tentativa — contrato de segurança do protótipo, sem vazar dados);
    CPFHub fora → 502 `CPF_SERVICE_DOWN`."""
    require_roles(request.auth, "lead")
    return auth_iface.confirm_identity(
        user_external_id=request.auth.external_id, cpf=payload.cpf
    )


@lead_router.post("/email", response=EmailOut)
def lead_email(request, payload: EmailIn):
    """Passo 5 — grava o e-mail. De outra conta → 409 `EMAIL_CONFLICT`; o próprio → segue
    (idempotente, `already_yours=true`); formato inválido → 422 `EMAIL_INVALID`."""
    require_roles(request.auth, "lead")
    return auth_iface.set_email(
        user_external_id=request.auth.external_id, email=payload.email
    )


@lead_router.post("/checkout", response=CheckoutOut)
def lead_set_checkout(request, payload: CheckoutSetIn):
    """Passo 6 — define (ou TROCA) a forma de pagamento e cria o checkout. Trocar recria a
    sessão: o link antigo morre (PIX antigo é cancelado no Asaas, best-effort) e nasce
    URL/QR/token novos. Pago → 409 `ALREADY_PAID`; sem cpf/e-mail → 409 `PROFILE_INCOMPLETE`
    (+`missing_fields`). A URL do gateway nasce async — o front acompanha por `GET /lead/me`."""
    require_roles(request.auth, "lead")
    return lead_iface.set_checkout(
        user_external_id=request.auth.external_id,
        payment_method=payload.payment_method,
    )


api.add_router("/auth", auth_router)
api.add_router("/lead", lead_router)


# ── matrícula: funil de coleta (autenticado, role enrollment) — 6b ──────────
# Fluxo plan/13 (Victor 2026-06-11): DOCUMENTO primeiro (a IA extrai e povoa o perfil) →
# endereço (POST só com CEP) → educação → selfie (= ASSINATURA da matrícula) → liberação.
# Convenção: as seções devolvem `missing_fields` — o front renderiza input SÓ do que falta.
class KinshipIn(Schema):
    relation: str  # quem é o titular do comprovante + grau de parentesco


class EducationIn(Schema):
    level: str  # 'fundamental' | 'medio'
    grade: int  # 1–9 (fundamental) / 1–3 (médio) — validado no service por nível
    completed: (
        bool  # terminou o ÚLTIMO ANO cursado? (passou/foi até o fim × parou/repetiu)
    )
    # O funil por eliminação (Victor 2026-07-28) não pergunta a escola — só UF/cidade.
    # Opcional preserva quem ainda manda (candidato/versões antigas do front).
    last_school: str = ""
    city: str  # cidade da escola
    state: str  # UF da escola
    last_year_when: str | None = None


# enums canônicos no OpenAPI (proposta #6): em vez de `"string"`, o schema declara os valores.
AnalysisStatus = Literal["pending", "approved", "rejected", "review"]
WizardStatus = Literal[
    "rg", "address", "education", "selfie", "awaiting_release", "completed"
]


class EnrollmentOut(Schema):
    external_id: str = Field(
        description="external_id da MATRÍCULA (≠ do user, ≠ do promoter) — proposta #8"
    )
    status: WizardStatus = Field(
        description="Seção do wizard a preencher AGORA: rg (documento) | address | education "
        "| selfie | awaiting_release | completed"
    )
    hub_external_id: str
    selfie_verified: bool
    # status canônico unificado da análise (proposta #4): a análise da SELFIE/assinatura.
    analysis_status: AnalysisStatus | None = Field(
        None, description="Análise da selfie: pending | approved | rejected | review"
    )
    selfie_status: str = Field(
        description="[DEPRECATED — use analysis_status] alias de compat"
    )
    # ack de polling (proposta #2): preenchidos SÓ na resposta do POST /selfie (que dispara análise).
    poll_after_ms: int | None = Field(
        None,
        description="Quando o front deve voltar a perguntar (ms). None fora de mutação.",
    )
    expires_at: str | None = Field(
        None,
        description="Até quando o `pending` vale; depois disso vira `review` (TTL).",
    )


class RgSectionOut(Schema):
    """Seção DOCUMENTO completa (GET/PATCH /enrollment/documents/rg) — plan/13.
    `next_slot` = qual slot o front deve pedir AGORA (None = completo ou aguardando análise).
    `photos` = status por slot individual ({slot: {status, reason}})."""

    # editáveis no PATCH (completa/corrige o que a extração não trouxe)
    number: str | None = None
    issuing_agency: str | None = None
    issue_date: str | None = None
    mother_name: str | None = None
    father_name: str | None = None
    birthplace: str | None = None
    marital_status: str | None = None
    nationality: str | None = None
    # do CPFHub/extração — NÃO editáveis pelo aluno
    name: str | None = None
    birth_date: str | None = None
    # fotos + validação por IA
    front_photo: str | None = None
    back_photo: str | None = None
    full_photo: str | None = None
    # canônico unificado (proposta #4): `analysis_status`/`analysis_reason`.
    analysis_status: AnalysisStatus | None = Field(
        None,
        description="pending (analisando) | approved | rejected (refazer — motivo em "
        "analysis_reason) | review (coordenador vai decidir)",
    )
    analysis_reason: str | None = Field(
        None,
        description="Orientação PÚBLICA (o que fazer agora). O motivo técnico da IA — lado "
        "trocado, nome divergente, suspeita de adulteração — NÃO sai daqui: fica no "
        "validation_result e só o hub/staff lê.",
    )
    blocked: bool = Field(
        False,
        description="Reprovado: o aluno é levado direto pro RG ao entrar e só sai quando "
        "reenviar. Cai no reenvio e volta a subir se a IA reprovar de novo.",
    )
    validation_status: AnalysisStatus | None = Field(
        None, description="[DEPRECATED — use analysis_status] alias de compat"
    )
    validation_reason: str | None = None  # [DEPRECATED — use analysis_reason]
    missing_fields: list[str] = []  # o aluno completa SÓ esses (no PATCH)
    next_slot: str | None = None  # qual slot enviar AGORA (rg_front/rg_back/null)
    photos: dict = {}  # status por slot individual: {slot: {status, reason}}


class RgPatchIn(Schema):
    number: str | None = None
    issuing_agency: str | None = None
    issue_date: str | None = None  # AAAA-MM-DD
    mother_name: str | None = None
    father_name: str | None = None
    birthplace: str | None = None
    marital_status: str | None = None
    nationality: str | None = None


class SelfieOut(Schema):
    """GET /enrollment/selfie — a selfie é a ASSINATURA da matrícula (plan/13)."""

    exists: bool
    photo: str | None = None
    taken_at: str | None = None
    # canônico unificado (proposta #4): `analysis_status`/`analysis_reason` + `expires_at` (TTL #2).
    analysis_status: AnalysisStatus | None = Field(
        None, description="pending (analisando) | approved | rejected | review"
    )
    analysis_reason: str | None = None  # comentários da IA + instruções p/ ser aprovada
    expires_at: str | None = Field(
        None, description="Até quando o `pending` vale; depois vira `review` (TTL)."
    )
    status: AnalysisStatus | None = Field(
        None, description="[DEPRECATED — use analysis_status] alias de compat"
    )
    verified: bool = False
    description: str | None = None  # [DEPRECATED — use analysis_reason]
    attempts: int = Field(
        0,
        description="Selfies recusadas até aqui. Cada nova foto ENTRA na biometria e a nota do "
        "passo passa a ser a melhor já obtida — não se recomeça do zero a cada tentativa.",
    )


class EnrollmentProfileOut(Schema):
    mother_name: str | None = None
    father_name: str | None = None
    marital_status: str | None = None
    birthplace: str | None = None
    nationality: str | None = None


class RgOut(Schema):
    number: str | None = None
    issuing_agency: str | None = None
    issue_date: str | None = None
    front_photo: str | None = None
    back_photo: str | None = None
    full_photo: str | None = (
        None  # RG inteiro (frente+verso numa imagem) — alternativa ao par
    )
    # canônico unificado (proposta #4): `analysis_status`/`analysis_reason`.
    analysis_status: AnalysisStatus | None = Field(
        None,
        description="Validação por IA (plan/12): pending (analisando) | approved | rejected "
        "(refazer — motivo em analysis_reason) | review (coordenador vai decidir)",
    )
    analysis_reason: str | None = None  # o PORQUÊ do status (a IA sempre justifica)
    validation_status: AnalysisStatus | None = Field(
        None, description="[DEPRECATED — use analysis_status] alias de compat"
    )
    validation_reason: str | None = None  # [DEPRECATED — use analysis_reason]
    missing_fields: list[str] = []  # campos que o OCR não leu — o aluno digita só esses


class EducationOut(Schema):
    level: str | None = None
    grade: int | None = None
    completed: bool | None = None
    last_school: str | None = None
    city: str | None = None
    state: str | None = None
    last_year_when: str | None = None


class EnrollmentMeOut(EnrollmentOut):
    """Resposta CANÔNICA da matrícula (proposta #3): o /me e TODA mutação que mexe na máquina
    devolvem este shape completo — o front roteia pelo `status` sem re-fetch. Bloco None = vazio."""

    profile: EnrollmentProfileOut | None = None
    address_complete: bool = Field(
        description="[DEPRECATED — use address.missing_fields]"
    )
    address: AddressOut | None = None
    address_proof: AddressProofSectionOut | None = None
    rg: RgOut | None = None
    education: EducationOut | None = None
    selfie: SelfieOut | None = None
    blocks: list[dict] | None = None


def _enr_guard(request) -> str:
    """Gate role enrollment + devolve o external_id do aluno logado."""
    require_roles(request.auth, "enrollment")
    return request.auth.external_id


@api.get("/enrollment/me", response=EnrollmentMeOut, tags=["enrollment"])
def enrollment_me(request):
    """Estado COMPLETO da matrícula pro resume do wizard: status + cada seção já preenchida, numa chamada.

    Aceita também o STUDENT (plan/14, Victor 2026-06-12): depois de concluída, o aluno continua
    enxergando todos os dados da matrícula. A fase da taxa NUNCA aparece aqui (status mascarado —
    política interna do polo)."""
    require_roles(request.auth, "enrollment", "student")
    enr = enrollment_iface.get_for_user_external_id(request.auth.external_id)
    if enr is None:
        raise NotFound("Matrícula não encontrada.", code="ENROLLMENT_NOT_FOUND")
    return enrollment_iface.me_dict(enr)


# ── seção DOCUMENTO (primeira do wizard — plan/13) ───────────────────────────


class RgUploadAck(Schema):
    """Ack do upload do RG (proposta #2): a análise roda em 2º plano; o front sabe quando voltar a
    perguntar (`poll_after_ms`) e até quando o `pending` vale (`expires_at`, depois vira `review`)."""

    slot: Literal["front", "back", "full"]
    stored: str
    analysis_status: AnalysisStatus
    poll_after_ms: int
    expires_at: str | None = None
    analysis: str = Field(
        description="[DEPRECATED — use analysis_status] alias de compat"
    )


class DocClassifyOut(Schema):
    """Classificação RÁPIDA (síncrona) da foto ANTES do upload — reconhece e checa legibilidade;
    NÃO valida autenticidade. Alimenta
    a UI generativa (o front escolhe o componente). `is_document=null` = a IA não decidiu → o front
    confirma o tipo com a pessoa (erro da IA nunca bloqueia). A validação minuciosa segue assíncrona
    no upload do RG. `doc_type`: rg|cnh|null; `completeness`: front|back|full|null."""

    is_document: bool | None = None
    doc_type: str | None = None
    completeness: str | None = None
    is_legible: bool | None = None
    reason: str | None = None
    confidence: float | None = None


@api.post(
    "/enrollment/documents/rg/photo/{slot}", response=RgUploadAck, tags=["enrollment"]
)
def enrollment_rg_photo(request, slot: str, file: UploadedFile = File(...)):
    """Foto do RG — `slot` aceita **`front`**, **`back`** ou **`full`** (documento inteiro numa
    imagem). Arquivo: JPEG/PNG/WEBP ou **PDF** (convertido internamente). A análise por IA roda
    em 2º plano: acompanhe `analysis_status` (+ motivo e campos extraídos) no
    `GET /enrollment/documents/rg`, voltando a perguntar a cada `poll_after_ms`."""
    ext = _enr_guard(request)
    real_slot = resolve_rg_slot(slot)
    ack = enrollment_iface.upload_rg_photo(
        user_external_id=ext, slot=real_slot, upload=file
    )
    return {"slot": slot, "analysis": ack["analysis_status"], **ack}


@api.post(
    "/enrollment/documents/classify", response=DocClassifyOut, tags=["enrollment"]
)
def enrollment_document_classify(request, file: UploadedFile = File(...)):
    """Classificação RÁPIDA (síncrona) da foto ANTES de enviar — só reconhece (é doc? rg/cnh?
    inteiro/frente/verso?), NÃO valida. Alimenta a UI generativa: o front escolhe o componente
    (ex.: RG frente aprovada → pede o verso; CNH + aluno → rejeita e pede RG). A validação
    minuciosa (autenticidade + extração) segue assíncrona no upload da foto."""
    _enr_guard(request)  # só cliente do funil (não vaza o classificador pra fora)
    from integrations.ai import service as ai

    return ai.classify_document(
        file.read(),
        caller="enrollment.classify",
        mime_type=file.content_type or "application/octet-stream",
    )


@api.get("/enrollment/documents/rg", response=RgSectionOut, tags=["enrollment"])
def enrollment_rg_get(request):
    """Seção documento completa: fotos, validação (status+motivo), TODOS os campos extraídos
    pela IA (doc + filiação/naturalidade/nascimento) e `missing_fields` (o que falta digitar)."""
    ext = _enr_guard(request)
    return enrollment_iface.get_rg_section(user_external_id=ext)


@api.patch("/enrollment/documents/rg", response=EnrollmentMeOut, tags=["enrollment"])
def enrollment_rg_patch(request, payload: RgPatchIn):
    """Completa/CORRIGE manualmente o que a extração não trouxe (`missing_fields`): campos do
    documento (número/órgão/emissão) e do perfil (filiação/naturalidade/estado civil/nacionalidade).
    Devolve o **EnrollmentMe canônico** (proposta #3) — o detalhe do RG segue no GET da seção."""
    ext = _enr_guard(request)
    return enrollment_iface.patch_rg_section(
        user_external_id=ext, **payload.dict(exclude_none=True)
    )


# ── seção ENDEREÇO (plan/13: POST só com CEP) ────────────────────────────────
@api.get("/enrollment/address", response=AddressOut, tags=["enrollment"])
def enrollment_get_address(request):
    """GET do endereço + `missing_fields` (o que ainda falta preencher)."""
    ext = _enr_guard(request)
    return enrollment_iface.get_address(user_external_id=ext)


@api.post("/enrollment/address", response=EnrollmentMeOut, tags=["enrollment"])
def enrollment_address(request, payload: AddressCepIn):
    """Body só `{cep}`: acha no ViaCEP, grava o endereço e devolve o **EnrollmentMe canônico**
    (proposta #3) — `address.missing_fields` JÁ AVISA o que falta: `["number"]` = achou tudo, só
    falta o número; rua/bairro na lista = cidade de CEP único (digite no PATCH)."""
    ext = _enr_guard(request)
    return enrollment_iface.set_address_cep(user_external_id=ext, cep=payload.cep)


@api.patch("/enrollment/address", response=EnrollmentMeOut, tags=["enrollment"])
def enrollment_address_patch(request, payload: AddressDataIn):
    """Preenche/CORRIGE os demais campos — sobrescreve o que vier no payload (vazio/None é
    ignorado). Devolve o EnrollmentMe canônico (proposta #3)."""
    ext = _enr_guard(request)
    return enrollment_iface.set_address_data(
        user_external_id=ext, **payload.dict(exclude_none=True)
    )


@api.post("/enrollment/address/proof", response=EnrollmentMeOut, tags=["enrollment"])
def enrollment_address_proof(request, file: UploadedFile = File(...)):
    """Comprovante de residência (JPEG/PNG/WEBP/PDF) — OBRIGATÓRIO, validado por IA (endereço +
    titular, F1). Assíncrono: acompanhe `address_proof.status` no `me` até `approved`/`rejected`/
    `review`/`needs_kinship`. `needs_kinship` → POST /enrollment/address/proof/kinship."""
    ext = _enr_guard(request)
    return enrollment_iface.upload_address_proof(user_external_id=ext, upload=file)


@api.post(
    "/enrollment/address/proof/kinship", response=EnrollmentMeOut, tags=["enrollment"]
)
def enrollment_address_proof_kinship(request, payload: KinshipIn):
    """Titular do comprovante é outra pessoa: informe quem é e o grau de parentesco → libera e avança."""
    ext = _enr_guard(request)
    return enrollment_iface.submit_address_proof_kinship(
        user_external_id=ext, relation=payload.relation
    )


# ── seção EDUCAÇÃO ───────────────────────────────────────────────────────────
@api.get("/enrollment/education", response=EducationOut, tags=["enrollment"])
def enrollment_get_education(request):
    """GET dos dados educacionais (tudo None = ainda não preenchido)."""
    ext = _enr_guard(request)
    return enrollment_iface.get_education(user_external_id=ext)


@api.post("/enrollment/education", response=EnrollmentMeOut, tags=["enrollment"])
def enrollment_education(request, payload: EducationIn):
    """Grava os dados escolares e devolve o **EnrollmentMe canônico** (proposta #3) — o corpo já
    traz o novo `status` (ex.: `selfie`), sem GET extra."""
    ext = _enr_guard(request)
    enr = enrollment_iface.set_education(
        user_external_id=ext,
        level=payload.level,
        grade=payload.grade,
        completed=payload.completed,
        last_school=payload.last_school,
        city=payload.city,
        state=payload.state,
        last_year_when=payload.last_year_when,
    )
    return enrollment_iface.me_dict(enr)


# ── seção SELFIE (= a ASSINATURA da matrícula — plan/13) ─────────────────────
@api.get("/enrollment/selfie", response=SelfieOut, tags=["enrollment"])
def enrollment_get_selfie(request):
    """Foto, quando foi enviada, status da análise e os comentários da IA/biometria (inclusive
    instruções de como ser aprovada, se reprovou). `exists: false` = ainda não enviada."""
    ext = _enr_guard(request)
    return enrollment_iface.get_selfie(user_external_id=ext)


@api.post("/enrollment/selfie", response=EnrollmentMeOut, tags=["enrollment"])
def enrollment_selfie(request, file: UploadedFile = File(...)):
    """Envia a selfie (assinatura). A análise roda em 2º plano (IA + biometria vs rosto do
    DOCUMENTO): acompanhe `analysis_status` no `GET /enrollment/selfie` (`pending` = analisando),
    voltando a perguntar a cada `poll_after_ms` (a resposta já traz o ack — proposta #2) e o
    **EnrollmentMe canônico** (proposta #3).

    A selfie É a assinatura do contrato (lane #6): o aceite LGPD (versão/hash do contrato + IP +
    user-agent + timestamp) é gravado no ato do envio."""
    ext = _enr_guard(request)
    # G-uploads: valida tamanho (MAX_UPLOAD_MB, ANTES de ler) + content-type + decode real, em vez
    # do `file.read()` cru que aceitava 2 GB (OOM) e bytes não-imagem.
    image_bytes, content_type = documents_iface.read_image_upload(file)
    enr = enrollment_iface.set_selfie(
        user_external_id=ext,
        image_bytes=image_bytes,
        content_type=content_type,
        consent_ip=source_ip(request),
        consent_user_agent=request.headers.get("user-agent"),
    )
    return {**enrollment_iface.me_dict(enr), **enrollment_iface.selfie_ack(enr)}


class ContractOut(Schema):
    """Contrato de matrícula versionado (lane #6): o front exibe `text` e, ao enviar a selfie,
    assina implicitamente a `version`/`hash` retornadas aqui."""

    version: str
    hash: str
    text: str


@api.get("/contract/current", response=ContractOut, tags=["enrollment"])
def get_current_contract(request):
    """Contrato de matrícula ATUAL (texto + versão + hash SHA-256). Fonte da verdade no backend
    (`users/consent`); a selfie é a assinatura deste aceite."""
    return STUDENT_CONTRACT.as_dict()


# ── aluno: funil final student→veteran (autenticado, role student) — §4 item 9 ──
# ⚠️ NÃO TESTADO (nem in-process completo, nem com aluno/IA real).
class BloodTypeIn(Schema):
    blood_type: str  # A+/A-/B+/B-/AB+/AB-/O+/O-


class ExamScheduleIn(Schema):
    subject: str
    scheduled_at: str  # ISO 8601 (ex.: 2026-06-10T14:00:00-03:00)


class StudentDocumentUploadAck(Schema):
    """Ack do upload de documento do aluno: a análise por IA roda em 2º plano; o front acompanha
    `analysis_status` no `GET /student/me`, voltando a perguntar a cada `poll_after_ms`."""

    doc_type: str
    stored: bool
    analysis_status: AnalysisStatus
    poll_after_ms: int
    expires_at: str | None = None


def _student_guard(request) -> str:
    """Gate role student + devolve o external_id do aluno logado."""
    require_roles(request.auth, "student")
    return request.auth.external_id


def _student_dict(ext: str):
    s = student_iface.get_for_user_external_id(ext)
    if s is None:
        raise NotFound("Aluno não encontrado.", code="STUDENT_NOT_FOUND")
    return student_iface.to_dict(s)


@api.get("/student/me", response=StudentMeOut, tags=["student"])
def student_me(request):
    return _student_dict(_student_guard(request))


def _veteran_guard(request) -> str:
    """Gate role veteran + devolve o external_id do veterano logado."""
    require_roles(request.auth, "veteran")
    return request.auth.external_id


@api.get("/veteran/me", tags=["veteran"])
def veteran_me(request):
    """Visão consolidada do VETERANO: TODOS os dados dele — pessoais, matrícula (perfil/endereço/
    escolaridade/RG/selfie), os documentos que ELE postou e o que o COORDENADOR postou (diploma +
    histórico + foto da retirada). Read-only. Paths de mídia relativos; o front prefixa /media/.

    A composição student × enrollment mora aqui (e não no `student.service`) porque `enrollment`
    já importa `student` no `conclude` — cruzar de volta lá dentro fecharia ciclo de import."""
    external_id = _veteran_guard(request)
    data = student_iface.veteran_detail(user_external_id=external_id)

    # bloco da MATRÍCULA — o enrollment persiste após o aluno virar student (nada o deleta).
    enr = enrollment_iface.get_for_user_external_id(external_id)
    me = enrollment_iface.me_dict(enr) if enr is not None else None
    data["enrollment"] = (
        None
        if me is None
        else {k: me.get(k) for k in ("profile", "address", "education", "rg", "selfie")}
    )
    return data


@api.post("/student/blood-type", response=StudentMeOut, tags=["student"])
def student_blood_type(request, payload: BloodTypeIn):
    ext = _student_guard(request)
    student_iface.set_blood_type(user_external_id=ext, blood_type=payload.blood_type)
    return _student_dict(ext)


@api.post(
    "/student/documents/{doc_type}", response=StudentDocumentUploadAck, tags=["student"]
)
def student_document(request, doc_type: str, file: UploadedFile = File(...)):
    ext = _student_guard(request)
    # G-uploads: valida tamanho + content-type + decode real antes de materializar os bytes.
    image_bytes, content_type = documents_iface.read_image_upload(file)
    doc, ack = student_iface.upload_document(
        user_external_id=ext,
        doc_type=doc_type,
        image_bytes=image_bytes,
        content_type=content_type,
    )
    return {
        "doc_type": doc_type,
        "stored": bool(doc.photo),
        "analysis_status": ack["analysis_status"],
        "poll_after_ms": ack["poll_after_ms"],
        "expires_at": ack["expires_at"],
    }


@api.post("/student/exam/schedule", response=StudentMeOut, tags=["student"])
def student_exam_schedule(request, payload: ExamScheduleIn):
    ext = _student_guard(request)
    student_iface.schedule_exam(
        user_external_id=ext,
        subject=payload.subject,
        scheduled_at=payload.scheduled_at,
    )
    return _student_dict(ext)


@api.get("/student/pendencies", response=list[PendencyOut], tags=["student"])
def student_pendencies(request):
    ext = _student_guard(request)
    pends = student_iface.list_pendencies(ext, open_only=True)
    return [
        {
            "external_id": str(p.external_id),
            "kind": p.kind,
            "description": p.description,
            "amount_cents": p.amount_cents,
        }
        for p in pends
    ]


# ── blocos de validação (polling do frontend) ─────────────────────────────────
@api.get("/me/blocks", response=list[BlockOut], tags=["blocks"])
def my_blocks(request):
    """Bloqueios ativos: validações que rejeitaram e o aluno PRECISA resolver.
    O front faz polling aqui; se voltar com itens, exibe modal bloqueante."""
    from users.auth.models import User

    user = User.objects.filter(external_id=request.auth.external_id).first()
    if user is None:
        return []
    return [blocks_svc.to_dict(b) for b in blocks_svc.get_active_blocks(user)]


@api.get("/me/blocks/{block_id}", response=BlockOut, tags=["blocks"])
def my_block(request, block_id: int):
    """Busca 1 bloco por ID (deep-link do modal). 404 se não pertence ao user."""
    from users.auth.models import User
    from users.exceptions import NotFound

    user = User.objects.filter(external_id=request.auth.external_id).first()
    block = blocks_svc.get_by_id(user=user, block_id=block_id) if user else None
    if block is None:
        raise NotFound("Bloco não encontrado.", code="BLOCK_NOT_FOUND")
    return blocks_svc.to_dict(block)


@api.post("/me/blocks/{block_external_id}/resolve", response=BlockOut, tags=["blocks"])
def resolve_block(request, block_external_id: str):
    """Resolve manualmente um bloco (ex.: usuário descartou a rejeição, ou coordenador aprovou
    externamente). Em geral o bloco resolve sozinho no re-upload — esse endpoint é o fallback."""
    try:
        block_id = int(block_external_id)
    except ValueError:
        raise NotFound("Bloco não encontrado.", code="BLOCK_NOT_FOUND")
    from users.auth.models import User

    user = User.objects.filter(external_id=request.auth.external_id).first()
    if user is None:
        raise NotFound("Bloco não encontrado.", code="BLOCK_NOT_FOUND")
    block = blocks_svc.resolve_by_id(user=user, block_id=block_id)
    if block is None:
        raise NotFound("Bloco não encontrado.", code="BLOCK_NOT_FOUND")
    return blocks_svc.to_dict(block)
