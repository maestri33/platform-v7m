"""Grupo `staff` — administração da plataforma (o "boss": cadastra hub, define coordenador).

Todas as rotas exigem SUPERUSER (staff = superuser nativo do Django — Victor 2026-06-03), via
`require_superuser`. Casca fina (CONVENTION §3): valida a borda e chama o `interface/` do `hub` e do
`users/roles`. Zero regra de negócio aqui.
"""

from __future__ import annotations

from django.conf import settings
from ninja import File, Form, Header, Router, Schema
from ninja.errors import HttpError
from ninja.files import UploadedFile

from api.auth import require_superuser
from api.base import add_auth_refresh, build_group
from api.schemas import MaterialIn, MaterialUpdateIn, TokenOut
from finance import interface as finance_iface
from finance.interface import commissions as finance_closing
from finance.interface import manual as finance_manual
from hub import interface as hub_iface
from integrations import status as integ_status
from integrations.bank.asaas import onboarding as asaas_onboarding
from users.auth import service as auth_iface
from users.exceptions import Conflict, NotFound, ValidationError
from users.profiles import interface as profiles
from users.roles import interface as roles
from users.roles.enrollment import service as enrollment_iface
from users.roles.lead import service as lead_iface
from users.roles.student import service as student_iface
from users.roles.training import service as training_iface

api = build_group(
    "staff", "Administração da plataforma: hub, coordenador, saúde dos serviços."
)


# ── staff/auth — login do STAFF (superuser puro, sem role de funil — Victor 2026-06-30) ──
# O login do cliente (clients/auth) EXIGE uma role de funil → um superuser PURO tomava
# NOT_IN_FUNNEL. Aqui o gate é is_superuser (não role): espelha o check/login do cliente, mas só
# enxerga staff. Públicas (auth=None) — é a porta de ENTRADA do app de staff.
auth_router = Router(tags=["auth"])


class StaffCheckIn(Schema):
    cpf: str | None = None
    phone: str | None = None
    external_id: str | None = None


class StaffCheckOut(Schema):
    found: bool
    external_id: str | None = None
    otp_sent: bool
    otp_wait: int | None = None


class StaffLoginIn(Schema):
    external_id: str
    otp: str


@auth_router.post("/check", response=StaffCheckOut, auth=None)
def staff_check(request, payload: StaffCheckIn):
    """Acha o STAFF (superuser) por cpf/phone/external_id e dispara OTP. NÃO vaza quem é staff:
    usuário comum (ou inexistente) sai `found:false` igual."""
    return auth_iface.check_staff(
        cpf=payload.cpf, phone=payload.phone, external_id=payload.external_id
    )

@auth_router.post("/login", response=TokenOut, auth=None)
def staff_login(request, payload: StaffLoginIn):
    """Login passwordless (OTP) do STAFF — exige is_superuser (não role de funil) e emite JWT.
    Não-superuser → 403 `NOT_STAFF`."""
    return auth_iface.login_staff(external_id=payload.external_id, otp=payload.otp)


add_auth_refresh(auth_router)
api.add_router("/auth", auth_router)


# ── schemas ──────────────────────────────────────────────────────────────
class HubCreateIn(Schema):
    brand: str
    coordinator_external_id: str | None = None


class SetCoordinatorIn(Schema):
    coordinator_external_id: str


class HubAddressIn(Schema):
    cep: str
    number: str | None = None
    complement: str | None = None


class HubOut(Schema):
    external_id: str
    brand: str
    coordinator_external_id: str | None
    is_default: bool


class PromoterOut(Schema):
    external_id: str
    name: str | None


def _hub_out(hub) -> dict:
    return {
        "external_id": str(hub.external_id),
        "brand": hub.brand,
        "coordinator_external_id": (
            str(hub.coordinator.external_id) if hub.coordinator else None
        ),
        "is_default": hub.is_default,
    }


