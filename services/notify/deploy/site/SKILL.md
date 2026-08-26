---
name: notify
description: Canal de notificação multi-app da V7M/Supletivo — WhatsApp (texto, mídia, nota de voz), e-mail e templates, via API HTTP e via MCP. Base IP-only http://10.1.30.114 (LAN/VPN, não público). Auth Bearer. Use quando precisar enviar aviso/OTP/confirmação para uma pessoa, consultar o que aconteceu com um envio, ler mensagens recebidas no número do app, ou editar os templates e canais de um app. Este documento é autossuficiente — contém o contrato HTTP completo.
---

# Notify — canal de notificação dos apps

O notify é **relay, não caixa postal**. Ele recebe *destino já validado + conteúdo
+ flags* e entrega em todos os canais disponíveis do app: WhatsApp (texto, mídia
ou nota de voz), e-mail, e — quando houver gateway — SMS. Quem guarda histórico
de conversa é o app; o notify guarda o rastro da entrega e devolve o que
aconteceu pelo webhook.

- **Base URL:** `http://10.1.30.114` — **somente por IP**, na LAN/VPN. Sem hostname
  público, sem TLS público. Porta 80 (Caddy) → Django (gunicorn 127.0.0.1:8100).
- **Painel:** `/` — um painel por app, editável (canais, templates, vozes, webhook, logs).
- **Contrato de máquina:** `GET /openapi.json` · Swagger em `/docs` · este arquivo em `/skill.md`.
- **MCP:** `POST /mcp` (JSON-RPC 2.0) — ferramentas prontas para agentes.
- Stack: Django 5.1 + django-ninja, django-q2 (fila em DB), Postgres, Evolution GO 0.7.2
  (WhatsApp), OmniRouter→MiniMax (TTS e assistente de texto),
  Stalwart Mail Server 0.16.18 (e-mail em `10.0.1.20`).

## Autenticação

```
Authorization: Bearer <api-key>
```

Exceções (sem auth): `GET /v1/health`, `POST /v1/webhook/evolution/...`, o painel e
o `initialize` do MCP.

- Sem header válido → **401** · key inválida/inativa → **403**.
- **A key identifica o app.** Não existe parâmetro para "enviar pela instância de
  outro app": trocar de app é trocar de key.

## O modelo: 1 app = 1 Account = 1 API key

Cada `Account` carrega a própria configuração de canais:

| Peça | O que é | Onde editar |
|---|---|---|
| `WhatsAppNumber` | Instância WhatsApp na Evolution GO 0.7.2 vinculada ao app. | painel → aba *whatsapp* |
| `MailIdentity` | Remetente SMTP (caixa no Stalwart Mail Server). Sem ela, o canal de e-mail fica indisponível. | painel → aba *e-mail* |
| `MailTemplate` | **Um shell HTML de e-mail por app** (a marca). Sem ele, usa o `default.html` do serviço. | painel → aba *template do e-mail* |
| `TtsVoices` | Vozes da nota de voz. Regra da casa: **M recebe voz feminina, F recebe voz masculina**. | painel → aba *voz* |
| `AppWebhook` | Para onde o notify devolve status de entrega e mensagens recebidas. | painel → aba *webhook* |
| `Template` | Teor por `event` (Markdown com `{placeholders}`), canais e flag de TTS. | painel → aba *eventos* ou `/v1/staff/templates` |

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| POST | `/notify` | **Contrato principal IA-first**: `{ account_id?, whatsapp?, email?, content, options? }` — canais ativados por presença de destino; suporta `pix`, `carousel`, `poll`, `location`, `contact`, `qr_code`, `tts`. |
| GET | `/v1/health` | Saúde (sem auth) → `{"status":"ok","db":true}` |
| POST | `/v1/send` | Envio direto (compatibilidade) |
| POST | `/v1/send-event` | Envio por evento (renderiza o Template do app) |
| GET | `/v1/notifications` | Histórico do app (filtros por query) |
| GET | `/v1/notifications/{external_id}` | Estado de um envio |
| POST | `/v1/phone/check` | Verifica se números existem no WhatsApp |
| POST | `/v1/staff/adhoc` | Envio avulso |
| GET/PUT/DELETE | `/v1/staff/templates/...` | CRUD de Templates/Triggers |
| POST | `/v1/admin/apps` | **Provisiona um app inteiro** |
| GET | `/v1/admin/apps` | Estado de todos os apps |
| POST | `/v1/admin/pairing-code` | Código de pareamento da instância na GO |
| POST | `/v1/webhook/evolution/{instance}` | Entrada da Evolution (sem auth) |
| POST | `/mcp` | MCP JSON-RPC (ver adiante) |

