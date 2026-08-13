"""Views do controlpanel — bootstrap + dashboard rico + edit de canais + workflow."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from django.db import transaction
from django.http import HttpResponse, HttpResponseForbidden, JsonResponse
from django.shortcuts import redirect, render
from django.utils import timezone
from django.views.decorators.http import require_GET, require_POST

from accounts.models import Account
from channels.models import MailIdentity, TtsVoices, WhatsAppNumber
from notify.models import (
    CHANNEL_EMAIL,
    CHANNEL_TTS,
    CHANNEL_WHATSAPP,
    Complaint,
    Notification,
    TemplateRequest,
)
from .models import ControlPanelState


# ── Estruturas auxiliares ────────────────────────────────────────────────────

@dataclass(frozen=True)
class StatusCard:
    name: str
    description: str
    ready: bool


def _cards(state):
    stages = (
        StatusCard("Banco de dados", "Persistência e migrações disponíveis.", state.database_ready),
        StatusCard("Fila", "Workers prontos para processar notificações.", state.queue_ready),
    )
    services = (
        StatusCard("WhatsApp", "Canal Evolution configurado e verificado.", state.whatsapp_ready),
        StatusCard("E-mail", "Canal SMTP configurado e verificado.", state.mail_ready),
    )
    return {"stages": stages, "services": services}


def _dashboard_data(account: Account | None = None):
    """Coleta dados para o dashboard: notificações, incidents, complaints, requests, channels."""
    from notify.models import Incident
    from operations.health import check_readiness

    recent_notifications = list(
        Notification.objects.select_related("account").order_by("-created_at")[:20]
    )
    open_incidents = list(
        Incident.objects.filter(status=Incident.STATUS_OPEN)
        .prefetch_related("notifications")
        .order_by("-updated_at")[:20]
    )
    open_complaints = list(
        Complaint.objects.filter(status=Complaint.OPEN)
        .order_by("-updated_at")[:20]
    )
    pending_requests = list(
        TemplateRequest.objects.filter(status=TemplateRequest.PENDING)
        .order_by("-submitted_at")[:20]
    )
    whatsapp_numbers = list(WhatsAppNumber.objects.select_related("account").order_by("account__slug", "slug"))
    mail_identities = list(MailIdentity.objects.select_related("account").order_by("account__slug", "from_email"))
    tts_voices = list(TtsVoices.objects.select_related("account").order_by("account__slug"))
    accounts = list(Account.objects.order_by("slug"))
    try:
        health_report = check_readiness()
    except Exception:
        health_report = None

    return {
        "recent_notifications": recent_notifications,
        "open_incidents": open_incidents,
        "open_complaints": open_complaints,
        "pending_requests": pending_requests,
        "whatsapp_numbers": whatsapp_numbers,
        "mail_identities": mail_identities,
        "tts_voices": tts_voices,
        "accounts": accounts,
        "health_report": health_report,
    }


# ── Home (bootstrap vs dashboard) ──────────────────────────────────────────

@require_GET
def home(request):
    state = ControlPanelState.load()
    if state.is_completed:
        template = "controlpanel/dashboard.html"
        context = {"state": state, **_cards(state), **_dashboard_data()}
    else:
        template = "controlpanel/bootstrap.html"
        context = {"state": state, **_cards(state)}
    return render(request, template, context)


# ── Bootstrap (readiness + complete + reopen) ───────────────────────────────

@require_POST
def update_readiness(request):
    state = ControlPanelState.load()
    if state.is_completed:
        return HttpResponse("Bootstrap concluído.", status=409)
    fields = ("database_ready", "queue_ready", "whatsapp_ready", "mail_ready")
    values = {field: request.POST.get(field) == "on" for field in fields}
    ControlPanelState.objects.filter(pk=ControlPanelState.SINGLETON_PK).update(**values)
    return redirect("/")


@require_POST
def complete_bootstrap(request):
    with transaction.atomic():
        state = ControlPanelState.objects.select_for_update().get_or_create(
            pk=ControlPanelState.SINGLETON_PK
        )[0]
        if not state.readiness_approved:
            return HttpResponse("Readiness ainda não aprovado.", status=409)
        ControlPanelState.objects.filter(pk=state.pk).update(completed_at=timezone.now())
    return redirect("/")


@require_POST
def reopen_bootstrap(request):
    if request.META.get("REMOTE_ADDR") not in {"127.0.0.1", "::1"}:
        return HttpResponseForbidden("O bootstrap pode ser reaberto somente localmente.")
    ControlPanelState.objects.filter(pk=ControlPanelState.SINGLETON_PK).update(completed_at=None)
    return redirect("/")


# ── Edit de Account (logo + color) ──────────────────────────────────────────

@require_POST
def edit_account(request, slug: str):
    account = Account.objects.filter(slug=slug).first()
    if account is None:
        return HttpResponse("Conta não encontrada.", status=404)
    account.color_primary = (request.POST.get("color_primary") or "").strip()
    if "logo" in request.FILES:
        account.logo = request.FILES["logo"]
    account.save()
    return redirect("/")


# ── Edit de canais ──────────────────────────────────────────────────────────

@require_POST
def edit_whatsapp(request, pk: int):
    wn = WhatsAppNumber.objects.filter(pk=pk).first()
    if wn is None:
        return HttpResponse("WhatsAppNumber não encontrada.", status=404)
    wn.instance_name = (request.POST.get("instance_name") or "").strip() or wn.instance_name
    wn.slug = (request.POST.get("slug") or "").strip() or wn.slug
    wn.is_default = request.POST.get("is_default") == "on"
    wn.save()
    return redirect("/")


@require_POST
def edit_mail(request, pk: int):
    mi = MailIdentity.objects.filter(pk=pk).first()
    if mi is None:
        return HttpResponse("MailIdentity não encontrada.", status=404)
    mi.smtp_host = (request.POST.get("smtp_host") or "").strip() or mi.smtp_host
    mi.smtp_port = int(request.POST.get("smtp_port") or mi.smtp_port)
    mi.smtp_user = (request.POST.get("smtp_user") or "").strip() or mi.smtp_user
    pwd = (request.POST.get("smtp_password") or "").strip()
    if pwd:
        from mail import crypto
        mi.smtp_password = crypto.encrypt(pwd)
    mi.from_email = (request.POST.get("from_email") or "").strip() or mi.from_email
    mi.from_name = (request.POST.get("from_name") or "").strip() or mi.from_name
    mi.is_default = request.POST.get("is_default") == "on"
    mi.save()
    return redirect("/")


@require_POST
def edit_tts(request, pk: int):
    tv = TtsVoices.objects.filter(pk=pk).first()
    if tv is None:
        return HttpResponse("TtsVoices não encontrado.", status=404)
    tv.voice_male = (request.POST.get("voice_male") or "").strip() or tv.voice_male
    tv.voice_female = (request.POST.get("voice_female") or "").strip() or tv.voice_female
    tv.save()
    return redirect("/")


# ── TemplateRequest workflow ───────────────────────────────────────────────

@require_POST
def submit_template_request(request, slug: str):
    account = Account.objects.filter(slug=slug).first()
    if account is None:
        return HttpResponse("Conta não encontrada.", status=404)
    TemplateRequest.objects.create(
        account=account,
        event=(request.POST.get("event") or "").strip(),
        title=(request.POST.get("title") or "").strip(),
        subject=(request.POST.get("subject") or "").strip(),
        body_md=(request.POST.get("body_md") or "").strip(),
        is_tts=request.POST.get("is_tts") == "on",
        channels=(request.POST.get("channels") or "whatsapp,email").strip(),
        media_url=(request.POST.get("media_url") or "").strip(),
        media_type=(request.POST.get("media_type") or "").strip(),
        mail_template=(request.POST.get("mail_template") or "default").strip(),
        requested_by=(request.POST.get("requested_by") or "anonymous").strip(),
    )
    return redirect("/")


@require_POST
def decide_template_request(request, pk: int):
    """Aprova ou rejeita uma solicitação. `action=approve|reject` no POST."""
    action = request.POST.get("action")
    notes = (request.POST.get("reviewer_notes") or "").strip()
    with transaction.atomic():
        tr = TemplateRequest.objects.select_for_update().filter(pk=pk).first()
        if tr is None:
            return HttpResponse("Solicitação não encontrada.", status=404)
        if tr.status != TemplateRequest.PENDING:
            return HttpResponse("Solicitação já decidida.", status=409)
        if action == "approve":
            from notify.models import Template
            Template.objects.update_or_create(
                account=tr.account, event=tr.event,
                defaults={
                    "title": tr.title,
                    "subject": tr.subject,
                    "body_md": tr.body_md,
                    "is_tts": tr.is_tts,
                    "channels": tr.channels or "whatsapp,email",
                    "media_url": tr.media_url,
                    "media_type": tr.media_type,
                    "mail_template": tr.mail_template or "default",
                    "active": True,
                },
            )
            tr.status = TemplateRequest.APPROVED
        elif action == "reject":
            tr.status = TemplateRequest.REJECTED
        else:
            return HttpResponse("action inválido.", status=400)
        tr.reviewer_notes = notes
        tr.reviewed_at = timezone.now()
        tr.save()
    return redirect("/")


# ── Complaints ─────────────────────────────────────────────────────────────

@require_POST
def resolve_complaint(request, pk: int):
    c = Complaint.objects.filter(pk=pk).first()
    if c is None:
        return HttpResponse("Reclamação não encontrada.", status=404)
    c.status = Complaint.RESOLVED
    c.save()
    return redirect("/")


# ── Smoke test ponta-a-ponta ───────────────────────────────────────────────

@require_POST
def smoke_test(request):
    """Cria 1 Notification de teste, roda dispatch, captura falhas como Complaint."""
    from notify.dispatch import dispatch

    slug = (request.POST.get("account_slug") or "teste-real").strip()
    account = Account.objects.filter(slug=slug, is_active=True).first()
    if account is None:
        return HttpResponse(f"Conta '{slug}' não encontrada.", status=404)

    notif = Notification.objects.create(
        account=account,
        caller="controlpanel.smoke",
        recipient_phone=(request.POST.get("phone") or "5511999990000").strip(),
        recipient_email=(request.POST.get("email") or "smoke@example.com").strip(),
        title="Smoke test",
        text="Smoke test do notify-server disparado pelo dashboard.",
        mail_template="default",
        want_whatsapp=bool(request.POST.get("phone") or request.POST.get("whatsapp")),
        want_email=bool(request.POST.get("email")),
        want_tts=False,
    )

    try:
        dispatch(notif.id)
    except Exception as exc:
        notif.refresh_from_db()
        Complaint.objects.create(
            account=account,
            channel="dispatch",
            category="dispatch_exception",
            summary=f"Smoke test #{notif.id} explodiu antes de terminar",
            detail=f"{type(exc).__name__}: {exc}",
            notification=notif,
        )
        return redirect("/")

    notif.refresh_from_db()
    failures = []
    if notif.whatsapp_status == "failed":
        failures.append((CHANNEL_WHATSAPP, "delivery_failed", "WhatsApp falhou no smoke", notif.whatsapp_error))
    if notif.email_status == "failed":
        failures.append((CHANNEL_EMAIL, "delivery_failed", "E-mail falhou no smoke", notif.email_error))
    if notif.tts_status == "failed":
        failures.append((CHANNEL_TTS, "generation_failed", "TTS falhou no smoke", notif.tts_error))
    for channel, category, summary, detail in failures:
        Complaint.objects.get_or_create(
            account=account,
            channel=channel,
            category=category,
            defaults={"summary": summary, "detail": detail or "", "notification": notif},
        )

    return redirect("/")


# ── Pairing WhatsApp (Fase 2 do plano) ──────────────────────────────────────

@require_GET
def whatsapp_pair(request):
    """Lista instâncias Evolution e mostra QR de cada uma que não está open."""
    from whatsapp.admin import EvolutionAdminClient, EvolutionAdminError

    client = EvolutionAdminClient()
    config_error = None
    instances: list[dict] = []
    if not client.is_configured:
        config_error = (
            "WHATSAPP_API_BASE_URL / WHATSAPP_GLOBAL_API_KEY não configurados no .env."
        )
    else:
        try:
            instances = client.list_instances()
        except EvolutionAdminError as exc:
            config_error = str(exc)

    return render(request, "controlpanel/whatsapp_pair.html", {
        "instances": instances,
        "config_error": config_error,
        "configured": client.is_configured,
    })


@require_POST
def whatsapp_pair_create(request):
    """Cria instância na Evolution e redireciona pra tela de pairing."""
    from whatsapp.admin import EvolutionAdminClient, EvolutionAdminError

    name = (request.POST.get("instance_name") or "").strip()
    if not name:
        return HttpResponse("instance_name obrigatório.", status=400)
    phone = (request.POST.get("phone") or "").strip() or None
    try:
        EvolutionAdminClient().create_instance(name, phone=phone)
    except EvolutionAdminError as exc:
        return HttpResponse(f"Erro ao criar instância: {exc}", status=502)
    return redirect("controlpanel:whatsapp_pair")


@require_GET
def whatsapp_pair_status(request, name: str):
    """Endpoint JSON pro polling: estado + QR (se houver)."""
    from django.http import JsonResponse
    from whatsapp.admin import EvolutionAdminClient, EvolutionAdminError

    client = EvolutionAdminClient()
    if not client.is_configured:
        return JsonResponse({"state": "misconfigured", "qr": None, "error": "WHATSAPP_API_BASE_URL/WHATSAPP_GLOBAL_API_KEY ausentes."}, status=503)
    try:
        qr, state = client.get_connect_qr(name)
    except EvolutionAdminError as exc:
        return JsonResponse({"state": "error", "qr": None, "error": str(exc)}, status=502)
    return JsonResponse({"state": state, "qr": qr})


@require_POST
def whatsapp_pair_register(request):
    """Registra uma instância conectada como WhatsAppNumber."""
    instance_name = (request.POST.get("instance_name") or "").strip()
    account_slug = (request.POST.get("account_slug") or "").strip() or "default"
    is_default = request.POST.get("is_default") == "on"
    if not instance_name:
        return HttpResponse("instance_name obrigatório.", status=400)
    account = Account.objects.filter(slug=account_slug).first()
    if account is None:
        return HttpResponse(f"Conta '{account_slug}' não encontrada.", status=404)
    from channels.models import WhatsAppNumber
    wn, created = WhatsAppNumber.objects.get_or_create(
        account=account, slug=instance_name.lower(),
        defaults={"instance_name": instance_name, "is_default": is_default},
    )
    if not created:
        wn.instance_name = instance_name
        wn.is_default = is_default
        wn.save()
    return redirect("controlpanel:whatsapp_pair")


@require_POST
def whatsapp_pair_delete(request, name: str):
    """Deleta instância da Evolution."""
    from whatsapp.admin import EvolutionAdminClient, EvolutionAdminError
    try:
        EvolutionAdminClient().delete_instance(name)
    except EvolutionAdminError as exc:
        return HttpResponse(f"Erro: {exc}", status=502)
    return redirect("controlpanel:whatsapp_pair")


# ── Autodestruição (alias do complete_bootstrap, exposto pelo dashboard) ──

@require_POST
def finalize(request):
    """Quando smoke ok + canais configured, finaliza o bootstrap. Idem complete_bootstrap."""
    return complete_bootstrap(request)