# ── tradução de erro de borda → envelope padrão `{detail, code}` (proposta API #5) ──
# O `hub`/`finance` levantam Exception com SLUG na mensagem (ex.: "hub_not_found"). Aqui viram
# DomainError com `code` UPPER_SNAKE estável (o front faz `switch(code)`), mantendo o MESMO status.
_HUB_ERROR_DETAIL = {
    "hub_not_found": "Polo não encontrado.",
    "coordinator_not_found": "Coordenador não encontrado.",
    "coordinator_not_promoter": "O coordenador precisa ser um promotor ativo.",
}
_MANUAL_PAYMENT_DETAIL = {
    "invalid_amount": "Valor inválido.",
    "amount_must_be_positive": "O valor deve ser positivo.",
    "pix_key_required": "Chave PIX obrigatória.",
    "line_code_required": "Linha digitável do boleto obrigatória.",
}


def _raise_hub_error(exc: Exception):
    """HubError (slug) → DomainError com code. `hub_not_found` é 404; o resto é 422 (mesmo status
    que o `HttpError` cru devolvia antes)."""
    slug = str(exc)
    if slug.startswith("invalid_brand:"):
        raise ValidationError(
            "Marca inválida (fora do catálogo).", code="INVALID_BRAND"
        ) from exc
    code = slug.upper()
    detail = _HUB_ERROR_DETAIL.get(slug, slug)
    if slug == "hub_not_found":
        raise NotFound(detail, code=code) from exc
    raise ValidationError(detail, code=code) from exc


def _raise_manual_payment_error(exc: Exception):
    """ManualPaymentError (slug) → 422 `PAYMENT_<SLUG>` (mantém o 422 do HttpError cru)."""
    slug = str(exc)
    detail = _MANUAL_PAYMENT_DETAIL.get(slug, slug)
    raise ValidationError(detail, code=f"PAYMENT_{slug.upper()}") from exc


# ── rotas (todas exigem superuser) ─────────────────────────────────────────
@api.post("/hubs", response=HubOut, tags=["staff"])
def create_hub(request, payload: HubCreateIn):
    """Cria um polo: marca (do catálogo) + coordenador opcional (um promotor)."""
    require_superuser(request.auth)
    try:
        hub = hub_iface.create_hub(
            brand=payload.brand,
            coordinator_external_id=payload.coordinator_external_id,
        )
    except hub_iface.HubError as exc:
        _raise_hub_error(exc)
    return _hub_out(hub)


@api.get("/hubs", response=list[HubOut], tags=["staff"])
def list_hubs(request):
    """Lista todos os polos."""
    require_superuser(request.auth)
    return [_hub_out(h) for h in hub_iface.list_hubs()]


@api.get("/promoters", response=list[PromoterOut], tags=["staff"])
def list_promoters(request):
    """Lista os promotores (pra escolher quem será coordenador de um polo)."""
    require_superuser(request.auth)
    base = roles.users_with_role("promoter")
    pmap = profiles.get_map(base)
    out = []
    for user in base:
        p = pmap.get(user.id)
        out.append(
            {
                "external_id": str(user.external_id),
                "name": p.name if p else None,
            }
        )
    return out


@api.put("/hubs/{external_id}/coordinator", response=HubOut, tags=["staff"])
def set_coordinator(request, external_id: str, payload: SetCoordinatorIn):
    """Designa/troca o coordenador de um polo (um promotor)."""
    require_superuser(request.auth)
    try:
        hub = hub_iface.set_coordinator(
            hub_external_id=external_id,
            coordinator_external_id=payload.coordinator_external_id,
        )
    except hub_iface.HubError as exc:
        _raise_hub_error(exc)
    return _hub_out(hub)


@api.put("/hubs/{external_id}/default", response=HubOut, tags=["staff"])
def set_default_hub(request, external_id: str):
    """Marca um polo como PADRÃO (fallback de captação; único — desmarca os outros)."""
    require_superuser(request.auth)
    try:
        hub = hub_iface.set_default(external_id)
    except hub_iface.HubError as exc:
        _raise_hub_error(exc)
    return _hub_out(hub)


