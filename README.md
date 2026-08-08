# notify-server

Serviço de notificação multi-tenant — Django + Ninja + Django-Q.

## O que é

Plataforma de notificação universal da casa: entrega (WhatsApp texto/mídia/voice-note + e-mail), teor (Templates/Triggers editáveis por conta), auditoria por canal. Cada Account tem seus números WhatsApp, e-mail (mailcow), vozes TTS e templates.

## Stack

- Django 5.1 + django-ninja (API)
- django-q2 (task queue, broker=DB)
- Postgres (produção) / SQLite (dev)
- Evolution GO (WhatsApp)
- OmniRouter → MiniMax (TTS)
- SMTP/mailcow (e-mail)
- Sentry (erros — opt-in por `SENTRY_DSN`)

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
| Webhook | `/v1/webhook/evolution/{instance}` | Inbound da Evolution |

## Mídia e TTS no Evolution GO

O Evolution GO baixa a mídia pela URL enviada ao `POST /send/media`. Como o
`notify-server` está no `pve-prod` e o GO no `pve-dev`, `MEDIA_LAN_BASE` deve
apontar para o relay privado `http://10.3.20.1:8114`. Os units systemd dos dois
hosts estão em `deploy/evolution-go-media/`.

O TTS gera MP3 pelo OmniRouter/MiniMax, salva em `MEDIA_ROOT/tts/` e o GO
converte o arquivo para Opus antes de entregá-lo como nota de voz (PTT).

## Observabilidade (Sentry)

Opt-in: sem `SENTRY_DSN` o SDK não sobe e nada muda no comportamento. Com DSN, o
init acontece no `settings.py` e por isso vale para os três entrypoints — web
(gunicorn), `qcluster` (django-q) e `manage.py` avulso. Os units systemd já leem
o `.env`, então basta preencher lá e reiniciar.

| Variável | Default | Para que serve |
|----------|---------|----------------|
| `SENTRY_DSN` | vazio | Vazio desliga o SDK por completo |
| `SENTRY_ENVIRONMENT` | `production` (`development` se `DEBUG`) | Ambiente no Sentry |
| `SENTRY_RELEASE` | vazio | Versão — ex.: SHA do deploy |
| `SENTRY_TRACES_SAMPLE_RATE` | `0.0` | Amostragem de tracing |
| `SENTRY_PROFILES_SAMPLE_RATE` | `0.0` | Amostragem de profiling |
| `SENTRY_SEND_DEFAULT_PII` | `0` | IP, cookies e corpo da request |
| `SENTRY_INCLUDE_LOCAL_VARIABLES` | `0` | Locais dos frames do traceback |

### PII

As duas últimas vêm desligadas de propósito. Este serviço trafega telefone e
e-mail de destinatário, e as locais dos frames do dispatch são exatamente isso:
o número resolvido, o corpo da mensagem e a `Notification`. O SDK manda locais
por padrão, e `SENTRY_SEND_DEFAULT_PII=0` sozinho **não** segura esse caminho —
daí `SENTRY_INCLUDE_LOCAL_VARIABLES=0` também ser default. Ligue só para
depurar, ciente do que vai junto.

O contexto que o report monta à mão também deixa `recipient_phone` e
`recipient_email` de fora.

### O que é reportado

O dispatch converte falha de canal em `*_status=failed` no banco e segue em
frente, e o worker do django-q guarda só o texto do erro em `Task.result` — sem
report explícito nada disso chegaria ao Sentry. Então:

- **falha de canal** (WhatsApp, e-mail, TTS) → evento com as tags
  `notify.channel`, `notify.caller` e `notify.account`;
- **erro inesperado no job** → evento com a tag `notify.task`; a exceção sobe
  depois do report, que é o que faz o django-q marcar falha e retentar.

Telemetria não derruba envio: se o próprio report falhar, vira warning no log.

## Sentry MCP (agentes)

O `.mcp.json` na raiz aponta para o servidor MCP do Sentry, então uma sessão de
Claude Code (ou outro cliente MCP) aberta neste repo já enxerga as ferramentas de
busca de issue/evento. A primeira conexão dispara o OAuth do Sentry no navegador:

```bash
claude mcp list    # sentry ✓ connected
```

A URL pode ser escopada — o projeto é o recomendado:

```
https://mcp.sentry.dev/mcp                  # tudo que a conta enxerga
https://mcp.sentry.dev/mcp/{org}            # uma organização
https://mcp.sentry.dev/mcp/{org}/{projeto}  # um projeto
```

## Deploy (LXC)

Ver `deploy/`.
