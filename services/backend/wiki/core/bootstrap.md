# core/bootstrap — o esqueleto do monólito

> Step **0** do MVP: o mínimo que faz o Django **subir**. Antes de qualquer app de negócio.
> Régua: `.claude/VISAO.md` + `.claude/CONVENTION.md`. Plano: `.claude/plan/0-init-django.md`.

## O que é

O `backend/` é o **monólito Django** — o cérebro (toda a lógica + o banco), conforme
[[../README|README]] e a CONVENTION. Este step só monta o esqueleto que roda: nada de
`users`/`hub`/`notify`/`integrations` ainda.

## Stack

- **uv** (deps + venv) · **Python 3.12** (baixado pelo uv via `.python-version`).
- **Django 5.2 LTS** (patch 5.2.14) · **django-environ** (config num ponto só).
- **Banco dev → SQLite** (`db.sqlite3`); prod → PostgreSQL via `DATABASE_URL` (depois).

## Layout

```
backend/
├── manage.py
├── pyproject.toml / uv.lock / .python-version
├── .env            # SECRET_KEY, DEBUG, ALLOWED_HOSTS (NÃO vai pro git)
├── .gitignore      # .env, db.sqlite3, .venv/, __pycache__/  (vivo)
└── core/           # settings, urls, wsgi, asgi
```

## Config (`backend/.env`)

`core/settings.py` lê tudo do `.env` com `django-environ`:

- `SECRET_KEY` · `DEBUG` · `ALLOWED_HOSTS`
- `DATABASE_URL` (ausente → SQLite local)
- `CORS_ALLOW_ALL_ORIGINS` · `CORS_ALLOWED_ORIGINS` (ver **CORS** abaixo)
- Fuso/idioma fixos no settings: `America/Sao_Paulo` / `pt-br`.

## Rodar em dev (local, porta 8000)

```bash
cd backend
uv sync                       # cria o .venv com as deps travadas
uv run python manage.py migrate
uv run python manage.py runserver
# GET /admin/ -> 302 -> /admin/login/
```

## Rodar em dev na porta 80 (`dev.m33.live`)

Este host de dev é **`10.1.20.30`** e **`dev.m33.live` aponta pra porta 80** dele. Pra o
domínio funcionar, suba o backend direto na 80 (porta <1024 → precisa de `sudo`; **dev-only**):

```bash
sudo .venv/bin/python manage.py runserver 0.0.0.0:80 --noreload
```

- **De fora (Victor):** `http://dev.m33.live`. **De dentro da rede:** use o IP `http://10.1.20.30`
  (o domínio pode não resolver de dentro).
- `ALLOWED_HOSTS` no `.env` já inclui `dev.m33.live` + `10.1.20.30`. Decisão/razão: `.claude/CONVENTION.md §11`.
- ⚠️ Via `sudo` o Django escreve `db.sqlite3`/sessões como **root**. Pro status endpoint (só
  leitura) não escreve; se for usar admin/migrar, use um método só de subida pra não misturar dono.

## CORS

`django-cors-headers` — `corsheaders` em `INSTALLED_APPS` e `CorsMiddleware` **antes** do
`CommonMiddleware`. Config no `.env`:

- **Dev:** `CORS_ALLOW_ALL_ORIGINS=True` (rede interna acessa fácil).
- **Prod:** `CORS_ALLOW_ALL_ORIGINS=False` + `CORS_ALLOWED_ORIGINS` com a lista explícita dos
  domínios dos edges/front.

Teste real do step: `.claude/tests/0-init-django.md`.