@api.patch("/hubs/{external_id}/address", response=HubOut, tags=["staff"])
def set_hub_address(request, external_id: str, payload: HubAddressIn):
    """Preenche o endereço do polo pelo CEP (ViaCEP) — o polo nasce com endereço vazio. CEP
    inexistente → 422 `CEP_NOT_FOUND` (envelope central)."""
    require_superuser(request.auth)
    try:
        hub = hub_iface.set_address(
            hub_external_id=external_id,
            cep=payload.cep,
            number=payload.number,
            complement=payload.complement,
        )
    except hub_iface.HubError as exc:
        _raise_hub_error(exc)
    return _hub_out(hub)


# ── autoria de matéria do treino (SÓ staff — Victor 2026-06-29: saiu do leadership) ──
# MaterialIn/MaterialUpdateIn vêm do módulo compartilhado (plan/15 A7). O coordenador, que é
# obrigatoriamente promotor, VÊ as matérias pelo funil de promotor (collaborators); autoria é staff.
@api.post("/training/materials", tags=["staff"])
def create_material(request, payload: MaterialIn):
    """Cria uma matéria do treino (texto+questão+gabarito)."""
    require_superuser(request.auth)
    m = training_iface.create_material(**payload.dict())
    return training_iface.material_to_dict(m, include_answer=True)


@api.put("/training/materials/{external_id}", tags=["staff"])
def update_material(request, external_id: str, payload: MaterialUpdateIn):
    """Edita uma matéria (campos enviados; `active=False` desativa)."""
    require_superuser(request.auth)
    m = training_iface.update_material(external_id, **payload.dict())
    return training_iface.material_to_dict(m, include_answer=True)


@api.get("/training/materials", tags=["staff"])
def list_materials(request):
    """Lista todas as matérias (com gabarito — visão de autoria)."""
    require_superuser(request.auth)
    return [
        training_iface.material_to_dict(m, include_answer=True)
        for m in training_iface.list_materials(active_only=False)
    ]


@api.post("/training/materials/{external_id}/publish", tags=["staff"])
def publish_material(request, external_id: str):
    """Publica uma matéria TRANSITÓRIA → atribui aos promotores JÁ existentes + re-trava + notifica.
    (As FIXAS não precisam: entram em cada novo promotor ao ser aprovado.)"""
    require_superuser(request.auth)
    return training_iface.publish_transitory(external_id)


@api.delete("/training/materials/{external_id}", tags=["staff"])
def delete_material(request, external_id: str):
    """Descarta uma matéria EFÊMERA (descartável). Não-efêmera → desative com update `active=False`."""
    require_superuser(request.auth)
    training_iface.delete_material(external_id)
    return {"deleted": external_id}


@api.post("/training/materials/{external_id}/video", tags=["staff"])
def upload_material_video(request, external_id: str, file: UploadedFile = File(...)):
    """Staff sobe o VÍDEO da matéria (1 por matéria; substitui o anterior). Salva em media/training/
    e devolve a matéria com o `video` (path relativo; o front prefixa /media/). Formato inválido →
    422 `INVALID_VIDEO_TYPE`; matéria inexistente → 404 `MATERIAL_NOT_FOUND`."""
    require_superuser(request.auth)
    m = training_iface.set_material_video(
        external_id,
        data=file.read(),
        content_type=getattr(file, "content_type", "video/mp4"),
    )
    return training_iface.material_to_dict(m, include_answer=True)


# ── leads (staff vê TODOS; filtra por polo) ──────────────────────────────────
@api.get("/leads", tags=["lead"])
def list_all_leads(request, hub: str | None = None, status: str | None = None):
    """Lista TODOS os leads (link de pagamento + comprovante). Filtros: `hub` (external_id) e `status`."""
    require_superuser(request.auth)
    hub_obj = None
    if hub:
        # hub passado mas inexistente → 404 (não cair silenciosamente em "todos os leads")
        hub_obj = hub_iface.get_by_external_id(hub)
        if hub_obj is None:
            raise NotFound("Polo não encontrado.", code="HUB_NOT_FOUND")
    leads = lead_iface.list_leads(hub=hub_obj, status=status)
    return [lead_iface.lead_to_dict(lead) for lead in leads]


