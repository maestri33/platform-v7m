"""Fase B — verificação do OTP (passos 09/15) e reenvio com cooldown (E1).

O código reaproveita o ``LoginOtpState`` do app authentication (mesmo TTL,
cooldown e janela de reenvio), mas a verificação é própria do captive:
liberar Wi-Fi não exige contexto de acesso de app habilitado, e o design
pede bloqueio de 10 min após 3 falhas por sessão.
"""

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from ninja_jwt.tokens import RefreshToken

from apps.authentication.models import LoginOtpState
from apps.authentication.services.context import get_enabled_access_contexts
from apps.authentication.services.otp import create_and_send_login_otp
from apps.captive.models import MacBinding, PortalEvent, PortalSession
from apps.profiles.services import get_profile_by_uuid
from services.base import ServiceResponse

from .grants import create_and_deliver_grant

OTP_LOCKED_MESSAGE = "Muitas tentativas. Aguarde {minutes} min e tente de novo."
OTP_INVALID_MESSAGE = "Código incorreto. Confira a mensagem no seu WhatsApp."
OTP_EXPIRED_MESSAGE = "Código expirado. Toque em reenviar pra receber um novo."


def _build_token_pair(*, profile):
    access_context = get_enabled_access_contexts(profile=profile)
    refresh = RefreshToken.for_user(profile.user)
    refresh["profile_uuid"] = str(profile.uuid)
    refresh["is_visitor"] = access_context["is_visitor"]
    access_token = refresh.access_token
    access_token["profile_uuid"] = str(profile.uuid)
    access_token["is_visitor"] = access_context["is_visitor"]
    return str(refresh), str(access_token)


def _register_failure(session, *, reason):
    max_attempts = int(getattr(settings, "CAPTIVE_OTP_MAX_ATTEMPTS", 3))
    lock_minutes = int(getattr(settings, "CAPTIVE_OTP_LOCK_MINUTES", 10))

    session.otp_attempts += 1
    update_fields = ["otp_attempts", "updated_at"]
    locked = session.otp_attempts >= max_attempts
    if locked:
        session.otp_locked_until = timezone.now() + timezone.timedelta(minutes=lock_minutes)
        session.otp_attempts = 0
        update_fields.append("otp_locked_until")
    session.save(update_fields=update_fields)

    PortalEvent.objects.create(
        event=PortalEvent.Event.OTP_FAILED,
        mac=session.mac,
        session=session,
        payload={"reason": reason, "locked": locked},
    )
    attempts_left = 0 if locked else max_attempts - session.otp_attempts
    return locked, attempts_left


def _fail_attempt(session, *, reason, message):
    locked, attempts_left = _register_failure(session, reason=reason)
    if locked:
        minutes = int(getattr(settings, "CAPTIVE_OTP_LOCK_MINUTES", 10))
        return ServiceResponse.fail(
            OTP_LOCKED_MESSAGE.format(minutes=minutes), locked=True, attempts_left=0
        )
    return ServiceResponse.fail(message, locked=False, attempts_left=attempts_left)


@transaction.atomic
def verify_portal_otp(*, session, code):
    """Passos 09/15 — ``POST /portal/otp/verify {phone, code, mac}``.

    Sucesso: vincula o MAC ao usuário, cria/entrega o grant pro agente local
    e retorna JWT + refresh.
    """

    if session.status != PortalSession.Status.AWAITING_OTP:
        return ServiceResponse.fail("Sessão não está aguardando código.", status_code=409)

    if session.otp_locked_until and session.otp_locked_until > timezone.now():
        remaining = int((session.otp_locked_until - timezone.now()).total_seconds() // 60) + 1
        return ServiceResponse.fail(
            OTP_LOCKED_MESSAGE.format(minutes=remaining), locked=True, attempts_left=0
        )

    profile = get_profile_by_uuid(profile_uuid=session.pending_profile_uuid)
    if not profile:
        return ServiceResponse.fail("Identificação não encontrada. Recomece pelo telefone.")

    otp_code = str(code or "").strip()
    if len(otp_code) != 6 or not otp_code.isdigit():
        return _fail_attempt(session, reason="malformed", message=OTP_INVALID_MESSAGE)

    user = profile.user
    otp_state = LoginOtpState.objects.filter(user=user).first()
    ttl_seconds = int(getattr(settings, "AUTH_LOGIN_OTP_TTL_SECONDS", 600))
    if not otp_state or otp_state.otp_created_at is None:
        return _fail_attempt(session, reason="expired", message=OTP_EXPIRED_MESSAGE)
    if (timezone.now() - otp_state.otp_created_at).total_seconds() > ttl_seconds:
        user.set_unusable_password()
        user.save(update_fields=["password"])
        otp_state.otp_created_at = None
        otp_state.save(update_fields=["otp_created_at", "updated_at"])
        return _fail_attempt(session, reason="expired", message=OTP_EXPIRED_MESSAGE)
    if not user.check_password(otp_code):
        return _fail_attempt(session, reason="invalid", message=OTP_INVALID_MESSAGE)

    # OTP é de uso único — igual ao login do app.
    user.set_unusable_password()
    user.save(update_fields=["password"])
    otp_state.otp_created_at = None
    otp_state.save(update_fields=["otp_created_at", "updated_at"])

    now = timezone.now()
    MacBinding.objects.update_or_create(
        mac=session.mac,
        defaults={"profile": profile, "is_active": True, "last_seen_at": now},
    )
    session.profile = profile
    session.status = PortalSession.Status.AUTHORIZED
    session.connected_at = session.connected_at or now
    session.otp_attempts = 0
    session.otp_locked_until = None
    session.save(
        update_fields=[
            "profile",
            "status",
            "connected_at",
            "otp_attempts",
            "otp_locked_until",
            "updated_at",
        ]
    )
    PortalEvent.objects.create(
        event=PortalEvent.Event.OTP_VERIFIED,
        mac=session.mac,
        session=session,
        payload={"kind": session.kind, "profile_uuid": str(profile.uuid)},
    )

    grant = create_and_deliver_grant(session=session)
    refresh_token, access_token = _build_token_pair(profile=profile)
    return ServiceResponse.ok(
        data={
            "kind": session.kind,
            "access": access_token,
            "refresh": refresh_token,
            "credential": grant.data["credential"],
        }
    )


def resend_portal_otp(*, session):
    """Reenvio com cooldown de 60s (rate-limit do ``LoginOtpState``)."""

    if session.status != PortalSession.Status.AWAITING_OTP:
        return ServiceResponse.fail("Sessão não está aguardando código.", status_code=409)

    profile = get_profile_by_uuid(profile_uuid=session.pending_profile_uuid)
    if not profile:
        return ServiceResponse.fail("Identificação não encontrada. Recomece pelo telefone.")

    otp_delivery = create_and_send_login_otp(user=profile.user)
    if not otp_delivery.success:
        return otp_delivery

    PortalEvent.objects.create(
        event=PortalEvent.Event.OTP_SENT,
        mac=session.mac,
        session=session,
        payload={"kind": session.kind, "resend": True},
    )
    return ServiceResponse.ok(
        data={"otp_expires_in_seconds": otp_delivery.data.get("otp_expires_in_seconds")}
    )
