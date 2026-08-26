"""Watchdog — "está tudo ligado?" com auto-cura e alerta (Q1/Q2/Q3/K1/J3).

Roda como Schedule da Django-Q a cada N minutos (`notify_schedules` cria).
Cada tick:

1. checa os serviços (GO, mailcow, OmniRouter) + tamanho da fila;
2. **auto-heal** (K1): instância da GO com credencial e sem sessão recebe
   `POST /instance/connect immediate` — é exatamente o gesto que faltou no
   apagão de 17/08/2026, quando a GO marcou `connected=false` após um blip de
   rede e nunca mais tentou sozinha (o wuzapi não tem auto-retry para isso;
   a sessão fica íntegra, só ninguém aperta o botão). A checagem roda em todo
   tick; o cooldown (`WATCHDOG_HEAL_COOLDOWN_MIN`) só evita martelar a GO em
   loop curto;
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

SERVICES = ("evolution-go", "mailcow", "omnirouter", "queue")


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


def _check_and_heal_license(base: str) -> bool:
    """Verifica e recupera a licença do Evolution GO automaticamente."""
    admin_key = (
        getattr(settings, "EVOLUTION_GO_ADMIN_KEY", "")
        or getattr(settings, "GLOBAL_API_KEY", "")
        or "621dbeb7c33b74cda265687b1d5e8d9e3f9a97ddfe2cbffec439124d884163e3"
    )
    try:
        resp = httpx.get(f"{base}/license/status", timeout=5.0)
        status_code = getattr(resp, "status_code", None)
        if status_code == 200:
            data = resp.json() if hasattr(resp, "json") else {}
            if isinstance(data, dict) and data.get("status") in ("active", None):
                return True
        elif status_code == 503 or "LICENSE_REQUIRED" in getattr(resp, "text", ""):
            pass
        else:
            return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("watchdog.license_check_failed", error=str(exc))
        return True

    logger.warning("watchdog.license_inactive_triggering_heal")
    try:
        httpx.get(
            f"{base}/license/register",
            headers={"apikey": admin_key},
            timeout=8.0,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("watchdog.license_register_failed", error=str(exc))

    try:
        resp = httpx.get(f"{base}/license/status", timeout=5.0)
        return resp.status_code == 200 and resp.json().get("status") == "active"
    except Exception:  # noqa: BLE001
        return False


def _check_go(heal: bool = True, force_heal: bool = False) -> tuple[bool, str]:
    from channels.models import WhatsAppNumber

    base = (getattr(settings, "EVOLUTION_GO_BASE_URL", "") or "").rstrip("/")
    if not base:
        return False, "EVOLUTION_GO_BASE_URL não configurada"

    # Passo 1: Checar e auto-recuperar a licença
    license_ok = _check_and_heal_license(base)
    if not license_ok:
        return False, "licença inativa (503 LICENSE_REQUIRED) — auto-heal acionado"

    # Passo 2: Checar cada número cadastrado
    numbers = list(WhatsAppNumber.objects.all())
    default_key = getattr(settings, "EVOLUTION_GO_API_KEY", "")
    if not numbers and not default_key:
        return True, "Evolution GO online (nenhum número WhatsApp cadastrado)"

    targets: dict[str, str] = {}
    for num in numbers:
        tok = num.go_api_key()
        if tok:
            targets[num.instance_name] = tok
    if default_key and "default" not in targets:
        targets.setdefault("default", default_key)

    logadas, fora = [], []
    for nome, tok in targets.items():
        try:
            r = httpx.get(f"{base}/instance/status", headers={"apikey": tok}, timeout=8.0)
            d = r.json().get("data", {}) if getattr(r, "status_code", None) == 200 else {}
            if d.get("LoggedIn"):
                logadas.append(nome)
                WhatsAppNumber.objects.filter(instance_name=nome).exclude(connection_status="open").update(
                    connection_status="open", status_checked_at=timezone.now()
                )
            else:
                fora.append(nome)
                WhatsAppNumber.objects.filter(instance_name=nome, connection_status="open").update(
                    connection_status="close", status_checked_at=timezone.now()
                )
        except Exception:  # noqa: BLE001
            fora.append(nome)

    if heal and fora:
        _heal_go(base, {n: targets[n] for n in fora if n in targets}, force=force_heal)
        # Reavalia o estado após o auto-heal
        logadas, fora = [], []
        for nome, tok in targets.items():
            try:
                r = httpx.get(f"{base}/instance/status", headers={"apikey": tok}, timeout=5.0)
                d = r.json().get("data", {}) if getattr(r, "status_code", None) == 200 else {}
                if d.get("LoggedIn"):
                    logadas.append(nome)
                else:
                    fora.append(nome)
            except Exception:  # noqa: BLE001
                fora.append(nome)

    ok = bool(logadas)
    detail = f"logadas: {', '.join(logadas) or '-'} · sem sessão: {', '.join(fora) or '-'}"
    return ok, detail


def _heal_go(base: str, fora: dict[str, str], force: bool = False) -> bool:
    """K1 — reconecta instâncias da GO com credencial salva sem escanear QR Code.
    
    Fase 1: POST /instance/connect com webhooks configurados.
    Fase 2: Se permanecer desconectada (sessão zumbi na memória da GO), dispara
            POST /instance/forcereconnect/{instanceId} com Admin Key.
    """
    from datetime import timedelta
    from channels.models import WhatsAppNumber

    row = _status_row("evolution-go")
    cooldown = timedelta(minutes=int(getattr(settings, "WATCHDOG_HEAL_COOLDOWN_MIN", 10)))
    if not force and row.heal_attempted_at and timezone.now() - row.heal_attempted_at < cooldown:
        logger.info("watchdog.heal_cooldown", restantes_min=cooldown.total_seconds() // 60)
        return False
    row.heal_attempted_at = timezone.now()
    row.save(update_fields=["heal_attempted_at"])

    ext_url = getattr(settings, "EXTERNAL_URL", "").rstrip("/") or "http://notify-web:8000"
    admin_key = (
        getattr(settings, "EVOLUTION_GO_ADMIN_KEY", "")
        or getattr(settings, "GLOBAL_API_KEY", "")
        or "621dbeb7c33b74cda265687b1d5e8d9e3f9a97ddfe2cbffec439124d884163e3"
    )

    still_down: dict[str, str] = {}

    # Fase 1: connect padrão
    for nome, tok in fora.items():
        try:
            resp = httpx.post(
                f"{base}/instance/connect",
                headers={"apikey": tok},
                json={
                    "immediate": True,
                    "subscribe": ["MESSAGE", "READ_RECEIPT", "HISTORY_SYNC"],
                    "webhookUrl": f"{ext_url}/v1/webhook/evolution/{nome}",
                },
                timeout=15.0,
            )
            logger.info("watchdog.heal_go.connect", instance=nome, status_code=getattr(resp, "status_code", 200))
            r = httpx.get(f"{base}/instance/status", headers={"apikey": tok}, timeout=5.0)
            if getattr(r, "status_code", None) == 200 and r.json().get("data", {}).get("LoggedIn"):
                WhatsAppNumber.objects.filter(instance_name=nome).update(
                    connection_status="open", status_checked_at=timezone.now()
                )
            else:
                still_down[nome] = tok
        except Exception as exc:  # noqa: BLE001
            logger.warning("watchdog.heal_go_failed", instance=nome, error=type(exc).__name__)
            still_down[nome] = tok

    # Fase 2: Forçar reconexão administrativa se a GO travou o cliente em memória
    if still_down:
        instances_map: dict[str, dict] = {}
        try:
            resp_all = httpx.get(
                f"{base}/instance/all",
                headers={"apikey": admin_key},
                timeout=8.0,
            )
            if getattr(resp_all, "status_code", None) == 200:
                data = resp_all.json()
                items = data if isinstance(data, list) else data.get("data", [])
                if isinstance(items, list):
                    for item in items:
                        if isinstance(item, dict) and item.get("name"):
                            instances_map[item["name"]] = item
        except Exception as exc:  # noqa: BLE001
            logger.warning("watchdog.heal_go.fetch_all_failed", error=str(exc))

        for nome in list(still_down.keys()):
            tok = still_down[nome]
            inst_info = instances_map.get(nome)
            inst_id = inst_info.get("id") if inst_info else None
            jid_raw = (inst_info.get("jid") or "") if inst_info else ""
            phone_number = jid_raw.split("@", 1)[0].split(":", 1)[0] if jid_raw else ""

            if inst_id:
                try:
                    body = {"number": phone_number} if phone_number else {}
                    resp_frc = httpx.post(
                        f"{base}/instance/forcereconnect/{inst_id}",
                        headers={"apikey": admin_key},
                        json=body,
                        timeout=15.0,
                    )
                    logger.info(
                        "watchdog.heal_go.forcereconnect",
                        instance=nome,
                        status_code=getattr(resp_frc, "status_code", 200),
                    )
                    r = httpx.get(f"{base}/instance/status", headers={"apikey": tok}, timeout=5.0)
                    if getattr(r, "status_code", None) == 200 and r.json().get("data", {}).get("LoggedIn"):
                        WhatsAppNumber.objects.filter(instance_name=nome).update(
                            connection_status="open", status_checked_at=timezone.now()
                        )
                        still_down.pop(nome, None)
                except Exception as exc:  # noqa: BLE001
                    logger.warning("watchdog.heal_go.forcereconnect_failed", instance=nome, error=str(exc))

    return not bool(still_down)


def _check_mailcow() -> tuple[bool, str]:
    try:
        from mail.stalwart import get_client as get_stalwart_client
        with get_stalwart_client() as st:
            dominios = st.list_domains()
        return True, f"{len(dominios)} domínio(s) (Stalwart)"
    except Exception:
        pass

    try:
        from mail.mailcow import get_client as get_mailcow_client
        with get_mailcow_client() as mc:
            dominios = mc.list_domains()
        return True, f"{len(dominios)} domínio(s)"
    except Exception as exc:  # noqa: BLE001
        return False, f"{type(exc).__name__}: {exc}"[:120]


def _check_omnirouter() -> tuple[bool, str]:
    """3 tentativas: o gateway tem tarpit intermitente contra esta origem
    (medido em produção — ok/fora alternando em segundos). Uma falha isolada
    não pode virar alerta falso; três seguidas é queda de verdade."""
    import time as _time

    from ai.client import health

    ultima = ""
    for tentativa in range(3):
        h = health()
        if h.get("ok"):
            detail = h.get("detail") or f"{h.get('models', 0)} modelo(s)"
            if tentativa:
                detail += f" (respondeu na {tentativa + 1}ª tentativa)"
            return True, str(detail)[:200]
        ultima = str(h.get("detail", ""))[:180]
        _time.sleep(2)
    return False, f"{ultima} (3 tentativas)"


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

def tick(force_heal: bool = False) -> dict:
    """Um ciclo do watchdog. Devolve o retrato (também usado pelo dashboard)."""
    resultados = {}

    def _call_check_go():
        try:
            return _check_go(force_heal=force_heal)
        except TypeError:
            return _check_go()

    checks = {
        "evolution-go": _call_check_go,
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
