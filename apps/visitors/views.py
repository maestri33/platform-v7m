"""Frontend HTML simples de contato usando templates e HTMX."""

import json
from datetime import date
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

from django.conf import settings
from django.contrib.auth import login as django_login
from django.contrib.auth import logout as django_logout
from django.http import HttpResponse
from django.shortcuts import redirect, render
from django.template.loader import render_to_string
from django.views.decorators.http import require_GET, require_POST

from apps.authentication.models import LoginOtpState
from apps.profiles.services import get_profile_by_uuid
from apps.visitors.messages import (
    ADDRESS_LOOKUP_SUCCESS_MESSAGE,
    AUTHENTICATION_SUCCESS_MESSAGE,
    CHRISTIANITY_PROMPT_MESSAGE,
    EVANGELICAL_PROMPT_MESSAGE,
    INVALID_BIRTH_DATE_MESSAGE,
    LOGIN_REQUIRED_MESSAGE,
    LOGIN_SUCCESS_MESSAGE,
    LOGOUT_SUCCESS_MESSAGE,
    PHONE_INVALID_MESSAGE,
    RESTART_FLOW_MESSAGE,
    SELECT_RELIGION_MESSAGE,
)
from apps.visitors.models import ChristianityTypeChoices, ReligionChoices, VisitorStatus
from apps.visitors.services import (
    authenticate_visitor_by_phone,
    get_my_visitor_address,
    get_my_visitor_profile_data,
    get_my_visitor_religious_data,
    login_visitor_with_status,
    save_my_visitor_address,
    save_my_visitor_profile_data,
    update_my_visitor_religious_data,
)

SESSION_PROFILE_UUID = "contact_profile_uuid"
SESSION_ACCESS = "contact_access"
SESSION_REFRESH = "contact_refresh"
SESSION_STATUS = "contact_status_code"
SESSION_IS_IN_PERSON = "contact_is_in_person"
SESSION_FLASH_MESSAGE = "contact_flash_message"
PRESENTIAL_STATUSES = {
    int(VisitorStatus.NEW_PRESENCIAL),
    int(VisitorStatus.DATA_COMPLETED_PRESENCIAL),
    int(VisitorStatus.ADDRESS_COMPLETED_PRESENCIAL),
    int(VisitorStatus.AWAITING_TO_COLLECT_YOUR_GIFT),
    int(VisitorStatus.AWAITING_RECEPTION_CONTACT),
}
FLOW_STEPS = [
    {
        "number": 1,
        "label": "Acesso",
        "description": "Telefone e confirmacao do codigo.",
    },
    {
        "number": 2,
        "label": "Dados",
        "description": "Identificacao e dados pessoais.",
    },
    {
        "number": 3,
        "label": "Endereco",
        "description": "Localizacao para continuarmos o atendimento.",
    },
    {
        "number": 4,
        "label": "Jornada espiritual",
        "description": "Contexto religioso e proximo passo.",
    },
]
FLOW_STAGE_INDEX = {
    "authentication": 1,
    "login": 1,
    "data": 2,
    "address": 3,
    "religion": 4,
    "status_4": 4,
    "status_14": 4,
    "status_21": 4,
}


def _bool_from_value(value):
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


def _digits(value):
    return "".join(char for char in str(value or "") if char.isdigit())


def _format_zipcode(value):
    digits = _digits(value)
    if len(digits) == 8:
        return f"{digits[:5]}-{digits[5:]}"
    return str(value or "").strip()


def _session_profile(request):
    profile_uuid = request.session.get(SESSION_PROFILE_UUID)
    if not profile_uuid:
        return None
    return get_profile_by_uuid(profile_uuid=profile_uuid)


def _visitor_user(request):
    user = getattr(request, "user", None)
    if getattr(user, "is_authenticated", False) and getattr(getattr(user, "profile", None), "visitor", None):
        return user
    return None


def _fresh_logged_visitor_user(request):
    """Recarrega o usuario autenticado com profile/visitor atualizados do banco."""

    user = _visitor_user(request)
    if not user:
        return None
    return user.__class__.objects.select_related("profile__visitor").filter(pk=user.pk).first()


