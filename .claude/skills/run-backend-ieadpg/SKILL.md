---
name: run-backend-ieadpg
description: "Sobe e faz smoke test E2E do backend Django 6 + Ninja (porta 8000). Verbos: run, start, dev, smoke, debug, verify, restart. Use quando precisar subir o backend isolado pra testar endpoints via curl, ou debugar models/services sem subir o frontend."
---

# run-backend-ieadpg — backend Django 6 + Ninja

Sobe o **backend IEADPG** (Django 6 + Django Ninja in-process + Taskiq + Redis + Unfold admin) na porta 8000, em background, e oferece um **smoke test E2E** com 5 checks de API pública e gated.

**Plataforma**: Windows 11 + Git Bash (testado). Linux nativo: troque `.venv/Scripts/activate` por `.venv/bin/activate`.

**Caminho do repo**: paths na SKILL.md são relativos ao `<unit>/` (= `backend.ieadpg.org/`). O skill mora em `<unit>/.claude/skills/run-backend-ieadpg/`.

## Prereqs

```bash
# Python 3.12 com .venv criada no repo
cd backend.ieadpg.org
python -m venv .venv
source .venv/Scripts/activate
pip install -r requirements.txt
```

## Build (gate de deploy)

```bash
cd backend.ieadpg.org
source .venv/Scripts/activate
python manage.py check        # 0 errors, 3 warnings (chaves ausentes) — normal em dev
python manage.py migrate --noinput
```

## Run (agent path)

```bash
bash .claude/skills/run-backend-ieadpg/dev-up.sh
# imprime:
#   [dev-up] Subindo backend Django em :8000 ...
#   [dev-up] Backend PID=... — log=/tmp/ieadpg-backend-logs/backend.log
#   === Backend up em http://localhost:8000 ===
```

**Logs** (em `$TEMP/ieadpg-backend-logs/` ou `/tmp/`):
- `backend.log` — Django runserver stdout/stderr
- `backend.pid` — PID (pra `taskkill` se quiser matar)

## Run (agent path) — smoke test E2E

```bash
bash .claude/skills/run-backend-ieadpg/smoke.sh
# espera 5 checks:
#   [PASS] Backend health OK — /api/v1/public/church/setup-status
#   [PASS] Auth gate OK — /api/v1/members/me sem token
#   [PASS] Auth gate OK — /api/v1/leadership/presbytery sem token
#   [PASS] /api/v1/ openapi.json (Ninja schema) retorna 200
#   [PASS] Django check (gate de deploy) retornou
#   === Smoke test: ALL PASS ===
```

## Direct invocation (sem subir o servidor)

```bash
cd backend.ieadpg.org
source .venv/Scripts/activate

# Chamar service direto
python manage.py shell -c "
from apps.presbytery.services import active_functions
from apps.profiles.models import Profile
p = Profile.objects.first()
print('functions:', active_functions(p))
print('roles:', list(p.user.roles.filter(revoked_at__isnull=True).values_list('role', flat=True)))
"

# Chamar endpoint via test client (sem rede)
python manage.py shell -c "
from django.test import Client
c = Client()
r = c.get('/api/v1/public/church/setup-status')
print(r.status_code, r.json())
"

# Rodar uma migration
python manage.py makemigrations
python manage.py migrate
```

## Run (human path)

```bash
cd backend.ieadpg.org
source .venv/Scripts/activate
python manage.py runserver 0.0.0.0:8000
# abre admin em http://localhost:8000/admin/
# API docs em http://localhost:8000/api/v1/<audience>/docs
```

Audiences Ninja (4 grupos montados em `core/api.py`):
- `public` (sem auth) — `/api/v1/public/...`
- `members` (JWT) — `/api/v1/members/...`
- `leadership` (JWT + role ∈ lider/dirigente, ou cargo pastoral) — `/api/v1/leadership/...`
- `staff` (JWT + role) — `/api/v1/staff/...`

