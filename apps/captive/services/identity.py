"""Confirmação de identidade quando o CPF já pertence a um cadastro.

Antes, o portal resolvia o conflito sozinho: reapontava o MAC, apagava o
cadastro recém-criado e mandava a pessoa "passar na recepção". Agora ela
confirma que é ela e tira uma selfie; só então os cadastros são fundidos.

A fusão é destrutiva, então mora aqui e só roda depois do "sim" — e nunca
apaga um cadastro que já tenha papel ativo ou CPF próprio.
"""

import logging

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.captive.models import (
    CaptiveConsent,
    MacBinding,
    PortalEvent,
    PortalSelfie,
    PortalSession,
)
from services.base import ServiceResponse

from .consent import record_consent

logger = logging.getLogger(__name__)

DENIED_MESSAGE = "Tudo bem. Confira o CPF e digite de novo."


def _first_name(profile):
    nome = str(getattr(profile, "full_name", "") or "").strip()
    if not nome:
        user = getattr(profile, "user", None)
        nome = str(getattr(user, "first_name", "") or "").strip() if user else ""
    return nome.split()[0] if nome else ""


def confirm_identity(*, session, confirmed):
    """Passo novo — "é você, {nome}?" na tela de conflito de CPF."""

    if session.identity_step != PortalSession.IdentityStep.AWAITING_CONFIRM:
        return ServiceResponse.fail("Etapa de identidade fora de ordem.", status_code=409)

    if not confirmed:
        session.claimed_profile = None
        session.identity_step = PortalSession.IdentityStep.AWAITING_CPF
        session.save(update_fields=["claimed_profile", "identity_step", "updated_at"])
        PortalEvent.objects.create(
            event=PortalEvent.Event.IDENTITY_DENIED,
            mac=session.mac,
            session=session,
            payload={},
        )
        return ServiceResponse.ok(data={"step": "cpf", "message": DENIED_MESSAGE})

    session.identity_step = PortalSession.IdentityStep.AWAITING_SELFIE
    session.save(update_fields=["identity_step", "updated_at"])
    PortalEvent.objects.create(
        event=PortalEvent.Event.IDENTITY_CONFIRMED,
        mac=session.mac,
        session=session,
        payload={"claimed_profile_uuid": str(getattr(session.claimed_profile, "uuid", ""))},
    )
    return ServiceResponse.ok(
        data={"step": "selfie", "candidate_name": _first_name(session.claimed_profile)}
    )


def _shrink(image_file):
    """Reduz a foto para no máximo ``CAPTIVE_SELFIE_MAX_PIXELS`` no maior lado.

    Devolve ``ContentFile`` JPEG, ou o arquivo original se o Pillow falhar —
    guardar a foto grande é melhor do que não guardar.
    """

    try:
        from io import BytesIO

        from django.core.files.base import ContentFile
        from PIL import Image, ImageOps

        limite = int(getattr(settings, "CAPTIVE_SELFIE_MAX_PIXELS", 1280))
        imagem = Image.open(image_file)
        imagem = ImageOps.exif_transpose(imagem)  # celular deitado vira em pé
        imagem = imagem.convert("RGB")
        imagem.thumbnail((limite, limite))
        buffer = BytesIO()
        imagem.save(buffer, format="JPEG", quality=85, optimize=True)
        return ContentFile(buffer.getvalue(), name="selfie.jpg")
    except Exception:
        logger.warning("Não consegui redimensionar a selfie; guardando original.", exc_info=True)
        try:
            image_file.seek(0)
        except Exception:
            pass
        return image_file


def submit_selfie(*, session, image_file, request=None):
    """Recebe a selfie, aceita automaticamente e funde os cadastros."""

    if session.identity_step != PortalSession.IdentityStep.AWAITING_SELFIE:
        return ServiceResponse.fail("Etapa de identidade fora de ordem.", status_code=409)

    # Consentimento biométrico é específico e destacado (LGPD art. 11) e fica
    # separado do aceite geral dos termos.
    record_consent(
        session=session,
        profile=session.profile,
        kind=CaptiveConsent.Kind.BIOMETRIC,
        request=request,
    )

    # I/O de arquivo FORA da transação: disco cheio não pode desfazer a fusão,
    # e uma fusão desfeita não pode deixar arquivo órfão.
    selfie = PortalSelfie(
        session=session,
        profile=session.profile,
        claimed_profile=session.claimed_profile,
        status=PortalSelfie.Status.AUTO_APPROVED,
        captured_via="camera",
    )
    try:
        selfie.image = _shrink(image_file)
        selfie.save()
    except Exception:
        logger.exception("Falha ao guardar a selfie da sessão %s", session.pk)
        selfie.image = None
        selfie.status = PortalSelfie.Status.SKIPPED
        selfie.captured_via = "falha"
        selfie.save()

    PortalEvent.objects.create(
        event=PortalEvent.Event.SELFIE_SUBMITTED,
        mac=session.mac,
        session=session,
        payload={"status": selfie.status, "auto": True},
    )
    return merge_into_claimed_profile(session=session)