def _is_logged_visitor(request):
    return _visitor_user(request) is not None and getattr(request.user, "is_authenticated", False)


def _store_auth_session(request, *, profile_uuid, access=None, refresh=None, status_code=None, is_in_person=None):
    request.session[SESSION_PROFILE_UUID] = str(profile_uuid)
    if access is not None:
        request.session[SESSION_ACCESS] = str(access)
    if refresh is not None:
        request.session[SESSION_REFRESH] = str(refresh)
    if status_code is not None:
        request.session[SESSION_STATUS] = int(status_code)
    if is_in_person is not None:
        request.session[SESSION_IS_IN_PERSON] = bool(is_in_person)
    request.session.modified = True


def _clear_contact_session(request, keep_mode=False):
    preserved_mode = request.session.get(SESSION_IS_IN_PERSON) if keep_mode else None
    for key in [SESSION_PROFILE_UUID, SESSION_ACCESS, SESSION_REFRESH, SESSION_STATUS]:
        request.session.pop(key, None)
    if keep_mode:
        request.session[SESSION_IS_IN_PERSON] = bool(preserved_mode)
    else:
        request.session.pop(SESSION_IS_IN_PERSON, None)
    request.session.modified = True


def _set_flash_message(request, *, message):
    request.session[SESSION_FLASH_MESSAGE] = str(message or "").strip()
    request.session.modified = True


def _pop_flash_message(request):
    message = str(request.session.pop(SESSION_FLASH_MESSAGE, "") or "").strip()
    if message:
        request.session.modified = True
    return message


def _render_partial(request, template_name, context=None):
    return render_to_string(template_name, context or {}, request=request)


def _service_message(response, *, fallback=""):
    meta = getattr(response, "meta", {}) or {}
    return str(meta.get("message") or response.error or fallback or "").strip()


def _modal_oob(request, *, message):
    return _render_partial(
        request,
        "contato/partials/_modal_oob.html",
        {
            "message": message,
        },
    )


def _swap_oob(request, *, target_id, template_name, context=None):
    return _render_partial(
        request,
        "contato/partials/_swap_oob.html",
        {
            "target_id": target_id,
            "content": _render_partial(request, template_name, context or {}),
        },
    )


def _swap_oob_html(request, *, target_id, html=""):
    return _render_partial(
        request,
        "contato/partials/_swap_oob.html",
        {
            "target_id": target_id,
            "content": html,
        },
    )


def _html_response(*parts):
    return HttpResponse("".join(parts))


def _site_media_url(path):
    normalized_path = str(path or "").strip().lstrip("/")
    return f"{settings.MEDIA_URL}site/{normalized_path}"


def _render_contact_shell(request, *, template_name=None, context=None):
    selected_template = template_name
    selected_context = context
    if not selected_template:
        selected_template, selected_context = _current_flow_template(request)

    return render(
        request,
        "contato/base.html",
        {
            "initial_content": _render_partial(request, selected_template, selected_context),
            "initial_modal_message": _pop_flash_message(request),
            "contact_brand_logo_url": "https://amalia.ieadpg.org/logo.png",
            "contact_hero_image_url": _site_media_url("hero_worship.jpg"),
            "contact_favicon_url": _site_media_url("logo-q.png"),
        },
    )


def _contact_public_url(request):
    return "/contato/?p=1" if bool(request.session.get(SESSION_IS_IN_PERSON, False)) else "/contato/"


def _visitor_mode_from_status(status_code):
    return int(status_code) in PRESENTIAL_STATUSES


def _resolve_is_in_person(request, *, user=None):
    current_user = user
    if current_user is None:
        current_user = _fresh_logged_visitor_user(request) or _visitor_user(request)

    visitor = getattr(getattr(current_user, "profile", None), "visitor", None)
    if visitor:
        return _visitor_mode_from_status(visitor.status)

    status_code = request.session.get(SESSION_STATUS)
    if status_code is not None:
        return _visitor_mode_from_status(status_code)

    return bool(request.session.get(SESSION_IS_IN_PERSON, False))


