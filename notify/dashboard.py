"""Dashboard operacional multi-tenant — Django + HTMX, read-only.

Protegido pelas API keys que já existem (gate por cookie assinado). Não há
usuários Django no serviço, então reusar a API key como credencial mantém a
consistência com a API e evita criar contas/senhas. Nenhuma view altera dados.
"""

from __future__ import annotations

from functools import wraps
from pathlib import Path

from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import redirect, render
from django.views.decorators.http import require_http_methods

from accounts.models import Account, ApiKey
from channels.models import MailIdentity, WhatsAppNumber
from notify.models import Notification, Template

_COOKIE = "notify_dash"
_SALT = "notify-dashboard"
_MAX_AGE = 60 * 60 * 12  # 12h
_STATUSES = ["pending", "sending", "sent", "failed", "skipped"]


def _authed(request) -> bool:
    try:
        return request.get_signed_cookie(_COOKIE, salt=_SALT, max_age=_MAX_AGE) == "1"
    except Exception:
        return False


def _require(view):
    @wraps(view)
    def wrapper(request, *a, **k):
        if not _authed(request):
            return redirect("/dashboard/login/")
        return view(request, *a, **k)

    return wrapper


@require_http_methods(["GET", "POST"])
def login(request):
    if request.method == "POST":
        raw = (request.POST.get("key") or "").strip()
        ok = ApiKey.objects.filter(
            key_hash=ApiKey.hash_key(raw), is_active=True, account__is_active=True
        ).exists()
        if ok:
            resp = redirect("/dashboard/")
            resp.set_signed_cookie(
                _COOKIE, "1", salt=_SALT, max_age=_MAX_AGE,
                httponly=True, samesite="Lax",
            )
            return resp
        return render(request, "dashboard/login.html", {"error": "Chave inválida."})
    if _authed(request):
        return redirect("/dashboard/")
    return render(request, "dashboard/login.html", {})


def logout(request):
    resp = redirect("/dashboard/login/")
    resp.delete_cookie(_COOKIE)
    return resp


def _account_summary(a: Account) -> dict:
    return {
        "obj": a,
        "wa": list(a.whatsapp_numbers.all()),
        "mail": list(a.mail_identities.all()),
        "tts": list(a.tts_voices.all()),
        "templates": a.templates.count(),
        "notifs": a.notifications.count(),
    }


@_require
def home(request):
    accounts = [_account_summary(a) for a in Account.objects.all().order_by("slug")]
    kpi = {
        "accounts": Account.objects.count(),
        "wa": WhatsAppNumber.objects.count(),
        "mail": MailIdentity.objects.count(),
        "templates": Template.objects.count(),
        "notifs": Notification.objects.count(),
        "failed": (
            Notification.objects.filter(whatsapp_status="failed").count()
            + Notification.objects.filter(email_status="failed").count()
            + Notification.objects.filter(tts_status="failed").count()
        ),
    }
    return render(
        request,
        "dashboard/home.html",
        {
            "accounts": accounts,
            "kpi": kpi,
            "all_accounts": Account.objects.order_by("slug"),
            "statuses": _STATUSES,
        },
    )


@_require
def account_detail(request, slug: str):
    a = Account.objects.filter(slug=slug).first()
    if not a:
        return HttpResponse("<p class='muted'>Conta não encontrada.</p>", status=404)
    templates = list(a.templates.select_related("trigger").order_by("event"))
    return render(
        request,
        "dashboard/_account.html",
        {
            "a": a,
            "wa": list(a.whatsapp_numbers.all()),
            "mail": list(a.mail_identities.all()),
            "tts": list(a.tts_voices.all()),
            "templates": templates,
        },
    )


@_require
def notifications(request):
    qs = Notification.objects.select_related("account", "whatsapp_number").order_by("-created_at")
    account = request.GET.get("account") or ""
    status = request.GET.get("status") or ""
    caller = request.GET.get("caller") or ""
    try:
        limit = min(int(request.GET.get("limit") or 30), 200)
    except ValueError:
        limit = 30
    if account:
        qs = qs.filter(account__slug=account)
    if caller:
        qs = qs.filter(caller__icontains=caller)
    if status:
        from django.db.models import Q

        qs = qs.filter(
            Q(whatsapp_status=status) | Q(email_status=status) | Q(tts_status=status)
        )
    rows = list(qs[:limit])
    return render(request, "dashboard/_notifications.html", {"rows": rows})


def htmx_js(request):
    p = Path(settings.BASE_DIR) / "notify" / "vendor" / "htmx.min.js"
    try:
        return HttpResponse(p.read_bytes(), content_type="application/javascript")
    except FileNotFoundError:
        return HttpResponse("// htmx ausente", content_type="application/javascript", status=404)
