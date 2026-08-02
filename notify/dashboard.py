"""Dashboard operacional — uma página por app, tudo editável.

SEM LOGIN, de propósito. Quem guarda a porta é a rede: o Caddy faz bind em
10.1.30.114, responde 404 para o hostname público e recusa origem fora de
RFC1918 + loopback + 100.64.0.0/10 (Tailscale). Chegar até aqui já significa
estar dentro da VPN — pedir uma API key que ninguém tem à mão na hora de olhar
um log seria atrito sobre uma porta já trancada por fora.

O que mudou: antes era só leitura. Agora a página da conta é o painel de
controle do app — WhatsApp (v2 e GO), e-mail (mailcow + SMTP), shell de e-mail
da marca, vozes, webhook e chaves. Cada bloco é um formulário HTMX que devolve
o próprio pedaço renderizado.

A gramática de resposta é uma só: **todo POST devolve um fragmento HTML** para o
alvo que o disparou. Nada de JSON aqui — quem quer JSON usa a API v1.
"""

from __future__ import annotations

from pathlib import Path

from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt

from accounts.models import Account, ApiKey
from channels.models import (
    DRIVER_GO,
    DRIVER_V2,
    AppWebhook,
    MailIdentity,
    MailTemplate,
    TtsVoices,
    WhatsAppNumber,
)
from notify.models import InboundEvent, Notification, Template

_STATUSES = ["pending", "sending", "sent", "failed", "skipped"]
_DRIVERS = [DRIVER_V2, DRIVER_GO]


# ── helpers ─────────────────────────────────────────────────────────────────

def _account_or_404(slug: str) -> Account | None:
    return Account.objects.filter(slug=slug).first()


def _flash(msg: str, kind: str = "ok") -> str:
    css = {"ok": "st-sent", "err": "st-failed", "warn": "st-pending"}.get(kind, "st-skipped")
    return f'<span class="pill {css}">{msg}</span>'


def _shared_instances(a: Account) -> dict[str, list[str]]:
    """Instâncias desta conta que OUTRA conta também usa.

    Duas contas na mesma instância significam dois apps mandando do mesmo
    número — o oposto do modelo. É silencioso no banco, então o painel precisa
    gritar.
    """
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


def _account_context(a: Account) -> dict:
    return {
        "a": a,
        "shared": _shared_instances(a),
        "external_url": getattr(settings, "EXTERNAL_URL", ""),
        "wa": list(a.whatsapp_numbers.all()),
        "mail": list(a.mail_identities.all()),
        # Identidade sem senha SMTP é um canal que parece pronto e falha no
        # envio. O painel precisa mostrar a diferença.
        "mail_pronto": a.mail_identities.exclude(smtp_password="").exists(),
        "tts": a.tts_voices.first(),
        "shell": MailTemplate.objects.filter(account=a).first(),
        "hook": AppWebhook.objects.filter(account=a).first(),
        "templates": list(a.templates.select_related("trigger").order_by("event")),
        "keys": list(a.api_keys.filter(is_active=True)),
        "drivers": _DRIVERS,
        "statuses": _STATUSES,
        "counts": {
            "notifs": a.notifications.count(),
            "inbound": a.inbound_events.count(),
            "failed": a.notifications.filter(whatsapp_status="failed").count()
            + a.notifications.filter(email_status="failed").count(),
        },
    }


def _render_account(request, a: Account, flash: str = "") -> HttpResponse:
    ctx = _account_context(a)
    ctx["flash"] = flash
    return render(request, "dashboard/_app.html", ctx)


def _webhook_url(instance_name: str) -> str:
    base = (getattr(settings, "EXTERNAL_URL", "") or "").rstrip("/")
    return f"{base}/v1/webhook/evolution/{instance_name}" if base else ""


def _numero_alvo(a: Account, request):
    """Instância sobre a qual a ação age.

    Assumir a default aqui seria o erro que trava a migração de número: quem
    pede QR está justamente parear a instância NOVA, que ainda não é a default.
    """
    pedido = (request.POST.get("number_slug") or request.GET.get("number_slug") or "").strip()
    if pedido:
        return a.whatsapp_numbers.filter(slug=pedido).first()
    return a.whatsapp_numbers.filter(is_default=True).first() or a.whatsapp_numbers.first()


def _post(request, field: str, default: str = "") -> str:
    return (request.POST.get(field) or default).strip()


def _bool(request, field: str) -> bool:
    return _post(request, field).lower() in {"1", "true", "on", "sim"}


# ── páginas ─────────────────────────────────────────────────────────────────

def home(request):
    accounts = []
    for a in Account.objects.prefetch_related(
        "whatsapp_numbers", "mail_identities", "tts_voices"
    ).order_by("slug"):
        accounts.append(
            {
                "obj": a,
                "wa": list(a.whatsapp_numbers.all()),
                "mail": list(a.mail_identities.all()),
                "templates": a.templates.count(),
                "notifs": a.notifications.count(),
            }
        )
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
            "drivers": _DRIVERS,
            "base_url": getattr(settings, "EXTERNAL_URL", ""),
        },
    )


def app_detail(request, slug: str):
    a = _account_or_404(slug)
    if a is None:
        return HttpResponse("<p class='warnrow'>Conta não encontrada.</p>", status=404)
    return _render_account(request, a)


_CHANNEL_FIELDS = {"whatsapp": "whatsapp_status", "email": "email_status", "tts": "tts_status"}


