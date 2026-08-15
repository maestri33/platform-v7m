# Handoff — buildout do app-promotor (C)

> **Para que serve:** abrir sessão(ões) novas pra construir o `app-promotor` quase do
> zero. Ele é **scaffold M0** hoje (7 arquivos, zero cliente HTTP). Este doc é o mapa.
> **Régua: palavra do Victor > este doc > qualquer doc de IA antigo.** Confirmar
> sequência com o Victor antes de cada fatia grande (cultura de Portão, "sem pressa").

## O que é este app (arquitetura, palavra do Victor 2026-06)

O **app do lado interno / v7m** — o "outro lado" do `app-supletivo` (que é o do aluno).
Um app, **superfícies role-gated**, consumindo **3 grupos** da API Ninja:

| Papel | Superfície | Grupo API | Entrada |
|---|---|---|---|
| **promotor / candidato** | funil do colaborador (base do app) | `collaborators` | login normal |
| **coordenador** | painel do polo/hub | `leadership` | **botão** que abre o painel |
| **staff ("boss")** | painel staff (carrega **qualquer** polo/hub) | `staff` | **botão** que leva ao painel |

> ⚠️ **Tensão com o CLAUDE.md:** o `CLAUDE.md`/`plan/16` atual escopa M0–M5 só no fluxo
> **collaborators** e marca "telas do coordenador" como **FUTURO (proibido)**. O Victor
> **expandiu** isso nesta conversa (coord + staff no mesmo app, via botão). **Reconciliar
> com o Victor** a ordem: terminar collaborators primeiro (M1–M5) e depois leadership/staff,
> ou intercalar. NÃO assumir — perguntar.

## Estado atual (M0 scaffold)

```
app/{page.tsx, layout.tsx, globals.css}   components/{layout/*, ui/Button.tsx}
next.config.ts (proxy /api/* → backend)    SEM lib/, SEM cliente HTTP, SEM telas
```
Estrutura: **root `app/`** (não `src/app/`), componentes **PascalCase** (`Button.tsx`),
`components/{layout,ui}`. (Difere do `app-supletivo`, que usa `src/` + kebab-case — é
uma divergência conhecida entre os dois fronts; **siga o padrão deste repo**.)

## O que cada grupo expõe (inventário real do backend)

Confira sempre no OpenAPI vivo: `GET /api/v1/<grupo>/docs`. Snapshot (2026-06):

### `collaborators` (~23) — base do app
- **auth:** `POST /auth/register · /auth/check · /auth/login` (+ `/refresh`, `/whoami`)
- **candidate:** `GET /candidate/me` · `POST /candidate/profile` · `GET|POST|PATCH /candidate/address`
  · `POST /candidate/documents` · `GET|PATCH /candidate/document` · `POST /candidate/documents/photo/{slot}`
  · `POST /candidate/pix` · `POST|GET /candidate/selfie`
- **training:** `GET /training/materials` · `GET /training/progress` · `POST /training/submissions`
- **promoter (painel):** `GET /promoter/me · /me/leads · /me/commissions · /study/pricing` · `POST /promoter/study/start`

### `leadership` (~36) — painel do coordenador
- **auth:** `POST /auth/check · /auth/login`
- **leads:** `GET /leads · /leads/{ext}`
- **matrículas:** `GET /enrollments · /enrollments/{ext}` · `POST .../fee/pay · /fee/schedule · /conclude
  · /rg/decide · /selfie/decide · /address · /documents/rg/photo/{slot} · /selfie · PATCH .../profile` (age-no-lugar)
- **reviews:** `GET /reviews` (fila única de decisões)
- **candidatos:** `GET /candidates · /candidates/{ext} · /candidates/{ext}/selfie` · `POST .../selfie/decide
  · /document/decide · /document/reset · /approve · /reject`
- **alunos:** `GET /students/{ext}` · `POST .../exam/grade · /pendencies · /pendencies/{ext}/resolve
  · /documentation/clear · /diploma/issue`
- **promotores:** `GET /promoters` · `POST .../suspend · /reactivate`
- **treino:** `GET|POST|PUT /training/materials`

### `staff` (28) — painel staff (qualquer hub)
- **hubs:** `POST|GET /hubs · PUT /hubs/{ext}/coordinator · /default · PATCH /hubs/{ext}/address`
- **finance:** `GET /finance/balance · /summary · /commissions · /payouts`
- **integrações:** `GET /integrations · /integrations/{name}` · `POST .../setup · .../test`
- **operação:** `GET /system · /logs/unrouted · /logs/ai-calls · /logs/checks`
- **views globais:** `GET /leads · /enrollments · /students · /promoters · /users` · `PUT /users/{ext}/phone`
- **treino:** `POST|PUT|GET|DELETE /training/materials · POST .../publish`

## Convenções OBRIGATÓRIAS (CLAUDE.md + lições da auditoria)

1. **`external_id` (UUID) é a borda — NUNCA PK.** Auditado no back: limpo. Mantenha.
2. **Erros: envelope `{detail, code, …extra}` → roteie por `switch(code)`, NUNCA parseando
   `detail`.** ⚠️ O `app-supletivo` errou isso (ignora `code`) — **nasça certo aqui**:
   capture `code` + extras (`expected_status`, `retry_after_s`, `missing_fields`) no client HTTP.
3. **Auth = cookies HttpOnly** (`v7m_access` + `v7m_refresh`) via **route handlers do Next**
   (`app/api/auth/{login,refresh,logout}/route.ts`); o cliente **nunca toca no token**.
   (Difere do `app-supletivo`, que usa localStorage — aqui é o modelo seguro.)
4. Código/identificadores em **inglês**; texto humano em **pt-BR**.
5. **Não criar arquivo que não foi pedido** (sem README por módulo, sem RUNBOOK, etc.).
6. **`AGENTS.md`: "This is NOT the Next.js you know"** — **ler `node_modules/next/dist/docs/`
   antes de escrever código Next.**
7. Backend é dependência externa via HTTP (`/api/v1/collaborators|leadership|staff/...`).
   NÃO mexer no backend a partir daqui.

## Sequência sugerida (confirmar com o Victor)

Milestones do CLAUDE.md (collaborators): **M1** auth (cookies + role-router) → **M2a**
wizard perfil+endereço → **M2b** documento foto+OCR → **M2c** pix R$0,01 + selfie async
(Portão 3 — toca $$/foto real) → **M3** treino → **M4** painel do promotor → **M5** polish/a11y.
**Depois** (expansão do Victor): **leadership** (painel do polo, via botão por role) e **staff**
(painel global). Pendências de produto (copy do hero, pix real, selfie real, CNH-e) → **perguntar
ao Victor, não decidir sozinho**.

## Primeiros passos da próxima sessão

- [ ] Confirmar com o Victor a ordem (collaborators completo antes de leadership/staff?).
- [ ] Ler os docs do Next no `node_modules` (AGENTS.md).
- [ ] Decidir estrutura (root `app/` + PascalCase — padrão deste repo).
- [ ] **M1:** route handlers de auth (cookies HttpOnly) + client HTTP com `switch(code)` + role-router
      (lead/enrollment/student → redireciona pro app do aluno; promoter/candidate → fica; coord/staff → botão).
- [ ] Seguir M2→M5; cada milestone vai a Portão 3 separado (testes aprovados).
