"""Helpers de apresentação/fluxo do frontend de visitors."""

from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import render
from django.template.loader import render_to_string

from apps.visitors.frontend.api_client import get_address, get_profile_data, get_religious_data
from apps.visitors.models import VisitorStatus

from .state import (
    SESSION_IS_IN_PERSON,
    SESSION_PROFILE_UUID,
    SESSION_STATUS,
    contact_public_url,
    pop_flash_message,
    resolve_is_in_person,
    session_profile,
    fresh_logged_visitor_user,
    is_logged_visitor,
)

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

FORM_OPTION_KEYS = (
    "gender",
    "marital_status",
    "state",
    "religion",
    "christianity_type",
)


def render_partial(request, template_name, context=None):
    return render_to_string(template_name, context or {}, request=request)


def modal_oob(request, *, message):
    return render_partial(
        request,
        "contato/partials/_modal_oob.html",
        {
            "message": message,
        },
    )


def swap_oob(request, *, target_id, template_name, context=None):
    return render_partial(
        request,
        "contato/partials/_swap_oob.html",
        {
            "target_id": target_id,
            "content": render_partial(request, template_name, context or {}),
        },
    )


def swap_oob_html(request, *, target_id, html=""):
    return render_partial(
        request,
        "contato/partials/_swap_oob.html",
        {
            "target_id": target_id,
            "content": html,
        },
    )


def html_response(*parts):
    return HttpResponse("".join(parts))


def site_media_url(path):
    normalized_path = str(path or "").strip().lstrip("/")
    return f"{settings.MEDIA_URL}site/{normalized_path}"


def flow_copy(request, *, stage, user=None):
    is_in_person = resolve_is_in_person(request, user=user)
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


def with_flow_context(request, *, stage, context=None, user=None):
    merged = dict(context or {})
    merged.update(flow_copy(request, stage=stage, user=user))
    return merged


def response_form_options(response):
    data = getattr(response, "data", {}) or {}
    raw_options = data.get("options") or {}
    return {
        key: list(raw_options.get(key) or [])
        for key in FORM_OPTION_KEYS
    }


def auth_context(request):
    return with_flow_context(request, stage="authentication", context={
        "is_in_person": bool(request.session.get(SESSION_IS_IN_PERSON, False)),
    })


def pending_login_context(request):
    profile = session_profile(request)
    return with_flow_context(request, stage="login", context={
        "profile_uuid": request.session.get(SESSION_PROFILE_UUID, ""),
        "first_name": getattr(getattr(profile, "user", None), "first_name", "") if profile else "",
    })


def profile_context_from_response(response):
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
        "options": response_form_options(response),
    }


def address_context_from_response(response):
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
        "options": response_form_options(response),
        "show_address_form": any(str(address.get(field, "") or "").strip() for field in ["zipcode", "street", "city", "state"]),
    }


def religion_context_from_response(response):
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
        "options": response_form_options(response),
    }


def status_screen_context(request, *, user):
    user = fresh_logged_visitor_user(request) or user
    visitor = user.profile.visitor
    status_code = int(visitor.status)
    request.session[SESSION_STATUS] = status_code

    if status_code in {VisitorStatus.NEW_ONLINE, VisitorStatus.NEW_PRESENCIAL}:
        response = get_profile_data(request, user=user)
        return "contato/partials/data.html", with_flow_context(
            request,
            stage="data",
            context=profile_context_from_response(response),
            user=user,
        )

    if status_code in {VisitorStatus.DATA_COMPLETED_ONLINE, VisitorStatus.DATA_COMPLETED_PRESENCIAL}:
        response = get_address(request, user=user)
        return "contato/partials/address.html", with_flow_context(
            request,
            stage="address",
            context=address_context_from_response(response),
            user=user,
        )

    if status_code in {VisitorStatus.ADDRESS_COMPLETED_ONLINE, VisitorStatus.ADDRESS_COMPLETED_PRESENCIAL}:
        response = get_religious_data(request, user=user)
        return "contato/partials/religion.html", with_flow_context(
            request,
            stage="religion",
            context=religion_context_from_response(response),
            user=user,
        )

    if status_code == VisitorStatus.AWAITTING_PRESENTIAL_VISIT:
        return "contato/partials/status_4.html", with_flow_context(
            request,
            stage="status_4",
            context={"status": VisitorStatus.details_for(status_code)},
            user=user,
        )

    if status_code == VisitorStatus.AWAITING_TO_COLLECT_YOUR_GIFT:
        return "contato/partials/status_14.html", with_flow_context(
            request,
            stage="status_14",
            context={"status": VisitorStatus.details_for(status_code)},
            user=user,
        )

    return "contato/partials/status_21.html", with_flow_context(
        request,
        stage="status_21",
        context={"status": VisitorStatus.details_for(status_code)},
        user=user,
    )


def current_flow_template(request):
    if is_logged_visitor(request):
        return status_screen_context(request, user=request.user)

    if request.session.get(SESSION_PROFILE_UUID):
        return "contato/partials/login.html", pending_login_context(request)

    return "contato/partials/authentication.html", auth_context(request)


def flow_swap(request):
    template_name, context = current_flow_template(request)
    return swap_oob(request, target_id="contact-flow", template_name=template_name, context=context)


def message_only_response(request, *, message):
    return html_response(
        flow_swap(request),
        modal_oob(request, message=message),
    )


def religion_prompt_oob(request, *, template_name=None, context=None):
    html = ""
    if template_name:
        html = render_partial(request, template_name, context or {})
    return swap_oob_html(request, target_id="contact-religion-detail", html=html)


def render_contact_shell(request, *, template_name=None, context=None):
    selected_template = template_name
    selected_context = context
    if not selected_template:
        selected_template, selected_context = current_flow_template(request)

    return render(
        request,
        "contato/base.html",
        {
            "initial_content": render_partial(request, selected_template, selected_context),
            "initial_modal_message": pop_flash_message(request),
            "contact_favicon_url": site_media_url("logo-q.png"),
        },
    )