def notifications(request):
    qs = Notification.objects.select_related("account", "whatsapp_number").order_by("-created_at")
    account = request.GET.get("account") or ""
    status = request.GET.get("status") or ""
    caller = request.GET.get("caller") or ""
    channel = (request.GET.get("channel") or "").lower()
    provider = request.GET.get("provider") or ""
    try:
        limit = min(int(request.GET.get("limit") or 30), 200)
    except ValueError:
        limit = 30
    if account:
        qs = qs.filter(account__slug=account)
    if caller:
        qs = qs.filter(caller__icontains=caller)
    # canal + status: filtra o status DAQUELE canal; canal sozinho: quem quis o
    # canal; status sozinho: qualquer canal naquele status (comportamento antigo).
    if channel in _CHANNEL_FIELDS and status:
        qs = qs.filter(**{_CHANNEL_FIELDS[channel]: status})
    elif channel in _CHANNEL_FIELDS:
        qs = qs.filter(**{f"want_{channel}": True})
    elif status:
        from django.db.models import Q

        qs = qs.filter(Q(whatsapp_status=status) | Q(email_status=status) | Q(tts_status=status))
    if provider:
        qs = qs.filter(driver_used=provider)
    return render(request, "dashboard/_notifications.html", {"rows": list(qs[:limit])})


def sent(request, slug: str):
    """Envios da conta COM o conteúdo — é o que se quer ver quando algo falha."""
    a = _account_or_404(slug)
    if a is None:
        return HttpResponse("<p class='warnrow'>Conta não encontrada.</p>", status=404)
    qs = Notification.objects.filter(account=a).order_by("-created_at")
    status = request.GET.get("status") or ""
    busca = (request.GET.get("q") or "").strip()
    channel = (request.GET.get("channel") or "").lower()
    provider = request.GET.get("provider") or ""
    if channel in _CHANNEL_FIELDS and status:
        qs = qs.filter(**{_CHANNEL_FIELDS[channel]: status})
    elif channel in _CHANNEL_FIELDS:
        qs = qs.filter(**{f"want_{channel}": True})
    elif status:
        from django.db.models import Q

        qs = qs.filter(Q(whatsapp_status=status) | Q(email_status=status) | Q(tts_status=status))
    if provider:
        qs = qs.filter(driver_used=provider)
    if busca:
        from django.db.models import Q

        qs = qs.filter(
            Q(text__icontains=busca)
            | Q(recipient_phone__icontains=busca)
            | Q(recipient_email__icontains=busca)
            | Q(caller__icontains=busca)
        )
    return render(request, "dashboard/_sent.html", {"rows": list(qs[:40]), "a": a})


def inbox(request, slug: str):
    a = _account_or_404(slug)
    if a is None:
        return HttpResponse("<p class='warnrow'>Conta não encontrada.</p>", status=404)
    rows = list(
        InboundEvent.objects.filter(account=a).order_by("-received_at")[:50]
    )
    return render(request, "dashboard/_inbox.html", {"rows": rows, "a": a})


# ── escrita: WhatsApp ───────────────────────────────────────────────────────

@csrf_exempt
def save_whatsapp(request, slug: str):
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)

    number_slug = _post(request, "slug", "principal")
    number, _created = WhatsAppNumber.objects.get_or_create(
        account=a, slug=number_slug, defaults={"instance_name": a.slug, "is_default": True}
    )
    number.instance_name = _post(request, "instance_name", number.instance_name)
    number.phone_number = _post(request, "phone_number", number.phone_number)
    driver = _post(request, "driver", number.driver)
    fallback = _post(request, "fallback_driver")
    number.driver = driver if driver in _DRIVERS else number.driver
    number.fallback_driver = fallback if (fallback in _DRIVERS and fallback != number.driver) else ""
    if _post(request, "go_token"):
        number.set_go_token(_post(request, "go_token"))
    number.is_default = _bool(request, "is_default") or not WhatsAppNumber.objects.filter(
        account=a, is_default=True
    ).exclude(pk=number.pk).exists()
    number.save()
    return _render_account(request, a, _flash("WhatsApp salvo"))


@csrf_exempt
def check_whatsapp(request, slug: str):
    """Estado ao vivo da instância nos DOIS provedores — sem alterar nada."""
    a = _account_or_404(slug)
    if a is None:
        return HttpResponse(status=404)
    from asgiref.sync import async_to_sync

    from whatsapp.factory import build_driver

    rows = []
    for number in a.whatsapp_numbers.all():
        for name in _DRIVERS:
            try:
                driver = build_driver(
                    name, instance_name=number.instance_name, go_api_key=number.go_api_key()
                )

                async def _run(d=driver):
                    async with d as wa:
                        return await wa.health()

                data = async_to_sync(_run)()
                state = str(data)[:120]
                ok = True
            except Exception as exc:  # noqa: BLE001
                state = f"{type(exc).__name__}: {exc}"[:120]
                ok = False
            rows.append({"number": number, "driver": name, "ok": ok, "detail": state})
        # o status que o dashboard mostra é o do provedor preferido
        preferido = next((r for r in rows if r["number"] == number and r["driver"] == number.driver), None)
        if preferido is not None:
            from django.utils import timezone

            number.connection_status = "open" if preferido["ok"] else "down"
            number.status_checked_at = timezone.now()
            number.save(update_fields=["connection_status", "status_checked_at"])
    return render(request, "dashboard/_wa_check.html", {"rows": rows})


@csrf_exempt
def pairing_code(request, slug: str):
    """Código de pareamento — expira em ~2 min, peça só com o celular na mão."""
    a = _account_or_404(slug)
    if a is None:
        return HttpResponse(status=404)
    number = _numero_alvo(a, request)
    if number is None:
        return HttpResponse(_flash("sem número cadastrado", "err"))
    token = number.go_api_key()
    if not token:
        return HttpResponse(_flash("número sem token da instância na GO", "err"))
    if not number.phone_number:
        return HttpResponse(_flash("número sem phone_number", "err"))
    from whatsapp.provisioning import ProvisioningError, go_pairing_code

    try:
        code = go_pairing_code(token, number.phone_number)
    except ProvisioningError as exc:
        return HttpResponse(_flash(f"falhou: {exc}"[:120], "err"))
    return HttpResponse(
        f'<span class="mono" style="font-size:18px;letter-spacing:2px">{code}</span> '
        f'<span class="muted">instância <span class="mono">{number.instance_name}</span> · '
        f"expira em ~2 min · digite no WhatsApp do {number.phone_number}</span>"
    )


