# Plano — Purga de delírios, funil de matrícula ponta a ponta e identidade visual

> **Evidência fixada em** `bb7227e4f42a2c44e479417f5f1e8bad13309490` (branch `152-ponytail-purge`), árvore de trabalho **suja** (72 paths). Índice GitNexus reindexado com `--pdg` nesta sessão (49.644 nós / 111.387 arestas / 521 clusters / 898 flows). Ver §11 para o digest canônico.
>
> **Classes de afirmação:** `[verified]` = lido no fonte ou medido no banco/runtime nesta sessão · `[graph]` = do índice GitNexus · `[inferred]` = deduzido de evidência verificada · `[assumed]` = não verificado, ver §12.

---

## 1. Objetivo

Matricular o primeiro aluno de verdade.

Tudo o mais neste plano é subordinado a isso. A purga de código alucinado e o trabalho de identidade visual entram porque atrapalham o objetivo ou porque podem correr em paralelo sem tocar no caminho crítico — não porque sejam fins em si.

**Critérios de aceite:**

1. Um lead real percorre telefone → OTP → CPF → e-mail → plano → checkout → pagamento → RG → endereço → escolaridade → selfie → contrato → `Enrollment` criada, sem intervenção manual no banco.
2. Nenhuma rota de produção serve PII sem autenticação.
3. Nenhuma suíte E2E reporta verde interceptando `**/api/**` sem que exista uma suíte equivalente contra o backend real.
4. `apps/landing-supletivo` volta a renderizar com a tipografia e a paleta próprias do projeto.

---

## 2. Estado atual — a descoberta que reordena o plano

**O funil nunca foi completado uma única vez.** Não é "converte mal": nunca rodou até o fim. Medido no Postgres `backend` do ambiente de dev nesta sessão `[verified]`:

| Tabela | Linhas | Leitura |
| --- | ---: | --- |
| `users_lead` | 3 | todas `status='pending'`, criadas em 2026-08-29, `failed_reason` vazio |
| `users_profile` (dos 3 leads) | 3 | **`cpf` e `email` vazios nos três** |
| `users_lead_checkout` | 0 | nenhum checkout jamais criado |
| `asaas_payment` | 0 | nenhuma cobrança |
| `users_enrollment` | 0 | nenhuma matrícula |
| `users_student` | 0 | nenhum aluno |
| `users_enrollment_education` | 0 | passo de escolaridade nunca alcançado |
| `users_document_rg` | 4 | `validation_status='pending'`, `validated_at=NULL`, `front/back/full_photo` **vazios** |
| `ai_aicall` | 0 | a IA de documento nunca foi invocada |
| volume `/app/media` | 6 arquivos | só `.ogg` de TTS — **zero imagens de documento** |
| `django_q_task` | 73 | 100% sucesso, mas 49 são `boot_selftest`; o resto é push (21) e avatar (3) |

### 2.1 Onde exatamente o funil para

`set_checkout` exige `cpf` **e** `email` no perfil e devolve 409 `PROFILE_INCOMPLETE` sem eles — `services/backend/users/roles/lead/service.py:491-505` `[verified]`. Os três leads têm ambos vazios, então nenhum deles jamais conseguiu criar checkout `[verified]`.

A consequência é estrutural, não incidental: `Enrollment` só nasce em `mark_paid → _apply_effects` (`lead/service.py:690,727`) `[verified]`, e **todo** o wizard de documentos vive no papel `enrollment`, cujo `upload_rg_photo` começa por `_require(...)` numa `Enrollment` existente (`users/roles/enrollment/service.py:568,578`) `[verified]`. O `lead/service.py` não tem nenhuma função de upload de documento `[verified]`.

Portanto: **sem CPF → sem checkout → sem pagamento → sem `Enrollment` → o wizard inteiro de documentos é inalcançável por construção.**

Os 4 RGs no banco pertencem a users com papel `lead` e `candidate` e são cascas vazias criadas por outro caminho `[verified]`; não são prova de que o upload funciona.