def _flow_copy(request, *, stage, user=None):
    is_in_person = _resolve_is_in_person(request, user=user)
    current_step = FLOW_STAGE_INDEX.get(stage, 1)

    if is_in_person:
        content = {
            "journey_name": "Recepção Presencial",
            "mode_badge": "Você está aqui 💛",
            "mode_summary": "Que alegria ter você conosco hoje! Vamos te acompanhar durante esse momento.",
            "authentication": {
                "title": "Obrigado por participar do culto.",
                "intro": "É uma alegria ter você aqui com a gente 🙏 Para continuarmos, informe seu telefone.",
            },
            "login": {
                "title": "Confirme seu código",
                "intro": "Enviamos um código para seu telefone. Digite abaixo para continuar.",
            },
            "data": {
                "title": "Dados principais",
                "intro": "Nos conte algumas informações básicas para que possamos te receber com carinho.",
            },
            "address": {
                "title": "Onde você mora?",
                "intro": "Isso nos ajuda a cuidar de você e, se quiser, te conectar com algo mais perto de você.",
            },
            "religion": {
                "title": "Sua caminhada de fé",
                "intro": "Queremos entender um pouco da sua história para te acolher melhor 💛",
            },
            "status_14": {
                "title": "Passe na recepção 😊",
                "intro": "Tudo certo por aqui! Agora é só ir até a recepção - temos um presente preparado com carinho para você.",
            },
            "status_21": {
                "title": "Vamos continuar próximos",
                "intro": "Sua visita foi registrada 💛 Em breve, alguém da nossa equipe vai falar com você.",
            },
        }
    else:
        content = {
            "journey_name": "Primeiro Contato Online",
            "mode_badge": "Bem-vindo 💬",
            "mode_summary": "Que bom ter você por aqui! Vamos começar essa conversa 😊",
            "authentication": {
                "title": "Obrigado por acessar a IEADPG.",
                "intro": "Ficamos felizes com seu contato 🙏 Para continuar, informe seu telefone.",
            },
            "login": {
                "title": "Confirme seu código",
                "intro": "Enviamos um código para seu telefone. Digite abaixo para continuar.",
            },
            "data": {
                "title": "Dados principais",
                "intro": "Nos conte algumas informações básicas para que possamos caminhar com você.",
            },
            "address": {
                "title": "Onde você mora?",
                "intro": "Isso nos ajuda a te acompanhar melhor e te indicar algo próximo de você.",
            },
            "religion": {
                "title": "Sua caminhada de fé",
                "intro": "Queremos entender sua história para te acolher com carinho 💛",
            },
            "status_4": {
                "title": "Tudo pronto!",
                "intro": "Seu contato foi registrado 😊 Que tal dar o próximo passo e nos fazer uma visita presencial? Vamos amar te receber!",
            },
        }

    page = content.get(stage) or content.get("data")
    steps = []
    for item in FLOW_STEPS:
        state = "upcoming"
        if item["number"] < current_step:
            state = "completed"
        elif item["number"] == current_step:
            state = "current"
        steps.append({**item, "state": state})

    return {
        "flow": {
            "is_in_person": is_in_person,
            "journey_name": content["journey_name"],
            "mode_badge": content["mode_badge"],
            "mode_summary": content["mode_summary"],
            "page_title": page["title"],
            "page_intro": page["intro"],
            "current_step_number": current_step,
            "total_steps": len(FLOW_STEPS),
            "steps": steps,
        }
    }


def _with_flow_context(request, *, stage, context=None, user=None):
    merged = dict(context or {})
    merged.update(_flow_copy(request, stage=stage, user=user))
    return merged


def _auth_context(request):
    return _with_flow_context(request, stage="authentication", context={
        "is_in_person": bool(request.session.get(SESSION_IS_IN_PERSON, False)),
    })