# ── escrita: e-mail ─────────────────────────────────────────────────────────

@csrf_exempt
def save_mail(request, slug: str):
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)
    from mail import crypto

    from_email = _post(request, "from_email")
    if not from_email:
        return _render_account(request, a, _flash("informe o from_email", "err"))

    identity = MailIdentity.objects.filter(account=a, from_email=from_email).first()
    if identity is None:
        identity = MailIdentity(account=a, from_email=from_email)
    identity.from_name = _post(request, "from_name", a.name)
    identity.smtp_host = _post(request, "smtp_host", getattr(settings, "MAILCOW_SMTP_HOST", ""))
    identity.smtp_port = int(_post(request, "smtp_port", "587") or 587)
    identity.smtp_user = _post(request, "smtp_user", from_email)
    senha = _post(request, "smtp_password")
    if senha:
        identity.smtp_password = crypto.encrypt(senha)
    identity.is_default = True
    identity.save()
    MailIdentity.objects.filter(account=a).exclude(pk=identity.pk).update(is_default=False)
    return _render_account(request, a, _flash("e-mail salvo"))


@csrf_exempt
def mailbox(request, slug: str):
    """Cria (ou rotaciona) a caixa no mailcow e atualiza a MailIdentity."""
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)
    local = _post(request, "local_part")
    domain = _post(request, "domain")
    rotate = _bool(request, "rotate")
    if not local or not domain:
        return _render_account(request, a, _flash("informe usuário e domínio", "err"))

    from mail import crypto
    from mail.mailcow import MailcowError, get_client

    try:
        with get_client() as mc:
            if domain not in mc.list_domains():
                return _render_account(request, a, _flash(f"domínio {domain} não existe", "err"))
            _box, senha, criada = mc.ensure_mailbox(
                local_part=local, domain=domain, name=a.name, rotate_password=rotate
            )
    except MailcowError as exc:
        return _render_account(request, a, _flash(f"mailcow: {exc}"[:120], "err"))
    except Exception as exc:  # noqa: BLE001
        return _render_account(request, a, _flash(f"{type(exc).__name__}"[:120], "err"))

    username = f"{local}@{domain}"
    identity = MailIdentity.objects.filter(account=a, from_email=username).first() or MailIdentity(
        account=a, from_email=username
    )
    identity.smtp_host = getattr(settings, "MAILCOW_SMTP_HOST", "")
    identity.smtp_port = int(getattr(settings, "MAILCOW_SMTP_PORT", 587))
    identity.smtp_user = username
    identity.from_name = identity.from_name or a.name
    if senha is not None:
        identity.smtp_password = crypto.encrypt(senha)
    # Sem senha, a identidade fica registrada mas NÃO vira a default: o painel
    # mostraria "e-mail pronto" e o primeiro envio real falharia no login SMTP.
    tem_senha = bool(identity.smtp_password)
    identity.is_default = tem_senha
    identity.save()
    if tem_senha:
        MailIdentity.objects.filter(account=a).exclude(pk=identity.pk).update(is_default=False)

    if not tem_senha:
        return _render_account(
            request,
            a,
            _flash("caixa existe, mas a senha não é recuperável no mailcow", "warn")
            + '<div class="meta">Marque <b>rotacionar senha</b> e salve de novo — sem isso o SMTP '
            "não autentica e o e-mail deste app não sai.</div>",
        )
    return _render_account(request, a, _flash("caixa criada" if criada else "caixa atualizada"))


# ── escrita: shell de e-mail (marca da conta) ───────────────────────────────

@csrf_exempt
def save_shell(request, slug: str):
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)
    html = request.POST.get("html") or ""
    if "{{content}}" not in html:
        return _render_account(request, a, _flash("o HTML precisa conter {{content}}", "err"))
    shell = MailTemplate.objects.filter(account=a).first() or MailTemplate(account=a)
    shell.html = html
    shell.subject = _post(request, "subject", shell.subject)
    shell.brand_name = _post(request, "brand_name", a.name)
    shell.accent_color = _post(request, "accent_color", shell.accent_color or "#172033")
    shell.logo_url = _post(request, "logo_url")
    shell.save()
    return _render_account(request, a, _flash("template de e-mail salvo"))


@csrf_exempt
def shell_ai(request, slug: str):
    """Gera/reescreve o shell com a IA. Devolve só o <textarea> preenchido."""
    a = _account_or_404(slug)
    if a is None:
        return HttpResponse(status=404)
    from ai import prompts
    from ai.client import AiError

    shell = MailTemplate.objects.filter(account=a).first()
    try:
        html = prompts.mail_shell(
            brand=_post(request, "brand_name", a.name),
            accent=_post(request, "accent_color"),
            instructions=_post(request, "instructions"),
            base_html=(shell.html if shell and _bool(request, "reuse") else ""),
        )
    except AiError as exc:
        return HttpResponse(
            f'<p class="warnrow">IA indisponível: {exc}</p>'
            f'<p class="muted">O envio de e-mail não depende disso — o shell atual continua valendo.</p>',
            status=200,
        )
    if "{{content}}" not in html:
        return HttpResponse(
            '<p class="warnrow">A IA devolveu um HTML sem {{content}} — descartado.</p>'
        )
    return render(request, "dashboard/_shell_editor.html", {"a": a, "shell": shell, "draft": html})


