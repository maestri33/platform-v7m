"""Views HTMX do captive portal (telas S1-S7 do design).

Cada passo devolve um fragmento HTML que o htmx troca dentro de
``#screen``. A sessão do dispositivo viaja no campo hidden ``sid`` (token
da ``PortalSession`` criada pelo agente local no ``session/start``).
"""

from django.conf import settings
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from apps.captive.models import AccessGrant, PortalSession
from apps.captive.services import (
    confirm_identity,
    current_worship_context,
    identify_phone,
    normalize_mac,
    resend_portal_otp,
    skip_selfie,
    start_session,
    submit_cpf,
    submit_selfie,
    verify_portal_otp,
)

RESEND_COOLDOWN_SECONDS = 60


def _get_session(request):
    sid = request.POST.get("sid") or request.GET.get("sid") or ""
    if not sid:
        return None
    try:
        return PortalSession.objects.filter(token=sid).first()
    except Exception:
        return None


def _screen_context(session, **extra):
    context = {
        "session": session,
        "sid": str(session.token) if session else "",
        "resend_cooldown": RESEND_COOLDOWN_SECONDS,
        "app_url": getattr(settings, "CAPTIVE_APP_URL", "https://app.ieadpg.org"),
        "internet_released": session.grants.filter(status=AccessGrant.Status.ACKED).exists()
        if session
        else False,
        "identity_step": session.identity_step if session else "",
        "selfie_enabled": bool(getattr(settings, "CAPTIVE_IDENTITY_SELFIE_ENABLED", False)),
    }
    context.update(extra)
    return context


def _connected_context(session):
    profile = session.profile
    nome = str(getattr(profile, "full_name", "") or "").strip() if profile else ""
    context = current_worship_context()
    next_starts_at = context.get("next_starts_at")
    return {
        "first_name": nome.split()[0] if nome else session.pending_first_name,
        "worship_live": context["live"],
        "next_worship": timezone.localtime(next_starts_at).strftime("%d/%m às %H:%M")
        if next_starts_at
        else "",
    }


def _candidate_name(session):
    """Primeiro nome do cadastro que o CPF apontou (para "é você, {nome}?")."""

    profile = session.claimed_profile
    nome = str(getattr(profile, "full_name", "") or "").strip() if profile else ""
    return nome.split()[0] if nome else ""


def _resume_screen(session):
    """Reabertura do portal (mini-browser do captive) volta na tela certa.

    A etapa de identidade manda quando existe; ``cpf_completed`` continua
    valendo para sessões criadas antes desta versão.
    """

    if session.status == PortalSession.Status.AWAITING_OTP:
        return "captive/partials/otp.html", {}

    if session.status == PortalSession.Status.AUTHORIZED:
        etapa = session.identity_step
        if etapa == PortalSession.IdentityStep.AWAITING_CONFIRM:
            return "captive/partials/identity_confirm.html", {
                "candidate_name": _candidate_name(session)
            }
        if etapa == PortalSession.IdentityStep.AWAITING_SELFIE:
            return "captive/partials/selfie.html", {
                "candidate_name": _candidate_name(session)
            }
        if etapa == PortalSession.IdentityStep.AWAITING_CPF:
            return "captive/partials/cpf.html", {}
        if session.kind == PortalSession.Kind.VISITOR and not session.cpf_completed:
            return "captive/partials/cpf.html", {}
        return "captive/partials/connected.html", _connected_context(session)

    return "captive/partials/phone.html", {}


@ensure_csrf_cookie
@require_GET
def portal(request):
    """Entrada do portal (S1) — via redirect do agente local com ``?sid=``.

    Aceita também os params crus do controlador (``mac``/``id`` + ``ap`` +
    ``ssid``) pra controladores que redirecionam direto sem passar pelo
    agente. ``?demo=1`` cria uma sessão de demonstração (só com DEBUG).
    """

    session = _get_session(request)

    if session is None:
        mac = request.GET.get("mac") or request.GET.get("id") or request.GET.get("client_mac")
        if mac:
            # Probes de captive (Android/iOS) batem várias vezes — reusa a
            # sessão aberta do MAC em vez de criar uma por acesso.
            normalized = normalize_mac(mac)
            session = (
                PortalSession.objects.filter(
                    mac=normalized,
                    status__in=[
                        PortalSession.Status.PENDING,
                        PortalSession.Status.AWAITING_OTP,
                        PortalSession.Status.AUTHORIZED,
                    ],
                    disconnected_at__isnull=True,
                )
                .order_by("-created_at")
                .first()
                if normalized
                else None
            )
            if session is None:
                started = start_session(
                    mac=mac,
                    ssid=request.GET.get("ssid", ""),
                    ap_mac=request.GET.get("ap", ""),
                    client_ip=request.META.get("REMOTE_ADDR"),
                )
                if started.success:
                    session = PortalSession.objects.filter(token=started.data["session"]).first()
        elif request.GET.get("demo") and settings.DEBUG:
            started = start_session(mac="02:00:00:0D:E0:01")
            session = PortalSession.objects.filter(token=started.data["session"]).first()

    if session is None:
        return render(request, "captive/portal.html", _screen_context(None, missing_session=True))

    screen, extra = _resume_screen(session)
    return render(request, "captive/portal.html", _screen_context(session, screen=screen, **extra))


