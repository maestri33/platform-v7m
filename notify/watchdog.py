"""Watchdog — "está tudo ligado?" com auto-cura e alerta (Q1/Q2/Q3/K1/J3).

Roda como Schedule da Django-Q a cada N minutos (`notify_schedules` cria).
Cada tick:

1. checa os 4 serviços (v2, GO, mailcow, OmniRouter) + tamanho da fila;
2. **auto-heal** (K1): instância da GO com credencial e sem sessão recebe
   `POST /instance/connect immediate` (com cooldown) — é exatamente o gesto
   que faltou no apagão de 2026-08-02, quando a GO reiniciou e ninguém
   reconectou; v2 `close` ganha `GET /instance/connect`;
3. transição ok↔fora dispara alerta ao admin (WhatsApp DIRETO pela instância
   default da GO + e-mail — sem passar pelo pipeline, para o alerta não
   depender do que está quebrado) e evento `service` nos webhooks das contas;
4. persiste tudo em `ServiceStatus` — o dashboard mostra este retrato.

O canário (Q3) é outra Schedule (diária): um envio REAL pro destino de
controle do Chefe pela conta default; falha → alerta.
"""

from __future__ import annotations

import httpx
import structlog
from django.conf import settings
from django.utils import timezone

logger = structlog.get_logger()

SERVICES = ("evolution-v2", "evolution-go", "mailcow", "omnirouter", "queue")


# ── helpers ─────────────────────────────────────────────────────────────────

def _status_row(name: str):
    from notify.models import ServiceStatus

    row, _ = ServiceStatus.objects.get_or_create(name=name)
    return row


def _set_status(name: str, ok: bool, detail: str) -> bool:
    """Grava o estado; devolve True se houve TRANSIÇÃO ok<->fora."""
    row = _status_row(name)
    changed = row.ok != ok or row.checked_at is None
    row.ok = ok
    row.detail = detail[:300]
    row.checked_at = timezone.now()
    if changed:
        row.changed_at = timezone.now()
    row.save()
    return changed and row.checked_at != row.changed_at or changed


# ── checagens ───────────────────────────────────────────────────────────────

def _check_v2() -> tuple[bool, str]:
    base = (getattr(settings, "WHATSAPP_API_BASE_URL", "") or "").rstrip("/")
    if not base:
        return False, "WHATSAPP_API_BASE_URL não configurada"
    try:
        r = httpx.get(
            f"{base}/instance/fetchInstances",
            headers={"apikey": getattr(settings, "WHATSAPP_GLOBAL_API_KEY", "")},
            timeout=8.0,
        )
        if r.status_code >= 400:
            return False, f"HTTP {r.status_code}"
        data = r.json()
        abertas = [i.get("name") for i in data if isinstance(i, dict) and i.get("connectionStatus") == "open"]
        return True, f"{len(data)} instância(s), {len(abertas)} com sessão: {', '.join(abertas[:5]) or '-'}"
    except Exception as exc:  # noqa: BLE001
        return False, type(exc).__name__


def _go_tokens() -> dict[str, str]:
    from channels.models import WhatsAppNumber

    tokens = {
        n.instance_name: n.go_api_key()
        for n in WhatsAppNumber.objects.exclude(go_token="")
    }
    default_key = getattr(settings, "EVOLUTION_GO_API_KEY", "")
    if default_key:
        tokens.setdefault("default", default_key)
    return {k: v for k, v in tokens.items() if v}


def _check_go(heal: bool = True) -> tuple[bool, str]:
    base = (getattr(settings, "EVOLUTION_GO_BASE_URL", "") or "").rstrip("/")
    if not base:
        return False, "EVOLUTION_GO_BASE_URL não configurada"
    tokens = _go_tokens()
    if not tokens:
        return False, "nenhum token de instância conhecido"
    logadas, fora = [], []
    for nome, tok in tokens.items():
        try:
            d = httpx.get(
                f"{base}/instance/status", headers={"apikey": tok}, timeout=8.0
            ).json().get("data", {})
            (logadas if d.get("LoggedIn") else fora).append(nome)
        except Exception:  # noqa: BLE001
            fora.append(nome)
    if heal and fora:
        _heal_go(base, {n: tokens[n] for n in fora})
    ok = bool(logadas)  # serviço "ok" = ao menos uma sessão viva; detalhe conta o resto
    return ok, f"logadas: {', '.join(logadas) or '-'} · sem sessão: {', '.join(fora) or '-'}"


