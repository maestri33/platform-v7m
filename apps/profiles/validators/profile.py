"""Validações de perfil reutilizáveis."""

from rest_framework.exceptions import ValidationError

from apps.profiles.models import EducationLevelChoices, GenderChoices, MaritalStatusChoices


def _choice_values(choice_class):
    return {choice.value for choice in choice_class}


def validate_profile_completion_data(*, profile_data):
    """Valida choices usados na etapa de completude do perfil."""

    gender = profile_data.get("gender", "")
    marital_status = profile_data.get("marital_status", "")
    education_level = profile_data.get("education_level", "")

    if gender and gender not in _choice_values(GenderChoices):
        raise ValidationError({"profile.gender": "Valor inválido."})
    if marital_status and marital_status not in _choice_values(MaritalStatusChoices):
        raise ValidationError({"profile.marital_status": "Valor inválido."})
    if education_level and education_level not in _choice_values(EducationLevelChoices):
        raise ValidationError({"profile.education_level": "Valor inválido."})