# ── resgate de lead sem pagamento ────────────────────────────────────────────────
@api.post("/leads/{external_id}/mark-paid", tags=["staff"])
def mark_lead_paid(request, external_id: str):
    """Staff força o pagamento de um lead (webhook perdido, pagamento manual, etc.).
    Promove lead→enrollment como se o webhook tivesse chegado."""
    require_superuser(request.auth)
    from users.roles.lead import service as lead_iface

    lead = lead_iface.get_by_external_id(external_id)
    if lead is None:
        raise NotFound("Lead não encontrado.", code="LEAD_NOT_FOUND")
    if not lead.payment_id:  # ponytail: sem checkout = sem pagamento pra marcar
        raise Conflict("Lead não tem checkout de pagamento.", code="NO_CHECKOUT")
    lead_iface.mark_paid(
        provider=lead.payment.provider,
        provider_payment_id=lead.payment_id,
    )
    return {"detail": "Pagamento confirmado. Lead promovido a enrollment."}


# ── purge de lead/candidato (staff apaga registro de teste por completo — Victor 2026-07-04) ──
@api.delete("/funnel-user", tags=["staff"])
def purge_funnel_user(
    request,
    user_external_id: str | None = None,
    lead_external_id: str | None = None,
    candidate_external_id: str | None = None,
    cpf: str | None = None,
    phone: str | None = None,
):
    """APAGA por completo um usuário do funil (lead e/ou candidato) — ATÔMICO e IRREVERSÍVEL.

    Identifique por UM dos parâmetros: `user_external_id`, `lead_external_id`,
    `candidate_external_id`, `cpf` ou `phone`. Cascade leva Profile, Lead+Checkout, Candidate,
    documentos, matrícula, aluno, OTPs, biometria… — libera CPF/telefone pra novo cadastro.
    Recusa staff (`PURGE_STAFF_FORBIDDEN` 403), coordenador/promotor/quem tem financeiro
    (`USER_NOT_PURGEABLE` 409 + `reason`). Sem identificador → 422 `MISSING_FIELD`."""
    require_superuser(request.auth)
    return roles.purge_funnel_user(
        user_external_id=user_external_id,
        lead_external_id=lead_external_id,
        candidate_external_id=candidate_external_id,
        cpf=cpf,
        phone=phone,
    )


# ── financeiro (WP6: saldo Asaas + comissões + fila de payouts + resumo) ─────
@api.get("/finance/balance", tags=["staff"])
def finance_balance(request):
    """Saldo da conta Asaas (read-only — NÃO move dinheiro)."""
    require_superuser(request.auth)
    return asaas_onboarding.account_balance()


@api.get("/finance/summary", tags=["staff"])
def finance_summary(request):
    """Resumo por status (contagem + total em reais) de comissões e da fila de saída."""
    require_superuser(request.auth)
    return finance_iface.summary()


@api.get("/finance/commissions", tags=["staff"])
def finance_commissions(request, status: str | None = None):
    """Comissões (filtro opcional por status: pending/processed/paid/failed)."""
    require_superuser(request.auth)
    return finance_iface.list_commissions(status=status)


@api.get("/finance/payouts", tags=["staff"])
def finance_payouts(request, status: str | None = None, kind: str | None = None):
    """Solicitações de pagamento / payouts (filtros: status; kind=commission|fee|manual)."""
    require_superuser(request.auth)
    return finance_iface.list_payment_requests(status=status, kind=kind)


