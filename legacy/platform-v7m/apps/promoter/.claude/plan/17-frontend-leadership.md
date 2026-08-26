# Plano — Front do Coordenador (Leadership) · V7M

> Status: **IMPLEMENTANDO** (L0/L1 entregues em `feature/leadership`,
> 2026-06-23; login unificado já mergeado).
> Régua: este plano + o código de hoje em `/root/app-v7m`. Backend vivo em
> `https://backend.v7m.live/api/v1/leadership` (OpenAPI é a fonte da verdade).
> Plataforma alvo: **app.v7m.org**. Idioma: identificadores em inglês, texto
> humano em pt-BR. Anti-bloat: lib nova só quando a tela exigir, com porquê.

---

## 0. Contexto

O backend já expõe **3 áreas**: `collaborators` (autosserviço candidato→promotor,
já tem front aqui), `leadership` (console do **coordenador de hub**) e `staff`
(back-office global). Este plano é o **Leadership**. O Staff vem depois, com o
mesmo `console-planner`.

O front do colaborador (`app/(app)/...`) **nunca foi testado** e tem dívida
(provável erro de sintaxe em `EnderecoForm.tsx`, sem validação client-side). Mas
a **infra é boa e reusável**: `lib/api` (envelope `{detail,code}` + `djangoFetch`),
`lib/auth` (cookies HttpOnly `v7m_access`/`v7m_refresh`), `components/ui`
(`Button`, `Field`, `Card`, `Container`, `PageHeader`), e o padrão de route group
com gating no `layout.tsx`. **Construímos sobre essa infra, endurecendo-a no
caminho — sem reescrever o colaborador agora.**

Leadership é um app **list-heavy + decisão** (filas, detalhe, modais de
"decidir"), perfil oposto ao wizard linear do colaborador.

---

## 1. Decisões de arquitetura

| # | Decisão | Recomendação | Por quê |
|---|---|---|---|
| A | Onde mora o Leadership | **Mesmo repo/app Next, novo route group `app/(leadership)/`** | Reusa `lib/` e `components/ui` direto; um deploy só. Subdomínio/subpath fica como questão de infra (ver §8 Q1). |
| B | URLs | Prefixo **`/coordenador/...`** dentro do route group | pt-BR legível ao humano, igual `/perfil`,`/painel` do colaborador. |
| C | Auth | **Login UNIFICADO + role-router** (decisão Victor, 2026-06-23) | Um único `/` com `CheckFlow` do colaborador. Após o login, `pickFunnelRole()` lê as roles do JWT e roteia: coordenador → `/coordenador`, staff → `/staff`, promotor/candidato → `/painel`. Removeu-se o login por área (`LeadershipCheckFlow`, `/coordenador/entrar`, `/api/leadership/auth/*`). |
| D | Render das listas | **Server Components com `cache:'no-store'`** + `revalidatePath` após ação | Casa com o default dinâmico do Next 16 e com o `router.refresh()` que o colaborador já usa. SWR só onde há **polling** (análise async de selfie/doc). |
| E | Mutações (aprovar/decidir) | **Server Actions** retornando `{ok}|{code}` via `useActionState` | Idiomático no Next 16; o modal lê o `code` e roteia por `switch(code)`. |
| F | Gating de auth | **No `layout.tsx`** via `readLeadershipSession()` (igual colaborador) | Simples e já provado. `proxy.ts`/middleware fica opcional p/ redirect rápido. |

---

## 2. IA & navegação

```
app/
  (leadership)/
    layout.tsx              → gate: readLeadershipSession() || redirect("/")
                              shell: header (polo + nome + logout), nav lateral/topo
    coordenador/
      page.tsx               → HOME = fila de revisões (GET /reviews)
      leads/page.tsx         → lista        leads/[id]/page.tsx → detalhe
      candidatos/page.tsx    → fila         candidatos/[id]/page.tsx → workspace decisão
      matriculas/page.tsx    → lista        matriculas/[id]/page.tsx → workspace (⚠ PIX)
      alunos/[id]/page.tsx   → workspace do aluno (sem lista no back — ver Q3)
      promotores/page.tsx    → lista + ações inline
      treinamento/page.tsx   → autoria de materiais (lista/cria/edita)
  api/
    leadership/auth/{check,login,refresh,logout}/route.ts   → proxy p/ /api/v1/leadership/auth/*
```