def skip_selfie(*, session):
    """Escape hatch: câmera que não abre não pode prender a pessoa na tela."""

    if session.identity_step != PortalSession.IdentityStep.AWAITING_SELFIE:
        return ServiceResponse.fail("Etapa de identidade fora de ordem.", status_code=409)

    PortalSelfie.objects.create(
        session=session,
        profile=session.profile,
        claimed_profile=session.claimed_profile,
        status=PortalSelfie.Status.SKIPPED,
        captured_via="skipped",
    )
    PortalEvent.objects.create(
        event=PortalEvent.Event.SELFIE_SKIPPED,
        mac=session.mac,
        session=session,
        payload={},
    )
    return merge_into_claimed_profile(session=session)


def _pode_apagar(profile):
    """Só apaga cadastro temporário: sem papel ativo e sem CPF próprio."""

    from apps.captive.models import CpfRecord
    from apps.roles.models import ProfileRole

    if ProfileRole.objects.filter(profile=profile, is_active=True).exists():
        return False
    return not CpfRecord.objects.filter(profile=profile).exists()


@transaction.atomic
def merge_into_claimed_profile(*, session):
    """Funde o cadastro temporário no existente e conclui a etapa."""

    existente = session.claimed_profile
    temporario = session.profile
    if existente is None:
        return ServiceResponse.fail("Nenhum cadastro reivindicado nesta sessão.", status_code=409)

    MacBinding.objects.update_or_create(
        mac=session.mac,
        defaults={"profile": existente, "is_active": True, "last_seen_at": timezone.now()},
    )

    apagado = None
    if temporario is not None and temporario.pk != existente.pk:
        # Leva o telefone digitado para o cadastro que fica, se ele ainda não tiver.
        telefone = getattr(temporario, "phone", None)
        if telefone and not hasattr(existente, "phone"):
            telefone.profile = existente
            telefone.save(update_fields=["profile", "updated_at"])

        session.selfies.update(claimed_profile=existente)

        # A prova do aceite tem que sobreviver à fusão: CaptiveConsent tem FK
        # CASCADE, então sem reapontar antes o registro morre com o cadastro.
        CaptiveConsent.objects.filter(profile=temporario).update(profile=existente)
        PortalSelfie.objects.filter(profile=temporario).update(profile=existente)

        if _pode_apagar(temporario):
            apagado = str(temporario.uuid)
            temporario.user.delete()  # cascade: profile, visitor
        else:
            logger.info(
                "Cadastro %s tem papel ou CPF próprio — mantido em vez de apagado.",
                temporario.pk,
            )

    session.profile = existente
    session.identity_step = PortalSession.IdentityStep.DONE
    session.cpf_completed = True
    session.save(update_fields=["profile", "identity_step", "cpf_completed", "updated_at"])

    PortalEvent.objects.create(
        event=PortalEvent.Event.PROFILE_MERGED,
        mac=session.mac,
        session=session,
        payload={
            "kept_profile_uuid": str(existente.uuid),
            "deleted_profile_uuid": apagado or "",
            "mac": session.mac,
        },
    )

    # Quem já é congregado ou membro não é rebaixado; quem não tem papel vira visitante.
    from apps.roles.services import RoleTransitionError, active_role, grant_role

    if not active_role(existente):
        try:
            grant_role(existente, "visitante", source="captive_portal_merge")
            PortalEvent.objects.create(
                event=PortalEvent.Event.ROLE_ASSIGNED,
                mac=session.mac,
                session=session,
                payload={"role": "visitante", "origem": "merge"},
            )
        except RoleTransitionError:
            logger.warning("Papel visitante recusado no merge do perfil %s", existente.pk)

    return ServiceResponse.ok(
        data={"merged": True, "first_name": _first_name(existente), "step": "connected"}
    )