# ── pagamento avulso (staff manda PIX/boleto a um terceiro livre — Victor 2026-06-29) ──
# Multipart: a imagem (recibo) é opcional. PRODUÇÃO REAL: o worker (Django-Q) é quem move o dinheiro
# pela fila money-safe (idempotente + retry); aqui só enfileira.
@api.post("/finance/payments", tags=["staff"])
def create_manual_payment(
    request,
    kind: str = Form(...),  # "pix" | "boleto"
    amount: str | None = Form(None),  # reais; obrigatório no PIX, opcional no boleto
    description: str | None = Form(None),
    supplier_name: str | None = Form(None),
    pix_key: str | None = Form(None),  # kind=pix
    boleto_line: str | None = Form(None),  # kind=boleto (linha digitável)
    receipt: UploadedFile | None = File(None),  # comprovante opcional
    idempotency_key: str | None = Header(None, alias="Idempotency-Key"),
):
    """Enfileira um pagamento avulso a um terceiro LIVRE (não precisa ser usuário): PIX por chave ou
    boleto por linha digitável, pela conta Asaas. Anexa um comprovante opcional. Entra na mesma fila
    de saída (visível em GET /finance/payouts, kind=manual). Validação inválida → 422.

    DINHEIRO REAL: exige o header `Idempotency-Key` (um uuid do front). A `external_reference` é
    derivada dela → um retry com a mesma key devolve o pagamento já criado em vez de disparar um 2º
    PIX. Sem a key → 422 `IDEMPOTENCY_KEY_REQUIRED` (fail-closed)."""
    require_superuser(request.auth)
    if not (idempotency_key or "").strip():
        raise HttpError(422, "IDEMPOTENCY_KEY_REQUIRED")

    receipt_path = None
    if receipt is not None:
        from core.media import save_media

        ext = (getattr(receipt, "name", "") or "").rsplit(".", 1)[-1].lower() or "jpg"
        receipt_path = save_media(prefix="receipt", data=receipt.read(), ext=ext)

    try:
        if kind == "pix":
            pr = finance_manual.request_pix_payment(
                amount=amount,
                pix_key=pix_key,
                supplier_name=supplier_name,
                description=description,
                receipt=receipt_path,
                idempotency_key=idempotency_key,
            )
        elif kind == "boleto":
            pr = finance_manual.request_boleto_payment(
                line_code=boleto_line,
                amount=amount,
                supplier_name=supplier_name,
                description=description,
                receipt=receipt_path,
                idempotency_key=idempotency_key,
            )
        else:
            raise ValidationError(
                "kind deve ser 'pix' ou 'boleto'.", code="PAYMENT_INVALID_KIND"
            )
    except finance_manual.ManualPaymentError as exc:
        _raise_manual_payment_error(exc)
    return {
        "external_id": str(pr.external_id),
        "kind": pr.kind,
        "method": pr.method,
        "amount": str(pr.amount),
        "status": pr.status,
        "external_reference": pr.external_reference,
        "receipt": pr.receipt,
    }


# ── fechamento semanal (staff adianta o "sexta 18h" e mede a saúde — Victor 2026-06-29) ──
@api.post("/finance/closing/run", tags=["staff"])
def run_closing(request):
    """Adianta o fechamento da semana corrente (em vez de esperar a sexta 18h). Idempotente: re-rodar
    a mesma semana é no-op (cada beneficiário já fechado é pulado). Devolve o resumo do fechamento."""
    require_superuser(request.auth)
    return finance_closing.run_weekly_closing()


@api.get("/finance/closing/health", tags=["staff"])
def closing_health(request):
    """Saúde do fechamento: cruza o SALDO da conta Asaas (lido ao vivo) com a OBRIGAÇÃO estimada
    (comissões pendentes da semana + fila de saída ativa). Diz se o saldo cobre — e o déficit se não."""
    require_superuser(request.auth)
    from decimal import Decimal

    obligation = finance_iface.closing_obligation()
    estimated = Decimal(obligation["obrigacao_estimada"])

    balance = asaas_onboarding.account_balance()
    saldo = balance.get("balance") if isinstance(balance, dict) else None
    if saldo is None:
        # saldo indisponível (sem key/erro de rede): reporta sem chutar suficiência.
        return {
            **obligation,
            "saldo": None,
            "suficiente": None,
            "deficit": None,
            "balance_error": balance.get("error")
            if isinstance(balance, dict)
            else True,
        }
    saldo_dec = Decimal(str(saldo)).quantize(Decimal("0.01"))
    deficit = estimated - saldo_dec
    return {
        **obligation,
        "saldo": str(saldo_dec),
        "suficiente": saldo_dec >= estimated,
        "deficit": str(deficit) if deficit > 0 else "0.00",
    }


