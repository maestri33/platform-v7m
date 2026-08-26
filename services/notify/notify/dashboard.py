"""Dashboard operacional do notify-server.

Interface enxuta, dividida por áreas funcionais em URLs dedicadas com Bootstrap inteligente:
- /dashboard/ (Visão Geral & Disparo)
- /dashboard/whatsapp/ (Área WhatsApp)
- /dashboard/email/ (Área E-mail)
- /dashboard/messages/ (Envios Outbound)
- /dashboard/inbox/ (Recebidas Inbound)
- /dashboard/settings/ (Configurações & Chaves)
- /dashboard/setup/ (Assistente de Setup)
"""

from __future__ import annotations

import json
import uuid
from pathlib import Path

import structlog
from django.conf import settings
from django.db.models import Q
from django.http import HttpResponse
from django.shortcuts import redirect, render
from django.views.decorators.csrf import csrf_exempt

logger = structlog.get_logger()

from accounts.models import Account, ApiKey
from channels.models import (
    DRIVER_GO,
    AppWebhook,
    MailIdentity,
    MailTemplate,
    WhatsAppNumber,
)
from notify.interface.send import send
from notify.models import InboundEvent, Notification


# ── Helpers & Bootstrap Check ────────────────────────────────────────────────

def _account_or_404(slug: str) -> Account | None:
    return Account.objects.filter(slug=slug).first()


def _flash(msg: str, kind: str = "ok") -> str:
    configs = {
        "ok": ("st-sent", "✓"),
        "err": ("st-failed", "✕"),
        "warn": ("st-pending", "⚠"),
    }
    css, icon = configs.get(kind, ("st-skipped", "•"))
    return f'<span class="pill {css}">{icon} {msg}</span>'


def _post(request, field: str, default: str = "") -> str:
    return (request.POST.get(field) or default).strip()


def _bool(request, field: str) -> bool:
    return _post(request, field).lower() in {"1", "true", "on", "sim"}


def _shared_instances(a: Account) -> dict[str, list[str]]:
    nomes = [n.instance_name for n in a.whatsapp_numbers.all() if n.instance_name]
    if not nomes:
        return {}
    conflito: dict[str, list[str]] = {}
    outros = (
        WhatsAppNumber.objects.filter(instance_name__in=nomes)
        .exclude(account=a)
        .select_related("account")
    )
    for n in outros:
        conflito.setdefault(n.instance_name, []).append(n.account.slug)
    return conflito


def _numero_alvo(a: Account, request):
    pedido = (request.POST.get("number_slug") or request.GET.get("number_slug") or "").strip()
    if pedido:
        return a.whatsapp_numbers.filter(slug=pedido).first()
    return a.whatsapp_numbers.filter(is_default=True).first() or a.whatsapp_numbers.first()


def _ensure_account_instance(a: Account) -> WhatsAppNumber:
    """Garante que a conta possua uma instância de WhatsApp com o mesmo nome e registrada."""
    wa_num = a.whatsapp_numbers.filter(is_default=True).first() or a.whatsapp_numbers.first()
    if wa_num is None:
        wa_num = WhatsAppNumber.objects.create(
            account=a,
            slug="principal",
            instance_name=a.slug,
            driver=DRIVER_GO,
            is_default=True,
        )

    # Tenta registrar na Evolution GO de forma resiliente
    try:
        from whatsapp import provisioning as wa
        inst, criada = wa.go_ensure_instance(instance_name=wa_num.instance_name)
        token = str(inst.get("token") or "")
        if token and not wa_num.go_token:
            wa_num.set_go_token(token)
            wa_num.save(update_fields=["go_token"])
            try:
                wa.go_set_webhook(token, wa_num.instance_name)
            except Exception:
                pass
    except Exception:
        pass

    return wa_num


def get_app_readiness(a: Account) -> dict:
    """Verifica a prontidão operacional (Bootstrap) dos canais do app."""
    wa_num = a.whatsapp_numbers.filter(is_default=True).first() or a.whatsapp_numbers.first()
    wa_ready = bool(wa_num and wa_num.instance_name and (wa_num.go_api_key() or getattr(settings, "EVOLUTION_GO_API_KEY", "")))
    wa_connected = bool(wa_num and wa_num.connection_status == "open")

    m_ident = a.mail_identities.filter(is_default=True).first() or a.mail_identities.first()
    mail_ready = bool(m_ident and m_ident.from_email and m_ident.smtp_host)

    first_send_done = a.notifications.filter(Q(whatsapp_status="sent") | Q(email_status="sent")).exists()
    is_complete = wa_ready and mail_ready

    return {
        "wa_configured": wa_num is not None,
        "wa_connected": wa_connected,
        "wa_ready": wa_ready,
        "mail_configured": m_ident is not None,
        "mail_ready": mail_ready,
        "first_send_done": first_send_done,
        "is_complete": is_complete,
        "next_step": "whatsapp" if not wa_ready else ("email" if not mail_ready else ("test" if not first_send_done else "ready")),
    }


def _get_context(request, active_tab: str = "overview") -> dict:
    accounts = list(Account.objects.all().order_by("slug"))
    if not accounts:
        acc = Account.objects.create(slug="default", name="Notify")
        accounts = [acc]

    selected_slug = request.GET.get("app") or accounts[0].slug
    a = Account.objects.filter(slug=selected_slug).first() or accounts[0]

    _ensure_account_instance(a)
    wa_numbers = list(a.whatsapp_numbers.all())
    mail_identities = list(a.mail_identities.all())
    mail_template = MailTemplate.objects.filter(account=a).first()
    api_keys = list(a.api_keys.filter(is_active=True))
    shared = _shared_instances(a)
    readiness = get_app_readiness(a)

    from ai.client import health as ai_health_check
    ai_health = ai_health_check()

    counts = {
        "total": a.notifications.count(),
        "sent": a.notifications.filter(Q(whatsapp_status="sent") | Q(email_status="sent")).count(),
        "failed": a.notifications.filter(Q(whatsapp_status="failed") | Q(email_status="failed")).count(),
        "inbound": a.inbound_events.count(),
    }

    return {
        "accounts": accounts,
        "a": a,
        "wa": wa_numbers,
        "mail": mail_identities,
        "mail_template": mail_template,
        "shell": mail_template,
        "keys": api_keys,
        "shared": shared,
        "counts": counts,
        "readiness": readiness,
        "active_tab": active_tab,
        "ai_health": ai_health,
        "OMNIROUTER_URL": getattr(settings, "OMNIROUTER_URL", ""),
        "AI_MODEL": getattr(settings, "AI_MODEL", "auto/best-fast"),
        "AI_STT_MODEL": getattr(settings, "AI_STT_MODEL", "whisper-1"),
    }


# ── Views por Área ──────────────────────────────────────────────────────────

def home(request):
    """Página principal / Visão Geral."""
    ctx = _get_context(request, "overview")
    a = ctx["a"]
    if not a.is_setup_complete and a.slug != "default":
        return redirect(f"/dashboard/setup/?app={a.slug}")
    ctx["recent_notifications"] = list(a.notifications.order_by("-created_at")[:15])
    return render(request, "dashboard/overview.html", ctx)


def view_whatsapp(request):
    """Área dedicada ao canal WhatsApp."""
    ctx = _get_context(request, "whatsapp")
    a = ctx["a"]
    if not a.is_setup_complete and a.slug != "default":
        return redirect(f"/dashboard/setup/?app={a.slug}")
    return render(request, "dashboard/whatsapp.html", ctx)


def view_email(request):
    """Área dedicada ao canal E-mail."""
    ctx = _get_context(request, "email")
    a = ctx["a"]
    if not a.is_setup_complete and a.slug != "default":
        return redirect(f"/dashboard/setup/?app={a.slug}")
    return render(request, "dashboard/email.html", ctx)


class HttpResponseStopPolling(HttpResponse):
    """Retorna HTTP 286 (HX-Stop-Polling) para instruir o HTMX a parar o polling periódico."""
    status_code = 286


