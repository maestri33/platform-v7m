# backend-supletivo

API Django da plataforma V7M. O frontend oficial, o bot e o serviço de notificações são projetos
externos; este repositório mantém somente regras de negócio, persistência e integrações necessárias.

## Desenvolvimento

```bash
uv sync
uv run python manage.py migrate
uv run python manage.py runserver
```

A configuração local fica em `.env`. Para enviar OTP e eventos, configure `NOTIFY_SERVER_URL` e
`NOTIFY_API_KEY`. A API pública está em `/api/v1/`, o admin Django em `/admin/` e o health check em
`/api/v1/health/healthz`.

## Verificação

```bash
set -a; source .env.ci; set +a
uv run python manage.py makemigrations --check --dry-run
uv run python manage.py check
uv run pytest
```

As apps `bot` e `notify` ainda carregam migrations de remoção. Elas devem continuar em
`INSTALLED_APPS` até essas migrations terem sido aplicadas em todos os ambientes.