# ── integrações (WP6: status/config + fluxo + ações setup/test) ─────────────
@api.get("/integrations", tags=["staff"])
def list_integrations(request):
    """Saúde/config de TODAS as integrações (read-only): env presente + fluxo + último do ledger."""
    require_superuser(request.auth)
    return integ_status.list_integrations()


@api.get("/integrations/{name}", tags=["staff"])
def integration_detail(request, name: str):
    """Detalhe de uma integração (asaas faz run_checks AO VIVO: saldo + webhook)."""
    require_superuser(request.auth)
    data = integ_status.integration_detail(name)
    if data is None:
        raise NotFound("Integração não encontrada.", code="INTEGRATION_NOT_FOUND")
    return data


@api.post("/integrations/asaas/setup", tags=["staff"])
def integration_setup(request):
    """Cadastra ou atualiza o webhook do Asaas. Idempotente."""
    require_superuser(request.auth)
    from integrations.bank.asaas import onboarding

    return onboarding.setup()


@api.post("/integrations/asaas/test", tags=["staff"])
def integration_test(request):
    """Executa e registra a bateria de saúde do Asaas."""
    require_superuser(request.auth)
    from integrations.bank.asaas import onboarding

    return onboarding.run_checks(record=True)


# ── status do servidor (WP6) ─────────────────────────────────────────────────
@api.get("/system", tags=["staff"])
def system_status(request):
    """Saúde do servidor: DB, migrações pendentes, qcluster (Django-Q) + fila, DEBUG, EXTERNAL_URL."""
    require_superuser(request.auth)
    from django.db import connection
    from django.db.migrations.executor import MigrationExecutor

    db_ok = True
    try:
        with connection.cursor() as c:
            c.execute("SELECT 1")
    except Exception:  # noqa: BLE001
        db_ok = False
    executor = MigrationExecutor(connection)
    pending = executor.migration_plan(executor.loader.graph.leaf_nodes())
    clusters: list = []
    queued = None
    try:
        from django_q.models import OrmQ
        from django_q.status import Stat

        clusters = [s.cluster_id for s in Stat.get_all()]
        queued = OrmQ.objects.count()
    except Exception:  # noqa: BLE001
        pass
    return {
        "db_ok": db_ok,
        "migrations_pending": [f"{m.app_label}.{m.name}" for m, _ in pending],
        "qcluster_alive": bool(clusters),
        "qcluster_count": len(clusters),
        "queued_tasks": queued,
        "debug": settings.DEBUG,
        "external_url": settings.EXTERNAL_URL,
    }


@api.get("/logs/ai-calls", tags=["staff"])
def logs_ai_calls(request, status: str | None = None, limit: int = 100):
    """Chamadas de IA (provider/modelo/operação/custo/erro/latência) — o ledger `AiCall`."""
    require_superuser(request.auth)
    from integrations.ai.models import AiCall

    qs = AiCall.objects.order_by("-created_at")
    if status:
        qs = qs.filter(status=status)
    return [
        {
            "provider": a.provider,
            "model": a.model,
            "operation": a.operation,
            "caller": a.caller,
            "status": a.status,
            "cost": str(a.cost) if a.cost is not None else None,
            "latency_ms": a.latency_ms,
            "error": a.error,
            "created_at": a.created_at.isoformat(),
        }
        for a in qs[:limit]
    ]