## Gotchas (coisas que eu REALMENTE quebrei a cara)

| Sintoma | Causa | Fix |
|---|---|---|
| `Port 8000 is in use, trying another one` | Outro Django ou agente anterior ocupando | `cmd //c "netstat -ano" \| grep ":8000.*LISTENING"` → PID → `cmd //c "taskkill /F /PID <pid>"`. `dev-up.sh` é idempotente: pula se já tem |
| `ModuleNotFoundError: No module named 'django'` | `.venv` não ativada | `which python` deve apontar pro `.venv/Scripts/python.exe`; se apontar pro system, `source .venv/Scripts/activate` falhou |
| `Token invalidado.` em curl autenticado | `assign`/`promote`/`grant`/`revoke` bumpam `Profile.token_version`; o JWT carrega o claim `token_version` no momento da emissão | Regenerar token: `python manage.py shell -c "from ninja_jwt.tokens import RefreshToken; from apps.profiles.models import Profile; p = Profile.objects.first(); t = RefreshToken.for_user(p.user).access_token; t['profile_uuid'] = str(p.uuid); t['token_version'] = int(p.token_version); print(t)"` — usar o `token_version` ATUAL do profile |
| `pkill python` não funciona | Git Bash no Windows não tem `pkill` | Use `cmd //c "taskkill /F /PID <pid>"` com PIDs do `netstat -ano` |
| `taskkill` direto no Git Bash não acha o PID | `taskkill` é do Windows cmd, não está no PATH do bash sem `cmd //c` | Sempre `cmd //c "taskkill /F /PID <pid>"` |
| `/api/v1/leadership/presbytery/me` retorna 500 | Ninja resolve rotas por ORDEM DE REGISTRO. `/me` precisa ser declarado ANTES de `/{profile_uuid}*` (Ninja first-match-wins, "me" é parseado como UUID) | Padrão estabelecido em `apps/presbytery/api.py`: rotas literais (`/me`, `/me/history`) ANTES das parametrizadas |
| `/api/v1/staff/credentials/` POST retorna 500 | Pydantic `Optional[T]` com `from __future__ import annotations` falha em forward-ref | Trocar pra `T \| None` (sintaxe union moderna). Conhecido bug em `apps/profiles/api.py:IssueCredentialInSchema` |
| Taskiq dashboard em :9000 espera `access-token: <token>`, NÃO `Authorization: Bearer` | Middleware custom em `taskiq_dashboard/api/middlewares.py` | `curl -H "access-token: supersecret" http://localhost:9000/api/...` |
| Auto-reload durante tests | `--reload` (default) recarrega o servidor quando você mexe em `.py` durante o smoke | Use `--noreload` no runserver (já tá no `dev-up.sh`) |
| `manage.py check` retorna 3 warnings (GEMINI_API_KEY, GOOGLE_VISION_API_KEY, CPFHUB_API_KEY) | É normal em dev — esses providers não são usados em rotas principais | Ignorar. Não bloqueia deploy |
| 422 Ninja em endpoint com enum retorna `{"allowed_values": {...}}` | Handler custom em `core/api.py:_install_422_handler` | Adicionar campo enum em `ALLOWED_VALUES_BY_FIELD` (`core/api.py:125-133`) |
| `Mark_ordained` rejeita com "Mulheres não compõem o presbitério" | Validação de gênero em `apps/presbytery/services.py` (convenção assembleiana) | Esperado — Profile com `gender="female"` não pode ser ordenada |
| `Database is locked` no SQLite | Outra transação aberta (ex: runserver + smoke simultâneo) | Aguardar ou `rm db.sqlite3 && python manage.py migrate` (em dev) |
| `Migration xxx is applied before its dependency yyy` | SQLite corrompido ou migration drift | `python manage.py migrate --noinput` resolve; se persistir, deletar `db.sqlite3` e migrar do zero (perde dados!) |
| OTP WhatsApp não chega | Evolution API offline em `10.1.20.200:8080` | Smoke **funciona** sem Evolution (não depende). Pra testar OTP: `python manage.py shell -c "from apps.authentication.models import LoginOtpState; print(LoginOtpState.objects.last().code)"` lê do banco |

