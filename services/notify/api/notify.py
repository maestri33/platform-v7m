"""POST /notify — o contrato IA-first da spec, por cima do mesmo pipeline.

`{ whatsapp?, email?, content, options? }`: o canal é decidido pela PRESENÇA do
destino — os dois presentes → sai nos dois; um → só naquele; nenhum → 400 claro.
Sem flags de canal para o cliente esquecer ligadas ou desligadas.

`/v1/send` continua existindo com o contrato antigo (flags explícitas) para os
apps já integrados. Os dois caminhos convergem em `notify.interface.send.send`,
então idempotência, IA (fail-open no dispatch), fila e webhook são os mesmos.
"""

from __future__ import annotations

from typing import Annotated, Literal

import structlog
from ninja import Field, Router, Schema
from ninja.errors import HttpError
from pydantic import field_validator, model_validator

from accounts.auth import api_key_auth, resolve_account
from api.errors import ErrorOut

logger = structlog.get_logger()
router = Router(tags=["notify"])

PhoneStr = Annotated[
    str,
    Field(
        pattern=r"^\d{10,15}$",
        description="Telefone no padrão E.164 apenas com dígitos (sem '+'), ex.: 5542999999999",
        examples=["5542999999999"],
    ),
]
GenderType = Literal["M", "F"]
MediaType = Literal["image", "video", "audio", "document"]


class PollOptions(Schema):
    question: str = Field(..., min_length=1, max_length=255, description="Pergunta da enquete")
    options: list[str] = Field(..., min_length=2, max_length=12, description="Opções de voto no WhatsApp")
    selectable_count: int = Field(default=1, ge=1, description="Quantidade máxima de opções selecionáveis")

    @model_validator(mode="after")
    def validate_selectable(self) -> PollOptions:
        if self.selectable_count > len(self.options):
            raise ValueError("selectable_count não pode ser maior que o número de opções.")
        return self


PixKeyType = Literal["cpf", "cnpj", "phone", "email", "random"]
CarouselButtonType = Literal["URL", "COPY", "REPLY", "CALL", "url", "copy", "reply", "call"]


class PixOptions(Schema):
    # Suporta código copia-e-cola (EMV / QR imagem) ou chave direta para botão nativo
    payload: str | None = Field(default=None, description="Código Pix copia-e-cola (BR Code/EMV)")
    label: str = Field(default="Pagamento via Pix", max_length=100)
    key: str | None = Field(default=None, description="Chave Pix para botão nativo (CPF, CNPJ, telefone, email ou EVP)")
    key_type: PixKeyType | None = Field(default=None, description="Tipo da chave Pix: cpf, cnpj, phone, email, random")
    name: str | None = Field(default=None, max_length=100, description="Nome do recebedor/beneficiário no botão")
    currency: str = Field(default="BRL", max_length=10)

    @model_validator(mode="after")
    def validate_pix_fields(self) -> PixOptions:
        payload = (self.payload or "").strip()
        key = (self.key or "").strip()
        if not payload and not key:
            raise ValueError("options.pix requer 'key' (para botão nativo) ou 'payload' (para QR-code).")
        if key and not self.key_type:
            raise ValueError("options.pix.key_type é obrigatório quando 'key' é informada.")
        return self


class LocationOptions(Schema):
    latitude: float = Field(..., description="Latitude geográfica")
    longitude: float = Field(..., description="Longitude geográfica")
    name: str | None = Field(default=None, max_length=200, description="Nome do local")
    address: str | None = Field(default=None, max_length=300, description="Endereço do local")


class ContactOptions(Schema):
    full_name: str = Field(..., min_length=1, max_length=200, description="Nome completo do contato")
    phone: str = Field(..., min_length=8, max_length=30, description="Telefone do contato")
    organization: str | None = Field(default=None, max_length=200, description="Empresa ou organização")


class CarouselButtonIn(Schema):
    type: CarouselButtonType = Field(default="URL", description="Tipo do botão do card: URL, COPY, CALL, REPLY")
    display_text: str = Field(..., min_length=1, max_length=50, description="Texto do botão")
    url: str | None = Field(default=None, description="URL de destino quando type=URL")
    copy_code: str | None = Field(default=None, description="Código para copiar quando type=COPY")
    phone_number: str | None = Field(default=None, description="Telefone para ligar quando type=CALL")
    id: str | None = Field(default=None, description="ID ou payload de callback quando type=REPLY")


class CarouselCardIn(Schema):
    title: str = Field(..., min_length=1, max_length=200, description="Título do card")
    image_url: str = Field(..., min_length=1, description="URL pública da imagem do card")
    text: str = Field(..., min_length=1, description="Texto/descrição do card")
    subtitle: str | None = Field(default=None, max_length=200, description="Subtítulo opcional")
    buttons: list[CarouselButtonIn] | None = Field(default=None, description="Botões do card")