### 2.2 O que isso significa para os defeitos já auditados

As três auditorias desta sessão encontraram defeitos reais rio abaixo — fees sem UI, webhook que quebra com promotor sem hub, refresh de JWT que não promove `lead → enrollment`, buraco de integridade no aceite do contrato. Todos continuam válidos.

Mas **nenhum deles jamais foi alcançado por uma execução real.** Isso muda a estratégia: não adianta consertar seis bloqueios em paralelo e torcer. O caminho crítico é sequencial por natureza — não dá para verificar o passo 9 antes do passo 3 passar.

### 2.3 Sobre "app.maestri.group é quase todo delírio de IA"

**Largamente refutado na camada de API** `[verified]`. Foram conferidos ~80 endpoints consumidos por `apps/group`; apenas 3 não existem no backend, e 31 das 44 rotas estão genuinamente ligadas.

O que produz a sensação de alucinação é outra coisa, e é específica:

- `apps/group/tests/e2e/helpers/mock-api.ts` (1859 linhas) intercepta `**/api/**` na linha 630, e 20 das 21 specs passam verdes independentemente do backend. Inclusive `finance-live.spec.ts` — "Módulo Financeiro **Real**" — que chama `setupApiMocks(page)` na linha 6 `[verified]`. A suíte não mede nada.
- `apps/group/src/app/dev-preview/documents/page.tsx` (314 linhas) e `dev-preview/address/page.tsx` (249 linhas) servem PII realista do próprio dono **sem guarda de autenticação** `[verified]`.
- `bento-dashboard.tsx`: sparkline falso (L232), fallback `|| 4` (L385), atalho Cmd+K fantasma (L405-407) `[verified]`.
- Duplicação pesada: 21 primitives forkados, 2 tabelas, 2 editores de notificação, 2 paradigmas de data-fetching, 8 módulos mortos, `@v7m/api-client` com zero consumidores.

A conclusão honesta: **o backend de `group` é real; a confiança nele é que é falsa**, porque a suíte que deveria provar isso mocka tudo.

### 2.4 Sobre a "cara de template genérico"

Também localizada, não difusa `[verified]`. A landing Astro pré-existente é genuinamente autoral: marca flag-diamond, paleta conferida em AA, Archivo Black auto-hospedada, escala fluida com `clamp`, easings com overshoot, voz portuguesa própria.

O visual genérico está inteiro no trabalho **não rastreado** de `modern-hero` (709 LOC + 405 de CSS), que descartou os seis ativos de marca e colocou Inter/Outfit, slate do Tailwind, brilhos roxo-rosa, um dingbat `✦`, um vídeo Web3 alugado de CloudFront e oito logos corporativos hot-linkados de empresas sem relação com o negócio. A variante com marca está no ar na home, e o template Web3 em inglês está no ar em `/modern` **sem noindex**.

Regressões que esse trabalho introduziu `[verified]`: o barrel de `@v7m/ui` arrasta `next/*` para o build Astro; o Preflight do Tailwind agora reseta o CSS autoral no site inteiro; todo heading renderiza em peso regular porque Outfit herdou o `font-weight:400` do Archivo Black (`apps/landing-supletivo/src/styles/global.css:84`); e a atribuição de comissão por ref/UTM provavelmente é perdida no re-render do React nas novas ilhas de CTA.

---

## 3. Escopo

**Dentro:** desbloqueio sequencial do funil `apps/supletivo` + backend; remoção de superfície não autenticada e de mocks enganosos em `apps/group`; reversão das regressões de `modern-hero` em `apps/landing-supletivo` e `packages/ui`; deduplicação de primitives.

**Fora (ver §12):** reorganização de apps descrita em `docs/specs/design.md`; migração para `@v7m/api-client`; unificação dos dois paradigmas de data-fetching de `group`; correção do `AGENTS.md §2` e do `README.md` (ambos descrevem apps que não existem `[verified]`).

---

## 4. Mudanças propostas

### W0 — Caminho crítico: atravessar o funil (SEQUENCIAL, um agente só)