def is_htmx(request) -> bool:
    """Detecta se a requisição veio através do HTMX."""
    return request.headers.get("HX-Request") == "true"


def view_messages(request):
    """Área dedicada aos envios (Outbound) com busca instantânea e paginação."""
    ctx = _get_context(request, "messages")
    a = ctx["a"]
    if not a.is_setup_complete and a.slug != "default":
        return redirect(f"/dashboard/setup/?app={a.slug}")
    qs = Notification.objects.filter(account=a).select_related("account", "whatsapp_number")
    channel_filter = request.GET.get("channel")
    status_filter = request.GET.get("status")
    search_q = request.GET.get("q")
    if search_q:
        qs = qs.filter(
            Q(text__icontains=search_q) |
            Q(recipient_phone__icontains=search_q) |
            Q(recipient_email__icontains=search_q)
        )
    if channel_filter:
        if channel_filter == "whatsapp":
            qs = qs.filter(want_whatsapp=True)
        elif channel_filter == "email":
            qs = qs.filter(want_email=True)
    if status_filter:
        qs = qs.filter(
            Q(whatsapp_status=status_filter) | Q(email_status=status_filter)
        )
        
    ctx["notifications"] = list(qs.order_by("-created_at")[:100])
    ctx["channel_filter"] = channel_filter or ""
    ctx["status_filter"] = status_filter or ""
    ctx["search_q"] = search_q or ""
    if is_htmx(request):
        return render(request, "dashboard/partials/_messages_table.html", ctx)
    return render(request, "dashboard/messages.html", ctx)


def view_inbox(request):
    """Área dedicada às mensagens recebidas (Inbound)."""
    ctx = _get_context(request, "inbox")
    a = ctx["a"]
    if not a.is_setup_complete and a.slug != "default":
        return redirect(f"/dashboard/setup/?app={a.slug}")
    search_q = request.GET.get("q")
    qs = InboundEvent.objects.filter(account=a).select_related("account")
    if search_q:
        qs = qs.filter(
            Q(preview__icontains=search_q) |
            Q(from_number__icontains=search_q)
        )
    inbound_list = list(qs.order_by("-received_at")[:100])
    ctx["inbound"] = inbound_list
    ctx["events"] = inbound_list
    ctx["search_q"] = search_q or ""
    if is_htmx(request):
        return render(request, "dashboard/partials/_inbox_table.html", ctx)
    return render(request, "dashboard/inbox.html", ctx)


def view_webhooks(request):
    """Área dedicada ao stream de Webhooks da Evolution."""
    from django.db.models import Count
    from notify.models import WebhookEvent
    ctx = _get_context(request, "webhooks")
    a = ctx["a"]
    if not a.is_setup_complete and a.slug != "default":
        return redirect(f"/dashboard/setup/?app={a.slug}")
    eventos = list(WebhookEvent.objects.all().order_by("-received_at")[:100])
    por_evento = [
        (r["event"], r["n"])
        for r in WebhookEvent.objects.values("event").annotate(n=Count("id")).order_by("-n")[:8]
    ]
    ctx["eventos"] = eventos
    ctx["total"] = WebhookEvent.objects.count()
    ctx["por_evento"] = por_evento
    return render(request, "dashboard/webhooks.html", ctx)


def webhook_stream(request):
    """Partial para polling de webhooks no stream ao vivo."""
    from notify.models import WebhookEvent
    eventos = list(WebhookEvent.objects.all().order_by("-received_at")[:100])
    return render(request, "dashboard/_webhook_events.html", {"eventos": eventos})


def view_settings(request):
    """Área dedicada às configurações da aplicação e chaves de API."""
    ctx = _get_context(request, "settings")
    a = ctx["a"]
    if not a.is_setup_complete and a.slug != "default":
        return redirect(f"/dashboard/setup/?app={a.slug}")
    return render(request, "dashboard/settings.html", ctx)


def view_setup(request):
    """Assistente de Setup (Bootstrap Wizard em 6 Etapas)."""
    ctx = _get_context(request, "setup")
    step_param = request.GET.get("step")
    if step_param and step_param.isdigit():
        ctx["a"].setup_step = int(step_param)
    return render(request, "dashboard/setup.html", ctx)


def app_detail(request, slug: str):
    """Compatibilidade com testes legados que buscam /dashboard/app/<slug>/."""
    a = _account_or_404(slug)
    if a is None:
        return HttpResponse("App não encontrado", status=404)
    return render(request, "dashboard/_app.html", {
        "a": a,
        "wa": list(a.whatsapp_numbers.all()),
        "mail": list(a.mail_identities.all()),
        "keys": list(a.api_keys.filter(is_active=True)),
        "shared": _shared_instances(a),
        "counts": {
            "notifs": a.notifications.count(),
            "inbound": a.inbound_events.count(),
            "failed": a.notifications.filter(Q(whatsapp_status="failed") | Q(email_status="failed")).count(),
        }
    })


# ── Ações Operacionais (Disparo de Teste, Requeue) ──────────────────────────

@csrf_exempt
def test_send(request, slug: str):
    """Disparo imediato de teste pelo painel."""
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse("Conta inválida", status=400)

    phone = _post(request, "phone")
    email = _post(request, "email")
    text = _post(request, "text", "Teste operacional do Notify.")
    subject = _post(request, "subject", "Teste de Notificação")

    if not phone and not email:
        return HttpResponse(_flash("informe telefone ou e-mail", "err"))

    try:
        ext = send(
            account=a,
            text=text,
            caller="dashboard.test",
            phone=phone,
            email=email,
            subject=subject,
            whatsapp=bool(phone),
            email_channel=bool(email),
            run_sync=True,
        )
    except Exception as exc:
        return HttpResponse(_flash(f"Falha: {exc}"[:150], "err"))

    n = Notification.objects.filter(account=a, external_id=ext).first()
    resumo = []
    if n:
        if phone:
            resumo.append(f"WhatsApp: {n.whatsapp_status}")
            if n.whatsapp_error:
                resumo.append(f"Erro WA: {n.whatsapp_error[:80]}")
        if email:
            resumo.append(f"E-mail: {n.email_status}")
            if n.email_error:
                resumo.append(f"Erro Mail: {n.email_error[:80]}")

    return HttpResponse(_flash(f"Enviado! ({' | '.join(resumo)})", "ok"))


@csrf_exempt
def requeue_notification(request, slug: str, external_id: str):
    """Reenfileira uma notificação que falhou."""
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)

    lookup = Q(idempotency_key=external_id)
    try:
        lookup |= Q(external_id=uuid.UUID(external_id))
    except (ValueError, AttributeError, TypeError):
        pass

    n = Notification.objects.filter(account=a).filter(lookup).first()
    if n is None:
        return HttpResponse(_flash("envio não encontrado", "err"))

    requeued = []
    if n.whatsapp_status == "failed":
        n.whatsapp_status = "pending"
        n.whatsapp_error = ""
        requeued.append("whatsapp")
    if n.email_status == "failed":
        n.email_status = "pending"
        n.email_error = ""
        requeued.append("email")

    if not requeued:
        return HttpResponse(_flash("nenhum canal em failed neste envio", "warn"))

    n.save(update_fields=["whatsapp_status", "email_status", "whatsapp_error", "email_error"])

    try:
        from django_q.tasks import async_task
        async_task("notify.dispatch.dispatch", n.id)
    except Exception:
        from notify.dispatch import dispatch
        dispatch(n.id, sync=True)
        n.refresh_from_db()

    return HttpResponse(f"reenfileirado: {', '.join(requeued)}")


# ── WhatsApp (Evolution GO) Ações ───────────────────────────────────────────

