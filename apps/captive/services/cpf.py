"""Fase C — CPF do visitante, pós-liberação (passos 16-19 + Fase D).

CPF duplicado (E3): em transação atômica o visitante recém-criado é deletado
e o MAC re-vinculado ao cadastro existente — a internet permanece liberada.
Sem conflito: HubCPF enriquece nome/sexo/nascimento (falha é adiável, E4) e
o passo de culto agenda/dispara as boas-vindas (passos 20-22).
"""

import logging

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.captive.models import CpfRecord, MacBinding, PortalEvent, PortalSession
from services.base import ServiceResponse

from .hubcpf import lookup_cpf
from .worship_context import current_worship_context

logger = logging.getLogger(__name__)

POST_WORSHIP_MESSAGE = (
    "Que alegria ter você no culto de hoje! 🙌\n\n"
    "Esperamos que tenha sido um momento especial na presença de Deus. "
    "Volte sempre — a nossa casa é a sua casa."
)
INVITE_MESSAGE = (
    "Foi uma alegria receber você na nossa casa! 🕊\n\n"
    "Nosso próximo culto será {when}. Vai ser muito bom ter você com a gente!"
)


def _digits(value):
    return "".join(ch for ch in str(value or "") if ch.isdigit())


def validate_cpf_digits(cpf):
    """Valida os dígitos verificadores do CPF."""

    digits = _digits(cpf)
    if len(digits) != 11 or digits == digits[0] * 11:
        return False
    for size in (9, 10):
        total = sum(int(d) * w for d, w in zip(digits[:size], range(size + 1, 1, -1)))
        check = (total * 10) % 11 % 10
        if check != int(digits[size]):
            return False
    return True


def _apply_enrichment(profile, enrichment):
    """Enriquece o cadastro sem sobrescrever dados já preenchidos."""

    update_fields = []
    if enrichment["name"] and not str(profile.full_name or "").strip():
        profile.full_name = enrichment["name"]
        update_fields.append("full_name")
    if enrichment["gender"] and not profile.gender:
        profile.gender = enrichment["gender"]
        update_fields.append("gender")
    if enrichment["birth_date"] and not profile.date_of_birth:
        profile.date_of_birth = enrichment["birth_date"]
        update_fields.append("date_of_birth")
    if update_fields:
        profile.save(update_fields=update_fields)

    user = profile.user
    if enrichment["name"] and not str(user.first_name or "").strip():
        parts = enrichment["name"].split()
        user.first_name = parts[0]
        user.last_name = parts[-1] if len(parts) > 1 else ""
        user.save(update_fields=["first_name", "last_name"])


def _worship_step(*, session, profile):
    """Passos 20-22 — agenda pós-culto (TTS) ou convite pro próximo culto."""

    from notifications.models import Notification

    context = current_worship_context()
    if context["live"]:
        delay = int(getattr(settings, "CAPTIVE_POST_WORSHIP_DELAY_MIN", 15))
        base_time = context.get("ends_at") or timezone.now()
        Notification.objects.create(
            recipient=profile,
            title="# Boas-vindas pós-culto",
            content=POST_WORSHIP_MESSAGE,
            event_key="captive-post-worship-welcome",
            use_tts=True,
            scheduled_for=base_time + timezone.timedelta(minutes=delay),
        )
        PortalEvent.objects.create(
            event=PortalEvent.Event.WELCOME_SCHEDULED,
            mac=session.mac,
            session=session,
            payload={"scheduled_for": str(base_time), "kind": "post_worship_tts"},
        )
    else:
        next_starts_at = context.get("next_starts_at")
        when = (
            timezone.localtime(next_starts_at).strftime("%d/%m às %H:%M")
            if next_starts_at
            else "em breve"
        )
        Notification.objects.create(
            recipient=profile,
            title="# Convite pro próximo culto",
            content=INVITE_MESSAGE.format(when=when),
            event_key="captive-next-worship-invite",
        )
        PortalEvent.objects.create(
            event=PortalEvent.Event.WELCOME_SCHEDULED,
            mac=session.mac,
            session=session,
            payload={"next_starts_at": str(next_starts_at), "kind": "invite"},
        )
    return context