Não paralelizável. Cada passo só é verificável depois que o anterior passa.

1. **Instrumentar antes de consertar.** Subir `backend-qcluster` e `backend-qcluster-slow` (definidos em `docker-compose.yml:204,236` mas **ausentes de `docker ps -a`** `[verified]`) e percorrer o funil manualmente como lead, registrando o primeiro ponto de falha real com o corpo da resposta.
2. **Passo 3 (CPF).** `CPFHUB_API_KEY` está presente no container (64 chars) `[verified]`, então o gate não é falta de credencial. Determinar se `_lookup_cpf` responde, e se a UI trata 502/422 de forma que deixe o usuário seguir. Este é o bloqueio nº 1.
3. **Passo 5 (e-mail)** → `set_email` (`users/auth/service.py:657`).
4. **Checkout** → `set_checkout` deve passar assim que 2 e 3 gravarem.
5. **Webhook pago** → corrigir o crash com promotor sem hub (`lead/service.py:769-771`, `LeadError("no_hub_for_promoter")` **dentro** da transação, depois do dinheiro entrar).
6. **Promoção de papel** `lead → enrollment` no refresh de JWT — sem isso o aluno leva "sessão expirada" logo após pagar.
7. **Wizard de documentos** → primeira execução real do upload de RG e do pipeline de IA.
8. **Fees + `conclude`** → `conclude` exige `first_fee_paid` e `second_fee_scheduled` (`enrollment/service.py:1761-1820`) e os dois endpoints que os gravam (`api/leadership/routers/enrollments.py:54,67`) **não têm UI em lugar nenhum**. Construir a UI mínima.

### W1 — Superfície insegura e mocks enganosos (paralelo, `apps/group`)

- Remover ou pôr atrás de guarda de auth `apps/group/src/app/dev-preview/**`.
- Renomear/segregar `mock-api.ts` para que nenhuma spec chamada "real" o use; marcar as 20 specs mockadas como o que são.
- Remover os fakes cosméticos do `bento-dashboard`.

### W2 — Deduplicação de UI (paralelo, `packages/ui` + `apps/group`)

Órfãos verificados, com a correção do agente já aplicada: `duty-icon-badge.tsx`, `document-capture-card.tsx`, e 11 dos 15 primitives (`badge`, `confirm-dialog`, `copy-button`, `dropdown-menu`, `input`, `select`, `sonner`, `spinner`, `status-pill`, `table`, `tabs`).

**Não remover** `chromatic-image.tsx`, `file-upload-dropzone.tsx`, `contract-signer.tsx`, `biometrics-liveness-capture.tsx`, `duty-status-card.tsx`, `primitives/{button,card,dialog}` — todos têm consumidores **internos** ao `packages/ui` que alcançam páginas de produção `[verified]`.

O achado que interessa: `apps/group` mantém forks locais exatamente dos primitives que estão mortos em `packages/ui`. Correspondência de um para um.

### W3 — Identidade visual (paralelo, `apps/landing-supletivo` + `packages/ui`)

- Decidir o destino de `modern-hero`: remover, ou rebrandar com os seis ativos originais. Enquanto isso, `noindex` em `/modern`.
- Corrigir `font-weight:400` herdado (`apps/landing-supletivo/src/styles/global.css:84`).
- Conter o Preflight do Tailwind para não resetar o CSS autoral.
- Impedir que o barrel de `@v7m/ui` arraste `next/*` para o build Astro.
- Verificar a atribuição ref/UTM nas ilhas de CTA.

---

## 5. Decisões de arquitetura

**Por que W0 é sequencial e os outros não.** W0 toca backend + `apps/supletivo` ao longo de um caminho de estado único; dois agentes ali colidem em arquivo e em semântica. W1/W2/W3 têm fronteiras de arquivo disjuntas de W0 e entre si, com uma exceção: W2 e W1 ambos tocam `apps/group`. Mitigação: W1 fica em `dev-preview/**`, `tests/e2e/**` e `components/dashboard/**`; W2 fica em `packages/ui/src/**` e `apps/group/src/components/ui/**`.