class CarouselOptions(Schema):
    cards: list[CarouselCardIn] = Field(..., min_length=1, max_length=10, description="Lista de cards do carrossel")
    body: str | None = Field(default=None, description="Texto principal antes dos cards")
    footer: str | None = Field(default=None, max_length=100, description="Rodapé da mensagem")


class QrCodeOptions(Schema):
    data: str = Field(..., min_length=1, description="Dados ou URL para gerar o QR Code")
    caption: str | None = Field(default=None, max_length=200, description="Legenda opcional")

    @field_validator("data", mode="before")
    @classmethod
    def clean_data(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("options.qr_code.data é obrigatório.")
        return v


class NotifyOptions(Schema):
    title: str | None = Field(default=None, max_length=200)
    subject: str | None = Field(default=None, max_length=255)
    # Recursos interativos no WhatsApp (Evolution GO) com degradação graciosa para texto:
    poll: PollOptions | None = None
    pix: PixOptions | None = None
    location: LocationOptions | None = None
    contact: ContactOptions | None = None
    carousel: CarouselOptions | None = None
    qr_code: QrCodeOptions | None = None
    media_url: str | None = Field(default=None, max_length=500)
    media_type: MediaType | None = None
    external_id: str | None = Field(default=None, max_length=255, description="Chave de idempotência")
    mail_template: str = Field(default="default", max_length=50)
    caller: str = Field(default="notify", max_length=100)
    run_sync: bool = Field(default=False, description="Despachar imediatamente de forma síncrona")


class NotifyIn(Schema):
    content: str = Field(..., description="Conteúdo da notificação em texto/markdown")
    account_id: str | None = Field(default=None, description="Slug ou ID da conta destino")
    whatsapp: str | None = Field(default=None, description="Telefone E.164 sem '+', ex.: 5542999999999")
    email: str | None = Field(default=None, description="E-mail do destinatário")
    options: NotifyOptions | None = None


class NotifyOut(Schema):
    external_id: str = Field(..., description="UUID da notificação enfileirada")
    account: str = Field(..., description="Slug da conta executora")
    channels: list[str] = Field(..., description="Canais ativados para o envio")


@router.post(
    "",
    response={200: NotifyOut, 400: ErrorOut, 403: ErrorOut, 404: ErrorOut},
    summary="Envio de notificação (contrato IA-first)",
    description="Dispara notificações via WhatsApp e/ou E-mail com base na presença dos destinatários.",
)
def notify(request, payload: NotifyIn):
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
    rich_commands = [
        bool(opts.poll),
        bool(opts.pix),
        bool(opts.location),
        bool(opts.contact),
        bool(opts.carousel),
        bool(opts.qr_code),
    ]
    if sum(rich_commands) > 1:
        raise HttpError(400, "Use apenas um comando interativo por envio (poll, pix, location, contact, carousel ou qr_code).")
    if any(rich_commands) and not phone:
        raise HttpError(400, "Recursos interativos de WhatsApp exigem um destino whatsapp.")
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
            media_url=opts.media_url,
            media_type=opts.media_type,
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
        data: dict = {
            "label": options.pix.label.strip(),
        }
        if options.pix.payload:
            data["payload"] = options.pix.payload.strip()
        if options.pix.key:
            data["key"] = options.pix.key.strip()
            data["key_type"] = options.pix.key_type
            if options.pix.name:
                data["name"] = options.pix.name.strip()
            data["currency"] = options.pix.currency.strip() if options.pix.currency else "BRL"
        elif options.pix.currency and options.pix.currency != "BRL":
            data["currency"] = options.pix.currency.strip()
        return {"pix": data}
    if options.location:
        return {
            "location": {
                "latitude": options.location.latitude,
                "longitude": options.location.longitude,
                "name": (options.location.name or "").strip(),
                "address": (options.location.address or "").strip(),
            }
        }
    if options.contact:
        return {
            "contact": {
                "full_name": options.contact.full_name.strip(),
                "phone": options.contact.phone.strip(),
                "organization": (options.contact.organization or "").strip(),
            }
        }
    if options.carousel:
        cards_data = []
        for card in options.carousel.cards:
            buttons_data = []
            for btn in card.buttons or []:
                b_dict = {
                    "type": btn.type,
                    "display_text": btn.display_text,
                    "url": btn.url,
                    "copy_code": btn.copy_code,
                    "phone_number": btn.phone_number,
                    "id": btn.id,
                }
                buttons_data.append({k: v for k, v in b_dict.items() if v is not None})
            cards_data.append(
                {
                    "title": card.title.strip(),
                    "subtitle": (card.subtitle or "").strip(),
                    "image_url": card.image_url.strip(),
                    "text": card.text.strip(),
                    "buttons": buttons_data or None,
                }
            )
        return {
            "carousel": {
                "cards": cards_data,
                "body": (options.carousel.body or "").strip(),
                "footer": (options.carousel.footer or "").strip(),
            }
        }
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
