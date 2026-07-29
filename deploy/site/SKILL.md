---
name: notify
description: Serviço de notificação multi-tenant da V7M/Supletivo (WhatsApp texto/mídia/nota de voz + e-mail) via API HTTP. Base IP-only http://10.1.30.114 (LAN/VPN, não público). Auth Bearer. Este documento é autossuficiente — contém o contrato HTTP completo; não depende de scripts ou arquivos externos.
---

# Notify — API HTTP

Serviço de notificação multi-tenant: entrega WhatsApp (texto, mídia, nota de voz/TTS)
e e-mail, com templates e triggers por conta. Cada `Account` tem seus números
WhatsApp, e-mail, vozes TTS e templates, identificados pela API key.

- **Base URL:** `http://10.1.30.114` — acessível **somente por IP**, na LAN/VPN. Não há
  hostname público nem TLS público. Porta 80 (Caddy) → Django (gunicorn 127.0.0.1:8100).
- **Contrato máquina-legível:** `GET /openapi.json` · Swagger UI em `/docs`.
- Stack: Django 5.1 + django-ninja, django-q2 (fila em DB), Postgres, Evolution GO
  (WhatsApp), OmniRouter→MiniMax (TTS), SMTP/mailcow (e-mail).

## Autenticação

Todas as rotas exigem, exceto `/v1/health` e o webhook:

```
Authorization: Bearer <api-key>
```

- Sem header válido → **401** `{"detail":"Missing API key"}`.
- Key inválida/inativa → **403** `{"detail":"Invalid API key"}`.
- A key identifica a `Account`; guarde-a só em variável de ambiente, nunca em código,
  URL ou log.

## Multi-tenant — contas, instâncias, e-mail e templates

O tenant é a **`Account`**, e a **API key seleciona a conta**. Não há parâmetro no
request para escolher instância: você troca de instância/e-mail/templates **trocando
a API key** (ou seja, usando a conta correspondente).

Cada `Account` carrega sua própria configuração de canais:

- **WhatsApp / Evolution:** uma ou mais `WhatsAppNumber` (campo `instance_name` = a
  instância na Evolution, `driver` = `evolution-v2` ou `evolution-go`). O `/v1/send`
  usa **o número marcado como default** da conta (ou o primeiro, se nenhum for
  default). Para mandar por uma instância Evolution diferente, use a conta cuja
  instância default é aquela.
- **E-mail:** uma `MailIdentity` por conta (SMTP host/porta/usuário/senha + `from_email`,
  `from_name`). Sem `MailIdentity`, o canal de e-mail fica indisponível para a conta.
- **TTS:** vozes por conta (regra cruzada: homem recebe voz feminina e vice-versa).
- **Templates:** `Template` por conta e por `event` (corpo em Markdown, canais, flag
  TTS, `mail_template`). Usados pelo `/v1/send-event`. Gerencie via
  `/v1/staff/templates/{account_slug}/{event}`.

Resumo: **1 app integrado = 1 Account = 1 API key**, e essa conta já resolve qual
Evolution, qual e-mail e quais templates serão usados. Para operar N apps com
instâncias/e-mails/templates distintos, crie N contas, cada uma com sua key.

Dashboard operacional (ver tudo isso por conta) em **`/dashboard/`** — faça login com
qualquer API key válida.

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| GET | `/v1/health` | Saúde (sem auth) → `{"status":"ok","db":true}` |
| POST | `/v1/send` | Envio direto (texto / mídia / TTS) |
| POST | `/v1/send-event` | Envio por evento (renderiza Template do DB) |
| GET | `/v1/notifications` | Histórico da conta (filtros por query) |
| GET | `/v1/notifications/{external_id}` | Status de uma notificação |
| POST | `/v1/phone/check` | Verifica se números existem no WhatsApp |
| POST | `/v1/staff/adhoc` | Envio avulso (staff) |
| GET/PUT/DELETE | `/v1/staff/templates/...` | CRUD de Templates/Triggers (staff) |
| POST | `/v1/admin/apps` | **Provisiona um app inteiro** (conta+key+instâncias+e-mail) |
| GET | `/v1/admin/apps` | Estado de todos os apps (canais, cadeia de driver) |
| POST | `/v1/admin/pairing-code` | Código de pareamento da instância na GO |
| POST | `/v1/webhook/evolution/{instance_name}` | Inbound da Evolution (sem auth) |