Navegação (sidebar): **Revisões · Candidatos · Matrículas · Alunos · Promotores ·
Leads · Treinamento**. "Revisões" é a tela-âncora (worklist do dia).

---

## 3. Telas (endpoint → tela → ações → estados)

Legenda risco: 🟢 leitura · 🟡 decisão (sem $) · 🔴 dinheiro/identidade real (Portão 3 com Victor).

| Tela | Rota | Endpoints | Ações principais | Estados | Risco |
|---|---|---|---|---|---|
| **Entrar** | `/` (login unificado) | `POST auth/check`, `auth/login`, `auth/refresh` | Telefone→OTP→entrar; role-router envia coord p/ `/coordenador` | rate-limit (`RATE_LIMITED`+`retry_after_s`), 403 não-coordenador | 🟢 |
| **Revisões (home)** | `/coordenador` | `GET /reviews` | abrir cada pendência | vazio ("nada na fila"), loading, erro | 🟢 |
| **Leads** | `/coordenador/leads` | `GET /leads?status` | filtrar, abrir | vazio, filtro sem resultado | 🟢 |
| **Lead detalhe** | `/coordenador/leads/[id]` | `GET /leads/{id}` | — | 404 fora do polo | 🟢 |
| **Candidatos (fila)** | `/coordenador/candidatos` | `GET /candidates` | abrir | vazio | 🟢 |
| **Candidato workspace** | `/coordenador/candidatos/[id]` | `GET /candidates/{id}`, `/selfie`; `POST .../approve`, `/reject`, `/selfie/decide`, `/document/decide`, `/document/reset` | **aprovar** (→promotor, atribui treino), **rejeitar** (modal motivo, `RejectIn`), decidir selfie/doc, resetar doc | review pendente, `SELFIE_NOT_IN_REVIEW`, `NOT_HUB_COORDINATOR` | 🟡 (selfie/doc = identidade → sub-gate) |
| **Matrículas (lista)** | `/coordenador/matriculas` | `GET /enrollments?status` | abrir | parcelas em aberto | 🟢 |
| **Matrícula workspace** | `/coordenador/matriculas/[id]` | `GET /enrollments/{id}`; `POST fee/pay`, `fee/schedule`, `conclude`, `rg/decide`, `selfie/decide`, `address`, `documents/rg/photo/{slot}`, `selfie`; `PATCH profile` | **pagar 1ª taxa (PIX real)**, **agendar 2ª**, **concluir** (cria login plataforma), upload proxy RG/selfie, corrigir OCR, endereço por CEP | `FEES_INCOMPLETE` (409 no conclude), `422` sem due date no QR, **401 após conclude** (token_version sobe) | 🔴 |
| **Aluno workspace** | `/coordenador/alunos/[id]` | `GET /students/{id}`; `POST exam/grade`, `documents/{id}/decide`, `pendencies`, `documentation/clear`, `diploma/issue`; `POST /pendencies/{id}/resolve` | corrigir prova, decidir doc, abrir/resolver pendência, liberar documentação, emitir diploma | pendência aberta, doc em review | 🟡 |
| **Promotores** | `/coordenador/promotores` | `GET /promoters`; `POST .../suspend`, `/reactivate`, `/materials/{mid}/approve` | suspender, reativar, aprovar material (destrava preso no treino) | bloqueado por treino | 🟡 |
| **Treinamento** | `/coordenador/treinamento` | `GET/POST /training/materials`, `PUT /training/materials/{id}` | listar (c/ gabarito), criar, editar | material complexo (`content_blocks[]`, vídeo/foto/texto) | 🟡 |

**Modais de decisão** (todos leem `code` do retorno e exibem msg pt-BR por
`switch(code)`): aprovar/rejeitar candidato, decidir selfie, decidir doc, resetar
doc, corrigir prova, decidir doc do aluno, abrir/resolver pendência, liberar
documentação, emitir diploma, suspender/reativar, aprovar material, **pagar/agendar
taxa (🔴)**, **concluir matrícula (🔴)**.

---

## 4. Componentes — reusar vs construir

**Reusar as-is** (de `components/ui`, `lib/`): `Button`, `Field`/`SelectField`/
`ReadOnlyField`/`FieldError`, `Card`/`CardLink`, `Container`, `PageHeader`,
`Spinner`, `StatusBanner`/`Badge`/`Stat`/`CopyButton`/`FileInput`; `djangoFetch`
+ `DjangoError` + `djangoErrorResponse`; helpers de cookie (`setAuthCookies`/
`clearAuthCookies`/`readAccessToken`); `LogoutButton`; padrão de `layout.tsx` com
gating.

