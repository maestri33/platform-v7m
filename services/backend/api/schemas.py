"""Schemas compartilhados entre grupos da API Ninja (CONVENTION §12: reusar, não duplicar).

A autoria de matéria do treino é feita por DOIS públicos — `staff` (administração) e `leadership`
(o coordenador também autora, palavra do Victor) — com o MESMO contrato. Os schemas vivem aqui pra
não duplicar (plan/15 A7).
"""

from __future__ import annotations

from ninja import Field, Schema


class CheckIn(Schema):
    """Body do `POST /auth/check` — compartilhado pelos grupos do funil (dedup)."""

    cpf: str | None = None
    phone: str | None = None
    external_id: str | None = None  # re-dispara OTP de usuário já conhecido (do USER)
    # O NORMAL é disparar OTP. `false` = modo sem OTP: espia found/roles e devolve `token` direto.
    send_otp: bool = True
    # funil do lead v2 (`?ref=` da landing): external_id do PROMOTOR — usado SÓ pelo grupo
    # `clients` quando o check CRIA a conta (captura). Os demais grupos ignoram.
    ref: str | None = None


class CheckOut(Schema):
    """Resposta do `POST /auth/check` — compartilhada pelos grupos do funil (dedup)."""

    found: bool
    external_id: str | None = Field(
        None, description="external_id do USER (é o que o /auth/login espera)"
    )
    otp_sent: bool
    otp_wait: int | None = None
    whatsapp: bool | None = None
    roles: list[str] | None = None
    # só no modo `send_otp=false`: JWT de acesso direto.
    token: str | None = None
    # funil do lead v2: o check do `clients` CRIA a conta quando o número é novo e tem WhatsApp
    # (found continua honesto = false). O front trata (found || created) → tela do OTP.
    created: bool = False


class LoginIn(Schema):
    """Body do `POST /auth/login` — compartilhado pelos grupos do funil (dedup)."""

    external_id: str = Field(description="external_id do USER (veio do /auth/check)")
    otp: str


class MaterialIn(Schema):
    """Criação de uma matéria do treino: conteúdo (texto/blocos) + questão + gabarito.

    `kind` fixa (todo promotor novo recebe) ou transitória (staff publica p/ os existentes);
    `blocking` = obrigatória (trava o painel); `ephemeral` = descartável; `content_blocks` =
    conteúdo rico (texto/imagem/vídeo/arquivo) que o front renderiza em ordem."""

    title: str
    question: str
    expected_answer: str
    text_content: str = ""
    content_blocks: list[dict] = []
    order: int = 0
    kind: str = "fixed"
    blocking: bool = True
    ephemeral: bool = False
    video: str | None = None
    photo: str | None = None


class MaterialUpdateIn(Schema):
    """Edição de uma matéria — só os campos enviados; `active=False` desativa."""

    title: str | None = None
    text_content: str | None = None
    content_blocks: list[dict] | None = None
    question: str | None = None
    expected_answer: str | None = None
    order: int | None = None
    active: bool | None = None
    kind: str | None = None
    blocking: bool | None = None
    ephemeral: bool | None = None
    video: str | None = None
    photo: str | None = None


class RefreshIn(Schema):
    """Body do `POST /auth/refresh` — compartilhado pelos 3 grupos (dedup #4)."""

    refresh_token: str


class TokenOut(Schema):
    """Par de tokens devolvido por `login`/`refresh` — compartilhado pelos grupos (dedup #4)."""

    access_token: str
    refresh_token: str
    token_type: str


class AddressCepIn(Schema):
    cep: str


class AddressDataIn(Schema):
    street: str | None = None
    number: str | None = None
    complement: str | None = None
    neighborhood: str | None = None
    city: str | None = None
    state: str | None = None


class PublicAddressOut(Schema):
    cep: str | None = None
    zipcode: str | None = None
    street: str | None = None
    number: str | None = None
    complement: str | None = None
    neighborhood: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    missing_fields: list[str] = []


class StudentPlatformFields(Schema):
    url: str | None = None
    login: str | None = None
    password: str | None = None
    notes: str | None = None
