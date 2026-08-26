"""Despacho do notify-server (Django-Q) — porte do monólito com multi-tenant.

G16 — 3 fases: CLAIM (select_for_update → SENDING) → ENVIO (fora da transação) → RESULTADO.
Config de cada canal vem das rows da conta (WhatsAppNumber, MailIdentity).
"""

from __future__ import annotations

import re
from urllib.parse import urljoin

import structlog
from asgiref.sync import async_to_sync
from django.conf import settings
from django.db import transaction

from notify import sanitize
from notify.models import (
    STATUS_FAILED,
    STATUS_PENDING,
    STATUS_SENDING,
    STATUS_SENT,
    STATUS_SKIPPED,
    Notification,
)

logger = structlog.get_logger()


class TransientDispatchError(Exception):
    """Falha transitória de canal — levantada para a Django-Q re-tentar.

    O estado já foi salvo (canal de volta a `pending`) antes do raise; a
    exceção existe só para o cluster reagendar a task (retry/max_attempts do
    Q_CLUSTER). Erro de negócio nunca vira isto.
    """


def _is_transient(exc: Exception) -> bool:
    """Erro que vale re-tentar: infraestrutura fora, não resposta de negócio."""
    import httpx

    from whatsapp.errors import WhatsAppSessionDown

    if isinstance(exc, WhatsAppSessionDown):
        return True
    if isinstance(exc, (httpx.TimeoutException, httpx.TransportError)):
        return True
    try:
        import smtplib

        from mail.client import MailError

        if isinstance(exc, MailError):
            # destinatário recusado é resposta final; falhas de rede/SMTP/login são transitórias
            if exc.recipients_refused:
                return False
            msg = str(exc).lower()
            return (
                "conexão" in msg
                or "smtp falhou" in msg
                or "timeout" in msg
                or "timed out" in msg
                or "disconnected" in msg
                or isinstance(getattr(exc, "__cause__", None), (OSError, smtplib.SMTPException))
            )
    except ImportError:  # pragma: no cover
        pass
    return isinstance(exc, OSError)


def _max_attempts() -> int:
    return int(getattr(settings, "Q_CLUSTER", {}).get("max_attempts", 3))


def _to_lan(url: str) -> str:
    """URL pública → LAN (Evolution busca mídia pelo IP interno)."""
    lan = settings.MEDIA_LAN_BASE
    ext = settings.EXTERNAL_URL
    if lan and ext and url.startswith(ext):
        return lan + url[len(ext):]
    return url


def _get_whatsapp_driver(notif: Notification, *, feature: str | None = None):
    """Driver de WhatsApp da row WhatsAppNumber da notificação (com fallback).

    Passa a ROW inteira, não só o `instance_name`: é dela que saem o provedor
    preferido, o fallback e o token da instância na Evolution GO. `feature`
    reordena a cadeia pelo mapa de capacidades (ex.: voice_note → GO primeiro).
    """
    from channels.models import WhatsAppNumber
    from whatsapp.factory import get_driver

    if notif.whatsapp_number_id:
        wn = notif.whatsapp_number
        if wn and wn.connection_status == "open":
            return get_driver(wn, feature=feature)

    open_wn = (
        WhatsAppNumber.objects.filter(account=notif.account, connection_status="open").first()
        or WhatsAppNumber.objects.filter(connection_status="open").first()
    )
    if open_wn:
        return get_driver(open_wn, feature=feature)
    if notif.whatsapp_number_id and notif.whatsapp_number:
        return get_driver(notif.whatsapp_number, feature=feature)
    return get_driver(feature=feature)


