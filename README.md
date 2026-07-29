# notify-server

Serviço de notificação multi-tenant — Django + Ninja + Django-Q.

## O que é

Relay de notificação da casa — **não é caixa postal**. Recebe destino já validado +
conteúdo + flags e entrega em todos os canais do app: WhatsApp (texto, mídia, nota
de voz), e-mail e, quando houver gateway, SMS. Devolve o que aconteceu pelo webhook
do app.

**1 app = 1 Account = 1 API key.** Cada conta tem seus números WhatsApp (instância
nos dois Evolutions), caixa de e-mail (mailcow), shell de e-mail próprio, vozes de
TTS, templates e webhook.

## Stack

- Django 5.1 + django-ninja (API)
- django-q2 (task queue, broker=DB)
- Postgres (produção) / SQLite (dev)
- Evolution v2 (base) + Evolution GO (fallback e funções extras)
- OmniRouter → MiniMax (TTS) e assistente de texto (opcional)
- SMTP/mailcow (e-mail)

## Setup dev

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # editar
DATABASE_URL=sqlite:///db.sqlite3 python manage.py migrate
DATABASE_URL=sqlite:///db.sqlite3 python manage.py shell -c "from accounts.models import Account; Account.objects.create(slug='default', name='Default')"
DATABASE_URL=sqlite:///db.sqlite3 python manage.py notify_seed --account default
DATABASE_URL=sqlite:///db.sqlite3 python manage.py runserver
```

## API

Auth: `Authorization: Bearer <api-key>`

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/v1/send` | Envio direto (texto/mídia/TTS) |
| POST | `/v1/send-event` | Envio por evento (Template do DB) |
| GET | `/v1/notifications` | Histórico por conta |
| POST | `/v1/phone/check` | Verifica números no WhatsApp |
| GET | `/v1/health` | Saúde do serviço |
| Staff | `/v1/staff/templates` | CRUD de Templates |
| Staff | `/v1/staff/adhoc` | Envio avulso |
| Admin | `/v1/admin/apps` | Provisiona um app inteiro (idempotente) |
| Webhook | `/v1/webhook/evolution/{instance}` | Entrada da Evolution (inbound + status + conexão) |
| MCP | `POST /mcp` | JSON-RPC para agentes (escopo = API key) |

## Painel

`http://10.1.30.114/` — um painel por app, editável: WhatsApp (v2 e GO), e-mail
(mailcow + SMTP), shell de e-mail da marca, vozes, webhook, templates de evento,
envios e recebidas. Sem login: quem tranca a porta é o Caddy (bind privado). O
contrato para agentes fica em `/skill.md`.

## Status de entrega

`sent` = o provedor aceitou. `delivered` / `read` vêm do `MESSAGES_UPDATE` da
Evolution, casados pelo `provider_message_id` guardado no envio. O estado só
avança — ACK atrasado não rebaixa.

## Mídia e TTS no Evolution GO

O Evolution GO baixa a mídia pela URL enviada ao `POST /send/media`. Como o
`notify-server` está no `pve-prod` e o GO no `pve-dev`, `MEDIA_LAN_BASE` deve
apontar para o relay privado `http://10.3.20.1:8114`. Os units systemd dos dois
hosts estão em `deploy/evolution-go-media/`.

O TTS gera MP3 pelo OmniRouter/MiniMax, salva em `MEDIA_ROOT/tts/` e o GO
converte o arquivo para Opus antes de entregá-lo como nota de voz (PTT).

## Deploy (LXC)

Ver `deploy/`.