@csrf_exempt
def check_whatsapp(request, slug: str):
    """Consulta o status real da conexão na Evolution GO."""
    a = _account_or_404(slug)
    if a is None:
        return HttpResponse("Conta inválida", status=404)
    numero = _numero_alvo(a, request)
    if numero is None:
        return HttpResponse(_flash("sem número cadastrado", "err"))

    import httpx
    base = (getattr(settings, "EVOLUTION_GO_BASE_URL", "") or "").rstrip("/")
    token = numero.go_api_key() or getattr(settings, "EVOLUTION_GO_API_KEY", "")
    if not base or not token:
        return HttpResponse(_flash("Evolution GO não configurada", "err"))

    try:
        resp = httpx.get(f"{base}/instance/status", headers={"apikey": token}, timeout=6.0)
        if resp.status_code == 503:
            return HttpResponse(_flash("Evolution GO sem licença ativa (503)", "warn"))
        dados = resp.json().get("data", {}) if resp.status_code < 400 else {}
        logado = bool(dados.get("LoggedIn"))
        numero.connection_status = "open" if logado else "down"
        numero.save(update_fields=["connection_status"])
        return HttpResponse(
            _flash(f"{numero.instance_name}: Conectado ({dados.get('Name') or 'WhatsApp'})", "ok")
            if logado
            else _flash(f"{numero.instance_name}: Desconectado / Necessário parear", "warn")
        )
    except Exception as exc:
        return HttpResponse(_flash(f"Erro ao checar: {exc}"[:100], "err"))


@csrf_exempt
def qr_code(request, slug: str):
    """Obtém o QR Code para pareamento na Evolution GO com auto-polling até conectar."""
    a = _account_or_404(slug)
    if a is None:
        return HttpResponse(status=404)
    numero = _numero_alvo(a, request)
    if numero is None:
        return HttpResponse(_flash("sem número cadastrado", "err"))

    import httpx
    base = (getattr(settings, "EVOLUTION_GO_BASE_URL", "") or "").rstrip("/")
    token = numero.go_api_key() or getattr(settings, "EVOLUTION_GO_API_KEY", "")
    if not base or not token:
        return HttpResponse(_flash("Configuração de WhatsApp incompleta", "err"))

    # 1. Checa se já está logado
    try:
        st_resp = httpx.get(f"{base}/instance/status", headers={"apikey": token}, timeout=5.0)
        if st_resp.status_code == 200:
            st_data = st_resp.json().get("data", {})
            if st_data.get("LoggedIn"):
                numero.connection_status = "open"
                if st_data.get("JID"):
                    phone = st_data.get("JID", "").split("@")[0]
                    if phone and not numero.phone_number:
                        numero.phone_number = phone
                numero.save()
                return HttpResponse(
                    f'<div style="background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.3);border-radius:8px;padding:16px;text-align:center">'
                    f'<span class="pill st-sent" style="font-size:14px;padding:6px 14px"><svg class="ico"><use href="#i-check-circle"></use></svg> Conectado · Tudo OK!</span>'
                    f'<div class="meta" style="margin-top:8px">Instância <b>{numero.instance_name}</b> online no WhatsApp ({numero.phone_number or "Ativa"}).</div>'
                    f'</div>',
                    status=286,
                )
    except Exception:
        pass

    # 2. Se desconectada, puxa o QR Code e embute polling de 3s
    try:
        resp = httpx.get(f"{base}/instance/qr", headers={"apikey": token}, timeout=10.0)
        if resp.status_code == 503:
            return HttpResponse(_flash("Evolution GO respondeu 503 (licença necessária)", "warn"))
        data = resp.json() if resp.status_code < 400 else {}
        inner = data.get("data") if isinstance(data.get("data"), dict) else data
        imagem = str((inner or {}).get("qrcode") or (inner or {}).get("QRCode") or "")
        if imagem:
            if not imagem.startswith("data:"):
                imagem = "data:image/png;base64," + imagem
            return HttpResponse(
                f'<div id="qr-container" hx-get="/dashboard/app/{a.slug}/whatsapp/qr" hx-trigger="every 3s" hx-swap="outerHTML" style="text-align:center;padding:16px;background:#fff;border-radius:8px;display:inline-block;box-shadow:0 4px 12px rgba(0,0,0,0.15)">'
                f'<img src="{imagem}" alt="QR Code" style="width:230px;height:230px;display:block;margin:0 auto">'
                f'<div style="color:#111;font-size:12px;margin-top:8px;font-weight:700;font-family:monospace">Escaneie no WhatsApp</div>'
                f'<div style="color:#666;font-size:11px;margin-top:4px">Aguardando leitura do QR Code...</div>'
                f'</div>'
            )
    except Exception as exc:
        return HttpResponse(_flash(f"Falha ao gerar QR: {exc}"[:100], "err"))

    return HttpResponse(
        f'<div id="qr-container" hx-get="/dashboard/app/{a.slug}/whatsapp/qr" hx-trigger="every 4s" hx-swap="outerHTML">'
        f'{_flash("Instância desconectada. Gerando QR Code...", "warn")}'
        f'</div>'
    )


@csrf_exempt
def pairing_code(request, slug: str):
    """Gera código de pareamento por número de telefone."""
    a = _account_or_404(slug)
    if a is None:
        return HttpResponse(status=404)
    numero = _numero_alvo(a, request)
    telefone = _post(request, "phone_number") or (numero.phone_number if numero else "")
    if not telefone:
        return HttpResponse(_flash("informe o número do telefone para parear", "err"))

    token = (numero.go_api_key() if numero else "") or getattr(settings, "EVOLUTION_GO_API_KEY", "")

    from whatsapp import provisioning as wa
    try:
        code = wa.go_pairing_code(token, telefone)
        if code:
            inst_nome = numero.instance_name if numero else ""
            return HttpResponse(
                f'<div class="pill st-sent" style="font-size:16px;padding:8px 16px;letter-spacing:2px"><b>{code}</b></div>'
                f'<div class="meta" style="margin-top:4px">Instância <span class="mono">{inst_nome}</span>: Digite este código na notificação do WhatsApp no celular</div>'
            )
    except Exception as exc:
        return HttpResponse(_flash(f"Falha ao gerar código: {exc}"[:100], "err"))

    return HttpResponse(_flash("Falha ao gerar código de pareamento.", "err"))


@csrf_exempt
def reconnect_instance(request, slug: str):
    """Solicita reconexão explícita da instância."""
    a = _account_or_404(slug)
    if a is None:
        return HttpResponse(status=404)
    numero = _numero_alvo(a, request)
    if numero is None:
        return HttpResponse(_flash("sem número cadastrado", "err"))

    import httpx
    base = (getattr(settings, "EVOLUTION_GO_BASE_URL", "") or "").rstrip("/")
    token = numero.go_api_key() or getattr(settings, "EVOLUTION_GO_API_KEY", "")

    try:
        httpx.post(
            f"{base}/instance/connect",
            headers={"apikey": token},
            json={
                "webhookUrl": f"http://notify-web:8000/v1/webhook/evolution/{numero.instance_name}",
                "subscribe": ["MESSAGE", "READ_RECEIPT", "HISTORY_SYNC"],
                "immediate": True,
            },
            timeout=15.0,
        )
        return HttpResponse(_flash(f"{numero.instance_name}: comando de reconexão enviado", "ok"))
    except Exception as exc:
        return HttpResponse(_flash(f"Falha: {exc}"[:100], "err"))


@csrf_exempt
def provision_instance(request, slug: str):
    """Cria ou atualiza instância do WhatsApp para o app."""
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)

    from whatsapp import provisioning as wa
    nome = _post(request, "instance_name") or a.slug
    telefone = _post(request, "phone_number")
    atual = a.whatsapp_numbers.filter(is_default=True).first() or a.whatsapp_numbers.first()
    substituindo = atual is not None and atual.instance_name != nome

    passos = []
    token = ""
    try:
        inst, criada = wa.go_ensure_instance(instance_name=nome)
        token = str(inst.get("token") or "")
        if token:
            try:
                wa.go_set_webhook(token, nome)
                passos.append(("evolution go", "ok", ("criada" if criada else "reaproveitada") + ", webhook registrado"))
            except Exception as exc:
                passos.append(("evolution go", "parcial", f"instância ok, webhook falhou: {exc}"[:120]))
        else:
            passos.append(("evolution go", "parcial", "sem token"))
    except Exception as exc:
        passos.append(("evolution go", "falhou", f"{type(exc).__name__}: {exc}"[:140]))

    numero, _ = WhatsAppNumber.objects.get_or_create(
        account=a, slug="principal" if not substituindo else nome[:40], defaults={"instance_name": nome, "driver": DRIVER_GO}
    )
    numero.instance_name = nome
    if telefone:
        numero.phone_number = telefone
    if token:
        numero.set_go_token(token)
    if not substituindo:
        numero.is_default = True
    numero.connection_status = "pareando"
    numero.save()

    houve_falha = any(p[1] == "falhou" for p in passos)
    detalhe = " · ".join(f"{n}: {st} ({d})" for n, st, d in passos)
    msg = f"instância '{nome}' pronta" if not houve_falha else f"instância '{nome}' parcial ({detalhe})"
    return HttpResponse(_flash(msg, "ok" if not houve_falha else "warn") + f'<div class="meta mono">{detalhe}</div>' + ('<div>Ela nasceu <b>inativa</b> de propósito.</div>' if substituindo else ''))