def _pending_login_context(request):
    profile = _session_profile(request)
    return _with_flow_context(request, stage="login", context={
        "profile_uuid": request.session.get(SESSION_PROFILE_UUID, ""),
        "first_name": getattr(getattr(profile, "user", None), "first_name", "") if profile else "",
    })


def _profile_context_from_response(response):
    data = response.data or {}
    return {
        "profile": data.get("profile") or {
            "full_name": "",
            "email": "",
            "date_of_birth": None,
            "gender": "",
            "marital_status": "",
        },
        "status": data.get("status") or {},
        "required_action": data.get("required_action", ""),
        "missing_fields": data.get("missing_fields", []),
    }


def _address_context_from_response(response):
    data = response.data or {}
    address = data.get("address") or {
        "zipcode": "",
        "street": "",
        "number": "",
        "complement": "",
        "neighborhood": "",
        "city": "",
        "state": "",
        "country": "Brasil",
    }
    return {
        "address": address,
        "status": data.get("status") or {},
        "required_action": data.get("required_action", ""),
        "missing_fields": data.get("missing_fields", []),
        "show_address_form": any(str(address.get(field, "") or "").strip() for field in ["zipcode", "street", "city", "state"]),
    }


def _religion_context_from_response(response):
    data = response.data or {}
    return {
        "religious_data": data.get("religious_data") or {
            "religion": "",
            "christianity_type": "",
            "evangelical_church_name": "",
            "evangelical_is_in_communion": None,
        },
        "status": data.get("status") or {},
        "required_action": (data.get("status") or {}).get("required_action", ""),
        "missing_fields": data.get("missing_fields", []),
    }


def _status_screen_context(request, *, user):
    user = _fresh_logged_visitor_user(request) or user
    visitor = user.profile.visitor
    status_code = int(visitor.status)
    request.session[SESSION_STATUS] = status_code

    if status_code in {VisitorStatus.NEW_ONLINE, VisitorStatus.NEW_PRESENCIAL}:
        response = get_my_visitor_profile_data(user=user)
        return "contato/partials/data.html", _with_flow_context(
            request,
            stage="data",
            context=_profile_context_from_response(response),
            user=user,
        )

    if status_code in {VisitorStatus.DATA_COMPLETED_ONLINE, VisitorStatus.DATA_COMPLETED_PRESENCIAL}:
        response = get_my_visitor_address(user=user)
        return "contato/partials/address.html", _with_flow_context(
            request,
            stage="address",
            context=_address_context_from_response(response),
            user=user,
        )

    if status_code in {VisitorStatus.ADDRESS_COMPLETED_ONLINE, VisitorStatus.ADDRESS_COMPLETED_PRESENCIAL}:
        response = get_my_visitor_religious_data(user=user)
        return "contato/partials/religion.html", _with_flow_context(
            request,
            stage="religion",
            context=_religion_context_from_response(response),
            user=user,
        )

    if status_code == VisitorStatus.AWAITTING_PRESENTIAL_VISIT:
        return "contato/partials/status_4.html", _with_flow_context(
            request,
            stage="status_4",
            context={"status": VisitorStatus.details_for(status_code)},
            user=user,
        )

    if status_code == VisitorStatus.AWAITING_TO_COLLECT_YOUR_GIFT:
        return "contato/partials/status_14.html", _with_flow_context(
            request,
            stage="status_14",
            context={"status": VisitorStatus.details_for(status_code)},
            user=user,
        )

    return "contato/partials/status_21.html", _with_flow_context(
        request,
        stage="status_21",
        context={"status": VisitorStatus.details_for(status_code)},
        user=user,
    )


def _current_flow_template(request):
    if _is_logged_visitor(request):
        return _status_screen_context(request, user=request.user)

    if request.session.get(SESSION_PROFILE_UUID):
        return "contato/partials/login.html", _pending_login_context(request)

    return "contato/partials/authentication.html", _auth_context(request)


def _flow_swap(request):
    template_name, context = _current_flow_template(request)
    return _swap_oob(request, target_id="contact-flow", template_name=template_name, context=context)