def shell_preview(request, slug: str):
    """Preview renderizado do e-mail, num iframe isolado."""
    a = _account_or_404(slug)
    if a is None:
        return HttpResponse(status=404)
    from mail import templates as mail_templates

    shell = MailTemplate.objects.filter(account=a).first()
    corpo = (
        "Olá {nome}, esta é uma **prévia** do seu template.\n\n"
        "- item de exemplo\n- outro item\n\nQualquer dúvida, é só responder."
    )
    if shell is not None and shell.is_valid:
        html = mail_templates.render_shell(
            shell.html,
            title="Assunto de exemplo",
            content=corpo,
            service_name=shell.brand_name or a.name,
        )
    else:
        html = mail_templates.render(
            "default", title="Assunto de exemplo", content=corpo, service_name=a.name
        )
    return HttpResponse(html)


# ── escrita: TTS, webhook, chaves, teste ────────────────────────────────────

@csrf_exempt
def save_tts(request, slug: str):
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)
    from tts.client import DEFAULT_VOICE_FEMALE, DEFAULT_VOICE_MALE

    voices = TtsVoices.objects.filter(account=a).first() or TtsVoices(account=a)
    voices.voice_male = _post(request, "voice_male", voices.voice_male or DEFAULT_VOICE_FEMALE)
    voices.voice_female = _post(request, "voice_female", voices.voice_female or DEFAULT_VOICE_MALE)
    voices.save()
    return _render_account(request, a, _flash("vozes salvas"))


@csrf_exempt
def save_webhook(request, slug: str):
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)
    url = _post(request, "url")
    hook = AppWebhook.objects.filter(account=a).first()
    if not url:
        if hook is not None:
            hook.delete()
        return _render_account(request, a, _flash("webhook removido", "warn"))
    hook = hook or AppWebhook(account=a)
    hook.url = url
    hook.secret = _post(request, "secret", hook.secret)
    eventos = request.POST.getlist("events") or ["status", "inbound"]
    hook.events = ",".join(eventos)
    hook.active = _bool(request, "active") or True
    hook.save()
    return _render_account(request, a, _flash("webhook salvo"))


@csrf_exempt
def test_webhook(request, slug: str):
    a = _account_or_404(slug)
    if a is None:
        return HttpResponse(status=404)
    from notify import outbound

    hook = AppWebhook.objects.filter(account=a).first()
    if hook is None:
        return HttpResponse(_flash("nenhum webhook cadastrado", "err"))
    try:
        outbound.deliver(a.id, "status", {"test": True, "account": a.slug})
    except Exception as exc:  # noqa: BLE001
        return HttpResponse(_flash(f"falhou: {type(exc).__name__}", "err"))
    return HttpResponse(_flash(f"entregue (HTTP {hook.last_status})"))


@csrf_exempt
def new_key(request, slug: str):
    """Gera uma key nova. A anterior continua válida até ser desativada."""
    a = _account_or_404(slug)
    if a is None:
        return HttpResponse(status=404)
    import secrets

    raw = secrets.token_urlsafe(32)
    ApiKey.objects.create(
        account=a, key_hash=ApiKey.hash_key(raw), label=_post(request, "label", "dashboard")
    )
    return HttpResponse(
        f'<div class="meta">Guarde agora — não aparece de novo:</div>'
        f'<div class="mono" style="word-break:break-all;padding:8px;background:var(--panel2);border-radius:8px">{raw}</div>'
    )


@csrf_exempt
def test_send(request, slug: str):
    """Envia de verdade, pelo mesmo caminho da API — inclusive fan-out."""
    a = _account_or_404(slug)
    if a is None:
        return HttpResponse(status=404)
    from notify.interface.send import send

    phone = _post(request, "phone") or None
    email = _post(request, "email") or None
    if not phone and not email:
        return HttpResponse(_flash("informe telefone ou e-mail", "err"))
    try:
        ext = send(
            account=a,
            text=_post(request, "text", "Teste do dashboard do notify."),
            caller="dashboard.test",
            phone=phone,
            email=email,
            subject=_post(request, "subject", "Teste do notify"),
            whatsapp=bool(phone),
            email_channel=bool(email),
            tts=_bool(request, "tts"),
            gender=_post(request, "gender") or None,
            run_sync=True,
        )
    except Exception as exc:  # noqa: BLE001
        return HttpResponse(_flash(f"{type(exc).__name__}: {exc}"[:140], "err"))
    n = Notification.objects.filter(account=a, external_id=ext).first()
    detalhe = ""
    if n is not None:
        detalhe = (
            f" · wa: {n.whatsapp_status} · email: {n.email_status} · tts: {n.tts_status}"
            + (f" · erro: {n.whatsapp_error or n.email_error or n.tts_error}"[:160] if n.whatsapp_error or n.email_error or n.tts_error else "")
        )
    return HttpResponse(_flash("enviado") + f'<span class="muted mono">{detalhe}</span>')


# ── escrita: templates de evento ────────────────────────────────────────────

@csrf_exempt
def save_template(request, slug: str, event: str):
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)
    from notify.interface import templates as _cache

    body = request.POST.get("body_md") or ""
    if not body.strip():
        return HttpResponse(_flash("corpo vazio", "err"))
    canais = ",".join(request.POST.getlist("channels") or ["whatsapp"])
    t, _ = Template.objects.update_or_create(
        account=a,
        event=event,
        defaults={
            "body_md": body,
            "title": _post(request, "title") or None,
            "subject": _post(request, "subject") or None,
            "channels": canais,
            "is_tts": _bool(request, "is_tts"),
            "mail_template": _post(request, "mail_template", "default"),
        },
    )
    _cache.invalidate(a.id, event)
    return HttpResponse(_flash(f"template {event} salvo"))


@csrf_exempt
def template_ai(request, slug: str, event: str):
    a = _account_or_404(slug)
    if a is None:
        return HttpResponse(status=404)
    from ai import prompts
    from ai.client import AiError

    t = Template.objects.filter(account=a, event=event).first()
    if t is None:
        return HttpResponse(_flash("template não encontrado", "err"))
    try:
        novo = prompts.rewrite(t.body_md, _post(request, "instructions"))
    except AiError as exc:
        return HttpResponse(f'<p class="warnrow">IA indisponível: {exc}</p>')
    return HttpResponse(
        f'<div class="meta">Sugestão da IA — revise e salve:</div>'
        f'<textarea name="body_md" rows="8" form="tpl-{event}">{novo}</textarea>'
    )