**Generalizar** (pequeno): `FunnelStepper` → `Stepper` recebendo `steps[]` (útil
no workspace de matrícula); extrair o padrão de mutação duplicado num hook/Server
Action util `useDecision()`/`runAction()` que devolve `{loading, error_code}`.

**Construir novo** (genéricos do console):
- `DataTable` — tabela com header, linhas, estado vazio/loading/erro e slot de
  filtro. **Mão + Tailwind primeiro**; TanStack Table só se precisar sort/virtualização (§7).
- `Modal`/`Dialog` — overlay acessível (focus-trap, ESC). **Em casa primeiro**;
  Radix `Dialog` só se a a11y de foco custar caro.
- `DecisionModal` — wrapper de Modal + form curto + tratamento `switch(code)`.
- `ReviewQueue` — lista agrupada da home (`/reviews`).
- `Money`/`DateBR` — formatação via `Intl` (sem lib).
- `OtpLogin` — CheckFlow do colaborador generalizado p/ área leadership.

**NÃO reusar**: `CheckFlow` candidato-específico (vira `OtpLogin`), wizard forms
(`PerfilForm`/`EnderecoForm`), `pickFunnelRole` candidato.

---

## 5. Camada de dados

- **Listas/detalhe**: Server Component faz `djangoFetch` autenticado
  (`cache:'no-store'`). Após uma ação, `revalidatePath` da rota → refetch.
- **Mutações**: **Server Action** (`'use server'`) lê cookie (`await cookies()`),
  chama o back, e retorna `{ok:true}` ou `{ok:false, code, extra}`. O componente
  usa `useActionState`; o `DecisionModal` faz `switch(code)`.
- **Polling** (só selfie/doc async em review): hook SWR client-side com
  `refreshInterval` até status sair de `pending`, respeitando `expires_at`.
- **Erro→UX por `switch(code)`** (nunca parsear `detail`):

| code | HTTP | UX |
|---|---|---|
| `NOT_HUB_COORDINATOR` / `*_NOT_FOUND` | 403/404 | "Esse registro não é do seu polo." + voltar |
| `FEES_INCOMPLETE` | 409 | bloqueia "Concluir", aponta parcela faltante |
| `SELFIE_NOT_IN_REVIEW` | 422 | recarrega estado; some o botão decidir |
| `WRONG_STATUS` | 409 | "Ação fora da etapa atual" + refresh |
| `RATE_LIMITED` | 429 | countdown com `retry_after_s` no OTP |
| `UNAUTHORIZED`/`SESSION_EXPIRED` | 401 | tenta refresh; se falhar → `/` |
| `VALIDATION_ERROR` | 422 | erros por campo (lista pydantic) |
| `ERROR`/desconhecido | — | banner genérico pt-BR + log |

⚠️ **`conclude` sobe `token_version`** → o JWT atual morre. Após concluir, tratar
o 401 seguinte como esperado (refresh ou re-login), não como falha.

---

## 6. Auth do coordenador

Fluxo OTP unificado: o mesmo `CheckFlow` do colaborador em `/` dispara
`POST auth/check` → `auth/login` (OTP→JWT) → `auth/refresh` (rotaciona par).
O JWT carrega as roles da pessoa, então **não há auth separada por área**.

Plugin na infra existente:
1. `lib/auth/server.ts`:
   - `readLeadershipSession()` → lê cookie → chama `leadership/whoami`.
   - `pickFunnelRole()` → inspeciona roles do JWT e roteia.
2. `app/(leadership)/layout.tsx` gateia por `readLeadershipSession()`;
   sem sessão → redirect `"/"`.
3. **Removidos** (decisão 2026-06-23): `LeadershipCheckFlow`,
   `/coordenador/entrar`, `app/api/leadership/auth/*`.

Regras de role-router:
- coordenador → `/coordenador`
- staff → `/staff`
- promotor/candidato → `/painel` (com `TrainingGate` se ainda em treinamento)
- 403 em `leadership/whoami` (não coordenador) mostra tela de "não autorizado"
  dentro do shell unificado.

---

## 7. Ferramentas — o que precisa

