# notify-server

Serviço de notificação multi-tenant — Django + Ninja + Django-Q.

## O que é

Plataforma de notificação universal da casa: entrega (WhatsApp texto/mídia/voice-note + e-mail), teor (Templates/Triggers editáveis por conta), auditoria por canal. Cada Account tem seus números WhatsApp, e-mail (mailcow), vozes TTS e templates.

## Stack

- Django 5.1 + django-ninja (API)
- django-q2 (task queue, broker=DB)
- Postgres (produção) / SQLite (dev)
- Evolution API v2 (WhatsApp)
- OmniRouter → MiniMax (TTS)
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
| Webhook | `/v1/webhook/evolution/{instance}` | Inbound da Evolution |

## Deploy (LXC)

Ver `deploy/` (a criar).
