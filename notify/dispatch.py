"""Despacho do notify-server (Django-Q) — porte do monólito com multi-tenant.

G16 — 3 fases: CLAIM (select_for_update → SENDING) → ENVIO (fora da transação) → RESULTADO.
Config de cada canal vem das rows da conta (WhatsAppNumber, MailIdentity, TtsVoices).
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
        from mail.client import MailError

        if isinstance(exc, MailError):
            # destinatário recusado é resposta final; conexão/login fora é transitório
            return not exc.recipients_refused and "conexão" in str(exc)
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
    from whatsapp.factory import get_driver

    if notif.whatsapp_number_id:
        wn = notif.whatsapp_number
        if wn:
            return get_driver(wn, feature=feature)
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


def _get_tts_voice(notif: Notification) -> str | None:
    """Voice ID da conta, baseado no gender (regra cruzada)."""
    from channels.models import TtsVoices

    voices = TtsVoices.objects.filter(account=notif.account).first()
    if voices is None:
        return None
    return voices.voice_for_gender(notif.gender)


def dispatch(notification_id: int, sync: bool = False) -> None:
    """Envia a Notification pelos canais pendentes (G16 — 3 fases).

    `sync=True` (run_sync da API): falha vira status na resposta, nunca raise.
    Assíncrono: falha TRANSITÓRIA volta o canal a `pending` e levanta
    `TransientDispatchError` para a Django-Q reagendar (até max_attempts do
    Q_CLUSTER). Nota de voz não é re-tentada como voz: o retry reentrega como
    texto — voz é best-effort, a mensagem é o requisito.
    """
    # ── FASE 1: CLAIM ────────────────────────────────────────────────────────
    with transaction.atomic():
        notif = Notification.objects.select_for_update().filter(id=notification_id).first()
        if notif is None:
            logger.warning("notify.dispatch_missing", id=notification_id)
            return

        notif.attempts += 1

        # TEST_MODE: dry-run
        if settings.TEST_MODE:
            if notif.whatsapp_status == STATUS_PENDING:
                notif.whatsapp_status = STATUS_SENT
            if notif.email_status == STATUS_PENDING:
                notif.email_status = STATUS_SENT
            if notif.tts_status == STATUS_PENDING:
                notif.tts_status = STATUS_SENT
            if notif.want_sms and notif.sms_status == STATUS_PENDING:
                notif.sms_status = STATUS_SENT
            notif.save()
            logger.info("notify.dispatched_dry_run", external_id=str(notif.external_id), caller=notif.caller)
            return

        wa_pending = notif.whatsapp_status == STATUS_PENDING
        wa_recover = notif.whatsapp_status == STATUS_SENDING
        email_pending = notif.email_status == STATUS_PENDING
        email_recover = notif.email_status == STATUS_SENDING
        tts_pending = notif.want_tts and notif.tts_status == STATUS_PENDING
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
        if tts_pending:
            notif.tts_status = STATUS_SENDING
        if do_sms:
            notif.sms_status = STATUS_SENDING
        notif.save()

    # ── FASE 1.5: IA adapta o conteúdo por canal (fail-open) ────────────────
    # Fora da transação e ANTES dos senders. Falha de IA nunca segura envio:
    # adapt() devolve o original quando o OmniRouter não ajudar. Os textos
    # adaptados viajam em atributos efêmeros (_wa_text/_email_text) — o
    # notif.text persistido continua sendo o que o app mandou.
    from ai import adapt as ai_adapt

    if (do_whatsapp or do_email) and ai_adapt.enabled_for(notif.account):
        canais = [c for c, on in (("whatsapp", do_whatsapp), ("email", do_email)) if on]
        adapted = ai_adapt.adapt(notif.text, channels=canais, title=notif.title or "")
        if adapted["adapted"]:
            notif._wa_text = adapted["whatsapp"]
            notif._email_text = adapted["email"]
            notif._ai_subject = adapted["subject"]
            logger.info(
                "notify.ai_adapted",
                external_id=str(notif.external_id),
                channels=canais,
            )

    # ── FASE 2: ENVIO (fora da transação) ────────────────────────────────────
    # E6: canais presentes disparam em PARALELO — WhatsApp e e-mail escrevem
    # campos disjuntos da mesma Notification, e o save é da FASE 3 (thread
    # principal). Cada job fecha a própria conexão de DB no fim. Falha num
    # canal já é isolada pelos try/except internos de cada sender.
    def _job_whatsapp() -> None:
        try:
            if wa_recover:
                if notif.tts_status == STATUS_SENDING:
                    notif.tts_status = STATUS_FAILED
                    notif.tts_error = "recuperado como texto (envio anterior interrompido)"
                _send_whatsapp_text(notif)
            elif notif.media_url:
                if tts_pending:
                    notif.tts_status = STATUS_SKIPPED
                _send_whatsapp_media(notif)
            elif notif.want_tts:
                _send_tts(notif)
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
    elif tts_pending:
        notif.tts_status = STATUS_SKIPPED
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
        notif.save()
        from notify import outbound

        transaction.on_commit(lambda: outbound.push_status(notif, stage="dispatched"))
        logger.info(
            "notify.dispatched",
            external_id=str(notif.external_id),
            caller=notif.caller,
            whatsapp=notif.whatsapp_status,
            email=notif.email_status,
            tts=notif.tts_status,
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
        async_to_sync(client.send_email)(
            notif.recipient_email, subject, html_body=html, plain_body=email_text
        )
        notif.email_status = STATUS_SENT
    except Exception as exc:
        notif.email_status = STATUS_FAILED
        notif.email_error = f"{type(exc).__name__}: {exc}"
        notif._transient_email = _is_transient(exc)
        logger.warning("notify.email_failed", external_id=str(notif.external_id), error=str(exc)[:200])


def _send_tts(notif: Notification) -> None:
    """Tenta voice-note via omnirouter (MiniMax). Se falhar, cai pra texto (WhatsApp)."""
    try:
        speakable = sanitize.for_tts(getattr(notif, "_wa_text", "") or notif.text)
        if not speakable.strip():
            notif.tts_status = STATUS_SKIPPED
            _send_whatsapp_text(notif)
            return

        # voz por conta (regra cruzada: homem→feminina, mulher→masculina)
        from tts.client import TtsClient, voice_for_gender
        voice = voice_for_gender(notif.gender)

        # resolve voz da conta (se configurada) — override do default
        from channels.models import TtsVoices
        voices_row = TtsVoices.objects.filter(account=notif.account).first()
        if voices_row:
            voice = voices_row.voice_for_gender(notif.gender) or voice

        tts_client = TtsClient()
        audio_bytes = async_to_sync(tts_client.synthesize)(speakable, voice, gender=notif.gender)

        # salva áudio em MEDIA_ROOT
        import uuid
        audio_name = f"{uuid.uuid4()}.mp3"
        audio_rel_path = f"tts/{audio_name}"
        import os
        audio_abs = os.path.join(settings.MEDIA_ROOT, audio_rel_path)
        os.makedirs(os.path.dirname(audio_abs), exist_ok=True)
        with open(audio_abs, "wb") as f:
            f.write(audio_bytes)

        notif.tts_audio_path = audio_rel_path
        base = settings.MEDIA_LAN_BASE or settings.EXTERNAL_URL
        audio_url = urljoin(base + "/", settings.MEDIA_URL + audio_rel_path)

        # Nota de voz é recurso GO-first (mapa de capacidades): a GO converte o
        # MP3 em Opus/PTT de verdade; a cadeia é reordenada e a v2 vira fallback.
        driver = _get_whatsapp_driver(notif, feature="voice_note")  # fora da coroutine — FK load é ORM síncrono

        async def _send_audio():
            async with driver as wa:
                number = await wa.resolve_br_number(notif.recipient_phone)
                return await wa.send_audio(number, audio_url)

        _record_provider(notif, driver, async_to_sync(_send_audio)())
        notif.tts_status = STATUS_SENT
        notif.whatsapp_status = STATUS_SENT  # entregue como áudio

    except Exception as exc:
        notif.tts_status = STATUS_FAILED
        notif.tts_error = f"{type(exc).__name__}: {exc}"
        logger.warning("notify.tts_failed_fallback_text", external_id=str(notif.external_id), error=str(exc)[:200])
        if notif.whatsapp_status != STATUS_SENT:
            _send_whatsapp_text(notif)