def _heal_go(base: str, fora: dict[str, str]) -> None:
    """K1 — reconecta instâncias da GO com credencial salva (cooldown 10 min)."""
    from datetime import timedelta

    row = _status_row("evolution-go")
    cooldown = timedelta(minutes=int(getattr(settings, "WATCHDOG_HEAL_COOLDOWN_MIN", 10)))
    if row.heal_attempted_at and timezone.now() - row.heal_attempted_at < cooldown:
        return
    row.heal_attempted_at = timezone.now()
    row.save(update_fields=["heal_attempted_at"])
    for nome, tok in fora.items():
        try:
            httpx.post(
                f"{base}/instance/connect",
                headers={"apikey": tok},
                json={
                    "immediate": True,
                    "subscribe": ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE"],
                    "webhookUrl": f"{getattr(settings, 'EXTERNAL_URL', '').rstrip('/')}/v1/webhook/evolution/{nome}",
                },
                timeout=15.0,
            )
            logger.info("watchdog.heal_go", instance=nome)
        except Exception as exc:  # noqa: BLE001
            logger.warning("watchdog.heal_go_failed", instance=nome, error=type(exc).__name__)


def _check_mailcow() -> tuple[bool, str]:
    try:
        from mail.mailcow import MailcowNotConfigured, get_client

        try:
            with get_client() as mc:
                dominios = mc.list_domains()
            return True, f"{len(dominios)} domínio(s)"
        except MailcowNotConfigured:
            return False, "não configurado"
    except Exception as exc:  # noqa: BLE001
        return False, f"{type(exc).__name__}: {exc}"[:120]


def _check_omnirouter() -> tuple[bool, str]:
    from ai.client import health

    h = health()
    detail = h.get("detail") or (f"{h.get('models', 0)} modelo(s)" if h.get("ok") else "")
    return bool(h.get("ok")), str(detail)[:200]


def _check_queue() -> tuple[bool, str]:
    try:
        from django_q.models import OrmQ

        pendentes = OrmQ.objects.count()
        limite = int(getattr(settings, "WATCHDOG_QUEUE_ALERT", 50))
        return pendentes <= limite, f"{pendentes} task(s) na fila (alerta > {limite})"
    except Exception as exc:  # noqa: BLE001
        return False, type(exc).__name__


# ── alerta ao admin (canal direto, fora do pipeline) ────────────────────────

def _alert_admin(msg: str) -> None:
    """WhatsApp direto pela instância default da GO + e-mail da conta default.

    De propósito NÃO usa o pipeline: alerta de serviço caído não pode depender
    da fila/pipeline que pode ser a própria coisa quebrada.
    """
    phone = getattr(settings, "ADMIN_ALERT_PHONE", "")
    if phone:
        try:
            from asgiref.sync import async_to_sync

            from whatsapp.evolution_go import EvolutionGoDriver

            async def _send():
                async with EvolutionGoDriver() as go:  # key da default via settings
                    await go.send_text(phone, f"🛎️ notify watchdog\n{msg}")

            async_to_sync(_send)()
        except Exception as exc:  # noqa: BLE001
            logger.warning("watchdog.alert_whatsapp_failed", error=type(exc).__name__)

    email = getattr(settings, "ADMIN_ALERT_EMAIL", "")
    if email:
        try:
            from asgiref.sync import async_to_sync

            from accounts.models import Account
            from channels.models import MailIdentity
            from mail.client import get_client_from_identity

            slug = getattr(settings, "NOTIFY_DEFAULT_ACCOUNT_SLUG", "default")
            identity = MailIdentity.objects.filter(
                account__slug=slug, is_default=True
            ).first() or MailIdentity.objects.filter(account__slug=slug).first()
            if identity:
                client = get_client_from_identity(identity)
                async_to_sync(client.send_email)(
                    email, "notify watchdog", html_body=f"<pre>{msg}</pre>", plain_body=msg
                )
        except Exception as exc:  # noqa: BLE001
            logger.warning("watchdog.alert_email_failed", error=type(exc).__name__)


