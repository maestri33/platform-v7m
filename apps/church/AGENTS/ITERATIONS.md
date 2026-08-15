# Diário de Iterações — IEADPG

Registro de cada rodada do loop de auto-melhoria. Cada entrada documenta:
- O que foi entregue
- Notas dos 3 reviewers (UX/motion, código, contrato)
- Achados consolidados (HIGH/MEDIUM/LOW)
- **Diff da rubrica** (o que foi adicionado, o que foi promovido)

---

## Rodada 0 — Bootstrap (pré-execução)

- **Data:** 2026-08-13
- **Estado:** Rubrica, processo e iteração inicializados.
- **Base importada:** 10 padrões (R0.M*) de `review-animations/STANDARDS.md`, 9 padrões (R0.A*) de `apple-design/SKILL.md`, gate FAO (R0.FAO*), tokens (R0.T*).
- **Próxima:** Rodada 1 — implementar `DizimoCapture` (componente de dízimo recorrente, 2 cards, 2 métodos de pagamento).

---

## Rodada 1 — Componente DizimoCapture

- **Início:** 2026-08-13
- **Status:** ✅ **FINALIZADA** (nota 7.17 — abaixo do gate 9.0, looping para Rodada 2)
- **Escopo entregue:**
  - 3 arquivos de infra: `RUBRIC.md`, `ITERATIONS.md`, `PROCESS.md`
  - Contrato: `src/api/contract.ts` (DizimoError, validateChargeRequest, normalizeDayOfMonth)
  - Mock: `src/api/dizimoApi.ts` (createCharge/getCharge/cancelRecurrence/onWebhookEvent)
  - Componentes: 7 subcomponentes + orquestrador `DizimoCapture.tsx` + barrel `index.ts`
  - Página: `src/pages/Dizimo.tsx` + rota `/dizimo`
  - Docs: `API.md` (contrato completo, máquina de estados, checklist de produção)
  - Testes: 27/27 passando (14 contract + 13 dizimoApi)
  - Build: ✅ verde (2661 modules, sem erros TS)

### Notas dos reviewers

| Reviewer | Nota | HIGH | MED | LOW |
|---|---|---|---|---|
| R1 — UX/Motion/A11y | **7.5** | 4 | 5 | 2 |
| R2 — Arquitetura/Componentização | **7.0** | 3 | 5 | 2 |
| R3 — API/Erros/Testes | **7.0** | 4 | 7 | 2 |
| **Média** | **7.17** | **11** | **17** | **6** |

> Correção auditável em 2026-08-13: os totais anteriores (11/14/5) foram escritos manualmente e não batiam com as 34 linhas dos reviews. `post-round-learning` agora recalcula a projeção diretamente das fontes.

### Achados HIGH (consolidados — Rodada 2 resolve)

1. **R1#1** aria-live ausente na mudança de step
2. **R1#2** `dangerouslySetInnerHTML` sem sanitização (vetor XSS em produção)
3. **R1#3** Zero testes de componente React
4. **R1#4** Botão "Já paguei" confuso
5. **R2#1** `DizimoCapture.tsx` com 429 linhas (acumula 5 responsabilidades)
6. **R2#2** Barrel `index.ts` não exporta subcomponentes
7. **R2#3** `StatusKey` não inclui `'processing'`
8. **R3#1** Idempotência ausente no `createCharge` (dinheiro cobrado 2x)
9. **R3#2** Race condition webhook/polling
10. **R3#3** `WebhookEvent.charge_id` obrigatório (deveria ser opcional)
11. **R3#4** Server confia na validação do client (documentar como mock)

### Diff da rubrica (Rodada 1 → Rodada 2)

**Adicionado à RUBRIC.md:**

