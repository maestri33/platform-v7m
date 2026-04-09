# Backend IEADPG

Backend Django da IEADPG para autenticacao, onboarding de visitantes, notificacoes e integracoes externas.

## Stack

- Python 3.12
- Django 6
- Django Ninja + JWT
- PostgreSQL ou SQLite por ambiente
- Redis + Taskiq
- Unfold Admin
- Evolution API
- ElevenLabs
- Gemini
- Groq

## Arquivos importantes

- [`.env.example`](.env.example): template de configuracao do ambiente
- [`requirements.txt`](requirements.txt): dependencias congeladas da `.venv` atual
- [`readme/2026-04-09_03-11-46_utc.md`](readme/2026-04-09_03-11-46_utc.md): snapshot tecnico detalhado do app e da rodada anterior

## Setup rapido

1. Crie e ative a virtualenv.
2. Instale as dependencias com `pip install -r requirements.txt`.
3. Copie `.env.example` para `.env` e ajuste os valores.
4. Rode `python manage.py migrate`.
5. Suba a aplicacao com `python manage.py runserver`.

## Execucao de workers

- Worker Taskiq: `./start_worker.sh`
- Scheduler Taskiq: `python run_scheduler.py`
- Dashboard Taskiq: `python run_dashboard.py`
- Redis local de apoio: `docker compose up -d redis`

## Atualizacoes recentes

### Infra e ambiente

- configuracao de banco centralizada no Django, com suporte a SQLite e PostgreSQL
- configuracao de Taskiq, broker, scheduler e dashboard centralizada em `core/settings.py`
- criacao do `.env.example`
- criacao do `requirements.txt` para reprodutibilidade do ambiente

### Visitors e notificacoes

- fluxo de visitors consolidado com etapas `authentication`, `login`, `refresh`, `data`, `address` e `religious-data`
- notificacoes passaram a usar um caminho unico de enqueue via signal + `transaction.on_commit`
- task de teste perigosa removida; ficou apenas o processamento real de notificacoes agendadas
- ajustes conservadores no onboarding para nao quebrar fluxos existentes

### Banco e testes

- ambiente de desenvolvimento atual ajustado para PostgreSQL remoto
- suporte a testes no banco principal com `TEST_DATABASE_USE_PRIMARY=true`
- template de banco de teste forçado para UTF-8 no caso de Postgres

### Admin

- revisao dos `admin.py` principais
- correcao dos badges/status que usavam `format_html()` sem argumentos, problema que quebrava o admin em Django 6
- troca de link hardcoded no admin de profiles por `reverse()`
- ajuste do teste de OTP para respeitar o `transaction.on_commit`

## Validacao recomendada

- `python manage.py check`
- `python manage.py test`

## Observacoes

- a pasta `readme/` guarda snapshots e documentacoes mais detalhadas por rodada
- o status `21` do fluxo de visitors continua preservado para expansao futura
