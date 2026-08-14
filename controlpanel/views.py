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


def _bootstrap_status() -> dict:
    """Estado dos 3 passos do wizard: cada um diz se está OK e o próximo passo.

    Passos:
      1. WhatsApp pareado (instância 'default' com state=open na Evolution)
      2. E-mail configurado (MailIdentity singleton existe)
      3. Template inicial configurado (Template default.welcome com body_md não-vazio)
    """
    from channels.models import MailIdentity, WhatsAppNumber
    from notify.models import Template
    from whatsapp.admin import EvolutionAdminClient

    # 1. WhatsApp
    wa = WhatsAppNumber.objects.filter(instance_name=DEFAULT_WA_INSTANCE).first()
    wa_state = "missing"
    if wa is not None:
        try:
            client = EvolutionAdminClient()
            if client.is_configured:
                _, state = client.get_connect_qr(DEFAULT_WA_INSTANCE)
                wa_state = state or "unknown"
            else:
                wa_state = "misconfigured"
        except Exception:
            wa_state = "error"
    whatsapp_ok = wa_state == "open"

    # 2. E-mail
    mi = MailIdentity.objects.first()
    mail_ok = mi is not None and bool(mi.from_email) and bool(mi.smtp_host)

    # 3. Template
    tpl = Template.objects.filter(event="default.welcome").first()
    template_ok = tpl is not None and bool(tpl.body_md and tpl.title)

    steps = [
        {"id": "whatsapp", "label": "Parear WhatsApp", "ok": whatsapp_ok, "state": wa_state,
         "url_name": "controlpanel:whatsapp_pair",
         "description": "Escaneie o QR com o WhatsApp real."},
        {"id": "email", "label": "Parear E-mail", "ok": mail_ok, "state": "ok" if mail_ok else "missing",
         "url_name": "controlpanel:email_pair",
         "description": "Informe SMTP, teste conexão e salve a identidade."},
        {"id": "template", "label": "Configurar Template", "ok": template_ok, "state": "ok" if template_ok else "missing",
         "url_name": "controlpanel:template_setup",
         "description": "Logo (opcional), nome exibido, site, mensagem inicial."},
    ]
    current = next((s for s in steps if not s["ok"]), None)
    completed_count = sum(1 for s in steps if s["ok"])
    return {
        "steps": steps,
        "current": current,
        "completed_count": completed_count,
        "total": len(steps),
        "is_done": current is None,
    }


@require_GET
def bootstrap_wizard(request):
    """Wizard sequencial: 1 WhatsApp → 2 E-mail → 3 Template → Dashboard."""
    status = _bootstrap_status()
    if status["is_done"]:
        return redirect("/")
    return render(request, "controlpanel/bootstrap.html", {"status": status})


@require_GET
def home(request):
    status = _bootstrap_status()
    if status["is_done"]:
        state = ControlPanelState.load()
        return render(request, "controlpanel/dashboard.html",
                      {"state": state, **_cards(state), **_dashboard_data()})
    return redirect("controlpanel:bootstrap_wizard")


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
#
# 1 notify = 1 instância WhatsApp fixa "default". Sem escolha de nome.
# O pareamento é único; o user escaneia o QR e (quando state=open) registra
# como WhatsAppNumber singleton, vinculado à Account singleton.

DEFAULT_WA_INSTANCE = "default"


def _singleton_account() -> Account:
    """Garante (e devolve) a Account singleton do notify."""
    acc = Account.objects.order_by("pk").first()
    if acc is None:
        acc = Account.objects.create(name="Notify", slug="default")
    return acc


@require_GET
def whatsapp_pair(request):
    """Tela única de pareamento: mostra QR + estado da instância 'default'."""
    from whatsapp.admin import EvolutionAdminClient, EvolutionAdminError

    client = EvolutionAdminClient()
    config_error = None
    initial_qr = None
    initial_state = None
    exists_in_evolution = False
    if not client.is_configured:
        config_error = "WHATSAPP_API_BASE_URL / WHATSAPP_GLOBAL_API_KEY não configurados no .env."
    else:
        try:
            instances = client.list_instances()
            exists_in_evolution = any(i.get("name") == DEFAULT_WA_INSTANCE for i in instances)
            if exists_in_evolution:
                initial_qr, initial_state = client.get_connect_qr(DEFAULT_WA_INSTANCE)
        except EvolutionAdminError as exc:
            config_error = str(exc)

    account = _singleton_account()
    from channels.models import WhatsAppNumber
    registered = WhatsAppNumber.objects.filter(
        account=account, instance_name=DEFAULT_WA_INSTANCE
    ).exists()

    return render(request, "controlpanel/whatsapp_pair.html", {
        "instance_name": DEFAULT_WA_INSTANCE,
        "exists_in_evolution": exists_in_evolution,
        "initial_qr": initial_qr,
        "initial_state": initial_state,
        "registered": registered,
        "config_error": config_error,
        "configured": client.is_configured,
    })