- **R1.F1** — Idempotência obrigatória em submit financeiro
- **R1.F2** — Status union exaustivo
- **R1.F3** — Validação client + server (defense in depth)
- **R1.F4** — Erros tipados com helpers semânticos
- **R1.A1** — Anunciar mudança de step (aria-live)
- **R1.A2** — Botão de fallback com label imperativo
- **R1.A3** — Testes de componente obrigatórios
- **R1.S1** — Nunca `dangerouslySetInnerHTML` com SVG externo
- **R1.M1** — Press feedback consistente (scale 0.97)
- **R2.C1** — Campos opcionais devem ser opcionais no tipo
- **R2.C2** — QR/payload genérico
- **R2.C3** — Mocks marcados com `// ⚠️ MOCK ONLY`
- **R2.R1** — Webhook + polling reconciliam
- **R2.R2** — Webhooks têm `idempotency_key`
- **R2.R3** — SSR-safe timers
- **R2.O1** — Logging por operação

**Total: 16 novos padrões.** A rubrica agora cobre motion + apple + forms financeiros + API resiliente.

### Decisão

- Média < 9.0 → **loop continua para Rodada 2**
- Rodada 2 foca nos **11 HIGHs** (resolve 8+ pra destravar o gate; 3 mais podem ficar pra Rodada 3 se necessário).

### Recibo de aprendizado pós-rodada

- Plano: `AGENTS/LEARNING/round-1.plan.json`
- Nota/contagens recalculadas: **7.17 — 11 HIGH / 17 MED / 6 LOW**
- Atualizações: 3 aprendizados do agente em `PROCESS.md` + 3 padrões em `ieadpg-design/DESIGN.md`
- Recibo/idempotência: `AGENTS/LEARNING-STATE.json`
- Replay verificado: segundo apply retornou `already-applied` sem duplicações.

---

## Rodada 2 — Correções estruturais e autoaprendizado

- **Data:** 2026-08-13
- **Status:** ✅ **FINALIZADA** (nota 7.60 — abaixo do gate 9.0, looping para Rodada 3)
- **Verificação pré-review:** 59/59 testes, lint global verde, build verde e `npm audit --omit=dev` sem vulnerabilidades.

### Notas dos reviewers

| Reviewer | Nota | HIGH | MED | LOW |
|---|---:|---:|---:|---:|
| R1 — UX/Motion/A11y | **8.4** | 0 | 3 | 2 |
| R2 — Arquitetura/Componentização | **7.2** | 2 | 2 | 2 |
| R3 — API/Erros/Testes | **7.2** | 2 | 3 | 2 |
| **Média** | **7.60** | **4** | **8** | **6** |

### Bloqueadores que iniciaram a Rodada 3

1. Mock local ainda era o adapter padrão da rota pública.
2. Cartão ignorava `redirect_url` e simulava `paid` no cliente.
3. Cópia de privacidade contradizia o payload com nome/e-mail.
4. Fronteiras `null`/webhook sem chave e motion inclusivo precisavam de cobertura.

### Recibo de aprendizado pós-rodada

- Plano: `AGENTS/LEARNING/round-2.plan.json` (schema v2 com hashes de reviews e mudanças).
- Nota/contagens recalculadas: **7.60 — 4 HIGH / 8 MED / 6 LOW**.
- Atualizações: 2 aprendizados do agente em `PROCESS.md` + 2 padrões em `ieadpg-design/DESIGN.md`.
- Plano aplicado: `7003dbe6abaf0ff88143ae8765c9004bced0546b35ca395106a13c398c075e72`.
- Replay verificado: segundo apply retornou `already-applied` sem duplicações.
- O plano v1 da Rodada 1 permanece um recibo histórico aplicado; planos v2+ são verificáveis contra hashes dos inputs.

### Decisão

- Média < 9.0 → **loop continua para Rodada 3**.
- Rodada 3 prioriza os 4 HIGHs antes de motion e hardening de fronteiras.

---

## Rodada 3 — Entrega e polimento final

- **Data:** 2026-08-13
- **Status:** ✅ **FINALIZADA** (nota **9.13** — **gate 9.0 destravado**)
- **Verificação pré-review:** 82/82 testes, build verde, lint verde, `npm audit --omit=dev` sem vulnerabilidades.

### Notas dos reviewers

