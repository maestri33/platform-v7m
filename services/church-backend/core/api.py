"""API principal do projeto."""

from ninja import NinjaAPI
from ninja.errors import ValidationError

from apps.profiles.models import EducationLevelChoices, GenderChoices, MaritalStatusChoices, StateChoices
from apps.visitors.models import ChristianityTypeChoices, ReligionChoices

from apps.captive.api import router as captive_router
from apps.visitors.api import router as visitors_router

api = NinjaAPI(title="IEADPG API")


def _choice_values(choice_class):
    return [choice.value for choice in choice_class]


ALLOWED_VALUES_BY_FIELD = {
    "gender": _choice_values(GenderChoices),
    "marital_status": _choice_values(MaritalStatusChoices),
    "education_level": _choice_values(EducationLevelChoices),
    "state": _choice_values(StateChoices),
    "religion": _choice_values(ReligionChoices),
    "christianity_type": _choice_values(ChristianityTypeChoices),
    "is_in_person": [True, False],
}


@api.exception_handler(ValidationError)
def on_validation_error(request, exc):
    """Padroniza respostas 422 da API com valores aceitos para enums."""

    allowed_values = {}
    for error in getattr(exc, "errors", []):
        location = error.get("loc", [])
        field = location[-1] if location else ""
        if field in ALLOWED_VALUES_BY_FIELD:
            allowed_values[field] = ALLOWED_VALUES_BY_FIELD[field]

    payload = {
        "message": (
            "Alguns campos possuem valores invalidos."
            if allowed_values
            else "Dados invalidos enviados."
        ),
        "allowed_values": allowed_values,
    }
    return api.create_response(request, payload, status=422)


api.add_router("/visitors/", visitors_router)
api.add_router("/portal/", captive_router)
