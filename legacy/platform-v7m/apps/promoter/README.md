# Promotor V7M — Frontend

App do colaborador (candidato → treinamento → promotor pleno) do projeto V7M.

- Stack: Next.js (App Router) + TypeScript + Tailwind v4 (`@theme inline`).
- Backend consumido: `~/mvp/backend/` (Django + Ninja), em
  `/api/v1/collaborators/`.
- Plano + decisões: `.claude/plan/16-frontend-promotor.md`.

## Comandos

```bash
npm install
npm run dev        # dev server (porta 3000 por padrão)
npm run lint
npm run build
```

## Configuração

Um único env (server-side, ver `.env.example`):

| Env | Dev | Prod |
|---|---|---|
| `BACKEND_URL` | `http://localhost:80` | `https://backend.v7m.live` |

O JWT do backend é **opaco** pro client — o Next guarda o par access/refresh em
**cookies HttpOnly** (`v7m_access` 15min, `v7m_refresh` 14d; `Secure` quando
`BACKEND_URL` é https) e repassa como `Bearer` pelos route handlers em
`app/api/`. O client nunca vê o token.

## Deploy (produção — build standalone)

`next.config.ts` usa `output: "standalone"` → o build gera um server Node mínimo
em `.next/standalone/`. Sequência (encaixa no CD por `/opt/deploy.sh` das outras
LXCs do projeto):

```bash
npm ci
npm run build
# standalone NÃO copia static/public sozinho:
cp -r .next/static .next/standalone/.next/static
[ -d public ] && cp -r public .next/standalone/public

# rodar (atrás de um reverse proxy — Nginx/Caddy — que faz TLS):
BACKEND_URL=https://backend.v7m.live NODE_ENV=production \
  node .next/standalone/server.js   # PORT=3000 por padrão
```

Provado em modo prod (`node .next/standalone/server.js`) contra o backend real
`backend.v7m.live` (superfície pública + proxy) e contra o backend dev (fluxo
autenticado E2E com token real). Ver `.claude/tests/16-m0-m5-final.md`.

## Estrutura

```
app/                    # App Router
  globals.css           # Tokens + @theme inline + base
  layout.tsx            # <html lang="pt-BR"> + fontes (next/font/google)
  page.tsx              # Home (hero)
  (auth)/               # entrar, cadastro (charcoal)
  (app)/                # painel + wizard do candidato + treinamento + painel promotor
  api/                  # route handlers (proxies finos pro Django)
components/
  ui/Button.tsx
  layout/{Container,Section,GrainSection}.tsx
lib/
  api/{config,client,django-error,types}.ts
  auth/{server,cookies}.ts
.claude/                # Plano, WORKFLOW, wiki
```
