"""Liberação de internet — credencial assinada + entrega ao agente local.

Cloud → agente local: depois do OTP o backend cria um ``AccessGrant`` com
credencial HMAC identificando o MAC e tenta o push pro
``CAPTIVE_LOCAL_CALLBACK_URL`` (retry com backoff, E4). Sem callback
configurado — ou push fora do ar — o grant fica pendente e o agente local
puxa via ``GET /portal/agent/grants`` e confirma com
``POST /portal/agent/grants/ack``.
"""

import base64
import hashlib
import hmac
import json
import logging
import time

import requests
from django.conf import settings
from django.utils import timezone

from apps.captive.models import AccessGrant, PortalEvent
from services.base import ServiceResponse

logger = logging.getLogger(__name__)


def _secret():
    return (settings.CAPTIVE_AGENT_SECRET or settings.SECRET_KEY).encode()


def _b64(data):
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _sign(payload_bytes):
    return hmac.new(_secret(), payload_bytes, hashlib.sha256).hexdigest()


def build_credential(*, mac, session_token, expires_at):
    """Credencial ``b64(payload).assinatura`` — verificável só com stdlib."""

    payload = json.dumps(
        {
            "mac": mac,
            "sid": str(session_token),
            "exp": int(expires_at.timestamp()),
        },
        sort_keys=True,
        separators=(",", ":"),
    ).encode()
    return f"{_b64(payload)}.{_sign(payload)}"


def verify_credential(credential):
    """Valida assinatura e expiração; retorna o payload da credencial."""

    try:
        encoded, signature = str(credential or "").rsplit(".", 1)
        payload_bytes = base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4))
    except (ValueError, TypeError):
        return ServiceResponse.fail("Credencial malformada.")

    if not hmac.compare_digest(_sign(payload_bytes), signature):
        return ServiceResponse.fail("Assinatura da credencial inválida.")

    payload = json.loads(payload_bytes)
    if payload.get("exp", 0) < time.time():
        return ServiceResponse.fail("Credencial expirada.")
    return ServiceResponse.ok(data=payload)


def _grant_push_body(grant):
    return {
        "mac": grant.mac,
        "credential": grant.credential,
        "expires_at": grant.expires_at.isoformat(),
        "session": str(grant.session.token),
        "duration_seconds": grant.duration_seconds,
    }


def deliver_grant(*, grant):
    """Push cloud → agente local com HMAC do corpo; fallback fica pro polling."""

    callback_url = str(getattr(settings, "CAPTIVE_LOCAL_CALLBACK_URL", "") or "")
    if not callback_url:
        return ServiceResponse.ok(data={"mode": "poll"})

    body = json.dumps(_grant_push_body(grant), sort_keys=True).encode()
    headers = {
        "Content-Type": "application/json",
        "X-Captive-Signature": _sign(body),
    }
    timeout = int(getattr(settings, "CAPTIVE_CALLBACK_TIMEOUT", 4))
    retries = max(1, int(getattr(settings, "CAPTIVE_CALLBACK_RETRIES", 3)))

    last_error = ""
    for attempt in range(1, retries + 1):
        grant.attempts += 1
        try:
            response = requests.post(callback_url, data=body, headers=headers, timeout=timeout)
            if 200 <= response.status_code < 300:
                grant.status = AccessGrant.Status.DELIVERED
                grant.delivered_at = timezone.now()
                grant.last_error = ""
                grant.save(update_fields=["status", "delivered_at", "attempts", "last_error", "updated_at"])
                return ServiceResponse.ok(data={"mode": "push", "attempts": attempt})
            last_error = f"HTTP {response.status_code}"
        except requests.RequestException as exc:
            last_error = str(exc)
        if attempt < retries:
            time.sleep(0.5 * attempt)

    grant.last_error = last_error
    grant.save(update_fields=["attempts", "last_error", "updated_at"])
    PortalEvent.objects.create(
        event=PortalEvent.Event.GRANT_PUSH_FAILED,
        mac=grant.mac,
        session=grant.session,
        payload={"error": last_error, "attempts": grant.attempts},
    )
    logger.warning("Push de liberação falhou pra %s: %s", grant.mac, last_error)
    return ServiceResponse.ok(data={"mode": "poll", "push_error": last_error})


def create_and_deliver_grant(*, session):
    """Cria o grant da sessão (idempotente por sessão ativa) e tenta o push."""

    now = timezone.now()
    existing = (
        session.grants.filter(expires_at__gt=now)
        .exclude(status=AccessGrant.Status.FAILED)
        .order_by("-created_at")
        .first()
    )
    if existing:
        return ServiceResponse.ok(data={"grant_id": existing.id, "credential": existing.credential})

    duration = int(getattr(settings, "CAPTIVE_GRANT_TTL_SECONDS", 43200))
    expires_at = now + timezone.timedelta(seconds=duration)
    grant = AccessGrant.objects.create(
        session=session,
        mac=session.mac,
        credential=build_credential(mac=session.mac, session_token=session.token, expires_at=expires_at),
        duration_seconds=duration,
        expires_at=expires_at,
    )
    delivery = deliver_grant(grant=grant)
    return ServiceResponse.ok(
        data={
            "grant_id": grant.id,
            "credential": grant.credential,
            "delivery": delivery.data,
        }
    )


def pending_grants():
    """Grants ainda não aplicados no controlador (pro polling do agente)."""

    now = timezone.now()
    queryset = AccessGrant.objects.filter(
        status__in=[AccessGrant.Status.PENDING, AccessGrant.Status.DELIVERED],
        expires_at__gt=now,
    ).order_by("created_at")
    return ServiceResponse.ok(
        data={
            "grants": [
                {
                    "mac": grant.mac,
                    "credential": grant.credential,
                    "expires_at": grant.expires_at.isoformat(),
                    "duration_seconds": grant.duration_seconds,
                }
                for grant in queryset
            ]
        }
    )


def ack_grant(*, credential):
    """Agente confirmou a aplicação — internet liberada de fato."""

    grant = AccessGrant.objects.filter(credential=str(credential or "").strip()).first()
    if not grant:
        return ServiceResponse.fail("Credencial não encontrada.", status_code=404)

    if grant.status != AccessGrant.Status.ACKED:
        grant.status = AccessGrant.Status.ACKED
        grant.acked_at = timezone.now()
        grant.save(update_fields=["status", "acked_at", "updated_at"])
        PortalEvent.objects.create(
            event=PortalEvent.Event.INTERNET_RELEASED,
            mac=grant.mac,
            session=grant.session,
        )
    return ServiceResponse.ok(data={"mac": grant.mac, "acked_at": grant.acked_at.isoformat()})
