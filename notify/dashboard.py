"""Dashboard operacional multi-tenant — Django + HTMX, read-only.

SEM LOGIN, de propósito. Quem guarda a porta é a rede, não um formulário: o
Caddy faz bind em 10.1.30.114, responde 404 para o hostname público e recusa
qualquer origem fora de RFC1918 + loopback + 100.64.0.0/10 (Tailscale). Chegar
até esta página já significa estar dentro da VPN.

O gate antigo pedia uma API key que ninguém tem à mão na hora de olhar um log —
era atrito puro sobre uma porta que já estava trancada por fora. Nenhuma view
aqui altera dados; é tudo leitura.
"""

from __future__ import annotations

from pathlib import Path

from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import render

from accounts.models import Account
from channels.models import MailIdentity, WhatsAppNumber
from notify.models import Notification, Template

_STATUSES = ["pending", "sending", "sent", "failed", "skipped"]


def _account_summary(a: Account) -> dict:
    return {
        "obj": a,
        "wa": list(a.whatsapp_numbers.all()),
        "mail": list(a.mail_identities.all()),
        "tts": list(a.tts_voices.all()),
        "templates": a.templates.count(),
        "notifs": a.notifications.count(),
    }


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