def _message_only_response(request, *, message):
    return _html_response(
        _flow_swap(request),
        _modal_oob(request, message=message),
    )


def _religion_prompt_oob(request, *, template_name=None, context=None):
    html = ""
    if template_name:
        html = _render_partial(request, template_name, context or {})
    return _swap_oob_html(request, target_id="contact-religion-detail", html=html)


def _address_lookup_context_from_cep(zipcode, payload):
    return {
        "address": {
            "zipcode": _format_zipcode(zipcode),
            "street": str(payload.get("logradouro", "") or "").strip(),
            "number": "",
            "complement": str(payload.get("complemento", "") or "").strip(),
            "neighborhood": str(payload.get("bairro", "") or "").strip(),
            "city": str(payload.get("localidade", "") or "").strip(),
            "state": str(payload.get("uf", "") or "").strip(),
            "country": "Brasil",
        }
    }


def _fetch_cep_data(zipcode):
    digits = _digits(zipcode)
    if len(digits) != 8:
        return None, "Informe um CEP valido com 8 digitos."

    try:
        with urlopen(f"https://viacep.com.br/ws/{digits}/json/", timeout=5) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, ValueError):
        return None, "Nao foi possivel consultar o CEP agora."

    if payload.get("erro"):
        return None, "CEP nao encontrado."

    return payload, None


def _login_required_message(request):
    _clear_contact_session(request, keep_mode=True)
    if getattr(request.user, "is_authenticated", False):
        django_logout(request)
    response = _html_response(
        _flow_swap(request),
        _modal_oob(request, message=LOGIN_REQUIRED_MESSAGE),
    )
    response["HX-Replace-Url"] = _contact_public_url(request)
    return response


@require_GET
def contact_home(request):
    """Renderiza a casca HTML principal do fluxo de contato."""

    if "p" in request.GET:
        request.session[SESSION_IS_IN_PERSON] = True
    elif not request.session.get(SESSION_PROFILE_UUID) and not _is_logged_visitor(request):
        request.session[SESSION_IS_IN_PERSON] = False

    return _render_contact_shell(request)


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
    _clear_contact_session(request, keep_mode=False)

    profile = get_profile_by_uuid(profile_uuid=profile_uuid)
    visitor = getattr(profile, "visitor", None) if profile else None
    if not visitor:
        _set_flash_message(request, message="Visitante nao encontrado.")
        return redirect("/contato/")

    is_in_person = _visitor_mode_from_status(visitor.status)
    _store_auth_session(
        request,
        profile_uuid=profile_uuid,
        is_in_person=is_in_person,
    )

    response = login_visitor_with_status(profile_uuid=profile_uuid, otp=otp)
    if not response.success:
        _set_flash_message(request, message=response.error)
        return redirect(_contact_public_url(request))

    profile = get_profile_by_uuid(profile_uuid=profile_uuid)
    if not profile or not getattr(profile, "visitor", None):
        _set_flash_message(request, message="Visitante nao encontrado.")
        return redirect("/contato/")

    django_login(request, profile.user, backend="django.contrib.auth.backends.ModelBackend")
    _store_auth_session(
        request,
        profile_uuid=profile_uuid,
        access=response.data.get("access", ""),
        refresh=response.data.get("refresh", ""),
        status_code=(response.data.get("status") or {}).get("code"),
        is_in_person=is_in_person,
    )
    _set_flash_message(
        request,
        message=LOGIN_SUCCESS_MESSAGE,
    )
    return redirect(_contact_public_url(request))