def _get_mail_client(notif: Notification):
    """Constrói MailClient com o remetente coerente com a marca do envelope."""
    from channels.models import MailIdentity
    from mail.client import get_client_from_identity

    identity = (
        MailIdentity.objects.filter(account=notif.account, is_default=True).first()
        or MailIdentity.objects.filter(account=notif.account).first()
    )
    if identity is None:
        return None
    # A marca do envelope é da CONTA: o shell de e-mail dela (se houver) manda,
    # senão vale o from_name da própria identidade. O `if` por slug de arquivo
    # que existia aqui embutia duas marcas no código do despacho.
    from mail import templates as mail_templates

    shell = mail_templates.shell_for_account(notif.account)
    from_name = (shell.brand_name if shell and shell.brand_name else "") or identity.from_name
    return get_client_from_identity(identity, from_name=from_name)


def dispatch(notification_id: int, sync: bool = False) -> None:
    """Envia a Notification pelos canais pendentes (G16 — 3 fases).

    `sync=True` (run_sync da API): falha vira status na resposta, nunca raise.
    Assíncrono: falha TRANSITÓRIA volta o canal a `pending` e levanta
    `TransientDispatchError` para a Django-Q reagendar (até max_attempts do
    Q_CLUSTER).
    """
    # ── FASE 1: CLAIM ────────────────────────────────────────────────────────
    with transaction.atomic():
        notif = (
            Notification.objects.select_for_update(of=("self",))
            .select_related("account", "whatsapp_number")
            .filter(id=notification_id)
            .first()
        )
        if notif is None:
            logger.warning("notify.dispatch_missing", id=notification_id)
            return

        # J1: correlation na fila — toda linha deste dispatch carrega o envio.
        import structlog as _st

        _st.contextvars.bind_contextvars(
            external_id=str(notif.external_id), account=notif.account.slug
        )

        notif.attempts += 1

        # TEST_MODE: dry-run
        if settings.TEST_MODE:
            if notif.whatsapp_status == STATUS_PENDING:
                notif.whatsapp_status = STATUS_SENT
            if notif.email_status == STATUS_PENDING:
                notif.email_status = STATUS_SENT
            if notif.want_sms and notif.sms_status == STATUS_PENDING:
                notif.sms_status = STATUS_SENT
            notif.save()
            logger.info("notify.dispatched_dry_run", external_id=str(notif.external_id), caller=notif.caller)
            return

        from datetime import timedelta
        from django.utils import timezone

        stuck_threshold = timezone.now() - timedelta(minutes=3)
        is_stuck = bool(notif.updated_at and notif.updated_at < stuck_threshold)

        wa_pending = notif.whatsapp_status == STATUS_PENDING
        wa_recover = notif.whatsapp_status == STATUS_SENDING and is_stuck
        email_pending = notif.email_status == STATUS_PENDING
        email_recover = notif.email_status == STATUS_SENDING and is_stuck
        # Canais plugáveis (registry). SMS: quando houver provedor registrado e
        # a Notification nascer com sms_status=pending, sai por aqui — sem
        # mexer em mais nada deste arquivo.
        sms_pending = notif.want_sms and notif.sms_status == STATUS_PENDING

        do_whatsapp = wa_pending or wa_recover
        do_email = email_pending or email_recover
        do_sms = sms_pending
        if wa_recover or email_recover:
            logger.warning(
                "notify.recovering_as_text",
                external_id=str(notif.external_id),
                whatsapp=wa_recover,
                email=email_recover,
            )

        if not (do_whatsapp or do_email or do_sms):
            notif.save(update_fields=["attempts"])
            return

        if do_whatsapp:
            notif.whatsapp_status = STATUS_SENDING
        if do_email:
            notif.email_status = STATUS_SENDING
        if do_sms:
            notif.sms_status = STATUS_SENDING
        notif.save()

    # ── FASE 1.4: Áudio da origem -> Transcrição STT via OmniRouter (fail-open) ─
    is_audio_media = bool(
        notif.media_url
        and (
            notif.media_type == "audio"
            or str(notif.media_url).lower().split("?")[0].endswith((".mp3", ".ogg", ".wav", ".m4a", ".opus", ".aac"))
        )
    )
    if is_audio_media and (not getattr(settings, "TEST_MODE", False)):
        try:
            from ai.client import transcribe
            audio_bytes = b""
            if notif.media_url.startswith(("http://", "https://")):
                import httpx
                resp = httpx.get(notif.media_url, timeout=15.0)
                if resp.status_code == 200:
                    audio_bytes = resp.content
            else:
                import os
                abs_path = os.path.join(settings.MEDIA_ROOT, notif.media_url.lstrip("/"))
                if os.path.isfile(abs_path):
                    with open(abs_path, "rb") as f:
                        audio_bytes = f.read()

            if audio_bytes:
                fname = notif.media_url.rsplit("/", 1)[-1].split("?")[0] or "audio.mp3"
                transcribed = transcribe(audio_bytes, filename=fname)
                if transcribed:
                    notif._wa_text = transcribed
                    notif._email_text = transcribed
                    if not notif.text or notif.text == notif.media_url:
                        notif.text = transcribed
                    logger.info("notify.audio_transcribed", external_id=str(notif.external_id), chars=len(transcribed))
        except Exception as exc:  # noqa: BLE001
            logger.warning("notify.transcribe_failed_failopen", error=str(exc)[:160])

    # ── FASE 1.5: IA adapta o conteúdo por canal (fail-open) ────────────────
    # Fora da transação e ANTES dos senders. Falha de IA nunca segura envio:
    # adapt() devolve o original quando o OmniRouter não ajudar. Os textos
    # adaptados viajam em atributos efêmeros (_wa_text/_email_text) — o
    # notif.text persistido continua sendo o que o app mandou.
    from ai import adapt as ai_adapt

    if (do_whatsapp or do_email) and ai_adapt.enabled_for(notif.account):
        text_to_adapt = getattr(notif, "_email_text", "") or notif.text
        canais = [c for c, on in (("whatsapp", do_whatsapp), ("email", do_email)) if on]
        adapted = ai_adapt.adapt(text_to_adapt, channels=canais, title=notif.title or "")
        if adapted["adapted"]:
            if not is_audio_media:
                notif._wa_text = adapted["whatsapp"]
            notif._email_text = adapted["email"]
            notif._ai_subject = adapted["subject"]
            logger.info(
                "notify.ai_adapted",
                external_id=str(notif.external_id),
                channels=canais,
            )

    # ── FASE 1.6: cadência anti-bloqueio por conta (K3/L3) ──────────────────
    # Conta que passou do teto por minuto tem o canal devolvido pra fila (o
    # retry transitório reagenda) — protege o número de banimento e a
    # reputação do IP de e-mail. Jitter entre envios de WhatsApp idem.
    def _cadence_exceeded(channel: str, limit: int) -> bool:
        if not limit:
            return False
        from datetime import timedelta

        from django.utils import timezone

        janela = timezone.now() - timedelta(seconds=60)
        enviados = (
            Notification.objects.filter(
                account=notif.account, updated_at__gte=janela, **{f"{channel}_status": STATUS_SENT}
            )
            .exclude(pk=notif.pk)
            .count()
        )
        return enviados >= limit

    if do_whatsapp and _cadence_exceeded(
        "whatsapp", int(getattr(settings, "WA_RATE_PER_MIN_ACCOUNT", 0))
    ):
        notif.whatsapp_status = STATUS_FAILED
        notif.whatsapp_error = "cadência: teto de envios/min da conta — reagendado"
        notif._transient_wa = not sync
        do_whatsapp = False
        logger.info("notify.cadence_hold", external_id=str(notif.external_id), channel="whatsapp")
    if do_email and _cadence_exceeded(
        "email", int(getattr(settings, "MAIL_RATE_PER_MIN_ACCOUNT", 0))
    ):
        notif.email_status = STATUS_FAILED
        notif.email_error = "cadência: teto de envios/min da conta — reagendado"
        notif._transient_email = not sync
        do_email = False
        logger.info("notify.cadence_hold", external_id=str(notif.external_id), channel="email")

    # ── FASE 2: ENVIO (fora da transação) ────────────────────────────────────
    # E6: canais presentes disparam em PARALELO — WhatsApp e e-mail escrevem
    # campos disjuntos da mesma Notification, e o save é da FASE 3 (thread
    # principal). Cada job fecha a própria conexão de DB no fim. Falha num
    # canal já é isolada pelos try/except internos de cada sender.
    def _job_whatsapp() -> None:
        try:
            # Jitter anti-bloqueio (K3): espaça envios consecutivos do mesmo
            # número. Só no caminho assíncrono — teste do painel não espera.
            jitter = float(getattr(settings, "WA_JITTER_MAX_S", 0))
            if jitter and not sync:
                import random
                import time as _time

                _time.sleep(random.uniform(0, jitter))
            if wa_recover:
                _send_whatsapp_text(notif)
            elif (notif.extra or {}).get("poll"):
                _send_whatsapp_poll(notif)
            elif (notif.extra or {}).get("location"):
                _send_whatsapp_location(notif)
            elif (notif.extra or {}).get("contact"):
                _send_whatsapp_contact(notif)
            elif (notif.extra or {}).get("carousel"):
                _send_whatsapp_carousel(notif)
            elif (notif.extra or {}).get("pix"):
                _send_whatsapp_pix(notif)
            elif (notif.extra or {}).get("qr_code"):
                _send_whatsapp_qr(notif, command="qr_code")
            elif notif.media_url:
                _send_whatsapp_media(notif)
            else:
                _send_whatsapp_text(notif)
        finally:
            from django.db import close_old_connections

            close_old_connections()

    def _job_email() -> None:
        try:
            _send_email(notif)
        finally:
            from django.db import close_old_connections

            close_old_connections()

    def _job_sms() -> None:
        try:
            from notify import channels_registry

            channels_registry.send("sms", notif)
        finally:
            from django.db import close_old_connections

            close_old_connections()

    jobs = []
    if do_whatsapp:
        jobs.append(_job_whatsapp)
    if do_email:
        jobs.append(_job_email)
    if do_sms:
        jobs.append(_job_sms)

    if len(jobs) <= 1:
        for job in jobs:
            job()
    else:
        from concurrent.futures import ThreadPoolExecutor

        with ThreadPoolExecutor(max_workers=len(jobs)) as pool:
            futures = [pool.submit(job) for job in jobs]
        for future in futures:
            exc = future.exception()
            if exc is not None:  # senders capturam tudo; isto é cinto de segurança
                logger.warning(
                    "notify.parallel_job_error",
                    external_id=str(notif.external_id),
                    error=f"{type(exc).__name__}: {exc}"[:200],
                )

    # ── FASE 3: RESULTADO ────────────────────────────────────────────────────
    # Falha transitória (sessão/SMTP/timeout) volta a `pending` para a Django-Q
    # re-tentar — mas só no caminho assíncrono e enquanto houver attempts.
    retry_channels: list[str] = []
    if not sync and notif.attempts < _max_attempts():
        if notif.whatsapp_status == STATUS_FAILED and getattr(notif, "_transient_wa", False):
            notif.whatsapp_status = STATUS_PENDING
            retry_channels.append("whatsapp")
        if notif.email_status == STATUS_FAILED and getattr(notif, "_transient_email", False):
            notif.email_status = STATUS_PENDING
            retry_channels.append("email")

    with transaction.atomic():
        notif.save(
            update_fields=[
                "whatsapp_status",
                "whatsapp_error",
                "email_status",
                "email_error",
                "sms_status",
                "sms_error",
                "driver_used",
                "driver_reason",
                "provider_message_id",
                "delivery_status",
                "attempts",
                "extra",
                "updated_at",
            ]
        )
        from notify import outbound

        transaction.on_commit(lambda: outbound.push_status(notif, stage="dispatched"))
        logger.info(
            "notify.dispatched",
            external_id=str(notif.external_id),
            caller=notif.caller,
            whatsapp=notif.whatsapp_status,
            email=notif.email_status,
            attempts=notif.attempts,
            retry=retry_channels or None,
        )

    if retry_channels:
        raise TransientDispatchError(
            f"canais {retry_channels} com falha transitória — "
            f"tentativa {notif.attempts}/{_max_attempts()}, Django-Q reagenda"
        )


