# MONOREPO_PLAN — Plano de consolidação `*.v7m` + `*.supletivo.net.br`

> **Status**: pesquisa de viabilidade (§ 11). Nada foi migrado ainda.
> **Casca**: `hub-v7m/` (vazio em `main`, branch de trabalho `claude/platform-testing-review-6gk9al`).
> **PoC**: [`poc-monorepo/`](./poc-monorepo) — Turborepo + pnpm workspaces com 3 apps dummy (Next / Astro / Vite) + 1 pacote de UI compartilhado. Prova de **deploy seletivo** abaixo.

---

## 1. Inventário dos repos atuais

Levantamento via `ls` + `package.json` + `pyproject.toml` em `/root/`. Tudo privado, sem publicação npm.

| Repo atual em `/root` | Stack | Domínio alvo | Package name (proposto) |
|---|---|---|---|
| `app-v7m/` | Next.js 16.2.9 (React 19, Tailwind 4) | `v7m.net.br` (aluno/prova) | `apps/web-aluno` |
| `app-supletivo/` | Next.js 16.2.7 + GSAP, linka `@supletivo/ui` | `supletivo.net.br` (aluno) | `apps/web-aluno-supletivo` |
| `app-staff/` | Next.js 16.2.7 | staff interno | `apps/web-staff` |
| `v7m-institucional/` | Vite + React 19 + SSR próprio, Tailwind 4 | `v7m.org` | `apps/web-v7m-org` |
| `landing-promotor/` | Astro 6.4.6, Playwright + axe | `promotor.v7m.net.br` | `apps/landing-promotor` |
| `landing-supletivo/` | Astro 6.4.6, Playwright + axe | `supletivo.net.br` (lp) | `apps/landing-supletivo` |
| `bot-supletivo/` | **Python** — FastAPI + aiosqlite + openai | webhook WhatsApp | `services/bot-fastapi` (fora do monorepo Node) |
| `backend-supletivo/` | **Python** — Django 5.2 + django-ninja + insightface | `api.supletivo.net.br` | `services/api-django` (fora do monorepo Node) |
| `packages/ui/` | pacote local `@supletivo/ui` | (linkado por `app-supletivo`) | `packages/ui` (mantido) |

**Observação importante**: `bot-supletivo` e `backend-supletivo` **não entram** no monorepo JavaScript. Serão pacotes irmãos (sibling monorepo ou apenas sub-pastas versionadas em paralelo). Razão: misturar `pnpm` com `pip`/`poetry` no mesmo `lockfile` é fricção constante sem ganho (Python tem maturidade própria de monorepo via `uv workspaces` ou `monorepo.py`).

---

## 2. Decisão arquitetural: **pnpm workspaces + Turborepo**

### 2.1 Trade-offs

| Critério | **pnpm + Turborepo** ✅ | **pnpm + Nx** | **Lerna (Bolt)** |
|---|---|---|---|
| Custo de entrada p/ Victor | Baixo — pnpm já é mentalidade monorepo | Médio — config Nx complexa | Alto — Lerna 6+ exige plugins |
| Cache local | ✅ trivial (`.turbo/`) | ✅ | ❌ removido em Lerna 7 |
| Cache remoto (LXC/1 runner) | opcional (`turbo login` com Vercel/self-host) | ✅ nativo (`nx-cloud`) | ❌ |
| `--filter` por path | ✅ (`--filter=app-promotor`) | ✅ (`nx run app:build`) | parcial |
| Detecção de pacotes afetados | ✅ via `git diff` em `inputs` glob | ✅ mais sofisticado (grafo de task) | ❌ |
| Compat. com Next/Astro/Vite modernos | ✅ puro | ⚠️ plugins por framework | ⚠️ |
| Suporte a Python sibling | ✅ (Python fica fora, vê § 5) | ⚠️ plugins Py | ❌ irrelevante |
| Manutenção | ativa (Turborepo 2.x, pnpm 9+) | ativa, multi-tenant | estagnada |
| **Veredito** | **escolhido** | bom, mas overkill p/ 7 apps | descartado |

**Por que não Nx**: Nx brilha em monorepos com 50+ pacotes, generators de código e task-graph distribuído. Aqui temos 7 apps JS — Turborepo é mais leve, mais rápido pra aprender, e o cache local já cobre o caso de uso ("1 runner por LXC" no enunciado). Se chegarmos a 30+ pacotes ou a workers distribuídos, migra-se pra Nx com `nx import` — não é caminho fechado.

**Por que não Lerna**: removedor de cache local na v7. Trabalho manual de orquestração. Sem vantagem concreta vs Turborepo em 2026.

### 2.2 Estratégia de deploy seletivo

