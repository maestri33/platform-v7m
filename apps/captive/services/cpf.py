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

from apps.captive.models import CpfRecord, PortalEvent, PortalSession
from services.base import ServiceResponse

from .consent import record_consent
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


def _ask_identity_confirmation(*, session, profile, existing_record):
    """E3 — CPF já existe: PERGUNTA em vez de resolver sozinho.

    Antes daqui saía a fusão destrutiva (apagava o cadastro recém-criado e
    reapontava o MAC). Agora só marcamos o cadastro reivindicado e mandamos a
    pessoa confirmar; a fusão mora em ``services/identity.py`` e só roda depois
    do "sim" + selfie.
    """

    existing_profile = existing_record.profile
    session.claimed_profile = existing_profile
    session.identity_step = PortalSession.IdentityStep.AWAITING_CONFIRM
    session.save(update_fields=["claimed_profile", "identity_step", "updated_at"])

    PortalEvent.objects.create(
        event=PortalEvent.Event.CPF_CONFLICT,
        mac=session.mac,
        session=session,
        payload={
            "existing_profile_uuid": str(existing_profile.uuid),
            "pending_profile_uuid": str(profile.uuid),
        },
    )
    PortalEvent.objects.create(
        event=PortalEvent.Event.IDENTITY_CONFIRM_ASKED,
        mac=session.mac,
        session=session,
        payload={"existing_profile_uuid": str(existing_profile.uuid)},
    )

    nome = str(getattr(existing_profile, "full_name", "") or "").strip()
    primeiro = nome.split()[0] if nome else ""

    if not getattr(settings, "CAPTIVE_IDENTITY_SELFIE_ENABLED", False):
        # Flag desligada: comportamento antigo — funde na hora e manda a pessoa
        # à recepção. Mantém o portal íntegro se o fluxo novo for desativado.
        from .identity import merge_into_claimed_profile

        merge_into_claimed_profile(session=session)
        return ServiceResponse.ok(
            data={
                "conflict": True,
                "step": "reception",
                "candidate_name": primeiro,
                "candidate_uuid": str(existing_profile.uuid),
            }
        )

    return ServiceResponse.ok(
        data={
            "conflict": True,
            "step": "confirm_identity",
            "candidate_name": primeiro,
            "candidate_uuid": str(existing_profile.uuid),
        }
    )


def ensure_visitor_and_role(*, session, profile):
    """Cria a linha de Visitor e concede o papel "visitante" (item 7 do fluxo).

    Roda mesmo com o HubCPF fora do ar: uma queda do enriquecimento não pode
    deixar a pessoa sem papel.
    """

    from apps.roles.services import RoleTransitionError, active_role, grant_role
    from apps.visitors.models import Visitor

    Visitor.objects.get_or_create(profile=profile)

    if active_role(profile):
        return
    try:
        grant_role(profile, "visitante", source="captive_portal")
    except RoleTransitionError:
        logger.warning("Papel visitante recusado para o perfil %s", profile.pk)
        return
    PortalEvent.objects.create(
        event=PortalEvent.Event.ROLE_ASSIGNED,
        mac=session.mac,
        session=session,
        payload={"role": "visitante", "origem": "cpf"},
    )


@transaction.atomic
def submit_cpf(*, session, cpf, request=None):
    """Passo 17 — ``POST /portal/cpf {cpf}`` (Bearer JWT no design)."""

    if session.status != PortalSession.Status.AUTHORIZED or not session.profile:
        return ServiceResponse.fail("Sessão ainda não liberada.", status_code=409)

    digits = _digits(cpf)
    if not validate_cpf_digits(digits):
        return ServiceResponse.fail("CPF inválido. Confira os números digitados.", status_code=422)

    profile = session.profile
    # O envio do CPF É o aceite dos termos (decisão do dono, 28/07/2026) —
    # gravado antes de qualquer ramo, porque a pessoa já manifestou a vontade.
    record_consent(session=session, profile=profile, request=request)

    existing = CpfRecord.objects.filter(cpf=digits).exclude(profile=profile).first()
    if existing:
        # Nada destrutivo aqui: só pergunta. ``cpf_completed`` continua False
        # até a identidade ser confirmada.
        return _ask_identity_confirmation(
            session=session, profile=profile, existing_record=existing
        )

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

    ensure_visitor_and_role(session=session, profile=profile)

    session.cpf_completed = True
    session.identity_step = PortalSession.IdentityStep.DONE
    session.save(update_fields=["cpf_completed", "identity_step", "updated_at"])

    context = _worship_step(session=session, profile=profile)
    return ServiceResponse.ok(
        data={
            "conflict": False,
            "worship_live": context["live"],
            "next_starts_at": context.get("next_starts_at"),
        }
    )
