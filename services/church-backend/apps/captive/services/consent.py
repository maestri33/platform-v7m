"""Registro auditável do consentimento LGPD.

O aceite dos termos acontece no **envio do CPF**: a pessoa lê o texto na tela e
o ato de enviar é a manifestação de vontade (decisão do dono, 28/07/2026).
Registrar só o "aceitou" não prova nada numa auditoria — por isso guardamos
quem, quando, de onde e **o texto exato exibido**.

A selfie tem consentimento próprio (``Kind.BIOMETRIC``) porque dado biométrico
exige manifestação específica e destacada (LGPD art. 11).
"""

import logging

from django.conf import settings
from django.db import transaction

from apps.captive.models import CaptiveConsent, PortalEvent

logger = logging.getLogger(__name__)

TERMS_TEXT = (
    "Ao enviar seu CPF você concorda que a IEADPG Jardim Amália guarde e use "
    "seus dados de cadastro (nome, telefone, CPF e data de nascimento) para "
    "identificar você na igreja, liberar o acesso à internet e enviar "
    "mensagens de boas-vindas e convites para os cultos. Você pode pedir a "
    "correção ou a exclusão dos seus dados a qualquer momento na recepção."
)
BIOMETRIC_TEXT = (
    "Autorizo o uso da minha foto para confirmar que este cadastro é meu. A "
    "foto fica guardada em área restrita, visível apenas para a secretaria da "
    "igreja, e pode ser apagada a pedido."
)


def _client_ip(request):
    if request is None:
        return None
    encaminhado = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if encaminhado:
        return encaminhado.split(",")[0].strip() or None
    return request.META.get("REMOTE_ADDR") or None


def record_consent(*, session, profile, kind=CaptiveConsent.Kind.TERMS, request=None):
    """Grava o aceite. Nunca levanta — falhar aqui não pode travar o cadastro.

    Devolve o ``CaptiveConsent`` criado, ou ``None`` se não foi possível gravar
    (o erro vai para o log, e o evento de portal não é emitido).
    """

    if profile is None:
        return None

    texto = TERMS_TEXT if kind == CaptiveConsent.Kind.TERMS else BIOMETRIC_TEXT
    origem = "envio_do_cpf" if kind == CaptiveConsent.Kind.TERMS else "envio_da_selfie"
    try:
        # Savepoint próprio: sem ele, um erro aqui envenena a transação do
        # cadastro inteiro — o except não basta dentro de um ``atomic``.
        with transaction.atomic():
            consentimento = CaptiveConsent.objects.create(
                profile=profile,
                session=session,
                kind=kind,
                terms_version=str(getattr(settings, "CAPTIVE_TERMS_VERSION", "") or ""),
                mac=getattr(session, "mac", "") or "",
                ip=_client_ip(request) or getattr(session, "client_ip", None),
                phone=getattr(session, "pending_phone", "") or "",
                user_agent=(request.META.get("HTTP_USER_AGENT", "")[:300] if request else ""),
                terms_text=texto,
                evidence={"accepted_by": origem},
            )
    except Exception:
        logger.exception("Falha ao gravar consentimento LGPD do perfil %s", getattr(profile, "pk", "?"))
        return None

    with transaction.atomic():
        PortalEvent.objects.create(
            event=PortalEvent.Event.LGPD_ACCEPTED,
            mac=getattr(session, "mac", "") or "",
            session=session,
            payload={
                "kind": kind,
                "terms_version": consentimento.terms_version,
                "profile_uuid": str(getattr(profile, "uuid", "")),
            },
        )
    return consentimento
