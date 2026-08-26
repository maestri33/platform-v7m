"""API de administração — provisionar e inspecionar apps.

Mesma autenticação Bearer do resto (o serviço é IP-only na VPN). O que muda é o
efeito: aqui se criam contas, instâncias e caixas de e-mail.
"""

from __future__ import annotations

from typing import Annotated, Literal

import structlog
from ninja import Field, Router, Schema
from ninja.errors import HttpError

from accounts.auth import api_key_auth
from api.errors import ErrorOut
from channels.models import DRIVER_GO

logger = structlog.get_logger()
router = Router(tags=["admin"])

SlugStr = Annotated[
    str,
    Field(
        pattern=r"^[a-z0-9_\-]+$",
        description="Identificador slug em minúsculas",
        examples=["meu-app"],
    ),
]


class ProvisionIn(Schema):
    slug: SlugStr
    name: str = Field(default="", max_length=100)
    phone_number: str = Field(default="", max_length=20)
    instance_name: str = Field(default="", max_length=100)
    driver: str = DRIVER_GO
    fallback_driver: str = ""
    email_local_part: str = Field(default="", max_length=100)
    email_domain: str = Field(default="", max_length=100)
    mail_from_name: str = Field(default="", max_length=100)
    webhook_url: str = Field(default="", max_length=500)
    webhook_secret: str = Field(default="", max_length=200)
    seed_templates: bool = True
    rotate_api_key: bool = False
    rotate_mail_password: bool = False


@router.post(
    "/apps",
    summary="Provisiona uma nova aplicação e seus canais",
    description="Cria conta, API key, instância WhatsApp, caixa de e-mail, vozes e templates com idempotência.",
)
def provision(request, payload: ProvisionIn):
    """Cria (ou completa) um app: conta, key, instância na Evolution GO,
    caixa no mailcow, vozes e templates.

    Idempotente: rodar de novo reaproveita o que existe e conserta o que falta.
    Falha parcial devolve 207 com o relatório passo a passo — a conta e o que deu
    certo permanecem.
    """
    api_key_auth(request)
    from notify.provisioning import provision_app

    if payload.driver != DRIVER_GO:
        raise HttpError(400, f"driver inválido: {payload.driver} (só evolution-go)")
    if payload.fallback_driver and payload.fallback_driver != DRIVER_GO:
        raise HttpError(400, f"fallback_driver inválido: {payload.fallback_driver}")

    dump_data = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()
    try:
        report = provision_app(**dump_data)
    except ValueError as exc:
        raise HttpError(400, str(exc)) from exc

    body = report.as_dict()
    from django.http import JsonResponse

    # 207: parte deu certo, parte não. Um 500 aqui esconderia o que ficou pronto.
    return JsonResponse(body, status=207 if report.failed else 201)


class AppWhatsAppOut(Schema):
    slug: str
    instance_name: str
    phone_number: str
    chain: list[str]
    is_default: bool
    connection_status: str


class AppMailOut(Schema):
    from_email: str
    from_name: str
    is_default: bool


class AppWebhookOut(Schema):
    url: str
    active: bool
    events: list[str]
    last_status: int | None = None
    last_error: str | None = None


class AppDetailOut(Schema):
    slug: str
    name: str
    is_active: bool
    api_keys: int
    templates: int
    whatsapp: list[AppWhatsAppOut]
    mail: list[AppMailOut]
    webhook: AppWebhookOut | None = None


@router.get(
    "/apps",
    response=list[AppDetailOut],
    summary="Lista todos os apps cadastrados com seus canais configurados",
)
def list_apps(request):
    api_key_auth(request)
    from django.db.models import Count, Q

    from accounts.models import Account

    qs = (
        Account.objects.annotate(
            active_api_keys_count=Count(
                "api_keys", filter=Q(api_keys__is_active=True), distinct=True
            ),
            templates_count=Count("templates", distinct=True),
        )
        .select_related("webhook")
        .prefetch_related("whatsapp_numbers", "mail_identities")
        .order_by("slug")
    )

    out = []
    for a in qs:
        webhook_obj = getattr(a, "webhook", None)
        out.append(
            {
                "slug": a.slug,
                "name": a.name,
                "is_active": a.is_active,
                "api_keys": a.active_api_keys_count,
                "templates": a.templates_count,
                "whatsapp": [
                    {
                        "slug": n.slug,
                        "instance_name": n.instance_name,
                        "phone_number": n.phone_number,
                        "chain": n.driver_chain,
                        "is_default": n.is_default,
                        "connection_status": n.connection_status,
                    }
                    for n in a.whatsapp_numbers.all()
                ],
                "mail": [
                    {"from_email": m.from_email, "from_name": m.from_name, "is_default": m.is_default}
                    for m in a.mail_identities.all()
                ],
                "webhook": (
                    {
                        "url": webhook_obj.url,
                        "active": webhook_obj.active,
                        "events": webhook_obj.event_list,
                        "last_status": webhook_obj.last_status,
                        "last_error": webhook_obj.last_error or None,
                    }
                    if webhook_obj
                    else None
                ),
            }
        )
    return out


class PairIn(Schema):
    account_slug: str = Field(..., description="Slug da conta do app")
    number_slug: str = Field(default="principal", description="Slug do número WhatsApp")


class PairingCodeOut(Schema):
    phone_number: str
    code: str
    expira_em_segundos: int = 120


@router.post(
    "/pairing-code",
    response={200: PairingCodeOut, 404: ErrorOut, 409: ErrorOut, 502: ErrorOut},
    summary="Gera código de pareamento de 8 dígitos para o WhatsApp",
)
def pairing_code(request, payload: PairIn):
    """Código de pareamento da instância na Evolution GO.

    Expira em ~2 minutos e exige alguém com o celular do número em mãos — peça o
    código só quando a pessoa estiver pronta para digitar.
    """
    api_key_auth(request)
    from channels.models import WhatsAppNumber
    from whatsapp.provisioning import ProvisioningError, go_pairing_code

    number = WhatsAppNumber.objects.filter(
        account__slug=payload.account_slug, slug=payload.number_slug
    ).first()
    if number is None:
        raise HttpError(404, "número não encontrado")
    token = number.go_api_key()
    if not token:
        raise HttpError(409, "número sem token da instância na Evolution GO")
    if not number.phone_number:
        raise HttpError(409, "número sem phone_number cadastrado")

    try:
        code = go_pairing_code(token, number.phone_number)
    except ProvisioningError as exc:
        raise HttpError(502, str(exc)) from exc
    return {"phone_number": number.phone_number, "code": code, "expira_em_segundos": 120}