@api.get("/logs/checks", tags=["staff"])
def logs_checks(request, scope: str | None = None, limit: int = 100):
    """Histórico do ledger de validação (`ValidationCheck` — testes carimbados)."""
    require_superuser(request.auth)
    from core.models import ValidationCheck

    qs = ValidationCheck.objects.order_by("-checked_at")
    if scope:
        qs = qs.filter(scope=scope)
    return [
        {
            "scope": c.scope,
            "name": c.name,
            "passed": c.passed,
            "mode": c.mode,
            "detail": c.detail,
            "checked_at": c.checked_at.isoformat(),
        }
        for c in qs[:limit]
    ]


# ── visão global (todos os polos) — WP6-D ────────────────────────────────────
@api.get("/enrollments", tags=["enrollment"])
def list_all_enrollments(request, hub: str | None = None, status: str | None = None):
    """Matrículas de TODOS os polos (filtros: `hub` external_id, `status`)."""
    require_superuser(request.auth)
    return enrollment_iface.list_for_staff(hub_external_id=hub, status=status)


@api.get("/students", tags=["student"])
def list_all_students(request, hub: str | None = None, status: str | None = None):
    """Alunos de TODOS os polos (filtros: `hub` external_id, `status`)."""
    require_superuser(request.auth)
    return student_iface.list_for_staff(hub_external_id=hub, status=status)


# ── credenciais da plataforma (SÓ staff altera após a conclusão — Victor 2026-06-23) ──
class PlatformCredentialsIn(Schema):
    platform_login: str
    platform_password: str
    platform_url: str | None = None
    platform_notes: str | None = None


@api.put("/students/{external_id}/platform-credentials", tags=["student"])
def set_student_platform_credentials(
    request, external_id: str, payload: PlatformCredentialsIn
):
    """Staff corrige login/senha (e url/notes) da plataforma de um aluno JÁ concluído. SÓ staff
    altera depois de concluído; coordenadores não podem fazê-lo. Login é ÚNICO por
    matrícula → 409 `PLATFORM_LOGIN_TAKEN` se repetir; aluno inexistente → 404."""
    require_superuser(request.auth)
    student = student_iface.set_platform_credentials(
        student_external_id=external_id,
        platform_login=payload.platform_login,
        platform_password=payload.platform_password,
        platform_url=payload.platform_url,
        platform_notes=payload.platform_notes,
    )
    return {"external_id": str(student.external_id), "status": student.status}


# ── usuários da plataforma (read-only; mutação de role = «PENDÊNCIA» Victor) ──
@api.get("/users", tags=["staff"])
def list_users(request, role: str | None = None, limit: int = 200):
    """Usuários + roles ativas (filtro opcional por `role`). Read-only — a mudança de role pelo staff
    fica pra depois (regra do Victor: "dentro do cabível")."""
    require_superuser(request.auth)
    from users.auth.models import User

    if role:
        base = roles.users_with_role(role)[:limit]
    else:
        base = list(User.objects.order_by("-id")[:limit])
    pmap = profiles.get_map(base)
    out = []
    for u in base:
        p = pmap.get(u.id)
        out.append(
            {
                "external_id": str(u.external_id),
                "name": p.name if p else None,
                "cpf": p.cpf if p else None,
                "phone": p.phone if p else None,
                "is_superuser": u.is_superuser,
                "roles": roles.active_roles(u),
            }
        )
    return out


# ── health check autenticado + run-tests (Wave 2) ──
from api.health import staff_health_router  # noqa: E402

api.add_router("", staff_health_router)  # rotas em /health e /health/run-tests


class PhoneIn(Schema):
    phone: str


@api.put("/users/{external_id}/phone", tags=["staff"])
def set_user_phone(request, external_id: str, payload: PhoneIn):
    """RESGATE DE LOGIN (Victor 2026-06-17): o usuário perdeu o número/chip e não recebe mais o OTP
    → fica trancado fora, sem rota nem pro coordenador. O staff troca o telefone (valida formato +
    WhatsApp ativo no novo número + unicidade). É a ponta da hierarquia de resgate user→coord→staff;
    trocar o canal de login é poder do staff, não do coordenador. Auditado."""
    require_superuser(request.auth)
    return auth_iface.change_phone(
        user_external_id=external_id, new_phone=payload.phone
    )