def _record_provider(notif: Notification, driver, result) -> None:
    """Guarda o id da mensagem e por qual provedor ela saiu.

    Sem o id, o `MESSAGES_UPDATE` que chega depois não sabe qual linha promover
    para `delivered`/`read`; sem o driver, ninguém descobre que a entrega caiu no
    fallback.
    """
    from whatsapp.ids import extract_message_id

    notif.driver_used = getattr(driver, "name", "") or notif.driver_used
    notif.driver_reason = getattr(driver, "last_reason", "") or ""
    msg_id = extract_message_id(result)
    if msg_id:
        notif.provider_message_id = msg_id
    if not notif.delivery_status:
        notif.delivery_status = "sent"


def _whatsapp_body(notif: Notification) -> str:
    body = sanitize.for_whatsapp(getattr(notif, "_wa_text", "") or notif.text)
    if notif.title:
        return f"*{notif.title}*\n\n{body}"
    return body


def _send_whatsapp_text(notif: Notification) -> None:
    driver = _get_whatsapp_driver(notif)  # fora da coroutine — FK load é ORM síncrono

    async def _run():
        async with driver as wa:
            number = await wa.resolve_br_number(notif.recipient_phone)
            return await wa.send_text(number, _whatsapp_body(notif))

    try:
        _record_provider(notif, driver, async_to_sync(_run)())
        notif.whatsapp_status = STATUS_SENT
    except Exception as exc:
        notif.whatsapp_status = STATUS_FAILED
        notif.whatsapp_error = f"{type(exc).__name__}: {exc}"
        notif._transient_wa = _is_transient(exc)
        logger.warning("notify.whatsapp_failed", external_id=str(notif.external_id), error=str(exc)[:200])