### POST /v1/admin/apps — provisionar um app

Uma chamada deixa a conta pronta: `Account` + `ApiKey`, instância com o **mesmo
número** na Evolution v2 **e** na GO (com webhook apontando de volta pro notify),
caixa no mailcow + `MailIdentity`, vozes de TTS e o seed de templates.

```bash
curl -sS -X POST $BASE/v1/admin/apps \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"slug":"meuapp","name":"Meu App","phone_number":"554299999999",
       "email_local_part":"noreply","email_domain":"v7m.org"}'
```

Campos: `slug` (**obrigatório**), `name`, `phone_number` (E.164 sem `+`),
`instance_name` (default = slug), `driver` (default `evolution-v2`),
`fallback_driver` (default `evolution-go`), `email_local_part`, `email_domain`,
`mail_from_name`, `voice_male`, `voice_female`, `seed_templates` (default true),
`rotate_api_key`, `rotate_mail_password`.

**É idempotente**: rodar de novo reaproveita o que existe e completa o que falta.
Não gera key nova nem troca a senha do SMTP — para isso use os `rotate_*`.
Nada aqui apaga instância: apagar destrói a credencial da sessão e obriga novo
pareamento com o celular na mão.

Respostas: **201** tudo certo · **207** falha parcial (o corpo traz `failed` e o
relatório passo a passo; o que deu certo permanece) · **400** entrada inválida.
A `api_key` só aparece **uma vez**, na resposta que a criou.

### Cadeia de drivers (v2 → GO)

Cada `WhatsAppNumber` diz seu provedor preferido (`driver`) e para onde cair
(`fallback_driver`). A queda acontece **só** quando a sessão está fora
(`WhatsAppSessionDown`); erro de negócio — número inválido, mídia recusada — sobe
direto, porque repetir no outro provedor não muda a resposta e poderia duplicar o
envio. `WHATSAPP_FORCE_DRIVER` no `.env` é a trava de emergência que ignora as
rows durante um incidente.

### POST /v1/send

Corpo JSON (`SendIn`):

| Campo | Tipo | Default | Notas |
|---|---|---|---|
| `text` | string | — | **obrigatório** (corpo da mensagem) |
| `phone` | string\|null | null | destino WhatsApp, formato E.164 sem `+` (ex.: `5599...`) |
| `email` | string\|null | null | destino e-mail |
| `caller` | string | `"api"` | rótulo de origem p/ auditoria/filtro |
| `whatsapp` | bool | `true` | enviar por WhatsApp |
| `email_channel` | bool | `false` | enviar por e-mail |
| `tts` | bool | `false` | entregar como nota de voz (PTT) em vez de texto |
| `media_url` | string\|null | null | URL HTTP(S) da mídia (alcançável pelo Evolution GO) |
| `media_type` | string\|null | null | `image` \| `video` \| `audio` \| `document` |
| `title` / `subject` | string\|null | null | título / assunto (e-mail) |
| `gender` | string\|null | null | seleção de voz TTS |
| `mail_template` | string | `"default"` | template de e-mail |
| `external_id` | string\|null | null | **chave de idempotência** do cliente |
| `run_sync` | bool | `false` | processa na hora em vez de enfileirar |

Regra: informe **ao menos** `phone` ou `email` (senão 400). Resposta `SendOut`:
`{"external_id":"<id>"}` — use-o para consultar o status depois.

Exemplos:

```bash
BASE=http://10.1.30.114
KEY=$NOTIFY_API_KEY

# texto por WhatsApp (idempotente)
curl -sS -X POST $BASE/v1/send \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"phone":"5599XXXXXXXXX","text":"Seu código é 123456","caller":"app.otp","external_id":"otp-abc-1"}'

# nota de voz (TTS)
curl -sS -X POST $BASE/v1/send \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"phone":"5599XXXXXXXXX","text":"Sua consulta foi confirmada","tts":true,"external_id":"voz-1"}'

# mídia (imagem)
curl -sS -X POST $BASE/v1/send \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"phone":"5599XXXXXXXXX","text":"Comprovante","media_url":"http://10.1.30.114/media/x.png","media_type":"image","external_id":"img-1"}'
```

### POST /v1/send-event