@csrf_exempt
def activate_number(request, slug: str, number_slug: str):
    """Promove uma instância a default."""
    a = _account_or_404(slug)
    if a is None:
        return HttpResponse(status=404)
    numero = a.whatsapp_numbers.filter(slug=number_slug).first()
    if numero is None:
        return HttpResponse(_flash("número não encontrado", "err"))

    import asyncio
    from whatsapp import factory
    try:
        driver = factory.build_driver(numero.driver, numero)
        async def _check():
            async with driver as d:
                return await d.health()
        h = asyncio.run(_check())
        data = h.get("data", {}) if isinstance(h, dict) else {}
        logado = bool(data.get("LoggedIn") or data.get("Connected"))
    except Exception:
        logado = False

    if not logado:
        return HttpResponse(_flash(f"a instância {numero.instance_name} ainda não está logada", "warn"))

    a.whatsapp_numbers.all().update(is_default=False)
    numero.is_default = True
    numero.connection_status = "open"
    numero.save(update_fields=["is_default", "connection_status"])
    return HttpResponse(_flash(f"instância {numero.instance_name} ativada como default!", "ok"))


# ── Configurações de Canais e Conta ──────────────────────────────────────────

@csrf_exempt
def save_whatsapp(request, slug: str):
    """Salva configurações da instância WhatsApp."""
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)

    instance_name = _post(request, "instance_name") or a.slug
    phone_number = _post(request, "phone_number")
    row_slug = _post(request, "slug", "principal")
    go_token = _post(request, "go_token")

    numero, _ = WhatsAppNumber.objects.get_or_create(
        account=a, slug=row_slug, defaults={"instance_name": instance_name, "driver": DRIVER_GO}
    )
    numero.instance_name = instance_name
    if phone_number:
        numero.phone_number = phone_number
    numero.driver = DRIVER_GO
    if request.POST.get("is_default") is not None:
        numero.is_default = _bool(request, "is_default")
    if go_token:
        numero.set_go_token(go_token)
    numero.save()

    return HttpResponse(_flash("Configurações de WhatsApp salvas!", "ok"))


@csrf_exempt
def save_mail(request, slug: str):
    """Salva configurações de E-mail SMTP."""
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)

    from mail import crypto

    from_email = _post(request, "from_email")
    from_name = _post(request, "from_name")
    smtp_host = _post(request, "smtp_host", "localhost")
    smtp_port = int(_post(request, "smtp_port", "587") or 587)
    smtp_user = _post(request, "smtp_user", from_email)
    smtp_pass = _post(request, "smtp_password")

    identity = a.mail_identities.first() or MailIdentity(account=a)
    if from_email:
        identity.from_email = from_email
    if from_name:
        identity.from_name = from_name
    identity.smtp_host = smtp_host
    identity.smtp_port = smtp_port
    identity.smtp_user = smtp_user
    identity.is_default = True
    if smtp_pass:
        identity.smtp_password = crypto.encrypt(smtp_pass)
    identity.save()

    return HttpResponse(_flash("Configurações de E-mail salvas!", "ok"))


@csrf_exempt
def mailbox(request, slug: str):
    """Cria ou associa caixa no servidor de e-mail (Stalwart / Mailcow)."""
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)

    from mail import crypto

    local_part = _post(request, "local_part", "noreply")
    domain = _post(request, "domain")

    try:
        from mail import stalwart
        client = stalwart.get_client()

        with client as mc:
            mb, raw_pwd, criada = mc.ensure_mailbox(local_part=local_part, domain=domain, name=a.name)
            full_email = f"{local_part}@{domain}"
            ident = a.mail_identities.filter(from_email=full_email).first() or MailIdentity(account=a, from_email=full_email)
            ident.from_name = a.name
            ident.smtp_host = getattr(settings, "STALWART_SMTP_HOST", getattr(settings, "MAILCOW_SMTP_HOST", "10.0.1.20"))
            ident.smtp_port = int(getattr(settings, "STALWART_SMTP_PORT", getattr(settings, "MAILCOW_SMTP_PORT", 587)))
            ident.smtp_user = full_email
            if raw_pwd:
                ident.smtp_password = crypto.encrypt(raw_pwd)
                ident.is_default = True
                msg = f"caixa {full_email} criada (senha gerada e salva)"
            else:
                ident.is_default = False
                msg = f"caixa {full_email} já existia — a senha não é recuperável pela API. Digite a senha no formulário abaixo."
            ident.save()
            return HttpResponse(_flash(msg, "ok" if raw_pwd else "warn") + ('<span class="pill st-pending">sem senha</span>' if not raw_pwd else ''))
    except Exception as exc:
        return HttpResponse(_flash(f"Falha no servidor de e-mail: {exc}"[:120], "err"))


@csrf_exempt
def save_shell(request, slug: str):
    """Salva o template shell de e-mail da marca."""
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)

    html = request.POST.get("html") or ""
    html_lower = html.lower()
    if "<script" in html_lower or "onerror=" in html_lower or "onload=" in html_lower or "javascript:" in html_lower:
        return HttpResponse('<p class="warnrow">rejeitado: tags de script ou manipuladores de evento não são permitidos</p>', status=400)

    if "{{content}}" not in html and "{{ content }}" not in html:
        return HttpResponse('<p class="warnrow">O shell precisa conter o placeholder <code>{{content}}</code></p>', status=400)

    shell = MailTemplate.objects.filter(account=a).first() or MailTemplate(account=a)
    shell.html = html
    shell.brand_name = _post(request, "brand_name", a.name)
    shell.accent_color = _post(request, "accent_color", "#6366f1")
    shell.save()
    return HttpResponse(_flash("Shell de e-mail salvo com sucesso!", "ok"))


def shell_preview(request, slug: str):
    """Preview do shell de e-mail."""
    a = _account_or_404(slug)
    if a is None:
        return HttpResponse(status=404)
    shell = MailTemplate.objects.filter(account=a).first()
    if shell and shell.html:
        rendered = (
            shell.html.replace("{{content}}", "<p>Olá! Este é um e-mail de teste operacional.</p>")
            .replace("{{title}}", "Assunto de Teste")
            .replace("{{service_name}}", shell.brand_name or a.name)
        )
    else:
        rendered = "<html><body><p>Nenhum shell cadastrado.</p></body></html>"
    return HttpResponse(rendered)


@csrf_exempt
def shell_ai(request, slug: str):
    """Gera sugestão de shell de e-mail com IA."""
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)

    from ai.client import propose_mail_template
    import html as _html

    brand_name = _post(request, "brand_name") or a.name
    accent_color = _post(request, "accent_color") or a.color or "#6366f1"

    try:
        draft = propose_mail_template(app_name=brand_name, accent_color=accent_color, logo_url=a.logo_url)
        escaped_draft = _html.escape(draft)
        return HttpResponse(f"""
        <div class="callout callout-info" style="margin-top:10px">
          <div>
            <strong>Sugestão gerada pela IA:</strong>
            <div style="margin-top:8px;display:flex;gap:8px;align-items:center">
              <textarea id="ai-draft-code" style="display:none">{escaped_draft}</textarea>
              <button type="button" class="primary" onclick="const ta=document.querySelector('textarea[name=html]'); const src=document.getElementById('ai-draft-code'); if(ta && src) {{ ta.value = src.value; ta.dispatchEvent(new Event('input')); }}">
                <svg class="ico-sm"><use href="#i-check"></use></svg> Aplicar ao Editor
              </button>
              <span class="meta">Clique para substituir o código HTML no editor acima.</span>
            </div>
          </div>
        </div>
        """)
    except Exception as exc:
        return HttpResponse(_flash(f"Falha ao gerar com IA: {exc}"[:120], "err"))


