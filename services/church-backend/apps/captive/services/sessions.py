"""Fase A — conexão e reconhecimento de MAC (passos 01-04 do design)."""

from django.conf import settings
from django.urls import reverse
from django.utils import timezone

from apps.captive.models import MacBinding, PortalEvent, PortalSession
from services.base import ServiceResponse

from .grants import create_and_deliver_grant
from .macs import normalize_mac


def _portal_url(session):
    base = str(getattr(settings, "CAPTIVE_PORTAL_BASE_URL", "") or "").rstrip("/")
    path = reverse("captive:portal")
    return f"{base}{path}?sid={session.token}"


def start_session(*, mac, ssid="", ap_mac="", client_ip=None):
    """Passo 02 — ``POST /portal/session/start {mac}``: MAC vinculado a usuário?

    SIM → libera direto (passo 03): sessão AUTHORIZED + grant entregue ao
    agente. NÃO → sessão PENDING e o agente redireciona o dispositivo pra
    ``portal_url`` (passo 04).
    """

    normalized = normalize_mac(mac)
    if not normalized:
        return ServiceResponse.fail("MAC inválido.", status_code=422)

    now = timezone.now()
    binding = (
        MacBinding.objects.filter(mac=normalized, is_active=True)
        .select_related("profile__user")
        .first()
    )

    if binding:
        binding.last_seen_at = now
        binding.save(update_fields=["last_seen_at", "updated_at"])
        session = PortalSession.objects.create(
            mac=normalized,
            ssid=str(ssid or ""),
            ap_mac=normalize_mac(ap_mac),
            client_ip=client_ip or None,
            profile=binding.profile,
            status=PortalSession.Status.AUTHORIZED,
            connected_at=now,
        )
        PortalEvent.objects.create(
            event=PortalEvent.Event.CONNECTED,
            mac=normalized,
            session=session,
            payload={"profile_uuid": str(binding.profile.uuid)},
        )
        grant = create_and_deliver_grant(session=session)
        return ServiceResponse.ok(
            data={
                "authorized": True,
                "session": str(session.token),
                "mac": normalized,
                "credential": grant.data["credential"],
                "profile_uuid": str(binding.profile.uuid),
            }
        )

    session = PortalSession.objects.create(
        mac=normalized,
        ssid=str(ssid or ""),
        ap_mac=normalize_mac(ap_mac),
        client_ip=client_ip or None,
    )
    PortalEvent.objects.create(
        event=PortalEvent.Event.REDIRECT_PORTAL, mac=normalized, session=session
    )
    return ServiceResponse.ok(
        data={
            "authorized": False,
            "session": str(session.token),
            "mac": normalized,
            "portal_url": _portal_url(session),
        }
    )


def stop_session(*, mac):
    """Accounting-stop do controlador — grava ``disconnected_at``."""

    normalized = normalize_mac(mac)
    if not normalized:
        return ServiceResponse.fail("MAC inválido.", status_code=422)

    session = (
        PortalSession.objects.filter(mac=normalized, disconnected_at__isnull=True)
        .order_by("-created_at")
        .first()
    )
    if not session:
        return ServiceResponse.fail("Nenhuma sessão aberta pra este MAC.", status_code=404)

    session.disconnected_at = timezone.now()
    session.status = PortalSession.Status.CLOSED
    session.save(update_fields=["disconnected_at", "status", "updated_at"])
    PortalEvent.objects.create(
        event=PortalEvent.Event.DISCONNECTED, mac=normalized, session=session
    )
    duration = None
    if session.connected_at:
        duration = int((session.disconnected_at - session.connected_at).total_seconds())
    return ServiceResponse.ok(data={"session": str(session.token), "duration_seconds": duration})