@require_POST
def whatsapp_pair_create(request):
    """Cria a instância 'default' na Evolution (nome fixo, sem perguntar)."""
    from whatsapp.admin import EvolutionAdminClient, EvolutionAdminError

    try:
        EvolutionAdminClient().create_instance(DEFAULT_WA_INSTANCE)
    except EvolutionAdminError as exc:
        return HttpResponse(f"Erro ao criar instância: {exc}", status=502)
    return redirect("controlpanel:bootstrap_wizard")


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
    """Registra a instância 'default' como WhatsAppNumber singleton."""
    from channels.models import WhatsAppNumber

    account = _singleton_account()
    wn, _ = WhatsAppNumber.objects.update_or_create(
        account=account, instance_name=DEFAULT_WA_INSTANCE,
        defaults={"slug": DEFAULT_WA_INSTANCE, "is_default": True},
    )
    return redirect("controlpanel:bootstrap_wizard")


@require_POST
def whatsapp_pair_delete(request, name: str):
    """Deleta instância da Evolution + remove WhatsAppNumber correspondente."""
    from whatsapp.admin import EvolutionAdminClient, EvolutionAdminError
    from channels.models import WhatsAppNumber

    try:
        EvolutionAdminClient().delete_instance(name)
    except EvolutionAdminError as exc:
        return HttpResponse(f"Erro: {exc}", status=502)
    WhatsAppNumber.objects.filter(instance_name=name).delete()
    return redirect("controlpanel:bootstrap_wizard")


# ── Stub: pareamento do WhatsApp fallback (Evolution GO) ─────────────────
#
# A Evolution GO precisa de config adicional (operator + DB). Por enquanto
# exibimos só uma página "em construção" pra deixar a rota viva no dashboard
# sem prometer o que não está pronto. Quando o GO estiver funcional, este
# view vira o equivalente ao whatsapp_pair (QR + register + delete).

@require_GET
def whatsapp_fallback_pair(request):
    """Stub: pareamento do WhatsApp fallback (Evolution GO)."""
    return render(request, "controlpanel/whatsapp_fallback_pair.html")


# ── Wizard de pareamento de e-mail (Step 3) ──────────────────────────────
#
# 1 notify = 1 MailIdentity default (singleton). O wizard:
#  - GET: se já tem, mostra estado + botão Editar; se não, mostra form vazio.
#  - POST email_pair_test: testa SMTP. Em sucesso, cria singleton e redireciona
#    pro form de edição. Em falha, mostra alert vermelho.
#  - POST email_pair_save: atualiza o singleton existente.

@require_GET
def email_pair(request):
    """Página do wizard de e-mail. Mostra estado atual ou form vazio/edião."""
    from channels.models import MailIdentity

    account = _singleton_account()
    mi = MailIdentity.objects.filter(account=account).first()
    editing = request.GET.get("edit") == "1"
    test_result = request.session.pop("email_test_result", None)
    return render(request, "controlpanel/email_pair.html", {
        "mi": mi,
        "editing": editing,
        "test_result": test_result,
    })


@require_POST
def email_pair_test(request):
    """Sondagem SMTP. Em sucesso, cria o singleton MailIdentity (1 row)."""
    from channels.models import MailIdentity
    from mail import crypto
    from mail.client import MailClient

    host = (request.POST.get("smtp_host") or "").strip()
    try:
        port = int(request.POST.get("smtp_port") or 587)
    except (TypeError, ValueError):
        port = 587
    user = (request.POST.get("smtp_user") or "").strip()
    password = (request.POST.get("smtp_password") or "").strip()
    from_email = (request.POST.get("from_email") or "").strip()
    from_name = (request.POST.get("from_name") or "").strip() or "Notify"

    if not host or not from_email:
        request.session["email_test_result"] = {
            "ok": False,
            "error": "smtp_host e from_email são obrigatórios.",
        }
        return redirect("controlpanel:bootstrap_wizard")

    client = MailClient(
        host=host, port=port, user=user, password=password,
        from_email=from_email, from_name=from_name, timeout=8.0,
    )
    result = client.probe()
    if not result.get("ok"):
        request.session["email_test_result"] = result
        return redirect("controlpanel:bootstrap_wizard")

    # sucesso: cria o singleton (deleta qualquer outro da mesma account)
    account = _singleton_account()
    with transaction.atomic():
        MailIdentity.objects.filter(account=account).delete()
        MailIdentity.objects.create(
            account=account,
            smtp_host=host,
            smtp_port=port,
            smtp_user=user,
            smtp_password=crypto.encrypt(password) if password else "",
            from_email=from_email,
            from_name=from_name,
            is_default=True,
        )

    return redirect("controlpanel:bootstrap_wizard")