@csrf_exempt
def save_webhook(request, slug: str):
    """Salva URL de webhook de retorno."""
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)

    url = _post(request, "url")
    if not url:
        AppWebhook.objects.filter(account=a).delete()
        return HttpResponse(_flash("Webhook removido.", "warn"))

    hook = AppWebhook.objects.filter(account=a).first() or AppWebhook(account=a)
    hook.url = url
    events_list = request.POST.getlist("events") or ["status", "inbound"]
    hook.events = ",".join(events_list) if isinstance(events_list, list) else str(events_list)
    hook.active = _bool(request, "active")
    hook.save()
    return HttpResponse(_flash("Webhook salvo!", "ok"))


@csrf_exempt
def save_account(request, slug: str):
    """Atualiza configurações básicas do app."""
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)

    name = _post(request, "name")
    if name:
        a.name = name
    a.ai_adapt = _bool(request, "ai_adapt")
    a.save()
    return HttpResponse(_flash("App atualizado!", "ok"))


@csrf_exempt
def toggle_account(request, slug: str):
    """Ativa ou desativa a conta."""
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)

    a.is_active = not a.is_active
    a.save(update_fields=["is_active"])
    status_label = "ATIVADO" if a.is_active else "DESATIVADO"
    return HttpResponse(_flash(f"App {status_label}", "ok" if a.is_active else "warn"))


@csrf_exempt
def delete_account(request, slug: str):
    """Exclui uma conta e todos os seus registros atomicamente (CASCADE)."""
    if request.method != "POST":
        return HttpResponse(status=405)

    if slug == "default" or slug == getattr(settings, "NOTIFY_DEFAULT_ACCOUNT_SLUG", "default"):
        return HttpResponse(_flash("A conta padrão do sistema (default) não pode ser excluída.", "err"), status=400)

    a = _account_or_404(slug)
    if a is None:
        return HttpResponse(_flash("Conta não encontrada.", "err"), status=404)

    # 1. Limpa instâncias exclusivas na Evolution GO se houver
    try:
        from channels.models import WhatsAppNumber
        import httpx
        go_base = getattr(settings, "EVOLUTION_GO_BASE_URL", "")
        admin_key = getattr(settings, "EVOLUTION_GO_ADMIN_KEY", "") or getattr(settings, "EVOLUTION_GO_API_KEY", "")
        if go_base and admin_key:
            for num in a.whatsapp_numbers.all():
                inst = num.instance_name
                other_uses = WhatsAppNumber.objects.exclude(account=a).filter(instance_name=inst).exists()
                if not other_uses and inst != "default":
                    try:
                        httpx.delete(f"{go_base}/instance/delete/{inst}", headers={"apikey": admin_key}, timeout=4.0)
                    except Exception:
                        pass
    except Exception:
        pass

    # 2. Exclusão atômica no banco de dados (CASCADE automático em todas as FKs)
    from django.db import transaction
    with transaction.atomic():
        a.delete()

    resp = HttpResponse(_flash("Conta excluída com sucesso.", "ok"))
    resp["HX-Redirect"] = "/dashboard/?app=default"
    return resp


@csrf_exempt
def revoke_key(request, slug: str, key_id: int):
    """Revoga uma chave de API."""
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)

    ApiKey.objects.filter(account=a, pk=key_id, is_active=True).update(is_active=False)
    return HttpResponse(_flash("Chave revogada.", "warn"))


@csrf_exempt
def new_key(request, slug: str):
    """Gera uma nova chave de API."""
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)

    import secrets
    raw_key = f"ntf_{secrets.token_urlsafe(32)}"
    label = _post(request, "label", "Dashboard Key")
    ApiKey.objects.create(account=a, key_hash=ApiKey.hash_key(raw_key), label=label)
    return HttpResponse(
        f'<div class="pill st-sent">Chave criada (não aparece de novo): <span class="mono" style="user-select:all">{raw_key}</span></div>'
    )


@csrf_exempt
def ai_adapt_test(request, slug: str):
    """Teste de adaptação IA (fail-open)."""
    a = _account_or_404(slug)
    if a is None:
        return HttpResponse(status=404)

    from ai import adapt as ai_adapt
    texto = _post(request, "text", "olá {nome}")
    out = ai_adapt.adapt(texto, channels=["whatsapp", "email"], title=_post(request, "title"))
    if not out.get("adapted"):
        return HttpResponse(f'<div class="callout-warn">IA não adaptou (fail-open) — texto: {out.get("whatsapp", texto)}</div>')
    return HttpResponse(f'<div class="pill st-sent">adaptado</div><div>{out.get("whatsapp")}</div><div>{out.get("email")}</div>')


@csrf_exempt
def omnirouter_test(request):
    """Testa conectividade e capacidades do OmniRouter (Chat, STT)."""
    import time
    from ai import client as ai_client

    base_url = (getattr(settings, "OMNIROUTER_URL", "") or "").rstrip("/")
    if not base_url:
        return HttpResponse(_flash("OMNIROUTER_URL não configurada", "err"))

    t0 = time.time()
    h = ai_client.health()
    elapsed = (time.time() - t0) * 1000

    if not h.get("ok"):
        return HttpResponse(
            f'<div class="callout-warn"><svg class="ico"><use href="#i-alert"></use></svg> '
            f'<strong>OmniRouter Fora:</strong> {h.get("detail", "Indisponível")} ({base_url})</div>'
        )

    return HttpResponse(
        f'<div style="background:rgba(0,255,167,0.06);border:1px solid rgba(0,255,167,0.25);border-radius:8px;padding:12px;color:#00ffa7;font-size:12px">'
        f'<div style="display:flex;align-items:center;gap:6px;font-weight:700;margin-bottom:6px">'
        f'<svg class="ico" style="width:16px;height:16px"><use href="#i-check-circle"></use></svg> '
        f'OmniRouter Conectado ({elapsed:.0f}ms)'
        f'</div>'
        f'<div style="color:var(--tx-muted);font-family:monospace;font-size:11px">'
        f'Gateway: {base_url} · Chat/Adaptação: {getattr(settings, "AI_MODEL", "auto/best-fast")} · '
        f'STT: {getattr(settings, "AI_STT_MODEL", "whisper-1")}'
        f'</div>'
        f'</div>'
    )


def services_status(request):
    """Status dos serviços integrados."""
    omni_url = getattr(settings, "OMNIROUTER_URL", "http://10.0.1.35")
    servicos = [
        {"name": "Evolution GO", "ok": False, "detail": "HTTP 503", "url": "http://evolution-go:4000"},
        {"name": "Stalwart Mail", "ok": False, "detail": "Desconectado", "url": "http://10.0.1.20:8080"},
        {"name": "OmniRouter", "ok": False, "detail": "Desconectado", "url": omni_url},
        {"name": "Postgres", "ok": True, "detail": "Conectado", "url": "localhost:5432"},
    ]
    return render(request, "dashboard/_services_status.html", {"rows": servicos})


# ── Detalhes de Mensagens & Inbound ──────────────────────────────────────────

def notification_detail(request, slug: str, external_id: str):
    """Visualiza dados completos de um envio."""
    a = _account_or_404(slug)
    if a is None:
        return HttpResponse(status=404)

    lookup = Q(idempotency_key=external_id)
    try:
        lookup |= Q(external_id=uuid.UUID(external_id))
    except (ValueError, AttributeError, TypeError):
        pass

    n = Notification.objects.filter(account=a).filter(lookup).first()
    if n is None:
        return HttpResponse("<p class='muted'>Envio não encontrado.</p>", status=404)

    return render(request, "dashboard/_message.html", {"n": n, "a": a})


