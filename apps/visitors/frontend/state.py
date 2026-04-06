"""Helpers de estado/sessao do frontend de visitors."""

from apps.profiles.models import Profile
from apps.visitors.models import VisitorStatus

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


def bool_from_value(value):
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


def digits(value):
    return "".join(char for char in str(value or "") if char.isdigit())


def format_zipcode(value):
    digits_only = digits(value)
    if len(digits_only) == 8:
        return f"{digits_only[:5]}-{digits_only[5:]}"
    return str(value or "").strip()


def session_profile(request):
    profile_uuid = request.session.get(SESSION_PROFILE_UUID)
    if not profile_uuid:
        return None
    return (
        Profile.objects.select_related("user", "visitor")
        .filter(uuid=profile_uuid)
        .first()
    )


def visitor_user(request):
    user = getattr(request, "user", None)
    if getattr(user, "is_authenticated", False) and getattr(getattr(user, "profile", None), "visitor", None):
        return user
    return None


def fresh_logged_visitor_user(request):
    """Recarrega o usuario autenticado com profile/visitor atualizados do banco."""

    user = visitor_user(request)
    if not user:
        return None
    return user.__class__.objects.select_related("profile__visitor").filter(pk=user.pk).first()


def is_logged_visitor(request):
    return visitor_user(request) is not None and getattr(request.user, "is_authenticated", False)


def store_auth_session(request, *, profile_uuid, access=None, refresh=None, status_code=None, is_in_person=None):
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


def clear_contact_session(request, keep_mode=False):
    preserved_mode = request.session.get(SESSION_IS_IN_PERSON) if keep_mode else None
    for key in [SESSION_PROFILE_UUID, SESSION_ACCESS, SESSION_REFRESH, SESSION_STATUS]:
        request.session.pop(key, None)
    if keep_mode:
        request.session[SESSION_IS_IN_PERSON] = bool(preserved_mode)
    else:
        request.session.pop(SESSION_IS_IN_PERSON, None)
    request.session.modified = True


def set_flash_message(request, *, message):
    request.session[SESSION_FLASH_MESSAGE] = str(message or "").strip()
    request.session.modified = True


def pop_flash_message(request):
    message = str(request.session.pop(SESSION_FLASH_MESSAGE, "") or "").strip()
    if message:
        request.session.modified = True
    return message


def contact_public_url(request):
    return "/contato/?p=1" if bool(request.session.get(SESSION_IS_IN_PERSON, False)) else "/contato/"


def visitor_mode_from_status(status_code):
    return int(status_code) in PRESENTIAL_STATUSES


def resolve_is_in_person(request, *, user=None):
    current_user = user
    if current_user is None:
        current_user = fresh_logged_visitor_user(request) or visitor_user(request)

    visitor = getattr(getattr(current_user, "profile", None), "visitor", None)
    if visitor:
        return visitor_mode_from_status(visitor.status)

    status_code = request.session.get(SESSION_STATUS)
    if status_code is not None:
        return visitor_mode_from_status(status_code)

    return bool(request.session.get(SESSION_IS_IN_PERSON, False))