def _push_service_event(name: str, ok: bool, detail: str) -> None:
    """Evento `service` no webhook de cada conta ativa que assina status."""
    from accounts.models import Account
    from notify import outbound

    payload = {
        "service": name,
        "ok": ok,
        "detail": detail,
        "at": timezone.now().isoformat(),
    }
    for account in Account.objects.filter(is_active=True):
        outbound._enqueue(account.id, "status", {"stage": "service", **payload})


# ── entradas públicas (Schedules) ───────────────────────────────────────────

def tick() -> dict:
    """Um ciclo do watchdog. Devolve o retrato (também usado pelo dashboard)."""
    resultados = {}
    checks = {
        "evolution-v2": _check_v2,
        "evolution-go": _check_go,
        "mailcow": _check_mailcow,
        "omnirouter": _check_omnirouter,
        "queue": _check_queue,
    }
    for name, fn in checks.items():
        try:
            ok, detail = fn()
        except Exception as exc:  # noqa: BLE001 — um check nunca derruba o tick
            ok, detail = False, f"check quebrou: {type(exc).__name__}"
        row = _status_row(name)
        transicao = row.checked_at is not None and row.ok != ok
        _set_status(name, ok, detail)
        resultados[name] = {"ok": ok, "detail": detail}
        if transicao:
            estado = "voltou ✅" if ok else "CAIU ❌"
            msg = f"{name} {estado}\n{detail}"
            logger.warning("watchdog.transition", service=name, ok=ok)
            _alert_admin(msg)
            _push_service_event(name, ok, detail)
    logger.info("watchdog.tick", **{k: v["ok"] for k, v in resultados.items()})
    return resultados


def canary() -> str | None:
    """Q3 — envio REAL agendado pro destino de controle. Falhou → alerta."""
    if not getattr(settings, "CANARY_ENABLED", True):
        return None
    phone = getattr(settings, "CANARY_PHONE", "")
    email = getattr(settings, "CANARY_EMAIL", "")
    if not phone and not email:
        _set_status("canary", False, "CANARY_PHONE/CANARY_EMAIL não configurados")
        return None

    from accounts.models import Account
    from notify.interface.send import send
    from notify.models import Notification

    slug = getattr(settings, "NOTIFY_DEFAULT_ACCOUNT_SLUG", "default")
    account = Account.objects.filter(slug=slug, is_active=True).first()
    if account is None:
        _set_status("canary", False, f"conta default '{slug}' indisponível")
        _alert_admin(f"canário não rodou: conta default '{slug}' indisponível")
        return None

    stamp = timezone.now().strftime("%d/%m %H:%M")
    try:
        ext = send(
            account=account,
            text=f"🐤 canário do notify — {stamp}. Cadeia ponta a ponta validada.",
            caller="watchdog.canary",
            phone=phone or None,
            email=email or None,
            whatsapp=bool(phone),
            email_channel=bool(email),
            run_sync=True,
        )
    except Exception as exc:  # noqa: BLE001
        _set_status("canary", False, f"send falhou: {type(exc).__name__}: {exc}"[:200])
        _alert_admin(f"🐤 CANÁRIO FALHOU (send): {type(exc).__name__}: {exc}"[:300])
        return None

    n = Notification.objects.filter(account=account, external_id=ext).first()
    problemas = []
    if phone and n.whatsapp_status != "sent":
        problemas.append(f"whatsapp={n.whatsapp_status} ({(n.whatsapp_error or '')[:80]})")
    if email and n.email_status != "sent":
        problemas.append(f"email={n.email_status} ({(n.email_error or '')[:80]})")
    if problemas:
        _set_status("canary", False, "; ".join(problemas))
        _alert_admin("🐤 CANÁRIO FALHOU: " + "; ".join(problemas))
    else:
        _set_status("canary", True, f"entregue {stamp} (wa+email)" if phone and email else f"entregue {stamp}")
    return ext