def _send_whatsapp_media(notif: Notification) -> None:
    driver = _get_whatsapp_driver(notif)  # fora da coroutine — FK load é ORM síncrono

    async def _run():
        async with driver as wa:
            number = await wa.resolve_br_number(notif.recipient_phone)
            wa_url = _to_lan(notif.media_url)
            return await wa.send_media(number, wa_url, notif.media_type or "document", caption=_whatsapp_body(notif))

    try:
        _record_provider(notif, driver, async_to_sync(_run)())
        notif.whatsapp_status = STATUS_SENT
    except Exception as exc:
        notif.whatsapp_status = STATUS_FAILED
        notif.whatsapp_error = f"{type(exc).__name__}: {exc}"
        notif._transient_wa = _is_transient(exc)
        logger.warning("notify.whatsapp_failed", external_id=str(notif.external_id), error=str(exc)[:200])


def _send_whatsapp_poll(notif: Notification) -> None:
    """Enquete clicável — recurso GO-first (B6, testado em produção).

    Sem GO utilizável na cadeia (ou driver sem `send_poll`), degrada para texto
    com as opções numeradas — entrega degradada honesta, nunca silêncio.
    """
    poll = (notif.extra or {}).get("poll") or {}
    question = str(poll.get("question") or notif.text)
    options = [str(o) for o in (poll.get("options") or [])][:12]
    if not options:
        _send_whatsapp_text(notif)
        return

    driver = _get_whatsapp_driver(notif, feature="poll")

    async def _run():
        async with driver as wa:
            number = await wa.resolve_br_number(notif.recipient_phone)
            return await wa.send_poll(
                number, question, options,
                selectable_count=int(poll.get("selectable_count") or 1),
            )

    try:
        _record_provider(notif, driver, async_to_sync(_run)())
        notif.whatsapp_status = STATUS_SENT
    except Exception as exc:
        logger.warning(
            "notify.poll_degraded_to_text",
            external_id=str(notif.external_id),
            error=f"{type(exc).__name__}: {exc}"[:160],
        )
        numeradas = "\n".join(f"{i+1}. {o}" for i, o in enumerate(options))
        notif._wa_text = f"{question}\n\n{numeradas}\n\nResponda com o número da opção."
        _send_whatsapp_text(notif)