@require_POST
def contact_authentication(request):
    """Recebe o telefone e inicia o fluxo OTP do visitante."""

    if getattr(request.user, "is_authenticated", False):
        django_logout(request)
    _clear_contact_session(request, keep_mode=True)

    phone = str(request.POST.get("phone") or request.POST.get("contact_number") or "").strip()
    is_in_person = _bool_from_value(request.POST.get("is_in_person"))
    request.session[SESSION_IS_IN_PERSON] = is_in_person

    if len(_digits(phone)) < 10:
        return _html_response(
            _flow_swap(request),
            _modal_oob(request, message=PHONE_INVALID_MESSAGE),
        )

    response = authenticate_visitor_by_phone(contact_number=phone, is_in_person=is_in_person)
    if not response.success:
        return _html_response(
            _flow_swap(request),
            _modal_oob(request, message=response.error),
        )

    _store_auth_session(
        request,
        profile_uuid=response.data["profile_uuid"],
        is_in_person=is_in_person,
    )
    return _html_response(
        _flow_swap(request),
        _modal_oob(request, message=AUTHENTICATION_SUCCESS_MESSAGE),
    )


@require_POST
def contact_login(request):
    """Confirma OTP, abre sessao Django e carrega a etapa correta."""

    profile_uuid = str(request.POST.get("profile_uuid") or request.session.get(SESSION_PROFILE_UUID) or "").strip()
    otp = str(request.POST.get("otp") or "").strip()

    response = login_visitor_with_status(profile_uuid=profile_uuid, otp=otp)
    if not response.success:
        return _html_response(
            _flow_swap(request),
            _modal_oob(request, message=response.error),
        )

    profile = get_profile_by_uuid(profile_uuid=profile_uuid)
    if not profile or not getattr(profile, "visitor", None):
        return _html_response(
            _flow_swap(request),
            _modal_oob(request, message="Visitante nao encontrado."),
        )

    django_login(request, profile.user, backend="django.contrib.auth.backends.ModelBackend")
    _store_auth_session(
        request,
        profile_uuid=profile_uuid,
        access=response.data.get("access", ""),
        refresh=response.data.get("refresh", ""),
        status_code=(response.data.get("status") or {}).get("code"),
        is_in_person=request.session.get(SESSION_IS_IN_PERSON, False),
    )
    return _html_response(
        _flow_swap(request),
        _modal_oob(
            request,
            message=LOGIN_SUCCESS_MESSAGE,
        ),
    )


@require_POST
def contact_profile_data(request):
    """Salva dados principais do visitante autenticado."""

    if not _is_logged_visitor(request):
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
            return _html_response(
                _flow_swap(request),
                _modal_oob(request, message=INVALID_BIRTH_DATE_MESSAGE),
            )
    response = save_my_visitor_profile_data(user=user, payload=payload)
    return _html_response(
        _flow_swap(request),
        _modal_oob(request, message=_service_message(response)),
    )


@require_POST
def contact_address_lookup(request):
    """Consulta um CEP e injeta o formulario completo de endereco."""

    if not _is_logged_visitor(request):
        return _login_required_message(request)
    user = request.user

    zipcode = str(request.POST.get("zipcode") or "").strip()
    payload, error = _fetch_cep_data(zipcode)
    if error:
        return _html_response(
            _modal_oob(request, message=error),
        )

    return _html_response(
        _swap_oob(
            request,
            target_id="address-form-slot",
            template_name="contato/partials/address_form.html",
            context=_address_lookup_context_from_cep(zipcode, payload),
        ),
        _modal_oob(
            request,
            message=ADDRESS_LOOKUP_SUCCESS_MESSAGE,
        ),
    )


@require_POST
def contact_address_save(request):
    """Salva endereco do visitante autenticado."""

    if not _is_logged_visitor(request):
        return _login_required_message(request)
    user = request.user

    payload = {
        "zipcode": _format_zipcode(request.POST.get("zipcode")),
        "street": str(request.POST.get("street") or "").strip(),
        "number": str(request.POST.get("number") or "").strip(),
        "complement": str(request.POST.get("complement") or "").strip(),
        "neighborhood": str(request.POST.get("neighborhood") or "").strip(),
        "city": str(request.POST.get("city") or "").strip(),
        "state": str(request.POST.get("state") or "").strip(),
        "country": str(request.POST.get("country") or "Brasil").strip() or "Brasil",
    }
    response = save_my_visitor_address(user=user, payload=payload)
    return _html_response(
        _flow_swap(request),
        _modal_oob(request, message=_service_message(response)),
    )