def _resolve_conflict(*, session, profile, existing_record):
    """E3 — CPF já existe: re-vincula o MAC e apaga o visitante recém-criado."""

    existing_profile = existing_record.profile
    with transaction.atomic():
        MacBinding.objects.update_or_create(
            mac=session.mac,
            defaults={
                "profile": existing_profile,
                "is_active": True,
                "last_seen_at": timezone.now(),
            },
        )
        session.profile = existing_profile
        session.save(update_fields=["profile", "updated_at"])
        PortalEvent.objects.create(
            event=PortalEvent.Event.CPF_CONFLICT,
            mac=session.mac,
            session=session,
            payload={
                "existing_profile_uuid": str(existing_profile.uuid),
                "removed_profile_uuid": str(profile.uuid),
            },
        )
        # Vincula o número ao cadastro existente quando ele ainda não tem
        # telefone; caso contrário a recepção ajusta manualmente.
        phone = getattr(profile, "phone", None)
        if phone and not hasattr(existing_profile, "phone"):
            phone.profile = existing_profile
            phone.save(update_fields=["profile", "updated_at"])
        # Deleta o usuário visitante recém-criado (cascade: profile, visitor).
        if session.kind == PortalSession.Kind.VISITOR and profile.pk != existing_profile.pk:
            profile.user.delete()
    return ServiceResponse.ok(data={"conflict": True})


@transaction.atomic
def submit_cpf(*, session, cpf):
    """Passo 17 — ``POST /portal/cpf {cpf}`` (Bearer JWT no design)."""

    if session.status != PortalSession.Status.AUTHORIZED or not session.profile:
        return ServiceResponse.fail("Sessão ainda não liberada.", status_code=409)

    digits = _digits(cpf)
    if not validate_cpf_digits(digits):
        return ServiceResponse.fail("CPF inválido. Confira os números digitados.", status_code=422)

    profile = session.profile
    existing = CpfRecord.objects.filter(cpf=digits).exclude(profile=profile).first()
    if existing:
        response = _resolve_conflict(session=session, profile=profile, existing_record=existing)
        session.cpf_completed = True
        session.save(update_fields=["cpf_completed", "updated_at"])
        return response

    record, _created = CpfRecord.objects.update_or_create(
        profile=profile, defaults={"cpf": digits}
    )

    # Passo 19 — HubCPF (cache: só consulta se ainda não enriquecido).
    if not record.enriched_at:
        enrichment = lookup_cpf(digits)
        if enrichment.success:
            _apply_enrichment(profile, enrichment.data)
            record.enriched = {
                "name": enrichment.data["name"],
                "gender": enrichment.data["gender"],
                "birth_date": str(enrichment.data["birth_date"] or ""),
            }
            record.enriched_at = timezone.now()
            record.pending_enrichment = False
            record.save(update_fields=["enriched", "enriched_at", "pending_enrichment", "updated_at"])
            PortalEvent.objects.create(
                event=PortalEvent.Event.CPF_ENRICHED,
                mac=session.mac,
                session=session,
                payload={"profile_uuid": str(profile.uuid)},
            )
        else:
            # E4 — enriquecimento é adiável; cadastro segue sem ele.
            record.pending_enrichment = True
            record.save(update_fields=["pending_enrichment", "updated_at"])
            logger.info("Enriquecimento adiado pro CPF do profile %s: %s", profile.pk, enrichment.error)

    session.cpf_completed = True
    session.save(update_fields=["cpf_completed", "updated_at"])

    context = _worship_step(session=session, profile=profile)
    return ServiceResponse.ok(
        data={
            "conflict": False,
            "worship_live": context["live"],
            "next_starts_at": context.get("next_starts_at"),
        }
    )