def _send_whatsapp_pix(notif: Notification) -> None:
    """Envio de Pix — se tiver chave direta, envia botão nativo; se tiver payload EMV, gera QR Code."""
    pix = (notif.extra or {}).get("pix") or {}
    key = str(pix.get("key") or "").strip()
    key_type = str(pix.get("key_type") or "").strip()

    if key and key_type:
        driver = _get_whatsapp_driver(notif, feature="pix_button")
        title = str(notif.title or pix.get("label") or "Pagamento via Pix").strip()
        description = _whatsapp_body(notif)
        footer = str(pix.get("label") or getattr(notif.account, "name", "Notify")).strip()
        merchant_name = str(pix.get("name") or getattr(notif.account, "name", "Beneficiário")).strip()
        currency = str(pix.get("currency") or "BRL").strip()

        async def _run():
            async with driver as wa:
                number = await wa.resolve_br_number(notif.recipient_phone)
                return await wa.send_pix_button(
                    number,
                    title,
                    description,
                    footer,
                    name=merchant_name,
                    key_type=key_type,
                    key=key,
                    currency=currency,
                )

        try:
            _record_provider(notif, driver, async_to_sync(_run)())
            notif.whatsapp_status = STATUS_SENT
            return
        except Exception as exc:
            logger.warning(
                "notify.pix_button_degraded",
                external_id=str(notif.external_id),
                error=f"{type(exc).__name__}: {exc}"[:160],
            )
            if pix.get("payload"):
                _send_whatsapp_qr(notif, command="pix")
                return
            notif._wa_text = f"*{title}*\n\n{description}\n\nChave Pix ({key_type.upper()}): {key}"
            _send_whatsapp_text(notif)
            return

    # Apenas payload EMV -> gera QR Code imagem
    _send_whatsapp_qr(notif, command="pix")