### POST /v1/send — o caminho principal

```bash
BASE=http://10.1.30.114
KEY=$NOTIFY_API_KEY

curl -sS -X POST $BASE/v1/send \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"phone":"5542999999999","email":"pessoa@dominio.com","email_channel":true,
       "text":"Sua matrícula foi confirmada","subject":"Matrícula confirmada",
       "external_id":"matricula-8821"}'
```

| Campo | Tipo | Default | Notas |
|---|---|---|---|
| `text` | string | — | **obrigatório** |
| `phone` | string\|null | null | E.164 **sem `+`** (ex.: `5542999999999`) |
| `email` | string\|null | null | destino de e-mail |
| `whatsapp` | bool | `true` | enviar por WhatsApp |
| `email_channel` | bool | `false` | enviar por e-mail |
| `tts` | bool | `false` | entregar como **nota de voz** (PTT) em vez de texto |
| `gender` | `M`\|`F`\|null | null | seleção da voz do TTS (regra cruzada) |
| `media_url` / `media_type` | string\|null | null | mídia por URL alcançável pela Evolution |
| `title` / `subject` | string\|null | null | título / assunto do e-mail |
| `mail_template` | string | `"default"` | só usado se o app **não** tiver shell próprio |
| `external_id` | string\|null | null | **chave de idempotência** |
| `caller` | string | `"api"` | rótulo de origem para auditoria |
| `run_sync` | bool | `false` | processa na hora em vez de enfileirar |

Regras: informe **ao menos** `phone` ou `email` (senão 400). Resposta:
`{"external_id":"<id>"}`. `tts:true` implica WhatsApp. Mídia e TTS não convivem no
mesmo envio — com `media_url`, o TTS sai `skipped`.

### Estado de um envio — leia os dois níveis

```bash
curl -sS "$BASE/v1/notifications/matricula-8821" -H "Authorization: Bearer $KEY"
```

1. **Por canal** (`whatsapp_status`, `email_status`, `tts_status`, `sms_status`):
   `pending` → `sending` → `sent` \| `failed` \| `skipped`.
   `sent` significa **"o provedor aceitou"**, não "chegou".
2. **De entrega** (`delivery_status`): `sent` → `delivered` → `read`. Vem do
   `MESSAGES_UPDATE` da Evolution, casado pelo `provider_message_id`. Só avança —
   um ACK atrasado nunca rebaixa.

Também úteis: `driver_used` (por qual provedor saiu — revela se caiu no fallback),
`attempts`, e `whatsapp_error` / `email_error` / `tts_error`.

### POST /v1/phone/check — distinga os dois "não"

- **200** com `exists:false` → resposta **final**: o número não tem WhatsApp.
- **503** `whatsapp_session_down` → **nosso** verificador caiu (sessão fora nos dois
  provedores). É **retentável**; não conclua que o número é inválido nem bloqueie
  o cadastro por isso.

### POST /v1/admin/apps — provisionar um app

Uma chamada deixa o app pronto: `Account` + `ApiKey`, instância na Evolution GO (com webhook apontando de volta), caixa no Stalwart +
`MailIdentity`, shell de e-mail próprio, vozes, webhook do app e seed de templates.

```bash
curl -sS -X POST $BASE/v1/admin/apps \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"slug":"meuapp","name":"Meu App","phone_number":"5542999999999",
       "email_local_part":"noreply","email_domain":"v7m.org",
       "webhook_url":"http://10.1.30.101/hooks/notify"}'
```

**Idempotente**: rodar de novo reaproveita o que existe e completa o que falta.
Não gera key nova nem troca a senha do SMTP — para isso use `rotate_api_key` /
`rotate_mail_password`. **Nada aqui apaga instância**: apagar destrói a credencial
da sessão e obriga novo pareamento com o celular na mão.

**201** tudo certo · **207** falha parcial (o corpo traz `failed` e o relatório
passo a passo; o que deu certo permanece) · **400** entrada inválida.
A `api_key` aparece **uma única vez**, na resposta que a criou.