Renderiza um Template cadastrado (`event`) com contexto. Corpo `SendEventIn`:
`event` (**obrigatório**), `phone`, `email`, `nome`, `nome_completo`, `gender`,
`ctx` (objeto com variáveis do template), `title`, `subject`, `media_url`,
`media_type`, `mail_template`, `idempotency_key`, `run_sync`, e overrides
(`body_md_override`, `is_tts_override`, `channels_override`). Resposta `SendOut`.

```bash
curl -sS -X POST $BASE/v1/send-event \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"event":"matricula_confirmada","phone":"5599XXXXXXXXX","nome":"Ana","ctx":{"curso":"ENEM"},"idempotency_key":"evt-1"}'
```

### GET /v1/notifications

Query params (todos opcionais): `caller`, `whatsapp_status`, `email_status`,
`tts_status`, `limit`. Retorna array de `NotificationOut`.

```bash
curl -sS "$BASE/v1/notifications?caller=app.otp&limit=10" -H "Authorization: Bearer $KEY"
```

### GET /v1/notifications/{external_id}

Status de uma notificação (`NotificationOut`). Campos-chave para diagnóstico:
`whatsapp_status`, `email_status`, `tts_status`, `attempts`, `whatsapp_error`,
`email_error`, `tts_error`, `created_at`, além de `want_whatsapp/want_email/want_tts`
e destinos. Trate um status de aceitação como confirmação do notify — verifique
também `attempts` e os campos `*_error`.

```bash
curl -sS "$BASE/v1/notifications/otp-abc-1" -H "Authorization: Bearer $KEY"
```

### POST /v1/phone/check

Corpo `PhoneCheckIn`: `{"numbers":["5599...","5588..."]}`. Retorna array
`PhoneCheckOut`: `[{"number":"5599...","exists":true}, ...]`.

Distinga os dois "não":

- **200** com `exists:false` → resposta **final**: o número não tem WhatsApp.
- **503** `whatsapp_session_down` → **nosso** verificador caiu (sessão fora nos
  dois provedores). É **retentável**; não conclua que o número é inválido nem
  bloqueie o cadastro por causa disso.

```bash
curl -sS -X POST $BASE/v1/phone/check \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"numbers":["5599XXXXXXXXX"]}'
```

### Staff (mesma Bearer key, escopo staff)

- `POST /v1/staff/adhoc` — `StaffNotifyIn`: `message` (**obrigatório**), `phone`,
  `email`, `subject`, `channels[]`.
- `GET /v1/staff/templates`, `GET /v1/staff/templates/stats`,
  `GET|PUT|DELETE /v1/staff/templates/{account_slug}/{event}`,
  `PUT /v1/staff/templates/{account_slug}/{event}/trigger`,
  `POST /v1/staff/templates/{account_slug}/{event}/preview`.

## Mídia e TTS

- **Mídia:** forneça `media_url` HTTP(S) **alcançável pelo Evolution**. Desde a
  migração da Evolution GO para a mesma LXC do v2 (`10.1.20.200`), notify e
  Evolution estão na mesma rede `10.1.x` e a URL é buscada direto — o antigo
  relay Tailscale `10.3.20.1:8114` foi desativado.
- **TTS:** com `tts:true`, o texto vira MP3 (OmniRouter/MiniMax), é salvo em
  `/media/tts/` e o Evolution GO converte para Opus e entrega como nota de voz (PTT).

## Idempotência e segurança operacional

- Use `external_id` / `idempotency_key` **estável** por mensagem lógica: reenvios com
  a mesma chave não duplicam a entrega.
- Não reenvie OTPs antigos nem mensagens já aceitas — consulte o status antes.
- Serviço é **IP-only** (LAN/VPN). Não publique no proxy da internet, não crie DNAT
  para o CT, não habilite TLS público nem troque o bind privado por wildcard.
- Em testes, limite os envios ao próprio número autorizado.

## Integração rápida (checklist p/ um app)

1. Ter `NOTIFY_API_KEY` no ambiente e a base `http://10.1.30.114`.
2. `GET /v1/health` → confirmar `{"status":"ok"}`.
3. (Opcional) `POST /v1/phone/check` para validar o número.
4. `POST /v1/send` (ou `/v1/send-event`) com `external_id`; guardar o `external_id`
   retornado.
5. `GET /v1/notifications/{external_id}` para acompanhar `*_status` / `*_error`.