def _send_whatsapp_location(notif: Notification) -> None:
    """Envia localização interativa / mapa com fallback para texto + Google Maps."""
    loc = (notif.extra or {}).get("location") or {}
    try:
        lat = float(loc.get("latitude"))
        lng = float(loc.get("longitude"))
    except (ValueError, TypeError):
        _send_whatsapp_text(notif)
        return

    name = str(loc.get("name") or notif.title or "Localização").strip()
    address = str(loc.get("address") or name).strip()
    driver = _get_whatsapp_driver(notif, feature="location")

    async def _run():
        async with driver as wa:
            number = await wa.resolve_br_number(notif.recipient_phone)
            return await wa.send_location(number, lat, lng, name=name, address=address)

    try:
        _record_provider(notif, driver, async_to_sync(_run)())
        notif.whatsapp_status = STATUS_SENT
    except Exception as exc:
        logger.warning(
            "notify.location_degraded_to_text",
            external_id=str(notif.external_id),
            error=f"{type(exc).__name__}: {exc}"[:160],
        )
        maps_link = f"https://maps.google.com/?q={lat},{lng}"
        notif._wa_text = f"📍 *{name}*\n{address}\n\nVer no mapa: {maps_link}"
        _send_whatsapp_text(notif)


def _send_whatsapp_contact(notif: Notification) -> None:
    """Envia contato vCard nativo com fallback para texto formatado."""
    contact = (notif.extra or {}).get("contact") or {}
    full_name = str(contact.get("full_name") or "").strip()
    phone = str(contact.get("phone") or "").strip()
    org = str(contact.get("organization") or "").strip()

    if not full_name or not phone:
        _send_whatsapp_text(notif)
        return

    driver = _get_whatsapp_driver(notif, feature="contact")

    async def _run():
        async with driver as wa:
            number = await wa.resolve_br_number(notif.recipient_phone)
            return await wa.send_contact(number, full_name, phone, organization=org)

    try:
        _record_provider(notif, driver, async_to_sync(_run)())
        notif.whatsapp_status = STATUS_SENT
    except Exception as exc:
        logger.warning(
            "notify.contact_degraded_to_text",
            external_id=str(notif.external_id),
            error=f"{type(exc).__name__}: {exc}"[:160],
        )
        lines = [f"👤 *{full_name}*", f"📞 {phone}"]
        if org:
            lines.append(f"🏢 {org}")
        notif._wa_text = "\n".join(lines)
        _send_whatsapp_text(notif)