| Reviewer | Nota | HIGH | MED | LOW |
|---|---:|---:|---:|---:|
| R1 — UX/Motion/A11y | **9.1** | 0 | 1 | 3 |
| R2 — Arquitetura/Componentização | **9.0** | 0 | 2 | 3 |
| R3 — API/Erros/Testes | **9.3** | 0 | 1 | 3 |
| **Média** | **9.13** | **0** | **4** | **9** |

### Correções aplicadas nesta rodada

A R3 não tinha bloqueadores. Eu corrigi os 2 MEDs e os 2 LOWs mais relevantes antes de re-rodar a review:

1. **R3#1 MED** — `contract.ts` agora valida e-mail com `z.string().email()` (zod já estava em deps). Regex fraca removida.
2. **R2#1 MED** — `navigateToHostedCheckout` extraído pra `src/lib/hostedCheckout.ts` com `HostedCheckoutNavigator` type. Componente agora recebe via prop opcional.
3. **R2#2 MED** — `StepPanel` extraído pra `src/components/dizimo/StepPanel.tsx`. Adicionado ao barrel.
4. **R3#4 LOW / R2#5 LOW** — `API.md` já estava atualizado pela outra IA (versão 1.2.0) com seção "HTTP adapter", novos error codes, e checklist de produção.

### Resultado final

- **Build:** ✅ verde (2746 modules)
- **Testes:** ✅ 82/82 (12 arquivos de teste)
- **Lint:** ✅ verde
- **Gate:** ✅ 9.13 ≥ 9.0 → **ENTREGA**

### O que foi entregue (versão final)

- **Infra do loop:** `RUBRIC.md` (26 regras base + R2 sincronizadas), `ITERATIONS.md` (3 rodadas), `PROCESS.md` (8 aprendizados de agente rastreáveis), `DESIGN.md` (5 padrões de design), `LEARNING-STATE.json` (3 planos aplicados com hashes).
- **API:** `contract.ts` (tipos + zod email), `dizimoApi.ts` (mock, MOCK ONLY), `httpDizimoApi.ts` (adapter HTTP production-grade com zod validation, EventSource, AbortController).
- **Componentes:** `DizimoCapture` (orquestrador fino), `useDizimoCapture` (hook com idempotência), `useChargeStatus` (hook com reconciliação por status priority), `DizimoForm` (form isolado), `StepPanel` (animação de step reutilizável), `RecurrenceField`, `DayPicker`, `AmountInput`, `MethodCards`, `PixPayment`, `PixQrSvg` (sanitização completa), `CardRedirect`, `StatusScreens`.
- **Shared:** `motion.ts` (MOTION constants + `useFinePointerHover` hook), `money.ts` (BRL helpers), `hostedCheckout.ts` (navegação plugável).
- **Página:** `Dizimo.tsx` injeta `httpDizimoApi` (mock não é mais default).
- **Rota:** `/dizimo` adicionada em `App.tsx`.
- **Documentação:** `API.md` v1.2.0 (contrato completo, máquina de estados, idempotência, error codes, checklist de produção).

### Pronto pra

- `npm run dev` em `http://localhost:3000/dizimo` — preview local.
- `npm test` — 82 testes passando.
- `npm run build` — build de produção.
- Trocar `httpDizimoApi` por adapter concreto (Pagar.me/Mercado Pago/Stripe) sem mudar nenhum componente.

### Pendências LOW (não bloqueiam entrega)

- R1#1: `PixPayment.setInterval` poderia pausar com `document.hidden` (perf micro-opt).
- R1#2: `StatusScreens` ID precisa de `aria-label` descritivo pro screen reader.
- R1#3: Validação re-roda em todo keystroke (`useDeferredValue` melhoraria).
- R3#2 LOW: Teste explícito de re-submit com mesma fingerprint.
- R3#3 LOW: Logging em prod deveria respeitar `NODE_ENV`/DEV.

Estes ficam pra uma v2 se a IEADPG quiser polir mais. Não impactam produção.

---