**Por que não confiar na suíte E2E como rede de segurança.** Ela mocka `**/api/**`. Até W1 concluir, a única verificação que conta é execução real contra o backend.

---

## 6. Riscos

| Risco | Severidade | Mitigação |
| --- | --- | --- |
| CPFHub é serviço externo pago; pode falhar ou custar por chamada | Alta — bloqueia W0 inteiro | Determinar cedo; considerar caminho de bypass explícito em dev |
| Árvore suja (72 paths) inclui `modern-hero` não rastreado | Média | Decidir o destino de `modern-hero` **antes** de W3 mexer em CSS |
| Remover primitives quebra import interno não mapeado | Média | `tsc --noEmit` em `packages/ui` já passa limpo; rodar de novo após cada remoção |
| `TEST_MODE=1` e `DEBUG=True` em `services/backend/.env` | Alta se vazar para produção | Nunca commitar; conferir antes de qualquer deploy |
| Agentes paralelos colidirem em `apps/group` | Média | Fronteiras de diretório em §5 |

---

## 7. Sequência de implementação

1. Subir `backend-qcluster` (destrava qualquer trabalho assíncrono).
2. **W0 passos 1-4** — chegar ao primeiro checkout criado. Marco: `users_lead_checkout` ≥ 1.
3. Em paralelo a partir daqui: **W1**, **W2**, **W3**.
4. **W0 passos 5-8** — marco: `users_enrollment` ≥ 1, depois `users_student` ≥ 1.
5. Reconciliação: rodar `pnpm turbo run check-types lint build` e `uv run pytest -v`.

---

## 8. Estratégia de teste

- **W0:** verificação por banco em cada marco — as tabelas de §2 são o placar. Nenhuma asserção por mock conta.
- **W1:** cada spec renomeada precisa declarar se é mockada ou real; ao menos uma spec real contra `backend-web`.
- **W2:** `pnpm turbo run check-types` verde após cada remoção.
- **W3:** comparação visual da landing antes/depois; conferir que headings voltaram ao peso correto.

Comandos verificados como existentes `[verified]`: `pnpm turbo run check-types`, `pnpm turbo run lint`, `pnpm turbo run build`, `cd services/backend && uv run pytest -v`, `pnpm docker:dev`.

---

## 9. Definition of Done

- [ ] Um `users_student` existe, originado de um lead que percorreu o funil sem edição manual de banco.
- [ ] `apps/group/src/app/dev-preview/**` inacessível sem auth (ou removido).
- [ ] Nenhuma spec com "real"/"live" no nome chama `setupApiMocks`.
- [ ] `pnpm turbo run check-types lint build` verde.
- [ ] `uv run pytest -v` verde.
- [ ] `git status` sem `.env`, sem chaves, sem `.md` solto fora de `docs/` (AGENTS.md).
- [ ] PR usa `ref #152` — escopo parcial, **não** `Closes` (AGENTS.md).

---

## 10. Rollback

Cada workstream é um branch próprio a partir de `152-ponytail-purge`. W1/W2/W3 são reversíveis por revert. W0 toca dados: qualquer migração precisa ser reversível, e o banco de dev tem só 3 leads de teste do próprio dono — não há dado de terceiro em risco `[verified]`.

---

## 11. Pacote de contexto para implementação