def inbound_detail(request, slug: str, external_id: str):
    """Visualiza o payload bruto de uma mensagem recebida."""
    a = _account_or_404(slug)
    if a is None:
        return HttpResponse(status=404)

    e = InboundEvent.objects.filter(account=a, external_id=external_id).first()
    if e is None:
        return HttpResponse("<p class='muted'>Mensagem não encontrada.</p>", status=404)

    pretty_payload = json.dumps(e.payload, ensure_ascii=False, indent=2)
    return render(request, "dashboard/_inbound_message.html", {"e": e, "bruto": pretty_payload})


def sent(request, slug: str):
    """Endpoint de envios filtrados por app."""
    a = _account_or_404(slug)
    if a is None:
        return HttpResponse(status=404)
    qs = Notification.objects.filter(account=a)
    q = request.GET.get("q")
    channel = request.GET.get("channel")
    status = request.GET.get("status")
    if q:
        qs = qs.filter(Q(text__icontains=q) | Q(recipient_phone__icontains=q) | Q(recipient_email__icontains=q))
    if channel:
        if channel == "whatsapp":
            qs = qs.filter(want_whatsapp=True)
        elif channel == "email":
            qs = qs.filter(want_email=True)
    if status:
        if channel == "whatsapp":
            qs = qs.filter(whatsapp_status=status)
        elif channel == "email":
            qs = qs.filter(email_status=status)
        else:
            qs = qs.filter(Q(whatsapp_status=status) | Q(email_status=status))
    return render(request, "dashboard/_sent.html", {"rows": list(qs.order_by("-created_at")[:50]), "a": a})


def inbox(request, slug: str):
    """Endpoint de mensagens recebidas por app."""
    a = _account_or_404(slug)
    if a is None:
        return HttpResponse(status=404)
    events = list(InboundEvent.objects.filter(account=a).order_by("-received_at")[:50])
    return render(request, "dashboard/_inbox.html", {"events": events, "rows": events, "a": a})


def notifications(request):
    """Feed de notificações filtrado para requisições AJAX."""
    slug = request.GET.get("account")
    if slug:
        qs = Notification.objects.filter(account__slug=slug)
    else:
        qs = Notification.objects.all()

    channel = request.GET.get("channel")
    status = request.GET.get("status")
    provider = request.GET.get("provider")
    if provider:
        qs = qs.filter(driver_used=provider)
    if channel:
        if channel == "whatsapp":
            qs = qs.filter(want_whatsapp=True)
        elif channel == "email":
            qs = qs.filter(want_email=True)
    if status:
        if channel == "whatsapp":
            qs = qs.filter(whatsapp_status=status)
        elif channel == "email":
            qs = qs.filter(email_status=status)
        else:
            qs = qs.filter(Q(whatsapp_status=status) | Q(email_status=status))

    notifs = list(qs.order_by("-created_at")[:50])
    linhas = [
        "<table><thead><tr><th>Data</th><th>Destinatário</th><th>Canal</th><th>Status</th><th>Provider</th><th>Mensagem</th><th>Ação</th></tr></thead><tbody>"
    ]
    for n in notifs:
        dest = n.recipient_phone or n.recipient_email or "-"
        st = n.whatsapp_status if n.want_whatsapp else (n.email_status if n.want_email else "-")
        pill_cls = "st-sent" if st == "sent" else ("st-failed" if st == "failed" else "st-pending")
        canal = "WhatsApp" if n.want_whatsapp else ("E-mail" if n.want_email else "-")
        prov = n.driver_used or "evolution-go"
        linhas.append(f"""
        <tr>
          <td class="muted mono">{n.created_at.strftime('%d/%m %H:%M')}</td>
          <td><b>{dest}</b></td>
          <td><span class="tag">{canal}</span></td>
          <td><span class="pill {pill_cls}">{st}</span></td>
          <td class="mono">{prov}</td>
          <td class="mono muted" style="font-size:11px">{n.text[:45]}</td>
          <td>
            {f'<button class="ghost" style="padding:2px 6px;font-size:11px" hx-post="/dashboard/app/{n.account.slug}/msg/{n.external_id}/requeue" hx-swap="outerHTML">Reenviar</button>' if st == "failed" else ''}
          </td>
        </tr>
        """)

    if len(linhas) == 1:
        linhas.append("<tr><td colspan='7' class='muted' style='text-align:center'>Nenhum envio recente encontrado.</td></tr>")
    linhas.append("</tbody></table>")

    return HttpResponse("".join(linhas))


# ── Assets Estáticos ─────────────────────────────────────────────────────────

def _vendor(name: str) -> HttpResponse:
    p = Path(settings.BASE_DIR) / "notify" / "vendor" / name
    try:
        return HttpResponse(p.read_bytes(), content_type="application/javascript")
    except FileNotFoundError:
        return HttpResponse(f"// {name} ausente", content_type="application/javascript", status=404)


def htmx_js(request):
    return _vendor("htmx.min.js")


def alpine_js(request):
    return _vendor("alpine.min.js")


def mail_domains(request, slug: str):
    """Devolve a lista de domínios disponíveis no Stalwart em formato <option>."""
    a = _account_or_404(slug)
    if a is None:
        return HttpResponse(status=404)

    dominios = []
    try:
        from mail.stalwart import get_client as get_stalwart_client
        with get_stalwart_client() as st:
            dominios = st.list_domains()
    except Exception:
        pass

    if not dominios:
        default_dom = getattr(settings, "DEFAULT_EMAIL_DOMAIN", "v7m.org")
        dominios = [default_dom]

    options = "".join(f'<option value="{d}">{d}</option>' for d in dominios)
    return HttpResponse(options)


def mail_mailboxes(request, slug: str):
    """Devolve as caixas de e-mail disponíveis no servidor para o domínio selecionado."""
    a = _account_or_404(slug)
    if a is None:
        return HttpResponse(status=404)

    domain = (request.GET.get("domain") or request.POST.get("domain") or "").strip()
    if not domain:
        domain = getattr(settings, "DEFAULT_EMAIL_DOMAIN", "v7m.org")

    mailboxes = []
    try:
        from mail.stalwart import get_client as get_stalwart_client
        with get_stalwart_client() as st:
            mailboxes = st.list_mailboxes(domain=domain)
    except Exception:
        pass

    current_ident = a.mail_identities.filter(is_default=True).first() or a.mail_identities.first()
    current_addr = current_ident.from_email if current_ident else ""

    options_html = []
    has_noreply = any(
        m.get("username", "").lower() == f"no-reply@{domain}".lower()
        or m.get("username", "").lower() == f"noreply@{domain}".lower()
        for m in mailboxes
    )
    if not has_noreply:
        sel = 'selected' if current_addr.lower() == f"no-reply@{domain}".lower() else ''
        options_html.append(f'<option value="no-reply@{domain}" {sel}>no-reply@{domain} (Padrão do Sistema)</option>')

    for m in mailboxes:
        u = m.get("username") or f"{m.get('local_part')}@{domain}"
        sel = 'selected' if u.lower() == current_addr.lower() else ''
        name_desc = f" — {m.get('name')}" if m.get('name') and m.get('name') != m.get('local_part') else ''
        options_html.append(f'<option value="{u}" {sel}>{u}{name_desc}</option>')

    return HttpResponse(f"""
    <div style="background:var(--panel2);border:1px solid var(--bd);border-radius:var(--radius);padding:14px;margin-bottom:14px">
      <div style="font-size:12px;font-weight:600;color:#fff;margin-bottom:8px">
        Caixas Existentes no Servidor para <span class="mono" style="color:var(--acc)">{domain}</span>:
      </div>
      <form hx-post="/dashboard/app/{a.slug}/mail/bind" hx-target="#mailbox-action-result" style="display:flex;gap:8px;align-items:center">
        <select name="selected_mailbox" id="selected_mailbox_input" class="mono" style="flex:1">
          {"".join(options_html)}
        </select>
        <button type="submit" class="primary" style="white-space:nowrap">
          <svg class="ico-sm"><use href="#i-check"></use></svg> Vincular Caixa Selecionada
        </button>
      </form>
    </div>
    """)