@require_POST
def htmx_identify(request):
    """S1 → passo 06. Membro → S2 · visitante → S4 · sem WhatsApp → S3."""

    session = _get_session(request)
    if session is None:
        return render(request, "captive/partials/expired.html", {})

    response = identify_phone(session=session, phone=request.POST.get("phone", ""))
    if not response.success:
        return render(
            request,
            "captive/partials/phone.html",
            _screen_context(session, error=response.error),
        )

    if response.data["kind"] == "invalid_whatsapp":
        return render(
            request,
            "captive/partials/phone.html",
            _screen_context(session, show_invalid_modal=True),
        )

    return render(request, "captive/partials/otp.html", _screen_context(session))


@require_POST
def htmx_otp_verify(request):
    """S2/S4 → passos 09/15. Membro → S7 · visitante → S5 · erro E1 inline."""

    session = _get_session(request)
    if session is None:
        return render(request, "captive/partials/expired.html", {})

    code = "".join(request.POST.get(f"d{i}", "") for i in range(1, 7)) or request.POST.get("code", "")
    response = verify_portal_otp(session=session, code=code)
    if not response.success:
        return render(
            request,
            "captive/partials/otp.html",
            _screen_context(
                session,
                error=response.error,
                locked=response.meta.get("locked", False),
                attempts_left=response.meta.get("attempts_left"),
            ),
        )

    if session.kind == PortalSession.Kind.VISITOR:
        return render(request, "captive/partials/cpf.html", _screen_context(session))
    return render(
        request,
        "captive/partials/connected.html",
        _screen_context(session, **_connected_context(session)),
    )


@require_POST
def htmx_otp_resend(request):
    """Reenvio do código com cooldown de 60s — atualiza só o widget."""

    session = _get_session(request)
    if session is None:
        return render(request, "captive/partials/expired.html", {})

    response = resend_portal_otp(session=session)
    return render(
        request,
        "captive/partials/resend.html",
        _screen_context(
            session,
            resent=response.success,
            resend_error=None if response.success else response.error,
        ),
    )


@require_POST
def htmx_cpf(request):
    """S5 → passo 17. Sem conflito → S7 · CPF duplicado → S6 (E3)."""

    session = _get_session(request)
    if session is None:
        return render(request, "captive/partials/expired.html", {})

    response = submit_cpf(
        session=session, cpf=request.POST.get("cpf", ""), request=request
    )
    if not response.success:
        return render(
            request,
            "captive/partials/cpf.html",
            _screen_context(session, error=response.error),
        )

    if response.data["conflict"]:
        # Sem a flag, mantém a tela antiga ("passe na recepção") — o fluxo novo
        # pode ser desligado sem redeploy se a câmera falhar em campo.
        if not getattr(settings, "CAPTIVE_IDENTITY_SELFIE_ENABLED", False):
            return render(
                request, "captive/partials/cpf_conflict.html", _screen_context(session)
            )
        return render(
            request,
            "captive/partials/identity_confirm.html",
            _screen_context(session, candidate_name=response.data.get("candidate_name", "")),
        )

    return render(
        request,
        "captive/partials/connected.html",
        _screen_context(session, **_connected_context(session)),
    )


@require_GET
def htmx_status(request):
    """Badge "internet liberada" — poll leve do estado do grant (ack do agente)."""

    session = _get_session(request)
    released = bool(
        session
        and session.grants.filter(status=AccessGrant.Status.ACKED).exists()
    )
    return render(
        request,
        "captive/partials/status_badge.html",
        {"internet_released": released, "sid": str(session.token) if session else ""},
    )


@require_POST
def htmx_identity_confirm(request):
    """"É você, {nome}?" — sim leva à selfie, não volta pro CPF."""

    session = _get_session(request)
    if session is None:
        return render(request, "captive/partials/expired.html", {})

    confirmado = str(request.POST.get("confirmed", "")).strip() in ("1", "true", "sim")
    response = confirm_identity(session=session, confirmed=confirmado)
    if not response.success:
        return render(
            request,
            "captive/partials/cpf.html",
            _screen_context(session, error=response.error),
        )

    if response.data["step"] == "cpf":
        return render(
            request,
            "captive/partials/cpf.html",
            _screen_context(session, error=response.data.get("message", "")),
        )

    return render(
        request,
        "captive/partials/selfie.html",
        _screen_context(session, candidate_name=response.data.get("candidate_name", "")),
    )


@require_POST
def htmx_selfie(request):
    """Recebe a foto (multipart), aceita automaticamente e funde os cadastros."""

    session = _get_session(request)
    if session is None:
        return render(request, "captive/partials/expired.html", {})

    arquivo = request.FILES.get("selfie")
    if arquivo is None:
        return render(
            request,
            "captive/partials/selfie.html",
            _screen_context(
                session,
                candidate_name=_candidate_name(session),
                error="Não recebemos a foto. Tente de novo ou toque em pular.",
            ),
        )

    response = submit_selfie(session=session, image_file=arquivo, request=request)
    if not response.success:
        return render(
            request,
            "captive/partials/selfie.html",
            _screen_context(session, candidate_name=_candidate_name(session), error=response.error),
        )
    return render(
        request,
        "captive/partials/connected.html",
        _screen_context(session, **_connected_context(session)),
    )


@require_POST
def htmx_selfie_skip(request):
    """Escape hatch: câmera que não abre não pode prender a pessoa na tela."""

    session = _get_session(request)
    if session is None:
        return render(request, "captive/partials/expired.html", {})

    response = skip_selfie(session=session)
    if not response.success:
        return render(
            request,
            "captive/partials/selfie.html",
            _screen_context(session, candidate_name=_candidate_name(session), error=response.error),
        )
    return render(
        request,
        "captive/partials/connected.html",
        _screen_context(session, **_connected_context(session)),
    )