@require_POST
def email_pair_save(request):
    """Atualiza o singleton MailIdentity existente."""
    from channels.models import MailIdentity
    from mail import crypto

    account = _singleton_account()
    mi = MailIdentity.objects.filter(account=account).first()
    if mi is None:
        return HttpResponse("MailIdentity ainda não existe — teste a conexão primeiro.", status=409)

    mi.smtp_host = (request.POST.get("smtp_host") or "").strip() or mi.smtp_host
    try:
        mi.smtp_port = int(request.POST.get("smtp_port") or mi.smtp_port)
    except (TypeError, ValueError):
        pass
    mi.smtp_user = (request.POST.get("smtp_user") or "").strip() or mi.smtp_user
    pwd = (request.POST.get("smtp_password") or "").strip()
    if pwd:
        mi.smtp_password = crypto.encrypt(pwd)
    mi.from_email = (request.POST.get("from_email") or "").strip() or mi.from_email
    mi.from_name = (request.POST.get("from_name") or "").strip() or mi.from_name
    mi.is_default = True
    mi.save()
    return redirect("controlpanel:bootstrap_wizard")


# ── Wizard de template (Step 4) ───────────────────────────────────────────
#
# Tela única de configuração de marca + template default.welcome:
#  - form com logo (upload opcional), display_name (obrigatório), site_url
#  - auto-cria Template(account, event='default.welcome') se não existir
#  - save persiste em Account (logo, color_primary) e em Template default
#    (title, subject, body_md). body_md recebe o site_url do form.

DEFAULT_TEMPLATE_EVENT = "default.welcome"
DEFAULT_TEMPLATE_BODY = "Olá {nome}, bem-vindo! Visite: {site}"


@require_GET
def template_setup(request):
    """Página do wizard de template. Auto-cria Template default se faltar."""
    from notify.models import Template

    account = _singleton_account()
    template, _ = Template.objects.get_or_create(
        account=account, event=DEFAULT_TEMPLATE_EVENT,
        defaults={"title": account.name, "subject": account.name, "body_md": DEFAULT_TEMPLATE_BODY},
    )
    saved = request.session.pop("template_saved", False)
    return render(request, "controlpanel/template_setup.html", {
        "account": account,
        "template": template,
        "default_template_body": DEFAULT_TEMPLATE_BODY,
        "saved": saved,
    })


@require_POST
def template_setup_save(request):
    """Salva marca (Account) + template default (title, subject, body_md)."""
    from notify.models import Template

    account = _singleton_account()
    display_name = (request.POST.get("display_name") or "").strip()
    if not display_name:
        return HttpResponse("display_name é obrigatório.", status=400)

    account.name = display_name
    color = (request.POST.get("color_primary") or "").strip()
    if color:
        account.color_primary = color
    if "logo" in request.FILES:
        account.logo = request.FILES["logo"]
    account.save()

    site_url = (request.POST.get("site_url") or "").strip()
    body_md = DEFAULT_TEMPLATE_BODY
    if site_url:
        body_md = body_md.replace("{site}", site_url)
    else:
        body_md = body_md.replace("Visite: {site}", "Visite nosso site")

    template, _ = Template.objects.get_or_create(
        account=account, event=DEFAULT_TEMPLATE_EVENT,
        defaults={"title": display_name, "subject": display_name, "body_md": body_md},
    )
    template.title = display_name
    template.subject = display_name
    template.body_md = body_md
    template.active = True
    template.save()

    request.session["template_saved"] = True
    return redirect("controlpanel:bootstrap_wizard")


# ── Autodestruição (alias do complete_bootstrap, exposto pelo dashboard) ──

@require_POST
def finalize(request):
    """Quando smoke ok + canais configured, finaliza o bootstrap. Idem complete_bootstrap."""
    return complete_bootstrap(request)