# ── conta: gestão (F2) ──────────────────────────────────────────────────────

@csrf_exempt
def save_account(request, slug: str):
    """Nome e config de IA da conta — o liga/desliga fica em toggle_account."""
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)
    a.name = _post(request, "name", a.name)
    a.ai_adapt = _bool(request, "ai_adapt")
    a.save(update_fields=["name", "ai_adapt"])
    return _render_account(request, a, _flash("conta salva"))


@csrf_exempt
def toggle_account(request, slug: str):
    """Desativar derruba TODA chamada com as keys desta conta (403 no auth)."""
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)
    a.is_active = not a.is_active
    a.save(update_fields=["is_active"])
    msg = "conta ATIVADA" if a.is_active else "conta DESATIVADA — as API keys dela param de autenticar"
    return _render_account(request, a, _flash(msg, "ok" if a.is_active else "warn"))


@csrf_exempt
def revoke_key(request, slug: str, key_id: int):
    """Revoga UMA key. Irreversível de propósito — key nova é um clique."""
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)
    updated = ApiKey.objects.filter(account=a, pk=key_id, is_active=True).update(is_active=False)
    if not updated:
        return _render_account(request, a, _flash("key não encontrada ou já revogada", "err"))
    return _render_account(request, a, _flash("key revogada — quem a usava recebe 403 agora", "warn"))


# ── ferramentas IA: testar análise/adaptação (F5) ───────────────────────────

@csrf_exempt
def ai_adapt_test(request, slug: str):
    """Roda a MESMA adaptação do pipeline e mostra o que sairia por canal."""
    a = _account_or_404(slug)
    if a is None:
        return HttpResponse(status=404)
    from ai import adapt as ai_adapt

    texto = _post(request, "text")
    if not texto:
        return HttpResponse(_flash("informe um texto", "err"))
    out = ai_adapt.adapt(texto, channels=["whatsapp", "email"], title=_post(request, "title"))

    if not out["adapted"]:
        return HttpResponse(
            _flash("IA não adaptou (fail-open) — o envio sairia com o texto original", "warn")
            + f'<div class="meta">original:</div><pre class="mono" style="white-space:pre-wrap">{out["whatsapp"]}</pre>'
        )
    partes = [
        _flash("adaptado"),
        '<div class="meta" style="margin-top:6px">whatsapp:</div>'
        f'<pre class="mono" style="white-space:pre-wrap">{out["whatsapp"]}</pre>',
        '<div class="meta">e-mail:</div>'
        f'<pre class="mono" style="white-space:pre-wrap">{out["email"]}</pre>',
    ]
    if out["subject"]:
        partes.append(f'<div class="meta">assunto sugerido: <span class="mono">{out["subject"]}</span></div>')
    partes.append(
        '<p class="hint">É exatamente o que o pipeline faria com este texto '
        f'({"IA ligada" if a.ai_adapt else "IA DESLIGADA nesta conta — o envio real não adapta"}).</p>'
    )
    return HttpResponse("".join(partes))


# ── status dos serviços (F4) ────────────────────────────────────────────────

def services_status(request):
    """Saúde real dos 4 serviços — cada um consultado agora, com timeout curto."""
    import httpx

    rows = []

    base_v2 = (getattr(settings, "WHATSAPP_API_BASE_URL", "") or "").rstrip("/")
    if base_v2:
        try:
            r = httpx.get(
                f"{base_v2}/instance/fetchInstances",
                headers={"apikey": getattr(settings, "WHATSAPP_GLOBAL_API_KEY", "")},
                timeout=8.0,
            )
            data = r.json() if r.status_code < 400 else []
            ok = r.status_code < 400
            detail = f"{len(data)} instância(s)" if ok else f"HTTP {r.status_code}"
        except Exception as exc:  # noqa: BLE001
            ok, detail = False, type(exc).__name__
    else:
        ok, detail = False, "WHATSAPP_API_BASE_URL não configurada"
    rows.append({"name": "Evolution v2", "url": base_v2, "ok": ok, "detail": detail})

    base_go = (getattr(settings, "EVOLUTION_GO_BASE_URL", "") or "").rstrip("/")
    if base_go:
        try:
            key = getattr(settings, "EVOLUTION_GO_ADMIN_KEY", "") or getattr(
                settings, "EVOLUTION_GO_API_KEY", ""
            )
            r = httpx.get(f"{base_go}/instance/all", headers={"apikey": key}, timeout=8.0)
            ok = r.status_code < 400
            if ok:
                data = r.json()
                items = data.get("data") if isinstance(data, dict) else data
                detail = f"{len(items) if isinstance(items, list) else '?'} instância(s)"
            else:
                detail = f"HTTP {r.status_code}"
        except Exception as exc:  # noqa: BLE001
            ok, detail = False, type(exc).__name__
    else:
        ok, detail = False, "EVOLUTION_GO_BASE_URL não configurada"
    rows.append({"name": "Evolution GO", "url": base_go, "ok": ok, "detail": detail})

    try:
        from mail.mailcow import MailcowNotConfigured, get_client

        try:
            with get_client() as mc:
                dominios = mc.list_domains()
            ok, detail = True, f"{len(dominios)} domínio(s): {', '.join(dominios[:4])}"
        except MailcowNotConfigured:
            ok, detail = False, "MAILCOW_BASE_URL/API_KEY não configurados"
    except Exception as exc:  # noqa: BLE001
        ok, detail = False, f"{type(exc).__name__}: {exc}"[:120]
    rows.append(
        {"name": "mailcow", "url": getattr(settings, "MAILCOW_BASE_URL", ""), "ok": ok, "detail": detail}
    )

    from ai.client import health as ai_health

    h = ai_health()
    rows.append(
        {
            "name": "OmniRouter",
            "url": getattr(settings, "OMNIROUTER_URL", ""),
            "ok": bool(h.get("ok")),
            "detail": (
                (h.get("detail") or f"{h.get('models', 0)} modelo(s)")
                if h.get("ok")
                else str(h.get("detail", ""))[:120]
            ),
        }
    )

    return render(request, "dashboard/_services_status.html", {"rows": rows})