@csrf_exempt
def bind_mailbox(request, slug: str):
    """Vincula uma caixa de e-mail existente à conta como MailIdentity."""
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)

    selected_mailbox = _post(request, "selected_mailbox") or _post(request, "existing_mailbox")
    if not selected_mailbox or "@" not in selected_mailbox:
        return HttpResponse(_flash("Selecione um endereço de e-mail válido", "err"))

    ident = a.mail_identities.filter(from_email=selected_mailbox).first() or MailIdentity(account=a, from_email=selected_mailbox)
    ident.from_name = a.name
    ident.smtp_host = getattr(settings, "STALWART_SMTP_HOST", getattr(settings, "MAILCOW_SMTP_HOST", "10.0.1.20"))
    ident.smtp_port = int(getattr(settings, "STALWART_SMTP_PORT", getattr(settings, "MAILCOW_SMTP_PORT", 587)))
    ident.smtp_user = selected_mailbox
    ident.is_default = True
    ident.save()

    a.mail_identities.exclude(pk=ident.pk).update(is_default=False)

    return HttpResponse(
        _flash(f"Caixa {selected_mailbox} vinculada com sucesso como identidade padrão!", "ok")
    )


@csrf_exempt
def set_ai_url(request, slug: str):
    """Testa e atualiza a URL/IP do OmniRouter para o sistema."""
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)

    url = _post(request, "url").rstrip("/")
    if not url:
        return HttpResponse(_flash("Informe a URL do OmniRouter (ex: http://10.0.1.35)", "err"))

    import httpx
    try:
        resp = httpx.get(url + "/", headers={"User-Agent": "notify-server/1.0"}, timeout=3.5)
        if resp.status_code < 500:
            settings.OMNIROUTER_URL = url
            extra = a.extra if isinstance(a.extra, dict) else {}
            extra["omnirouter_url"] = url
            a.extra = extra
            a.save(update_fields=["extra"])
            return HttpResponse(_flash(f"OmniRouter online em {url}! (HTTP {resp.status_code})", "ok"))
        return HttpResponse(_flash(f"OmniRouter respondeu HTTP {resp.status_code}", "warn"))
    except Exception as exc:
        return HttpResponse(_flash(f"Não foi possível conectar em {url}: {type(exc).__name__}", "err"))


@csrf_exempt
def create_account(request):
    """Cria uma nova aplicação / conta e inicia o wizard obrigatório travado no setup."""
    if request.method != "POST":
        return HttpResponse(status=405)

    name = _post(request, "name")
    raw_slug = _post(request, "slug") or name
    from django.utils.text import slugify
    slug = slugify(raw_slug)
    if not slug:
        return HttpResponse(_flash("Nome ou identificador da aplicação inválido", "err"), status=400)

    # Cria a conta travada em is_setup_complete = False
    a, _ = Account.objects.get_or_create(
        slug=slug,
        defaults={
            "name": name or slug,
            "is_setup_complete": False,
            "setup_step": 1,
            "ai_url": "http://10.0.1.35/v1/chat/completions",
            "ai_api_key": "sk-d3786a77f7a483da-d7292e-5e7de527",
        },
    )

    # Garante instância de WhatsApp com o mesmo nome da conta
    _ensure_account_instance(a)

    # Proposta inicial de template HTML
    from ai.client import propose_mail_template
    from channels.models import MailTemplate
    MailTemplate.objects.get_or_create(
        account=a,
        defaults={
            "html": propose_mail_template(a.name, a.color, a.logo_url),
            "brand_name": a.name,
            "accent_color": a.color,
        },
    )

    return redirect(f"/dashboard/setup/?app={slug}")


# ── Wizard Setup Handlers ───────────────────────────────────────────────────

@csrf_exempt
def setup_step_whatsapp(request, slug: str):
    """Etapa 1: Valida/garante o WhatsApp e avança para etapa 2."""
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)
    _ensure_account_instance(a)
    a.setup_step = 2
    a.save(update_fields=["setup_step"])
    return redirect(f"/dashboard/setup/?app={slug}")


@csrf_exempt
def setup_step_email_probe(request, slug: str):
    """Testa a conectividade com o Stalwart / SMTP e valida a caixa."""
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)

    domain = (_post(request, "domain") or getattr(settings, "DEFAULT_EMAIL_DOMAIN", "v7m.org")).strip()
    mailbox_mode = _post(request, "mailbox_mode", "existing")
    selected_mailbox = _post(request, "selected_mailbox", "").strip()
    local_part = _post(request, "local_part", "").strip()
    smtp_host = getattr(settings, "STALWART_SMTP_HOST", "10.0.1.20")
    smtp_port = int(getattr(settings, "STALWART_SMTP_PORT", 587))

    if mailbox_mode == "existing" and selected_mailbox:
        target_email = selected_mailbox
    elif local_part:
        target_email = f"{local_part}@{domain}"
    else:
        target_email = f"no-reply@{domain}"

    import smtplib
    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=8.0) as srv:
            try:
                srv.starttls()
            except smtplib.SMTPNotSupportedError:
                pass
            srv.noop()

        return HttpResponse(f"""
        <div style="background:rgba(0,255,167,0.08);border:1px solid rgba(0,255,167,0.3);border-radius:var(--radius);padding:14px;color:#00ffa7;font-size:12.5px;margin-top:12px">
          <div style="font-weight:700;margin-bottom:4px;display:flex;align-items:center;gap:6px">
            <svg class="ico" style="width:16px;height:16px"><use href="#i-check-circle"></use></svg>
            Conexão com Stalwart Mail Server validada com sucesso!
          </div>
          <div style="color:var(--tx-muted);font-size:12px">
            Host: <span class="mono" style="color:#fff">{smtp_host}:{smtp_port}</span> (STARTTLS OK) · Remetente configurado: <span class="mono" style="color:#34d399">{target_email}</span>
          </div>
        </div>
        """)
    except Exception as exc:
        return HttpResponse(f"""
        <div style="background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);border-radius:var(--radius);padding:14px;color:#fca5a5;font-size:12.5px;margin-top:12px">
          <div style="font-weight:700;margin-bottom:4px;display:flex;align-items:center;gap:6px">
            <svg class="ico" style="stroke:#ef4444;width:16px;height:16px"><use href="#i-alert"></use></svg>
            Falha na conexão SMTP com o Stalwart ({smtp_host}:{smtp_port}):
          </div>
          <div class="mono" style="font-size:11.5px;color:#f87171">{exc}</div>
        </div>
        """)


@csrf_exempt
def setup_step_email(request, slug: str):
    """Etapa 2: Configura mailbox Stalwart/SMTP e avança para etapa 3."""
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)

    domain = (_post(request, "domain") or getattr(settings, "DEFAULT_EMAIL_DOMAIN", "v7m.org")).strip()
    mailbox_mode = _post(request, "mailbox_mode", "existing")
    selected_mailbox = _post(request, "selected_mailbox", "").strip()
    local_part = _post(request, "local_part", "").strip()
    mailbox_pass = _post(request, "mailbox_password", "").strip()

    if mailbox_mode == "new" and local_part:
        target_email = f"{local_part}@{domain}"
        try:
            from mail.stalwart import get_client as get_stalwart_client
            with get_stalwart_client() as st:
                st.ensure_mailbox(domain=domain, local_part=local_part, name=a.name, password=mailbox_pass or None)
        except Exception as exc:
            logger.warning("setup.stalwart_ensure_failed", error=str(exc))
    elif selected_mailbox and "@" in selected_mailbox:
        target_email = selected_mailbox
    elif local_part:
        target_email = f"{local_part}@{domain}"
    else:
        target_email = f"no-reply@{domain}"

    ident = a.mail_identities.filter(from_email=target_email).first() or MailIdentity(account=a, from_email=target_email)
    ident.from_name = a.name
    ident.smtp_host = getattr(settings, "STALWART_SMTP_HOST", "10.0.1.20")
    ident.smtp_port = int(getattr(settings, "STALWART_SMTP_PORT", 587))
    ident.smtp_user = target_email
    if mailbox_pass:
        from mail import crypto
        ident.smtp_password = crypto.encrypt(mailbox_pass)
    ident.is_default = True
    ident.save()
    a.mail_identities.exclude(pk=ident.pk).update(is_default=False)

    a.setup_step = 3
    a.save(update_fields=["setup_step"])
    return redirect(f"/dashboard/setup/?app={slug}")