## Troubleshooting

| Erro | Fix |
|---|---|
| `python: can't open file 'manage.py'` | `cd backend.ieadpg.org` antes — o `manage.py` está nesse dir |
| `psycopg2.OperationalError: connection to server failed` | `DATABASE_ENGINE=sqlite` no `.env` (dev). Se tiver postgres configurado, ver docker-compose |
| `DisallowedHost at /` | `ALLOWED_HOSTS` no `.env` precisa incluir o host. Dev: `localhost,127.0.0.1,0.0.0.0` |
| `OSError: [Errno 48] Address already in use` | Outra instância escutando. Mate PIDs do `netstat -ano \| grep :8000` |
| `CORS error` no browser | `CORS_ALLOW_ALL_ORIGINS=True` no `.env` em dev. Se faltar, adicionar |
| 404 em `/api/v1/public/...` | Verificar `core/api.py:public_api.add_router(...)` — cada router precisa ser MOUNTADO explicitamente. Routers órfãos (não montados) não funcionam |

## Verificação rápida (build + smoke)

```bash
# 1. Build gate
cd backend.ieadpg.org
source .venv/Scripts/activate
python manage.py check           # 0 errors
python manage.py migrate --noinput

# 2. Subir
bash .claude/skills/run-backend-ieadpg/dev-up.sh

# 3. Smoke
bash .claude/skills/run-backend-ieadpg/smoke.sh
#   ALL PASS

# 4. Matar
cat $TEMP/ieadpg-backend-logs/backend.pid 2>/dev/null | xargs -I {} cmd //c "taskkill /F /PID {}" 2>/dev/null
# ou
cmd //c "netstat -ano" | grep ":8000.*LISTENING" | awk '{print $5}' | xargs -I {} cmd //c "taskkill /F /PID {}"
```

## Arquivos do skill

- `SKILL.md` — este arquivo.
- `dev-up.sh` — sobe backend em background, idempotente.
- `smoke.sh` — 5 checks E2E.

## Stack

- **Django 6.0** + **Django Ninja 1.6** (in-process) + **ninja-jwt 5.4** (auth) + **Unfold 0.87** (admin) + **Taskiq 0.12** (background) + **Redis 7** (broker) + **SQLite** (dev) / **PostgreSQL** (prod via `DATABASE_URL`).
- **Integrações**: Evolution API (WhatsApp em `10.1.20.200:8080`, instance `ieadpg`), ElevenLabs (TTS), MiniMax (visão primário, Groq deprecated), Gemini (imagem), Asaas (PIX/boleto), InfinitePay (cartão).
- **Roles**: UserRole (assignments, NÃO flags booleanas) — ver memória `feedback-role-system-no-flags`.
- **Bootstrap-dirigente**: primeiro user assume todas lideranças e vai cedendo lugar — ver memória `feedback-bootstrap-dirigente`.
- **Audiences de auth**: `public` (sem auth), `members` (JWT), `leadership` (JWT + role ∈ lider/dirigente, ou cargo pastoral), `staff` (JWT + role). Ver `core/auth.py:75-122` e `core/api.py:80-110`.
- **Endpoints públicos úteis pra smoke**: `/api/v1/public/church/setup-status` (200 com `needs_setup`).
- **Documentação interativa**: `http://localhost:8000/api/v1/public/docs` (Ninja auto-gera OpenAPI).

## Apps relacionados

- **`contato-ieadpg/`** (outro repo) — SPA pastoral (steps de visitante). Usa `run-contato-ieadpg` skill lá. Roda em :5178+ quando a landing ocupa :5173.
- **`ieadpg-amalia-page/`** (outro repo) — Landing pública. Usa `run-ieadpg-landing` skill lá. Tipicamente em :5173.