# ── assets ──────────────────────────────────────────────────────────────────

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


# ── provisionamento pelo painel ─────────────────────────────────────────────

@csrf_exempt
def app_new(request):
    """Provisiona um app inteiro — mesmo caminho do POST /v1/admin/apps.

    A API key aparece UMA vez, aqui. Depois disso ela só existe como hash.
    """
    if request.method != "POST":
        return HttpResponse(status=405)
    from notify.provisioning import provision_app

    slug = _post(request, "slug")
    if not slug:
        return HttpResponse('<p class="warnrow">informe o slug</p>', status=400)
    try:
        report = provision_app(
            slug=slug,
            name=_post(request, "name") or slug,
            phone_number=_post(request, "phone_number"),
            email_local_part=_post(request, "email_local_part"),
            email_domain=_post(request, "email_domain"),
            webhook_url=_post(request, "webhook_url"),
        )
    except ValueError as exc:
        return HttpResponse(f'<p class="warnrow">{exc}</p>', status=400)

    a = _account_or_404(report.account_slug)
    passos = " · ".join(f"{s.name}:{s.status}" for s in report.steps)
    flash = _flash("provisionado" if not report.failed else f"parcial ({', '.join(report.failed)})",
                   "ok" if not report.failed else "warn")
    flash += (
        '<div class="meta" style="margin-top:6px">account_id (é isto que o app manda no payload — sem chave):</div>'
        f'<div class="mono" style="font-size:16px;padding:8px;background:var(--panel2);border-radius:8px">{report.account_slug}</div>'
    )
    if report.api_key:
        flash += (
            '<div class="meta" style="margin-top:6px">API key (aparece uma única vez):</div>'
            f'<div class="mono" style="word-break:break-all;padding:8px;background:var(--panel2);border-radius:8px">{report.api_key}</div>'
        )
    flash += f'<div class="meta mono" style="margin-top:6px">{passos}</div>'
    return _render_account(request, a, flash)


# ── instância própria por app ───────────────────────────────────────────────

