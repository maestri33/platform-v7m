"""Frontend HTML simples de contato usando templates e HTMX."""

from datetime import date

from django.contrib.auth import login as django_login
from django.contrib.auth import logout as django_logout
from django.shortcuts import redirect, render
from django.views.decorators.http import require_GET, require_POST

from apps.authentication.models import LoginOtpState
from apps.profiles.models import Profile
from apps.visitors.frontend.api_client import (
    authenticate_visitor,
    get_address,
    get_profile_data,
    get_religious_data,
    login_visitor,
    save_address,
    save_profile_data,
    update_religious_data,
)
from apps.visitors.frontend.cep import address_lookup_context_from_cep, fetch_cep_data
from apps.visitors.frontend.messages import (
    CHRISTIANITY_PROMPT_MESSAGE,
    EVANGELICAL_PROMPT_MESSAGE,
)
from apps.visitors.frontend.presentation import (
    flow_swap,
    html_response,
    modal_oob,
    religion_prompt_oob,
    render_contact_shell,
    swap_oob,
)
from apps.visitors.frontend.state import (
    SESSION_IS_IN_PERSON,
    SESSION_PROFILE_UUID,
    SESSION_STATUS,
    bool_from_value,
    clear_contact_session,
    contact_public_url,
    digits,
    format_zipcode,
    is_logged_visitor,
    store_auth_session,
    set_flash_message,
    visitor_mode_from_status,
)
from apps.visitors.messages import (
    AUTHENTICATION_SUCCESS_MESSAGE,
    LOGIN_SUCCESS_MESSAGE,
)
from apps.visitors.models import ChristianityTypeChoices, ReligionChoices, VisitorStatus


def _service_message(response, *, fallback=""):
    meta = getattr(response, "meta", {}) or {}
    return str(meta.get("message") or response.error or fallback or "").strip()


def _response_options(response):
    data = getattr(response, "data", {}) or {}
    options = data.get("options") or {}
    if isinstance(options, dict):
        return options
    return {}


def _load_profile(profile_uuid):
    return (
        Profile.objects.select_related("user", "visitor")
        .filter(uuid=profile_uuid)
        .first()
    )


def _login_required_message(request):
    clear_contact_session(request, keep_mode=True)
    if getattr(request.user, "is_authenticated", False):
        django_logout(request)
    response = html_response(
        flow_swap(request),
        modal_oob(request, message="Sua conexão caiu, mas fica tranquilo... vamos entrar novamente!"),
    )
    response["HX-Replace-Url"] = contact_public_url(request)
    return response


def _address_lookup_form_context(request, *, user, zipcode, payload):
    context = address_lookup_context_from_cep(zipcode, payload)
    context["options"] = _response_options(get_address(request, user=user))
    return context


def _christianity_type_options(request, *, user):
    return list(_response_options(get_religious_data(request, user=user)).get("christianity_type") or [])


@require_GET
def contact_home(request):
    """Renderiza a casca HTML principal do fluxo de contato."""

    if "p" in request.GET:
        request.session[SESSION_IS_IN_PERSON] = True
    elif not request.session.get(SESSION_PROFILE_UUID) and not is_logged_visitor(request):
        request.session[SESSION_IS_IN_PERSON] = False

    return render_contact_shell(request)


@require_GET
def contact_modal_blank(request):
    """Retorna o placeholder vazio do modal para troca via HTMX."""

    return render(request, "contato/partials/_modal_dialog.html", {})


@require_GET
def contact_magic_login(request, profile_uuid):
    """Autentica via magic link e reaproveita a mesma shell HTMX do fluxo de contato."""

    profile_uuid = str(profile_uuid or "").strip()
    otp = str(request.GET.get("otp") or "").strip()

    if getattr(request.user, "is_authenticated", False):
        django_logout(request)
    clear_contact_session(request, keep_mode=False)

    profile = _load_profile(profile_uuid)
    visitor = getattr(profile, "visitor", None) if profile else None
    if not visitor:
        set_flash_message(request, message="Visitante nao encontrado.")
        return redirect("/contato/")

    is_in_person = visitor_mode_from_status(visitor.status)
    store_auth_session(
        request,
        profile_uuid=profile_uuid,
        is_in_person=is_in_person,
    )

    response = login_visitor(request, profile_uuid=profile_uuid, otp=otp)
    if not response.success:
        set_flash_message(request, message=response.error)
        return redirect(contact_public_url(request))

    profile = _load_profile(profile_uuid)
    if not profile or not getattr(profile, "visitor", None):
        set_flash_message(request, message="Visitante nao encontrado.")
        return redirect("/contato/")

    django_login(request, profile.user, backend="django.contrib.auth.backends.ModelBackend")
    store_auth_session(
        request,
        profile_uuid=profile_uuid,
        access=response.data.get("access", ""),
        refresh=response.data.get("refresh", ""),
        status_code=(response.data.get("status") or {}).get("code"),
        is_in_person=is_in_person,
    )
    set_flash_message(
        request,
        message=LOGIN_SUCCESS_MESSAGE,
    )
    return redirect(contact_public_url(request))


