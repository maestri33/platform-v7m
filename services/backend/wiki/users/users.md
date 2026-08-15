# users — identidade, papéis e dados pessoais (§4 item 3)

> O "quem" da plataforma. Um **app Django** com sub-módulos (pacotes): `auth/` (+ `jwt/`, `otp/`),
> `profiles/`, `roles/`, **`address/`** e **`documents/`** (ciclo 3b).
> Fonte de verdade da identidade (VISAO). Modelo B (CONVENTION §1): a lógica vive no Django; os
> edges FastAPI (depois) chamam as **views DMZ** por HTTP.

## Decisões que mandam aqui
- **Custom `AUTH_USER_MODEL = users.User`** (Victor 2026-06-01) — o `User` carrega o `external_id`
  (UUID na borda) e é âncora pura de identidade. `USERNAME_FIELD = external_id`; admin loga por UUID.
- **Login passwordless por OTP** — `User` nasce com `set_unusable_password()`; OTP **é** o login.
- **Unicidade absoluta** de `cpf`/`phone`/`email` (spec auth) — no `Profile`, com `unique` + formato
  + **veracidade real** (CPFHub + WhatsApp).
- **`external_id` só na borda**; dentro é **FK de verdade** (roles/otp → `User`).

## Models (app_label `users`, um migration set)
- **`User`** (`auth/models.py`): `external_id` (UUID unique), flags admin, senha (inutilizável p/ user normal).
- **`Profile`** (`profiles/models.py`): 1-1 `User` — `cpf`(11,unique), `phone`(13,unique, formato
  `55`+DDD+`9`+8), `email`(unique,null), `gender`(M/F — vem do CPFHub). **Completo (3b):** `name` +
  `birth_date` (brinde do CPFHub no register), `pix_key` (só o campo; validação Asaas adiada), FK 1-1
  `address` (Profile→Address, §4).
- **`Address`** (`address/models.py`): entidade própria de endereço → [[wiki/users/address]].
- **`Document`** + `RG`/`CNH`/`Certificate`/`Military` (`documents/models.py`) → [[wiki/users/documents]].
- **`UserRole`** (`roles/models.py`): FK `User`, `role`, `assigned_at`, `revoked_at` (ativa = nulo;
  histórico nas revogadas).
- **`OtpCode`** + **`OtpRateLimit`** (`auth/otp/models.py`): auditoria (hash SHA256, nunca plaintext)
  + rate-limit em DB (sem Redis).

## auth — endpoints DMZ (`/users/auth/…`)
- `POST register/` `{role, phone, cpf}` → valida entry-role + formato + **CPFHub** (identidade real)
  + validação remota do número pelo notify-server → transação atômica `User`+`Profile`(com `name`/
  `birth_date` do CPFHub)+**`Address` vazio**+**`Document`+sub-docs null**+role inicial → dispara OTP
  → `{external_id}`.
- `POST check/` `{cpf|phone|external_id}` → acha + dispara OTP. Resposta com `found`/`external_id`,
  mais **`roles`** (roles ativas do usuário existente → o front escolhe o fluxo de login) e
  **`whatsapp`** (só quando veio `phone` e o usuário NÃO existe: o número tem WhatsApp ativo? — o front
  avisa antes do cadastro; `null` = WhatsApp fora do ar, **não bloqueia o check**). **VAZA existência DE
  PROPÓSITO** (CONVENTION §5): não-encontrado = `found:false` + `otp_sent:false` honesto (o front sabe que
  é cadastro novo). Rate-limit de IP fica no reverse proxy (§5).
- `POST recover/` `{cpf|phone}` → OTP no canal conhecido; **nunca** devolve `external_id`.
- `POST login/` `{external_id, role, otp}` → confere role ativa → valida OTP → **JWT** com as roles ativas.

## jwt (`auth/jwt/`)
RS256. Par de chaves PEM gerado no 1º boot em `keys/` (**gitignored**, privada nunca commitada).
`issue` (access 30min + refresh 1440min, claims `external_id`+`roles`, header com `kid`), `refresh`,
`get_jwks`. View pública **`GET /.well-known/jwks.json`** (RFC 7517) — os edges validam o token por ela.

## otp (`auth/otp/`)
Código 6 díg, hash SHA256, TTL 300s, máx 3 tentativas, rate-limit 30s + 5/h (DB). Enviado por
**WhatsApp via notify-server**; o backend envia somente o evento e o destinatário.
**Comando:** `manage.py otp_reset_ratelimit --phone|--cpf|--external-id <valor>` zera o rate-limit de
OTP de um usuário (apoio a teste/atendimento; remove as linhas `OtpRateLimit` dele).

## roles (`roles/`)
Catálogo de transições no **`.env`** (`ROLE_RULES`, §9), validado no boot (`catalog.py`). Cadeias:
`lead→enrollment→student` (+`veteran` aditivo) e `candidate→training→promoter` (+`coordinator` aditivo).
`assign` (entrada, `from_role=None`), `promote` (replace = digivolução: revoga a anterior), `active_roles`.

## Config (`.env`)
`JWT_*` (paths das chaves, alg, expirações, issuer), `OTP_*` (dígitos, TTL, tentativas, rate-limit),
`ROLE_RULES` (JSON). Defaults = porte do legado.

## Reusa (sem duplicar)
[[wiki/integrations/tools/cpf]] (CPFHub) · notify-server (validação e envio).

## Rabo pra trás (specs novas)
- `specs/log_otp_mask.md` — o código do OTP aparece no `text_preview` do log do cliente WhatsApp.
- `specs/profiles_pix_validacao.md` — validar a chave Pix no Asaas (DICT) = ciclo do `candidate`.
- `specs/selfie.md` — selfie (validação tipo-assinatura) = ciclo `candidate`/`enrollment`.

## Teste real
- `.claude/tests/3-users-auth-jwt-otp-roles.md` — register → OTP no zap → login → JWT/JWKS → 409 →
  promote. Tudo REAL.
- `.claude/tests/3b-users-address-documents-profiles.md` — provisionamento (Address+Documents null) →
  CEP ViaCEP real → upload de foto real → gate de gênero. Tudo REAL.