@csrf_exempt
def provision_instance(request, slug: str):
    """Cria a instância DESTE app nos dois Evolutions — sem tirar produção do ar.

    Editar `instance_name` no formulário só renomeia um ponteiro: se a instância
    não existir no provedor, o envio falha. É este botão que cria de verdade e
    guarda o token dela (o app deixa de depender da key global).

    **A instância nova nasce inativa.** Instância recém-criada não tem sessão de
    WhatsApp: apontar o envio para ela antes do pareamento derrubaria o canal do
    app no instante do clique. Ela só assume depois de `activate_number`, que
    confere se está logada.

    Idempotente: instância existente é reaproveitada, nunca apagada (apagar
    destrói a credencial e obriga novo pareamento presencial).
    """
    a = _account_or_404(slug)
    if a is None or request.method != "POST":
        return HttpResponse(status=400)
    from django.utils.text import slugify

    from whatsapp import provisioning as wa

    nome = _post(request, "instance_name") or a.slug
    telefone = _post(request, "phone_number")
    atual = a.whatsapp_numbers.filter(is_default=True).first() or a.whatsapp_numbers.first()
    substituindo = atual is not None and atual.instance_name != nome

    passos = []
    try:
        _inst, criada = wa.v2_ensure_instance(instance_name=nome, phone_number=telefone)
        try:
            wa.v2_set_webhook(nome)
            passos.append(("evolution v2", "ok", "criada" if criada else "reaproveitada"))
        except Exception as exc:  # noqa: BLE001
            passos.append(("evolution v2", "parcial", f"instância ok, webhook falhou: {exc}"[:120]))
    except Exception as exc:  # noqa: BLE001
        passos.append(("evolution v2", "falhou", f"{type(exc).__name__}: {exc}"[:140]))

    token = ""
    try:
        inst, criada = wa.go_ensure_instance(instance_name=nome)
        token = str(inst.get("token") or "")
        if token:
            try:
                wa.go_set_webhook(token, nome)
                passos.append(("evolution go", "ok", ("criada" if criada else "reaproveitada") + ", webhook registrado"))
            except Exception as exc:  # noqa: BLE001
                passos.append(("evolution go", "parcial", f"instância ok, webhook falhou: {exc}"[:120]))
        else:
            passos.append(("evolution go", "parcial", "sem token — envio cairia na key global"))
    except Exception as exc:  # noqa: BLE001
        passos.append(("evolution go", "falhou", f"{type(exc).__name__}: {exc}"[:140]))

    row_slug = "principal" if not substituindo else (slugify(nome) or "proprio")[:40]
    numero, _criada = WhatsAppNumber.objects.get_or_create(
        account=a, slug=row_slug, defaults={"instance_name": nome}
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
    flash = _flash(
        f"instância '{nome}' pronta" if not houve_falha else f"instância '{nome}' parcial",
        "ok" if not houve_falha else "warn",
    ) + f'<div class="meta mono" style="margin-top:6px">{detalhe}</div>'
    if substituindo:
        flash += (
            '<div class="meta">Ela nasceu <b>inativa</b> de propósito: instância sem sessão não pode '
            f'assumir o envio. Pareie (QR ou código) e clique em <b>ativar</b> — o app continua saindo por '
            f'<span class="mono">{atual.instance_name}</span> até lá.</div>'
        )
    elif token:
        flash += '<div class="meta">Token da instância guardado — este app deixou de depender da key global.</div>'
    return _render_account(request, a, flash)


@csrf_exempt
def activate_number(request, slug: str, number_slug: str):
    """Promove a instância a default — só se ela estiver realmente logada.

    A checagem não é burocracia: promover uma instância sem sessão é a diferença
    entre "trocamos o número do app" e "o app parou de mandar mensagem".
    """
    a = _account_or_404(slug)
    if a is None:
        return HttpResponse(status=404)
    numero = a.whatsapp_numbers.filter(slug=number_slug).first()
    if numero is None:
        return HttpResponse(_flash("número não encontrado", "err"))

    from asgiref.sync import async_to_sync

    from whatsapp.factory import build_driver

    forcar = _bool(request, "force")
    logado = False
    detalhe = ""
    try:
        driver = build_driver(
            numero.driver, instance_name=numero.instance_name, go_api_key=numero.go_api_key()
        )

        async def _run():
            async with driver as wa:
                return await wa.health()

        data = async_to_sync(_run)()
        texto = str(data)
        logado = ("'LoggedIn': True" in texto) or ('"LoggedIn":true' in texto) or ("'state': 'open'" in texto)
        detalhe = texto[:160]
    except Exception as exc:  # noqa: BLE001
        detalhe = f"{type(exc).__name__}: {exc}"[:160]

    if not logado and not forcar:
        return HttpResponse(
            _flash("instância ainda não está logada — pareie antes de ativar", "warn")
            + f'<div class="meta mono">{detalhe}</div>'
            + f'<div class="actions"><button class="danger" hx-post="/dashboard/app/{a.slug}/whatsapp/{number_slug}/activate" '
            'hx-vals=\'{"force":"1"}\' hx-target="#panel" hx-swap="innerHTML" '
            'hx-confirm="Ativar mesmo sem sessão? O app pode parar de enviar.">ativar mesmo assim</button></div>'
        )

    numero.is_default = True
    numero.connection_status = "open" if logado else "unknown"
    numero.save(update_fields=["is_default", "connection_status"])
    WhatsAppNumber.objects.filter(account=a).exclude(pk=numero.pk).update(is_default=False)
    return _render_account(
        request, a, _flash(f"'{numero.instance_name}' agora é a instância deste app")
    )


@csrf_exempt
def register_webhooks(request, slug: str):
    """Reaponta o webhook das duas Evolutions para o IP deste notify.

    O que estava registrado apontava para o hostname público, que o Caddy
    responde 404 desde o endurecimento — ou seja, status de entrega e mensagens
    recebidas nunca chegavam.
    """
    a = _account_or_404(slug)
    if a is None:
        return HttpResponse(status=404)
    from whatsapp import provisioning as wa

    linhas = []
    for numero in a.whatsapp_numbers.all():
        alvo = wa.webhook_url_for(numero.instance_name)
        try:
            wa.v2_set_webhook(numero.instance_name)
            linhas.append(f"v2/{numero.instance_name}: ok → {alvo}")
        except Exception as exc:  # noqa: BLE001
            linhas.append(f"v2/{numero.instance_name}: {type(exc).__name__}: {exc}"[:150])
        token = numero.go_api_key() or getattr(settings, "EVOLUTION_GO_API_KEY", "")
        try:
            wa.go_set_webhook(token, numero.instance_name)
            linhas.append(f"go/{numero.instance_name}: ok → {alvo}")
        except Exception as exc:  # noqa: BLE001
            linhas.append(f"go/{numero.instance_name}: {type(exc).__name__}: {exc}"[:150])
    corpo = "<br>".join(linhas) or "sem instâncias"
    return HttpResponse(f'<div class="meta mono">{corpo}</div>')


@csrf_exempt
def qr_code(request, slug: str):
    """QR para parear a instância — v2 primeiro, GO como alternativa.

    A ordem não é preferência estética: a Evolution v2 devolve o PNG pronto em
    `GET /instance/connect/{instance}`, enquanto a GO responde "no QR code
    available" para instância recém-criada. Tentar a GO primeiro colocaria a
    pessoa com o celular na mão diante de um erro.
    """
    a = _account_or_404(slug)
    if a is None:
        return HttpResponse(status=404)
    numero = _numero_alvo(a, request)
    if numero is None:
        return HttpResponse(_flash("sem número cadastrado", "err"))
    import httpx

    tentativas = []

    # ── Evolution v2 ────────────────────────────────────────────────────────
    base_v2 = (getattr(settings, "WHATSAPP_API_BASE_URL", "") or "").rstrip("/")
    key_v2 = getattr(settings, "WHATSAPP_GLOBAL_API_KEY", "")
    if base_v2:
        try:
            resp = httpx.get(
                f"{base_v2}/instance/connect/{numero.instance_name}",
                headers={"apikey": key_v2},
                timeout=25.0,
            )
            data = resp.json() if resp.status_code < 400 else {}
            imagem = str(data.get("base64") or "")
            codigo = str(data.get("pairingCode") or "")
            if imagem:
                if not imagem.startswith("data:"):
                    imagem = "data:image/png;base64," + imagem
                extra = (
                    f'<div class="meta">Ou digite o código <span class="mono" style="font-size:16px">{codigo}</span></div>'
                    if codigo
                    else ""
                )
                return HttpResponse(
                    f'<img src="{imagem}" alt="QR" style="width:260px;background:#fff;padding:8px;border-radius:8px">'
                    f'<div class="meta">Instância <span class="mono">{numero.instance_name}</span> · Evolution v2 · '
                    "WhatsApp → Aparelhos conectados → Conectar aparelho. O QR rotaciona a cada ~30s.</div>" + extra
                )
            tentativas.append(f"v2: sem base64 ({str(data)[:90]})")
        except Exception as exc:  # noqa: BLE001
            tentativas.append(f"v2: {type(exc).__name__}")

    # ── Evolution GO ────────────────────────────────────────────────────────
    token = numero.go_api_key() or getattr(settings, "EVOLUTION_GO_API_KEY", "")
    base_go = (getattr(settings, "EVOLUTION_GO_BASE_URL", "") or "").rstrip("/")
    if base_go and token:
        try:
            # Sem `immediate` aqui, de propósito: em 2026-07-29 um connect
            # imediato numa instância nova derrubou o cliente da GO inteiro e
            # todas as sessões caíram junto — inclusive a que atende o funil.
            # Reconectar é ato explícito, no botão "reconectar".
            resp = httpx.get(f"{base_go}/instance/qr", headers={"apikey": token}, timeout=20.0)
            data = resp.json() if resp.status_code < 400 else {}
            inner = data.get("data") if isinstance(data.get("data"), dict) else data
            imagem = str((inner or {}).get("qrcode") or (inner or {}).get("QRCode") or "")
            if imagem:
                if not imagem.startswith("data:"):
                    imagem = "data:image/png;base64," + imagem
                return HttpResponse(
                    f'<img src="{imagem}" alt="QR" style="width:260px;background:#fff;padding:8px;border-radius:8px">'
                    f'<div class="meta">Instância <span class="mono">{numero.instance_name}</span> · Evolution GO</div>'
                )
            tentativas.append(f"go: {str(data)[:90]}")
        except Exception as exc:  # noqa: BLE001
            tentativas.append(f"go: {type(exc).__name__}")

    return HttpResponse(
        _flash("nenhum provedor devolveu QR (a instância já pode estar logada)", "warn")
        + f'<div class="meta mono">{" · ".join(tentativas)}</div>'
    )


# ── conteúdo das mensagens ──────────────────────────────────────────────────

def notification_detail(request, slug: str, external_id: str):
    """O que foi realmente enviado — corpo, destino, erro e entrega."""
    a = _account_or_404(slug)
    if a is None:
        return HttpResponse(status=404)
    import uuid

    from django.db.models import Q

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
    a = _account_or_404(slug)
    if a is None:
        return HttpResponse(status=404)
    e = InboundEvent.objects.filter(account=a, external_id=external_id).first()
    if e is None:
        return HttpResponse("<p class='muted'>Mensagem não encontrada.</p>", status=404)
    import json as _json

    return render(
        request,
        "dashboard/_inbound_message.html",
        {"e": e, "bruto": _json.dumps(e.payload, ensure_ascii=False, indent=2)[:4000]},
    )


# ── diagnóstico de voz ──────────────────────────────────────────────────────

@csrf_exempt
def tts_probe(request, slug: str):
    """Sintetiza de verdade e conta quem respondeu — ou por que ninguém respondeu."""
    a = _account_or_404(slug)
    if a is None:
        return HttpResponse(status=404)
    from tts.client import probe

    resultado = probe(gender=_post(request, "gender") or None)
    linhas = []
    for t in resultado["tentativas"]:
        if t["ok"]:
            linhas.append(
                f'<div><span class="pill st-sent">ok</span> <span class="mono">{t["model"]}</span> '
                f'· voz <span class="mono">{t["voice"]}</span> · {t["bytes"]} bytes de áudio</div>'
            )
        else:
            linhas.append(
                f'<div><span class="pill st-failed">falhou</span> <span class="mono">{t["model"]}</span> '
                f'<span class="muted mono">{t["erro"]}</span></div>'
            )
    if not resultado["ok"]:
        linhas.append(
            '<p class="hint">Nenhum provedor de voz respondeu. Envios com <span class="mono">tts:true</span> '
            "continuam saindo como texto — o canal não morre, só perde o áudio.</p>"
        )
    return HttpResponse("".join(linhas))


@csrf_exempt
def reconnect_instance(request, slug: str):
    """Reconecta uma instância da GO que tem credencial salva.

    A GO **não reconecta sozinha no boot**: depois de reiniciar o container ela
    loga "Found 0 connected instances" e fica assim até alguém pedir. É
    `POST /instance/connect` com `immediate:true` que levanta a sessão de volta
    — e é por isso que este botão existe em vez de a reconexão ficar escondida
    dentro de outra ação: ele derruba e refaz o cliente, então precisa ser
    escolha de quem está olhando.
    """
    a = _account_or_404(slug)
    if a is None:
        return HttpResponse(status=404)
    numero = _numero_alvo(a, request)
    if numero is None:
        return HttpResponse(_flash("sem número cadastrado", "err"))
    import httpx

    token = numero.go_api_key() or getattr(settings, "EVOLUTION_GO_API_KEY", "")
    base = (getattr(settings, "EVOLUTION_GO_BASE_URL", "") or "").rstrip("/")
    if not base or not token:
        return HttpResponse(_flash("Evolution GO não configurada para este número", "err"))
    try:
        httpx.post(
            f"{base}/instance/connect",
            headers={"apikey": token},
            json={
                "webhookUrl": _webhook_url(numero.instance_name),
                "subscribe": ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE"],
                "immediate": True,
            },
            timeout=30.0,
        )
        import time

        time.sleep(4)
        estado = httpx.get(f"{base}/instance/status", headers={"apikey": token}, timeout=15.0).json()
    except Exception as exc:  # noqa: BLE001
        return HttpResponse(_flash(f"{type(exc).__name__}: {exc}"[:140], "err"))

    dados = estado.get("data") if isinstance(estado, dict) else {}
    logado = bool((dados or {}).get("LoggedIn"))
    numero.connection_status = "open" if logado else "down"
    numero.save(update_fields=["connection_status"])
    return HttpResponse(
        _flash(
            f"{numero.instance_name}: sessão de pé ({(dados or {}).get('Name') or 'sem nome'})"
            if logado
            else f"{numero.instance_name}: sem credencial salva — precisa parear",
            "ok" if logado else "warn",
        )
    )