@require_POST
def contact_religion_prepare(request):
    """Decide o proximo passo do fluxo religioso."""

    if not _is_logged_visitor(request):
        return _login_required_message(request)
    user = request.user

    religion = str(request.POST.get("religion") or "").strip()
    if not religion:
        return _html_response(
            _modal_oob(request, message=SELECT_RELIGION_MESSAGE),
        )

    if religion != ReligionChoices.CHRISTIANITY:
        response = update_my_visitor_religious_data(user=user, payload={"religion": religion})
        return _html_response(
            _flow_swap(request),
            _modal_oob(request, message=_service_message(response)),
        )

    return _html_response(
        _religion_prompt_oob(
            request,
            template_name="contato/partials/modal_christianity_type.html",
            context={"body_context": {"religion": religion}},
        ),
        _modal_oob(
            request,
            message=CHRISTIANITY_PROMPT_MESSAGE,
        ),
    )


@require_POST
def contact_religion_christianity(request):
    """Recebe o ramo cristao e decide se ja pode salvar ou se precisa de dados evangelicos."""

    if not _is_logged_visitor(request):
        return _login_required_message(request)
    user = request.user

    christianity_type = str(request.POST.get("christianity_type") or "").strip()
    if not christianity_type:
        return _html_response(
            _religion_prompt_oob(
                request,
                template_name="contato/partials/modal_christianity_type.html",
                context={"body_context": {"religion": ReligionChoices.CHRISTIANITY}},
            ),
            _modal_oob(
                request,
                message=CHRISTIANITY_PROMPT_MESSAGE,
            ),
        )

    if christianity_type == ChristianityTypeChoices.EVANGELICAL_PROTESTANT:
        return _html_response(
            _religion_prompt_oob(
                request,
                template_name="contato/partials/modal_evangelical_info.html",
                context={
                    "body_context": {
                        "religion": ReligionChoices.CHRISTIANITY,
                        "christianity_type": christianity_type,
                    }
                },
            ),
            _modal_oob(
                request,
                message=EVANGELICAL_PROMPT_MESSAGE,
            ),
        )

    response = update_my_visitor_religious_data(
        user=user,
        payload={
            "religion": ReligionChoices.CHRISTIANITY,
            "christianity_type": christianity_type,
        },
    )
    return _html_response(
        _flow_swap(request),
        _modal_oob(request, message=_service_message(response)),
    )


@require_POST
def contact_religion_evangelical(request):
    """Salva a ramificacao evangelica do fluxo religioso."""

    if not _is_logged_visitor(request):
        return _login_required_message(request)
    user = request.user

    church_name = str(request.POST.get("evangelical_church_name") or "").strip()
    is_in_communion_raw = str(request.POST.get("evangelical_is_in_communion") or "").strip().lower()
    if not church_name or is_in_communion_raw not in {"true", "false"}:
        return _html_response(
            _religion_prompt_oob(
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
            _modal_oob(
                request,
                message=EVANGELICAL_PROMPT_MESSAGE,
            ),
        )

    response = update_my_visitor_religious_data(
        user=user,
        payload={
            "religion": ReligionChoices.CHRISTIANITY,
            "christianity_type": ChristianityTypeChoices.EVANGELICAL_PROTESTANT,
            "evangelical_church_name": church_name,
            "evangelical_is_in_communion": is_in_communion_raw == "true",
        },
    )
    return _html_response(
        _flow_swap(request),
        _modal_oob(request, message=_service_message(response)),
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
    _clear_contact_session(request, keep_mode=False)
    response = _html_response(
        _flow_swap(request),
        _modal_oob(request, message=RESTART_FLOW_MESSAGE),
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

    _clear_contact_session(request, keep_mode=True)
    response = _html_response(
        _flow_swap(request),
        _modal_oob(request, message=LOGOUT_SUCCESS_MESSAGE),
    )
    response["HX-Replace-Url"] = _contact_public_url(request)
    return response