O requisito **"não quebrar 1 runner por LXC"** significa: **só construa e publique o que mudou**. Turbo resolve isto nativamente:

- **Inputs glob** no `turbo.json` (`src/**`, configs por framework) → hash de invalidação.
- **`turbo run build --filter=app-promotor`** → só `app-promotor` + dependências (`@hub/ui`).
- **Cache local em `.turbo/cache/`** → segundo build idêntico retorna em <1s.
- **Deploy p/ LXC**: `turbo run build --filter=[origin/main]...` (só changed apps) + upload SFTP/SCP por path. Implementação alvo: GitHub Action com `pnpm deploy` ou `vercel-deploy`-style webhook por site (cada app é um projeto Vercel/LXC independente fora do monorepo).

---

## 3. Layout proposto (Fase 2)

```
hub-v7m/                              ← raiz do monorepo
├── apps/
│   ├── web-aluno/                    ← ex app-v7m/
│   ├── web-aluno-supletivo/          ← ex app-supletivo/
│   ├── web-staff/                    ← ex app-staff/
│   ├── web-v7m-org/                  ← ex v7m-institucional/
│   ├── landing-promotor/             ← ex landing-promotor/
│   └── landing-supletivo/            ← ex landing-supletivo/
├── packages/
│   ├── ui/                           ← ex packages/ui (já é workspace dep)
│   ├── eslint-config/                ← @hub/eslint-config (consolidado)
│   ├── tailwind-preset/              ← @hub/tailwind (tokens compartilhados)
│   └── tsconfig/                     ← @hub/tsconfig (base Next/Astro/Vite)
├── services/                         ← sibling directory, fora do `pnpm-workspace.yaml`
│   ├── api-django/                   ← ex backend-supletivo/
│   └── bot-fastapi/                  ← ex bot-supletivo/
├── infra/
│   ├── lxc/                          ← scripts de bootstrap p/ cada LXC
│   └── deploy/                       ← GitHub Actions seletivas
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
├── .changeset/                       ← Changesets p/ versionamento (não SemVer de apps)
├── .env.example                      ← consolidado
└── README.md                         ← mapa rápido
```

**Cada app permanece um pacote independente deployável** (não é Turborepo que decide pra onde vai o build — é um hook pós-build que faz upload por path). Apps continuam tendo `next.config` / `astro.config` / `vite.config` próprios.

---

## 4. Versionamento

Decisão do Victor (do enunciado): `0.0.0` → `0.0.x` (fix) → `0.x.0` (feature) → **0.1.0** (E2E verde + logs + CI/CD + monorepo) → `x.0.0` (grande mudança / mobile).

**Implementação técnica recomendada**:

| Componente | Versão | Como versiona |
|---|---|---|
| `hub-v7m` (raiz) | `0.1.0` | **tag SemVer no `main`** — uma versão do monorepo inteiro |
| Cada `apps/*` | herdada do `package.json` individual | **versionamento independente** via git tag por path (`apps/web-staff@0.4.2`) |
| `@hub/ui` | SemVer genuíno | Conventional commits + Changesets |
| `services/api-django` | SemVer (`backend` pyproject já é 0.1.0) | tag em `services/api-django/` |

**SemVer por app ≠ SemVer pelo monorepo**. O `0.1.0` do enunciado é a versão do monorepo inteiro — o que é correto porque "E2E verde + logs + CI/CD + monorepo" é um marco único. Apps podem ter suas próprias versões a partir daí (ex: `app-staff@0.2.0` antes do monorepo chegar a `0.2.0`).