| Ferramenta | Quando | Veredito |
|---|---|---|
| next 16 / react 19 / swr / tailwind v4 | já no projeto | **manter** |
| **zod** | validar os muitos forms de decisão (motivo, grade, pendência, CEP) antes do round-trip | **adicionar já** (justificado) |
| **react-hook-form** | só a autoria de material (`content_blocks[]` com field arrays) é complexa | adicionar **só na tela de treinamento** |
| Modal | overlays de decisão | **em casa**; Radix `Dialog` só se a11y de foco doer |
| Tabela | listas | **em casa**; **TanStack Table** só se precisar sort/paginação/virtualização |
| date-fns | datas | opcional; **preferir `Intl`** |
| libs de teste (vitest/playwright) | — | **fora de escopo** (regra do CLAUDE.md) |

Notas Next 16 a respeitar no código: `await cookies()`/`await headers()` (agora
async); `params` é `Promise` em rotas dinâmicas; `fetch` é dinâmico por padrão
(o `cache:'no-store'` atual está OK); Server Actions para mutações; `middleware`
está sendo renomeado p/ `proxy` (`NextMiddleware`→`NextProxy`).

---

## 8. Milestones (cada um fecha num Portão 3 separado — sem pressa)

| M | Entrega | Risco |
|---|---|---|
| **L0** | ✅ Scaffold `(leadership)` (shell+nav+gating) + **login unificado** (único `/`, `CheckFlow` do colaborador, role-router, `readLeadershipSession`). `/coordenador/entrar` + `/api/leadership/auth/*` removidos. **Build verde 2026-06-23.** | 🟡 mexe login |
| **L1** | ✅ **Revisões** (`/reviews`, **7 baldes reais**) + **Leads** lista/detalhe — só leitura, render **defensivo** (contrato não publicado no OpenAPI). **Build verde.** | 🟢 |
| **L2** | **Candidatos**: fila + workspace + decisões (aprovar/rejeitar/selfie/doc/reset) | 🟡 (selfie/doc real → sub-gate) |
| **L3** | **Alunos**: prova, decidir doc, pendências, liberar documentação, diploma | 🟡 |
| **L4** | **Promotores** (suspender/reativar/aprovar material) + **Treinamento** (autoria) | 🟡 |
| **L5** | **Matrículas**: workspace + **taxa PIX real (pay/schedule)** + concluir | 🔴 **Portão 3 dedicado com Victor**, valores controlados |
| **L6** | Polish + a11y (foco em modais, teclado, leitores de tela) | 🟢 |

Ordem proposital: leitura primeiro, **dinheiro por último**.

---

## 9. Perguntas para o Victor (não decidir sozinho)

1. **Domínio/deploy de app.v7m.org**: app único Next com route groups
   (`/coordenador`, `/staff`) ou subdomínios separados? (muda só infra/CORS)
2. ~~**Login unificado + role-router** (1 entrada) **ou** login por área~~ — **resolvido em 2026-06-23: login unificado** (Decisão C).
3. **Alunos não têm endpoint de lista** no leadership — confirmar que o aluno é
   acessado só via Matrícula/Revisões, ou falta `GET /students` aí.
4. **Copy/branding** do console: herdar o skin V7M gold+charcoal do colaborador
   ou identidade própria de coordenador?
5. **L5 (PIX real)**: usar uma matrícula de teste com valores controlados pra
   validar `fee/pay` e `fee/schedule` sem risco?
6. **Front do colaborador** ("uma bosta", não testado): endurecemos o `lib/`
   compartilhado conforme o Leadership usa (e corrigimos o provável bug do
   `EnderecoForm`), ou fica congelado?
7. **`/reviews`**: o payload agregado é suficiente pra montar a worklist da home,
   ou compomos a home a partir das listas por seção?

---

## 10. Riscos

- 🔴 **PIX real** (`fee/pay`/`fee/schedule`) e **selfie/RG real** (uploads proxy) —
  nunca automatizar; Portão 3 com Victor.
- ⚠️ **`conclude`** cria login de plataforma e invalida o JWT (token_version) —
  tratar 401 subsequente como esperado.
- ⚠️ **Async sem webhook**: análise de selfie/doc é **poll** (`expires_at`).
- ⚠️ **Escopo de hub**: tudo é hub-scoped; `NOT_HUB_COORDINATOR`/404 são normais.
- ⚠️ **Dívida herdada**: `lib/`/`components` vêm de app não testado — validar ao
  reusar (ver Q6).
