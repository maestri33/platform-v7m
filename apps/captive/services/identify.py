"""Fase B — identificação por telefone (passos 05-14 do design).

Membro (telefone já cadastrado) → OTP direto. Desconhecido → Evolution valida
se o número tem WhatsApp (nunca no front); com WhatsApp cria o visitante e
manda boas-vindas + OTP; sem WhatsApp devolve o erro E2 (modal S3).
"""

import logging

from django.utils import timezone

from apps.authentication.services.otp import create_and_send_login_otp
from apps.captive.models import PortalEvent, PortalSession
from apps.profiles.services import get_profile_by_phone
from services.base import ServiceResponse
from services.communication.evolution.messages import validate_number

logger = logging.getLogger(__name__)

WELCOME_VISITOR_MESSAGE = (
    "Seja muito bem-vindo(a) à IEADPG Jardim Amália! 🕊\n\n"
    "Que alegria ter você na nossa casa. Seu acesso ao Wi-Fi está quase "
    "pronto — é só confirmar o código de verificação que enviamos na "
    "próxima mensagem."
)


def _digits(value):
    return "".join(ch for ch in str(value or "") if ch.isdigit())


def _first_name(profile):
    user = getattr(profile, "user", None)
    if user and str(user.first_name or "").strip():
        return str(user.first_name).strip()
    full_name = str(getattr(profile, "full_name", "") or "").strip()
    return full_name.split()[0] if full_name else ""


def _mark_awaiting_otp(session, *, profile, phone, kind):
    session.pending_profile_uuid = str(profile.uuid)
    session.pending_phone = phone
    session.pending_first_name = _first_name(profile)
    session.kind = kind
    session.status = PortalSession.Status.AWAITING_OTP
    session.otp_attempts = 0
    session.otp_locked_until = None
    session.save(
        update_fields=[
            "pending_profile_uuid",
            "pending_phone",
            "pending_first_name",
            "kind",
            "status",
            "otp_attempts",
            "otp_locked_until",
            "updated_at",
        ]
    )


def _send_otp(session, *, profile, phone, kind):
    otp_delivery = create_and_send_login_otp(user=profile.user)
    if not otp_delivery.success:
        return otp_delivery

    _mark_awaiting_otp(session, profile=profile, phone=phone, kind=kind)
    PortalEvent.objects.create(
        event=PortalEvent.Event.OTP_SENT,
        mac=session.mac,
        session=session,
        payload={"kind": kind, "profile_uuid": str(profile.uuid)},
    )
    return ServiceResponse.ok(
        data={
            "kind": kind,
            "first_name": session.pending_first_name,
            "otp_expires_in_seconds": otp_delivery.data.get("otp_expires_in_seconds"),
        }
    )


def identify_phone(*, session, phone):
    """Passo 06 — ``POST /portal/identify {phone, mac}``."""

    number = _digits(phone)
    local_number = number[2:] if number.startswith("55") and len(number) > 11 else number
    if len(local_number) not in (10, 11):
        return ServiceResponse.fail(
            "Informe um número válido com DDD, ex: (42) 9 9999-9999.", status_code=422
        )

    profile = get_profile_by_phone(phone=number) or get_profile_by_phone(phone=local_number)
    if profile:
        # Passos 07-08 — usuário encontrado: OTP de boas-vindas pelo nome.
        return _send_otp(session, profile=profile, phone=number, kind=PortalSession.Kind.MEMBER)

    # Passo 10 — Evolution: número tem WhatsApp? (checado sempre no backend)
    # E4 — Evolution indisponível: "tente novamente em instantes", sem
    # liberar internet (diferente de "número sem WhatsApp", que é o E2).
    try:
        validation = validate_number(local_number)
    except Exception as exc:
        logger.warning("Evolution indisponível no identify: %s", exc)
        return ServiceResponse.fail(
            "Não conseguimos validar seu número agora. Tente novamente em instantes.",
            status_code=503,
        )
    if not validation.get("success"):
        PortalEvent.objects.create(
            event=PortalEvent.Event.WHATSAPP_INVALID,
            mac=session.mac,
            session=session,
            payload={"phone": number},
        )
        return ServiceResponse.ok(data={"kind": "invalid_whatsapp"})

    # Passo 12 — cria usuário tipo visitante (registro mínimo, telefone
    # verificado, origem captive_portal).
    from apps.visitors.services.creation import create_visitor

    try:
        creation = create_visitor(contact_number=local_number)
    except Exception as exc:
        logger.warning("Evolution indisponível no create_visitor: %s", exc)
        return ServiceResponse.fail(
            "Não conseguimos validar seu número agora. Tente novamente em instantes.",
            status_code=503,
        )
    if not creation.success:
        return creation

    profile = get_profile_by_phone(phone=local_number)
    if not profile:
        return ServiceResponse.fail("Falha ao criar o cadastro do visitante.")

    PortalEvent.objects.create(
        event=PortalEvent.Event.VISITOR_CREATED,
        mac=session.mac,
        session=session,
        payload={
            "profile_uuid": str(profile.uuid),
            "origin": "captive_portal",
            "reused_existing_profile": creation.data.get("reused_existing_profile", False),
        },
    )

    # Passo 13 — boas-vindas + OTP. A mensagem de boas-vindas sai como
    # notificação própria; o OTP reaproveita o fluxo padrão de login.
    from notifications.models import Notification

    Notification.objects.create(
        recipient=profile,
        title="# Bem-vindo à IEADPG",
        content=WELCOME_VISITOR_MESSAGE,
        event_key="captive-visitor-welcome",
    )
    return _send_otp(session, profile=profile, phone=number, kind=PortalSession.Kind.VISITOR)