**Ferramenta**: [Changesets](https://github.com/changesets/changesets) em `.changeset/` para os pacotes internos (`@hub/ui`, `@hub/eslint-config` etc.). Apps grandes usam **Conventional Commits + tag manual** por enquanto.

---

## 5. Como Python entra (não-conflituoso)

`bot-supletivo` e `backend-supletivo` **ficam em `services/`** mas **fora de `pnpm-workspace.yaml`**. Cada um mantém `pyproject.toml` próprio.

Opções para uni-los em CI:

1. **Sibling monorepo dentro do mesmo repo**: `services/api-django/pyproject.toml` com `[tool.uv]` workspaces (`uv workspace`) ou `monorepo.py`. **Recomendado**.
2. **Apenas coabitação**: dois `Dockerfile` independentes, cada um com seu CI Python. **Mais simples, suficiente.**

Se Victor decidir consolidar Python, primeiro passo: trocar `pip install -r requirements.txt` por `uv lock + uv sync` em ambos, depois adicionar `[tool.uv.sources]` no `services/api-django/pyproject.toml`.

**Separar lockfiles evita**: `pnpm-lock.yaml` e `uv.lock` disputarem resolução de dependências transitivas (ex: requests vs httpx num shared workspace).

---

## 6. Plano em 3 fases

### Fase 1 — **PoC + validação** (esta entrega, branch `claude/platform-testing-review-6gk9al`)
- ✅ `hub-v7m/poc-monorepo/` com Turborepo 2.10.4 + pnpm 9.15.9
- ✅ 3 apps dummy (`web-next`, `web-astro`, `web-vite`) + pacote `ui` shared
- ✅ Validado: `pnpm turbo run build --filter=app-promotor` constrói só 1 app
- ✅ Confirmado por `--dry-run=json`: plano contém só o app selecionado + dependências
- **Próximo**: revisar PR, ajustar `turbo.json` se preferir remote cache, validar que CI reproduz o filtro.

### Fase 2 — **Migração controlada** (NÃO iniciar sem aprovação)
1. **Semana 1**: consolidar 1 app de baixo risco (`app-staff` — menos dependências externas) usando `git subtree` para preservar histórico.
2. **Semana 2**: criar `packages/tsconfig`, `packages/eslint-config`, `packages/tailwind-preset` baseado nos duplicados dos 3 Next apps.
3. **Semana 3**: migrar `app-v7m` + `app-supletivo` (vinculados a `@supletivo/ui`).
4. **Semana 4**: migrar 2 Astro (`landing-*`) com Playwright/Axe — estes têm `.github/workflows` próprias que precisam virar ações centralizadas.
5. **Semana 5**: migrar Vite (`v7m-institucional` — tem SSR próprio, é o mais delicado).
6. **Semana 6**: mover `backend-supletivo` + `bot-supletivo` para `services/` sem unificar lockfiles Python.

**Comando de migração** (exemplo para `app-staff`):
```bash
git subtree add --prefix=apps/web-staff \
  ../app-staff.git main --squash
# depois, na migration, rename no package.json pra @hub/web-staff
```

### Fase 3 — **CI/CD + tag 0.1.0**
1. Substituir GH Actions individuais por `.github/workflows/monorepo.yml` com matrix + `turbo run build --filter=[origin/main]...`.
2. Configurar deploy por path → um webhook por LXC/site recebe "estes apps mudaram, faça deploy destes paths".
3. Habilitar Turborepo remote cache (Vercel Remote Cache gratuito, ou self-host minio).
4. **Quando tudo estiver verde**: tag `v0.1.0` na raiz do monorepo.

---

## 7. Riscos & mitigações

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Apps com GH Actions próprias brigam pelo mesmo runner | Alta | Phase 3 desativa GH Actions individuais; matrix central |
| `git subtree` perde histórico se squash | Média | `--squash=false` na primeira tentativa, validar `git log apps/web-staff` mostra 100% do histórico |
| Python entra no `pnpm-workspace.yaml` por engano | Média | Phase 3 enumeração explícita: Python fica em `services/`, sem wildcard |
| Lockfile drift entre app original e monorepo | Alta | Re-instalar do zero em CI (`pnpm install --frozen-lockfile`); preferir `--filter` desde o dia 1 |
| Versão de Node divergente entre apps (16.2.7 vs 16.2.9) | Baixa | `.nvmrc` na raiz fixa versão única; apps migram juntas |
| Vite SSR (`v7m-institucional`) ter config única | Alta | Manter `vite.config` intacto dentro de `apps/web-v7m-org/`; Turbo não toca build, só orquestra |

---

## 8. Acceptance check (esta entrega)

- [x] Plano de migração escrito (`MONOREPO_PLAN.md`).
- [x] PoC de deploy seletivo em `poc-monorepo/` com Turborepo.
- [x] Branch `claude/platform-testing-review-6gk9al` com PoC (sem merges).
- [x] Validação: `pnpm build` filtrado constrói só 1 pacote (provado com `--filter=app-promotor`).
- [x] Trade-offs Turborepo vs Nx vs Lerna documentados (§ 2.1).
- [x] Plano em 3 fases (§ 6).
- [ ] PR draft: **precisa de gh CLI; criando abaixo**.

---

## 9. Trade-offs resumidos (TL;DR)

**Turborepo escolhido** porque: monorepo JS de 7 apps, cache local resolve "1 runner por LXC", `--filter` é o requisito central, e a curva de aprendizado é a menor das 3 opções. Nx seria a segunda escolha se crescermos para 30+ pacotes ou tasks distribuídas; hoje é overkill. Lerna foi descontinuado de fato.

**Python fica fora** porque: maturidade de monorepo Python (uv workspaces) é paralela mas independente; misturar pip+pnpm num mesmo `package.json` raiz traz fricção sem ganho nesta escala.