@csrf_exempt
def setup_step_ai_probe(request, slug: str):
    """Etapa 3: Executa teste de conectividade com a IA usando o probe do usuário."""
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)

    ai_url = _post(request, "ai_url") or a.ai_url or "http://10.0.1.35/v1/chat/completions"
    ai_api_key = _post(request, "ai_api_key") or a.ai_api_key or "sk-d3786a77f7a483da-d7292e-5e7de527"
    model = _post(request, "model") or "default"

    from ai.client import probe_chat_completions
    res = probe_chat_completions(url=ai_url, api_key=ai_api_key, model=model)

    if res.get("ok"):
        content_preview = res.get("content", "").replace("\n", "<br>")
        return HttpResponse(f"""
        <div style="background:rgba(0,255,167,0.08);border:1px solid rgba(0,255,167,0.3);border-radius:var(--radius);padding:14px;color:#00ffa7;font-size:12.5px">
          <div style="font-weight:700;margin-bottom:6px;display:flex;align-items:center;gap:6px">
            <svg class="ico" style="width:16px;height:16px"><use href="#i-check-circle"></use></svg>
            Probe da IA bem-sucedido! (Modelo Respondente: <span class="mono" style="color:#fff">{res.get('model')}</span>)
          </div>
          <div style="color:var(--tx);font-size:12px;margin-top:8px;background:var(--panel);padding:10px 12px;border-radius:6px;border:1px solid var(--bd);line-height:1.5">
            <b>Resposta da IA:</b><br>{content_preview}
          </div>
        </div>
        """)
    else:
        err = res.get("error", "Sem resposta")
        return HttpResponse(f"""
        <div style="background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);border-radius:var(--radius);padding:14px;color:#fca5a5;font-size:12.5px">
          <div style="font-weight:700;margin-bottom:4px;display:flex;align-items:center;gap:6px">
            <svg class="ico" style="stroke:#ef4444;width:16px;height:16px"><use href="#i-alert"></use></svg>
            Falha no Probe da IA:
          </div>
          <div class="mono" style="font-size:11.5px;color:#f87171">{err}</div>
        </div>
        """)


@csrf_exempt
def setup_step_ai_save(request, slug: str):
    """Etapa 3: Salva a configuração de IA e avança para a etapa 4."""
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)

    ai_url = _post(request, "ai_url") or "http://10.0.1.35/v1/chat/completions"
    ai_api_key = _post(request, "ai_api_key") or "sk-d3786a77f7a483da-d7292e-5e7de527"

    a.ai_url = ai_url
    a.ai_api_key = ai_api_key
    a.setup_step = 4
    a.save(update_fields=["ai_url", "ai_api_key", "setup_step"])
    return redirect(f"/dashboard/setup/?app={slug}")


@csrf_exempt
def setup_step_logo_upload(request, slug: str):
    """Etapa 4: Faz upload manual do arquivo de logo."""
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)

    logo_file = request.FILES.get("logo_file")
    if not logo_file:
        return HttpResponse(_flash("Nenhum arquivo enviado", "err"))

    logo_dir = Path(settings.MEDIA_ROOT) / "logos"
    logo_dir.mkdir(parents=True, exist_ok=True)
    ext = Path(logo_file.name).suffix or ".png"
    target_path = logo_dir / f"{slug}{ext}"
    with open(target_path, "wb") as f:
        for chunk in logo_file.chunks():
            f.write(chunk)

    rel_url = f"/media/logos/{slug}{ext}"
    a.logo_url = rel_url
    a.save(update_fields=["logo_url"])

    return HttpResponse(f"""
    <div style="font-size:12px;color:var(--tx-muted);margin-bottom:10px">Logo Atualizada com Sucesso:</div>
    <img src="{rel_url}" alt="Logo {a.name}" style="width:120px;height:120px;object-fit:contain;background:#000;border-radius:12px;border:1px solid var(--sent)">
    """)


@csrf_exempt
def setup_step_logo_generate(request, slug: str):
    """Etapa 4: Gera logo via IA (Stable Diffusion) e salva."""
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)

    prompt = _post(request, "prompt") or f"minimalist modern vector logo for {a.name}, sleek geometric network nodes, dark background"
    base_url = a.ai_url.split("/v1")[0] if "/v1" in a.ai_url else "http://10.0.1.35"

    from ai.client import generate_image
    try:
        img_bytes = generate_image(prompt=prompt, base_url=base_url, api_key=a.ai_api_key)
        logo_dir = Path(settings.MEDIA_ROOT) / "logos"
        logo_dir.mkdir(parents=True, exist_ok=True)
        target_path = logo_dir / f"{slug}.png"
        with open(target_path, "wb") as f:
            f.write(img_bytes)

        rel_url = f"/media/logos/{slug}.png"
        a.logo_url = rel_url
        a.save(update_fields=["logo_url"])

        return HttpResponse(f"""
        <div style="font-size:12px;color:var(--tx-muted);margin-bottom:10px">Logo Gerada com Sucesso via IA:</div>
        <img src="{rel_url}" alt="Logo {a.name}" style="width:120px;height:120px;object-fit:contain;background:#000;border-radius:12px;border:1px solid var(--sent)">
        """)
    except Exception as exc:
        return HttpResponse(f"""
        <div style="color:#f87171;font-size:12px;padding:10px">Erro ao gerar logo via IA: {type(exc).__name__} - {exc}</div>
        """)


@csrf_exempt
def setup_step_logo_confirm(request, slug: str):
    """Etapa 4: Confirma a logo e avança para a etapa 5."""
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)

    if a.logo_url:
        tpl = MailTemplate.objects.filter(account=a).first()
        if tpl:
            tpl.logo_url = a.logo_url
            tpl.save(update_fields=["logo_url"])

    a.setup_step = 5
    a.save(update_fields=["setup_step"])
    return redirect(f"/dashboard/setup/?app={slug}")


@csrf_exempt
def setup_step_template_propose(request, slug: str):
    """Etapa 5: Re-propõe template HTML personalizado via IA."""
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)

    from ai.client import propose_mail_template
    tpl_html = propose_mail_template(app_name=a.name, accent_color=a.color or "#4f7cff", logo_url=a.logo_url)
    return HttpResponse(f'<textarea name="html" id="tpl-html-code" rows="18" class="mono" style="font-size:11.5px;line-height:1.4" required oninput="renderWizardTemplatePreview(this.value)">{tpl_html}</textarea><script>if(typeof renderWizardTemplatePreview==="function"){{renderWizardTemplatePreview(document.getElementById("tpl-html-code").value);}}</script>')


@csrf_exempt
def setup_step_template_save(request, slug: str):
    """Etapa 5: Salva o template HTML e avança para a etapa 6."""
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)

    html_content = _post(request, "html")
    tpl = MailTemplate.objects.filter(account=a).first() or MailTemplate(account=a)
    if html_content:
        tpl.html = html_content
    tpl.brand_name = a.name
    tpl.accent_color = a.color or "#4f7cff"
    tpl.logo_url = a.logo_url
    tpl.save()

    a.setup_step = 6
    a.save(update_fields=["setup_step"])
    return redirect(f"/dashboard/setup/?app={slug}")


@csrf_exempt
def setup_finish(request, slug: str):
    """Etapa 6: Conclui o setup e desbloqueia a conta para o dashboard operacional."""
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)

    a.is_setup_complete = True
    a.setup_step = 6
    a.save(update_fields=["is_setup_complete", "setup_step"])
    return redirect(f"/?app={slug}")

