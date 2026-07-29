"""API de administração — provisionar e inspecionar apps.

Mesma autenticação Bearer do resto (o serviço é IP-only na VPN). O que muda é o
efeito: aqui se criam contas, instâncias e caixas de e-mail.
"""

from __future__ import annotations

import structlog
from ninja import Router, Schema
from ninja.errors import HttpError

from accounts.auth import api_key_auth
from channels.models import DRIVER_GO, DRIVER_V2

logger = structlog.get_logger()
router = Router(tags=["admin"])


class ProvisionIn(Schema):
    slug: str
    name: str = ""
    phone_number: str = ""
    instance_name: str = ""
    driver: str = DRIVER_V2
    fallback_driver: str = DRIVER_GO
    email_local_part: str = ""
    email_domain: str = ""
    mail_from_name: str = ""
    voice_male: str = ""
    voice_female: str = ""
    webhook_url: str = ""
    webhook_secret: str = ""
    seed_templates: bool = True
    rotate_api_key: bool = False
    rotate_mail_password: bool = False


@router.post("/apps")
def provision(request, payload: ProvisionIn):
    """Cria (ou completa) um app: conta, key, instâncias nos dois Evolutions,
    caixa no mailcow, vozes e templates.

    Idempotente: rodar de novo reaproveita o que existe e conserta o que falta.
    Falha parcial devolve 207 com o relatório passo a passo — a conta e o que deu
    certo permanecem.
    """
    api_key_auth(request)
    from notify.provisioning import provision_app

    valid = {DRIVER_V2, DRIVER_GO}
    if payload.driver not in valid:
        raise HttpError(400, f"driver inválido: {payload.driver}")
    if payload.fallback_driver and payload.fallback_driver not in valid:
        raise HttpError(400, f"fallback_driver inválido: {payload.fallback_driver}")

    try:
        report = provision_app(**payload.dict())
    except ValueError as exc:
        raise HttpError(400, str(exc)) from exc

    body = report.as_dict()
    from django.http import JsonResponse

    # 207: parte deu certo, parte não. Um 500 aqui esconderia o que ficou pronto.
    return JsonResponse(body, status=207 if report.failed else 201)


@router.get("/apps")
def list_apps(request):
    api_key_auth(request)
    from accounts.models import Account

    out = []
    for a in Account.objects.prefetch_related(
        "whatsapp_numbers", "mail_identities", "tts_voices"
    ).order_by("slug"):
        out.append(
            {
                "slug": a.slug,
                "name": a.name,
                "is_active": a.is_active,
                "api_keys": a.api_keys.filter(is_active=True).count(),
                "templates": a.templates.count(),
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
                "tts": [
                    {"voice_male": t.voice_male, "voice_female": t.voice_female}
                    for t in a.tts_voices.all()
                ],
                "webhook": (
                    {
                        "url": a.webhook.url,
                        "active": a.webhook.active,
                        "events": a.webhook.event_list,
                        "last_status": a.webhook.last_status,
                        "last_error": a.webhook.last_error or None,
                    }
                    if hasattr(a, "webhook")
                    else None
                ),
            }
        )
    return out


class PairIn(Schema):
    account_slug: str
    number_slug: str = "principal"


@router.post("/pairing-code")
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