@require_POST
def contact_authentication(request):
    """Recebe o telefone e inicia o fluxo OTP do visitante."""

    if getattr(request.user, "is_authenticated", False):
        django_logout(request)
    clear_contact_session(request, keep_mode=True)

    phone = str(request.POST.get("phone") or request.POST.get("contact_number") or "").strip()
    is_in_person = bool_from_value(request.POST.get("is_in_person"))
    request.session[SESSION_IS_IN_PERSON] = is_in_person

    if len(digits(phone)) < 10:
        return html_response(
            flow_swap(request),
            modal_oob(request, message="Hum... esse número parece não estar correto. Vamos tentar de novo?"),
        )

    response = authenticate_visitor(request, phone=phone, is_in_person=is_in_person)
    if not response.success:
        return html_response(
            flow_swap(request),
            modal_oob(request, message=response.error),
        )

    store_auth_session(
        request,
        profile_uuid=response.data["profile_uuid"],
        is_in_person=is_in_person,
    )
    return html_response(
        flow_swap(request),
        modal_oob(request, message=AUTHENTICATION_SUCCESS_MESSAGE),
    )


@require_POST
def contact_login(request):
    """Confirma OTP, abre sessao Django e carrega a etapa correta."""

    profile_uuid = str(request.POST.get("profile_uuid") or request.session.get(SESSION_PROFILE_UUID) or "").strip()
    otp = str(request.POST.get("otp") or "").strip()

    response = login_visitor(request, profile_uuid=profile_uuid, otp=otp)
    if not response.success:
        return html_response(
            flow_swap(request),
            modal_oob(request, message=response.error),
        )

    profile = _load_profile(profile_uuid)
    if not profile or not getattr(profile, "visitor", None):
        return html_response(
            flow_swap(request),
            modal_oob(request, message="Visitante nao encontrado."),
        )

    django_login(request, profile.user, backend="django.contrib.auth.backends.ModelBackend")
    store_auth_session(
        request,
        profile_uuid=profile_uuid,
        access=response.data.get("access", ""),
        refresh=response.data.get("refresh", ""),
        status_code=(response.data.get("status") or {}).get("code"),
        is_in_person=request.session.get(SESSION_IS_IN_PERSON, False),
    )
    return html_response(
        flow_swap(request),
        modal_oob(
            request,
            message=LOGIN_SUCCESS_MESSAGE,
        ),
    )


@require_POST
def contact_profile_data(request):
    """Salva dados principais do visitante autenticado."""

    if not is_logged_visitor(request):
        return _login_required_message(request)
    user = request.user

    payload = {
        "full_name": str(request.POST.get("full_name") or "").strip(),
        "email": str(request.POST.get("email") or "").strip(),
        "date_of_birth": str(request.POST.get("date_of_birth") or "").strip(),
        "gender": str(request.POST.get("gender") or "").strip(),
        "marital_status": str(request.POST.get("marital_status") or "").strip(),
    }
    if payload["date_of_birth"]:
        try:
            payload["date_of_birth"] = date.fromisoformat(payload["date_of_birth"])
        except ValueError:
            return html_response(
                flow_swap(request),
                modal_oob(request, message="A data de nascimento informada não parece válida. Pode tentar novamente?"),
            )
    response = save_profile_data(request, user=user, payload=payload)
    return html_response(
        flow_swap(request),
        modal_oob(request, message=_service_message(response)),
    )


@require_POST
def contact_address_lookup(request):
    """Consulta um CEP e injeta o formulario completo de endereco."""

    if not is_logged_visitor(request):
        return _login_required_message(request)

    zipcode = str(request.POST.get("zipcode") or "").strip()
    payload, error = fetch_cep_data(zipcode)
    if error:
        return html_response(
            modal_oob(request, message=error),
        )

    return html_response(
        swap_oob(
            request,
            target_id="address-form-slot",
            template_name="contato/partials/address_form.html",
            context=_address_lookup_form_context(request, user=request.user, zipcode=zipcode, payload=payload),
        ),
        modal_oob(
            request,
            message="Pronto! Já consegui localizar seu endereço.",
        ),
    )


@require_POST
def contact_address_save(request):
    """Salva endereco do visitante autenticado."""

    if not is_logged_visitor(request):
        return _login_required_message(request)
    user = request.user

    payload = {
        "zipcode": format_zipcode(request.POST.get("zipcode")),
        "street": str(request.POST.get("street") or "").strip(),
        "number": str(request.POST.get("number") or "").strip(),
        "complement": str(request.POST.get("complement") or "").strip(),
        "neighborhood": str(request.POST.get("neighborhood") or "").strip(),
        "city": str(request.POST.get("city") or "").strip(),
        "state": str(request.POST.get("state") or "").strip(),
        "country": str(request.POST.get("country") or "Brasil").strip() or "Brasil",
    }
    response = save_address(request, user=user, payload=payload)
    return html_response(
        flow_swap(request),
        modal_oob(request, message=_service_message(response)),
    )