## Webhook do app — como o notify devolve

Cadastre a URL no painel (aba *webhook*) ou no provisionamento. O notify faz
`POST` com `Content-Type: application/json`:

```json
{ "event": "status", "data": { "external_id": "...", "whatsapp_status": "sent",
  "delivery_status": "read", "driver_used": "evolution-go", "attempts": 1 } }
```

```json
{ "event": "inbound", "data": { "from_number": "5542988887777",
  "preview": "quero saber do curso", "wa_message_id": "...", "payload": { } } }
```

Headers: `X-Notify-Event`, `X-Notify-Account` e — se o app cadastrou segredo —
`X-Notify-Signature: sha256=<hmac do corpo>`. Verifique com HMAC-SHA256 do corpo
bruto usando o segredo.

Responda **2xx**. Qualquer outra coisa (ou timeout de 10s) faz a Django-Q
reagendar a entrega.

## MCP — `POST /mcp`

JSON-RPC 2.0 sobre HTTP, mesma porta, mesma API key. A key define o app: as
ferramentas já enviam pelos canais dele.

```bash
curl -sS -X POST $BASE/mcp -H "Content-Type: application/json" \
  -H "Authorization: Bearer $KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call",
       "params":{"name":"notify_send","arguments":{
         "phone":"5542999999999","text":"Seu código é 123456","external_id":"otp-1"}}}'
```

Ferramentas: `notify_send`, `notify_send_event`, `notify_status`, `notify_history`,
`notify_inbox`, `notify_phone_check`, `notify_channels`, `notify_templates`,
`notify_template_upsert`.

Erro de uso volta como resultado com `isError: true` (leia o texto); só falha de
protocolo vira `error` JSON-RPC. Não há SSE — `GET /mcp` responde 405 de propósito.

Comece por `notify_channels` quando não souber o que o app tem configurado.

## Editando a API e o teor (o que um agente pode mudar)

- **Template de evento** (o texto que vai para a pessoa): `notify_template_upsert`
  no MCP, `PUT /v1/staff/templates/{account_slug}/{event}` na API, ou a aba
  *eventos* do painel. **Preserve os `{placeholders}`** — eles são preenchidos pelo
  `ctx` de quem dispara. Teste com
  `POST /v1/staff/templates/{account_slug}/{event}/preview`.
- **Shell de e-mail do app** (a marca): aba *template do e-mail*. O HTML precisa
  conter `{{content}}`; `{{title}}` e `{{service_name}}` são opcionais. Há um
  assistente que escreve/reescreve o shell pelo OmniRouter — a sugestão vem para
  revisão e **nada é salvo sem confirmação**.
- **Canais** (número, drivers, caixa de e-mail, vozes, webhook): abas do painel ou
  `POST /v1/admin/apps` (idempotente).
- **Novo evento**: crie o `Template` com o `event` e chame `/v1/send-event`.

A IA é **assistiva**: se o OmniRouter estiver fora, sugestões não aparecem e o
envio continua normal. Nenhuma entrega depende de modelo.

## Regras de operação

- Use `external_id` / `idempotency_key` **estável** por mensagem lógica: reenvio com
  a mesma chave não duplica entrega.
- Não reenvie OTP antigo nem mensagem já aceita — consulte o status antes.
- Serviço **IP-only** (LAN/VPN). Não publique no proxy da internet, não crie DNAT,
  não habilite TLS público, não troque o bind privado por wildcard.
- **Nunca** chame logout/delete de instância na Evolution: destrói a credencial da
  sessão e exige novo pareamento presencial com o dono do número.
- Em teste, envie só para o próprio número autorizado.
- **SMS**: o canal existe no modelo mas **não tem gateway** — sai como `skipped`.

## Integração rápida

1. `NOTIFY_API_KEY` no ambiente e base `http://10.1.30.114`.
2. `GET /v1/health` → `{"status":"ok"}`.
3. (Opcional) `POST /v1/phone/check` para validar o número.
4. `POST /v1/send` (ou `/v1/send-event`) com `external_id`.
5. Cadastre o webhook do app e reaja a `status` / `inbound` — evita polling.
6. Para diagnosticar: `GET /v1/notifications/{external_id}` e o painel em `/`.
