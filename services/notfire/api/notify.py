"""POST /notify — o contrato IA-first da spec, por cima do mesmo pipeline.

`{ whatsapp?, email?, content, options? }`: o canal é decidido pela PRESENÇA do
destino — os dois presentes → sai nos dois; um → só naquele; nenhum → 400 claro.
Sem flags de canal para o cliente esquecer ligadas ou desligadas.

`/v1/send` continua existindo com o contrato antigo (flags explícitas) para os
apps já integrados. Os dois caminhos convergem em `notify.interface.send.send`,
então idempotência, IA (fail-open no dispatch), fila e webhook são os mesmos.
"""

from __future__ import annotations

import structlog
from ninja import Router, Schema
from ninja.errors import HttpError

from accounts.auth import api_key_auth

logger = structlog.get_logger()
router = Router(tags=["notify"])


class PollOptions(Schema):
    question: str
    options: list[str]
    selectable_count: int = 1


class PixOptions(Schema):
    payload: str  # código Pix copia-e-cola (BR Code/EMV)
    label: str = "Pagamento via Pix"


class QrCodeOptions(Schema):
    data: str
    caption: str | None = None


class NotifyOptions(Schema):
    title: str | None = None
    subject: str | None = None
    tts: bool = False
    # Enquete clicável no WhatsApp (recurso GO — testado em produção). Quando
    # presente, o canal WhatsApp envia a poll; sem GO disponível, degrada para
    # texto com as opções numeradas.
    poll: PollOptions | None = None
    # Pix usa QR + copia-e-cola. O botão PIX da Evolution GO é rejeitado pelo
    # WhatsApp em contas não-Business; a imagem funciona nos dois provedores.
    pix: PixOptions | None = None
    qr_code: QrCodeOptions | None = None
    gender: str | None = None
    media_url: str | None = None
    media_type: str | None = None
    external_id: str | None = None  # idempotência
    mail_template: str = "default"
    caller: str = "notify"
    run_sync: bool = False


class NotifyIn(Schema):
    content: str
    account_id: str | None = None  # slug ou id; ausente → conta default
    whatsapp: str | None = None  # telefone E.164 sem '+', ex.: 5542999999999
    email: str | None = None
    options: NotifyOptions | None = None


class NotifyOut(Schema):
    external_id: str
    account: str
    channels: list[str]


@router.post("", response=NotifyOut)
def notify(request, payload: NotifyIn):
    from accounts.auth import resolve_account

    account = resolve_account(request, payload.account_id)
    from notify.ratelimit import check_rate

    check_rate(account.slug)
    from notify.interface.send import send

    phone = (payload.whatsapp or "").strip() or None
    email = (payload.email or "").strip().lower() or None
    content = (payload.content or "").strip()

    if not content:
        raise HttpError(400, "content é obrigatório.")
    if not phone and not email:
        raise HttpError(
            400, "Informe ao menos um destino: whatsapp (telefone) e/ou email."
        )

    opts = payload.options or NotifyOptions()
    rich_commands = [bool(opts.poll), bool(opts.pix), bool(opts.qr_code)]
    if sum(rich_commands) > 1:
        raise HttpError(400, "Use apenas um comando por envio: poll, pix ou qr_code.")
    if any(rich_commands) and not phone:
        raise HttpError(400, "poll, pix e qr_code exigem um destino whatsapp.")
    channels = [c for c, on in (("whatsapp", bool(phone)), ("email", bool(email))) if on]

    # Idempotency-Key no header (spec I3) tem precedência sobre options.external_id.
    idem = (request.headers.get("Idempotency-Key") or "").strip() or opts.external_id

    try:
        ext = send(
        account=account,
        text=content,
        caller=opts.caller or "notify",
        phone=phone,
        email=email,
        title=opts.title,
        subject=opts.subject,
        whatsapp=bool(phone),
        email_channel=bool(email),
        tts=bool(opts.tts and phone),
        media_url=opts.media_url,
        media_type=opts.media_type,
        gender=opts.gender,
        mail_template=opts.mail_template or "default",
        idempotency_key=idem,
        run_sync=opts.run_sync,
        extra=_command_extra(opts),
        )
    except ValueError as exc:
        raise HttpError(400, str(exc)) from exc
    logger.info("notify.api_notify", account=account.slug, channels=channels)
    return {"external_id": ext, "account": account.slug, "channels": channels}


def _command_extra(options: NotifyOptions) -> dict | None:
    if options.poll:
        return {
            "poll": {
                "question": options.poll.question,
                "options": options.poll.options,
                "selectable_count": options.poll.selectable_count,
            }
        }
    if options.pix:
        payload = options.pix.payload.strip()
        if not payload:
            raise HttpError(400, "options.pix.payload é obrigatório.")
        return {"pix": {"payload": payload, "label": options.pix.label.strip()}}
    if options.qr_code:
        data = options.qr_code.data.strip()
        if not data:
            raise HttpError(400, "options.qr_code.data é obrigatório.")
        return {
            "qr_code": {
                "data": data,
                "caption": (options.qr_code.caption or "").strip(),
            }
        }
    return None