def _send_whatsapp_carousel(notif: Notification) -> None:
    """Envia carrossel interativo deslizante com fallback para texto formatado."""
    carousel = (notif.extra or {}).get("carousel") or {}
    cards = carousel.get("cards") or []
    if not cards:
        _send_whatsapp_text(notif)
        return

    formatted_cards = []
    for card in cards:
        buttons = []
        for btn in card.get("buttons") or []:
            b_type = str(btn.get("type") or "URL").upper()
            b_text = str(btn.get("display_text") or "")
            b_id = btn.get("url") or btn.get("phone_number") or btn.get("id") or btn.get("copy_code") or ""
            buttons.append(
                {
                    "type": b_type,
                    "displayText": b_text,
                    "id": b_id,
                    "copyCode": btn.get("copy_code") or "",
                }
            )
        formatted_cards.append(
            {
                "header": {
                    "title": card.get("title") or "",
                    "subtitle": card.get("subtitle") or "",
                    "imageUrl": card.get("image_url") or "",
                },
                "body": {"text": card.get("text") or ""},
                "buttons": buttons or None,
            }
        )

    driver = _get_whatsapp_driver(notif, feature="carousel")
    body = str(carousel.get("body") or notif.text or "").strip()
    footer = str(carousel.get("footer") or getattr(notif.account, "name", "Notify")).strip()

    async def _run():
        async with driver as wa:
            number = await wa.resolve_br_number(notif.recipient_phone)
            return await wa.send_carousel(number, formatted_cards, body=body, footer=footer)

    try:
        _record_provider(notif, driver, async_to_sync(_run)())
        notif.whatsapp_status = STATUS_SENT
    except Exception as exc:
        logger.warning(
            "notify.carousel_degraded_to_text",
            external_id=str(notif.external_id),
            error=f"{type(exc).__name__}: {exc}"[:160],
        )
        card_blocks = []
        for i, c in enumerate(cards, 1):
            title = c.get("title") or f"Item {i}"
            text = c.get("text") or ""
            btn_links = [
                f"👉 {b.get('display_text')}: {b.get('url') or b.get('copy_code') or b.get('id')}"
                for b in (c.get("buttons") or [])
                if b.get("display_text")
            ]
            block = f"*{title}*\n{text}"
            if btn_links:
                block += "\n" + "\n".join(btn_links)
            card_blocks.append(block)

        notif._wa_text = (f"{body}\n\n" if body else "") + "\n\n---\n\n".join(card_blocks)
        _send_whatsapp_text(notif)


def _send_whatsapp_qr(notif: Notification, *, command: str) -> None:
    """Gera e envia QR genérico ou Pix sem depender de API externa."""
    from notify.qr import build_qr_media_url

    options = (notif.extra or {}).get(command) or {}
    if command == "pix":
        data = str(options.get("payload") or "").strip()
        label = str(options.get("label") or "Pagamento via Pix").strip()
        caption = f"{label}\n\nPix copia-e-cola:\n{data}"
    else:
        data = str(options.get("data") or "").strip()
        caption = str(options.get("caption") or notif.text).strip()

    try:
        notif.media_url = build_qr_media_url(notif.external_id, data)
        notif.media_type = "image"
        notif._wa_text = caption
        _send_whatsapp_media(notif)
    except Exception as exc:
        notif.whatsapp_status = STATUS_FAILED
        notif.whatsapp_error = f"{type(exc).__name__}: {exc}"
        logger.warning(
            "notify.qr_failed",
            external_id=str(notif.external_id),
            command=command,
            error=str(exc)[:200],
        )