@require_POST
def contact_religion_prepare(request):
    """Decide o proximo passo do fluxo religioso."""

    if not is_logged_visitor(request):
        return _login_required_message(request)
    user = request.user

    religion = str(request.POST.get("religion") or "").strip()
    if not religion:
        return html_response(
            modal_oob(request, message="Agora vamos falar mais sobre a sua fé..."),
        )

    if religion != ReligionChoices.CHRISTIANITY:
        response = update_religious_data(request, user=user, payload={"religion": religion})
        return html_response(
            flow_swap(request),
            modal_oob(request, message=_service_message(response)),
        )

    return html_response(
        religion_prompt_oob(
            request,
            template_name="contato/partials/modal_christianity_type.html",
            context={
                "body_context": {"religion": religion},
                "christianity_type_options": _christianity_type_options(request, user=user),
            },
        ),
        modal_oob(
            request,
            message=CHRISTIANITY_PROMPT_MESSAGE,
        ),
    )


@require_POST
def contact_religion_christianity(request):
    """Recebe o ramo cristao e decide se ja pode salvar ou se precisa de dados evangelicos."""

    if not is_logged_visitor(request):
        return _login_required_message(request)
    user = request.user

    christianity_type = str(request.POST.get("christianity_type") or "").strip()
    if not christianity_type:
        return html_response(
            religion_prompt_oob(
                request,
                template_name="contato/partials/modal_christianity_type.html",
                context={
                    "body_context": {"religion": ReligionChoices.CHRISTIANITY},
                    "christianity_type_options": _christianity_type_options(request, user=user),
                },
            ),
            modal_oob(
                request,
                message=CHRISTIANITY_PROMPT_MESSAGE,
            ),
        )

    if christianity_type == ChristianityTypeChoices.EVANGELICAL_PROTESTANT:
        return html_response(
            religion_prompt_oob(
                request,
                template_name="contato/partials/modal_evangelical_info.html",
                context={
                    "body_context": {
                        "religion": ReligionChoices.CHRISTIANITY,
                        "christianity_type": christianity_type,
                    },
                },
            ),
            modal_oob(
                request,
                message=EVANGELICAL_PROMPT_MESSAGE,
            ),
        )

    response = update_religious_data(
        request,
        user=user,
        payload={
            "religion": ReligionChoices.CHRISTIANITY,
            "christianity_type": christianity_type,
        },
    )
    return html_response(
        flow_swap(request),
        modal_oob(request, message=_service_message(response)),
    )


@require_POST
def contact_religion_evangelical(request):
    """Salva a ramificacao evangelica do fluxo religioso."""

    if not is_logged_visitor(request):
        return _login_required_message(request)
    user = request.user

    church_name = str(request.POST.get("evangelical_church_name") or "").strip()
    is_in_communion_raw = str(request.POST.get("evangelical_is_in_communion") or "").strip().lower()
    if not church_name or is_in_communion_raw not in {"true", "false"}:
        return html_response(
            religion_prompt_oob(
                request,
                template_name="contato/partials/modal_evangelical_info.html",
                context={
                    "body_context": {
                        "religion": ReligionChoices.CHRISTIANITY,
                        "christianity_type": ChristianityTypeChoices.EVANGELICAL_PROTESTANT,
                        "evangelical_church_name": church_name,
                        "evangelical_is_in_communion": is_in_communion_raw,
                    }
                },
            ),
            modal_oob(
                request,
                message=EVANGELICAL_PROMPT_MESSAGE,
            ),
        )

    response = update_religious_data(
        request,
        user=user,
        payload={
            "religion": ReligionChoices.CHRISTIANITY,
            "christianity_type": ChristianityTypeChoices.EVANGELICAL_PROTESTANT,
            "evangelical_church_name": church_name,
            "evangelical_is_in_communion": is_in_communion_raw == "true",
        },
    )
    return html_response(
        flow_swap(request),
        modal_oob(request, message=_service_message(response)),
    )


@require_POST
def contact_restart(request):
    """Reinicia o fluxo visual simples."""

    if getattr(request.user, "is_authenticated", False):
        otp_state = LoginOtpState.objects.filter(user=request.user).first()
        if otp_state:
            otp_state.otp_created_at = None
            otp_state.save(update_fields=["otp_created_at", "updated_at"])
        django_logout(request)
    clear_contact_session(request, keep_mode=False)
    response = html_response(
        flow_swap(request),
        modal_oob(request, message="Vamos tentar de novo? Digite seu telefone corretamente."),
    )
    response["HX-Replace-Url"] = "/contato/"
    return response


@require_POST
def contact_logout(request):
    """Encerra a sessao atual do contato e volta ao inicio publico."""

    if getattr(request.user, "is_authenticated", False):
        otp_state = LoginOtpState.objects.filter(user=request.user).first()
        if otp_state:
            otp_state.otp_created_at = None
            otp_state.save(update_fields=["otp_created_at", "updated_at"])
        django_logout(request)

    clear_contact_session(request, keep_mode=True)
    response = html_response(
        flow_swap(request),
        modal_oob(request, message="Você saiu com sucesso. Se quiser continuar, é só informar seu telefone novamente!"),
    )
    response["HX-Replace-Url"] = contact_public_url(request)
    return response