```yaml
task: "Purga de delírios de IA, funil de matrícula ponta a ponta, identidade visual"
verified_at_commit: bb7227e4f42a2c44e479417f5f1e8bad13309490
branch: 152-ponytail-purge
worktree: dirty (72 paths)
evidence_provenance:
  schema_version: 2
  head_commit: bb7227e4f42a2c44e479417f5f1e8bad13309490
  generated_plan_path: docs/plans/2026-09-02-gitnexus-plan-purga-delirios-funil-matricula.md
  global_dirty_digest:
    algorithm: sha256
    canonicalization: "gitnexus-evidence-provenance-v2 NUL-framed UTF-8 records"
    value: dc8691599874fc940bfbf599a0b014347f40df236328bea8857a9d0b0ceed484
  cited_paths:
    - AGENTS.md
    - apps/group/src/components/dashboard/bento-dashboard.tsx
    - apps/group/tests/e2e/helpers/mock-api.ts
    - apps/landing-supletivo/src/styles/global.css
    - apps/landing-supletivo/src/styles/tokens.css
    - docker-compose.yml
    - services/backend/api/clients/routers/enrollment.py
    - services/backend/api/leadership/routers/enrollments.py
    - services/backend/users/auth/service.py
    - services/backend/users/roles/enrollment/service.py
    - services/backend/users/roles/lead/service.py
  note: "Todos os paths citados estão 'unstaged' — o digest de worktree difere do de HEAD. Reverificar antes de executar."
index_refresh:
  command: "node .gitnexus/run.cjs analyze --index-only --pdg"
  runner_version: "1.6.10"
  outcome: "exit 0 — 49644 nodes, 111387 edges, 521 clusters, 898 flows"

established_facts:
  - "Funil nunca completado: 3 leads pending, 0 checkout, 0 enrollment, 0 student"
  - "Bloqueio nº1: perfis dos 3 leads sem cpf e sem email -> set_checkout 409 PROFILE_INCOMPLETE"
  - "Enrollment nasce só em mark_paid; todo o wizard de documentos exige Enrollment"
  - "backend-qcluster definido em compose mas nunca instanciado"
  - "ai_aicall=0 e zero imagens em /app/media: pipeline de documento nunca rodou"
  - "CPFHUB_API_KEY presente no container (64 chars)"
  - "NEXT_PUBLIC_LEAD_MOCK ausente de todos os .env: mock do lead estava desligado"

critical_path_symbols:
  - services/backend/users/roles/lead/service.py:468 set_checkout
  - services/backend/users/roles/lead/service.py:690 mark_paid
  - services/backend/users/roles/lead/service.py:727 _apply_effects
  - services/backend/users/auth/service.py:574 confirm_identity
  - services/backend/users/auth/service.py:657 set_email
  - services/backend/users/roles/enrollment/service.py:568 upload_rg_photo
  - services/backend/users/roles/enrollment/service.py:1761 conclude

workstream_boundaries:
  W0: [services/backend/**, apps/supletivo/src/**]
  W1: [apps/group/src/app/dev-preview/**, apps/group/tests/e2e/**, apps/group/src/components/dashboard/**]
  W2: [packages/ui/src/**, apps/group/src/components/ui/**]
  W3: [apps/landing-supletivo/**, packages/ui/src/components/modern-hero/**]
```

---

## 12. Premissas e questões em aberto

- `[assumed]` CPFHub responde corretamente com a chave atual. **Não verificado** — não chamei a API externa paga. É a primeira coisa a determinar em W0.
- `[assumed]` Os 3 leads pararam por abandono do usuário, não por erro de servidor. `failed_reason` está vazio nos três, o que é consistente com abandono, mas não é prova.
- `[inferred]` A atribuição ref/UTM é perdida no re-render das ilhas de CTA — vem da auditoria, não reverifiquei no fonte.
- **Adiado:** reorganização de apps de `docs/specs/design.md`; migração para `@v7m/api-client`; unificação dos data-fetchings de `group`; correção de `AGENTS.md §2` e `README.md`, ambos descrevendo apps inexistentes (`apps/admin`, `apps/app-promotor`, `apps/app-supletivo`, `apps/hub`, `tooling/qa-audit`) `[verified]`.

---

## 13. Referências

- `AGENTS.md` — convenções vinculantes (pnpm, `ref #N` em escopo parcial, proibição de `.env` rastreado)
- `docs/specs/design.md` (não rastreado) — spec de reorganização, fora de escopo aqui
- Índice GitNexus em `.gitnexus/` — reindexado nesta sessão com `--pdg`