def _subject_from_body(text: str) -> str:
    """Assunto derivado do corpo quando o template não define subject/title."""
    if not text:
        return ""
    line = next((ln.strip() for ln in text.splitlines() if ln.strip()), "")
    line = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", line)
    line = re.sub(r"[*_`~]", "", line)
    line = re.sub(r"^[\wÀ-ÿ'.\- ]{1,30}?,\s+", "", line, count=1)
    m = re.match(r"(.+?[.!?])(?:\s|$)", line)
    sent = m.group(1) if m and len(m.group(1)) >= 12 else line
    sent = sent.strip().rstrip(".!?")
    if not sent:
        return ""
    sent = sent[0].upper() + sent[1:]
    if len(sent) > 78:
        sent = sent[:77].rsplit(" ", 1)[0] + "…"
    return sent


def _send_email(notif: Notification) -> None:
    from mail import templates as mail_templates

    try:
        # L2: destino que já deu bounce não recebe nova tentativa — proteger a
        # reputação do IP vale mais que insistir num endereço morto.
        from channels.models import SuppressedEmail

        if SuppressedEmail.objects.filter(
            account=notif.account, email__iexact=notif.recipient_email or ""
        ).exists():
            notif.email_status = STATUS_SKIPPED
            notif.email_error = "destino suprimido por bounce anterior (remova no admin para reativar)"
            logger.info("notify.email_suppressed", to=notif.recipient_email)
            return

        client = _get_mail_client(notif)
        if client is None:
            notif.email_status = STATUS_FAILED
            notif.email_error = "Nenhuma MailIdentity configurada para esta conta"
            return

        # Assunto: envio explícito > assunto do template da conta > título >
        # primeira frase do corpo. O template da conta aceita {{title}} e
        # {{service_name}} como placeholders.
        shell = mail_templates.shell_for_account(notif.account)
        account_subject = ""
        if shell is not None and shell.subject:
            account_subject = (
                shell.subject.replace("{{title}}", notif.title or "")
                .replace("{{service_name}}", shell.brand_name or notif.account.name)
                .strip()
            )
        email_text = getattr(notif, "_email_text", "") or notif.text
        subject = (
            notif.subject or account_subject or notif.title
            or getattr(notif, "_ai_subject", "")
            or _subject_from_body(email_text) or "Notificação"
        )
        if notif.media_url:
            content_html = mail_templates.md_to_html(email_text) + mail_templates.media_html(
                notif.media_url, notif.media_type or "document", caption=notif.title or ""
            )
            html = mail_templates.render_for_account(
                notif.account, notif.mail_template, title=notif.title or "",
                content=content_html, content_is_html=True,
            )
        else:
            html = mail_templates.render_for_account(
                notif.account, notif.mail_template, title=notif.title or "", content=email_text,
            )
        res = async_to_sync(client.send_email)(
            notif.recipient_email, subject, html_body=html, plain_body=email_text
        )
        if isinstance(res, dict) and res.get("message_id"):
            email_mid = str(res["message_id"]).strip("<>")
            notif.extra = {**(notif.extra or {}), "email_message_id": email_mid}
            if not notif.provider_message_id:
                notif.provider_message_id = email_mid
        notif.email_status = STATUS_SENT
    except Exception as exc:
        notif.email_status = STATUS_FAILED
        notif.email_error = f"{type(exc).__name__}: {exc}"
        notif._transient_email = _is_transient(exc)
        # L2: destinatário recusado pelo servidor → entra na lista de supressão.
        from mail.client import MailError

        if isinstance(exc, MailError) and exc.recipients_refused:
            from channels.models import SuppressedEmail

            SuppressedEmail.objects.get_or_create(
                account=notif.account,
                email=(notif.recipient_email or "").lower(),
                defaults={"reason": str(exc)[:300]},
            )
            logger.warning("notify.email_bounced_suppressed", to=notif.recipient_email)
        logger.warning("notify.email_failed", external_id=str(notif.external_id), error=str(exc)[:200])
