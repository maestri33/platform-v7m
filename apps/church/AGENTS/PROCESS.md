# Processo do Loop de Auto-Melhoria — IEADPG

Este documento é o **contrato** do loop. Define quem faz o quê, em que ordem, e quando o loop para.

---

## 1. Visão geral

```
       ┌─────────────────────────────────────────────┐
       │  RUBRIC.md (viva — cresce a cada rodada)    │
       └─────────────┬───────────────────────────────┘
                     │ alimenta
                     ▼
  ┌────────────────────────────────────────────────────┐
  │ 1. IMPLEMENTAÇÃO                                  │
  │    agent: coder (ou orquestrador)                  │
  │    input: plano + RUBRIC.md                        │
  │    output: código + testes                        │
  └─────────────┬──────────────────────────────────────┘
                ▼
  ┌────────────────────────────────────────────────────┐
  │ 2. REVIEW MULTI-AGENTE (3 paralelos)              │
  │    R1: UX / motion / a11y                         │
  │    R2: arquitetura / componentização / export.    │
  │    R3: contrato de API / erros / testes           │
  │    cada um aplica a RUBRIC.md completa            │
  │    cada um nota 0–10 com achados HIGH/MED/LOW     │
  └─────────────┬──────────────────────────────────────┘
                ▼
  ┌────────────────────────────────────────────────────┐
  │ 3. CONSOLIDAÇÃO                                   │
  │    agent: orquestrador (este agente)               │
  │    - calcula média das 3 notas                    │
  │    - agrupa achados                               │
  │    - SE nota ≥ 9.0 → §5 (entrega)                 │
  │    - SE nota < 9.0 → §4 (atualizar)               │
  └─────────────┬──────────────────────────────────────┘
                │
       ┌────────┴────────┐
       ▼                 ▼
 ┌──────────┐      ┌──────────────────────────────┐
 │ §5 fim   │      │ §4 ATUALIZAR                 │
 │ entrega  │      │   - achado novo → RUBRIC.md  │
 └──────────┘      │   - padrão recorrente → RULE │
                   │   - tudo → ITERATIONS.md     │
                   │   - LOOP → Rodada N+1        │
                   └──────────────────────────────┘
```

---

## 2. Reviewers (papéis)

Cada reviewer é executado como subagent paralelo. Todos aplicam a **RUBRIC.md completa** (R0 + R1 + R2 + ...). O output é uma tabela markdown com achados, severidade, e `file:line`.

### R1 — UX / Motion / Acessibilidade
- Aplica: R0.M1–M10, R0.A1–A9, R0.FAO, R1 (forms financeiros), R2 (a11y de transação).
- Foco: a UI **parece certa**? motion ajuda ou atrapalha? feedback imediato? reduced-motion honrado? foco visível em todos os controls? aria-labels em payment?
- **Bloqueia** se: scale(0), ease-in em UI, keyframes em toasts, animação em keyboard/100+/dia, hover sem gate, reduced-motion não honrado, transação sem confirmação explícita.

### R2 — Arquitetura / Componentização / Exportabilidade
- Aplica: R0 + R1 + R2 (parte de componentização).
- Foco: cada peça é um arquivo? props explícitas? zero prop drilling? tema via tokens, não hard-coded? componente pode ser dropado em outro projeto? types exportados? zero side-effects globais?
- **Bloqueia** se: hard-coded color fora de `card-brand`/tokens, magic numbers sem nome, componente com mais de ~250 linhas sem subcomponente, falta de export nomeado, types privados, `useEffect` sem cleanup, `any` desnecessário.

### R3 — Contrato de API / Erros / Testes
- Aplica: R0 + R2 (parte de API).
- Foco: tipos públicos exportados? mock com latência simulada? falhas injetáveis (testar offline, timeout, 4xx, 5xx)? máquina de estados documentada? webhook documentado? erros tipados e recuperáveis? testes cobrem happy + error + edge?
- **Bloqueia** se: tipos não exportados, mock sem falhas, erros genéricos (`throw new Error('falhou')`), ausência de testes pra máquina de estados, validação sem zod/valibot, side-effects em import.

---

## 3. Consolidação (papel do orquestrador)

1. Recebe 3 reviews com notas e achados.
2. Calcula média: `M = (R1 + R2 + R3) / 3`.
3. **Gate:** `M ≥ 9.0` → §5 (entrega). `M < 9.0` → §4 (atualizar).
4. Tabela consolidada única, ordenada por severity (HIGH → MED → LOW).
5. Conflitos entre reviewers: prioriza o achado mais severo.

---

## 4. Atualizar (auto-melhoria)

A cada rodada com `M < 9.0`, o orquestrador:

1. Lê os 3 reviews e recalcula notas/contagens a partir das tabelas brutas.
2. Para **cada achado HIGH não coberto pela RUBRIC**:
   - Cria nova regra `R{N}.<seção>` na RUBRIC.md, na seção apropriada (Motion / Apple / Forms financeiros / API).
   - Marca com origem: `> Adicionado na Rodada N, achado R{reviewer}.{n}.`
3. Para **achados MED/LOW recorrentes** (aparece em 2+ rodadas):
   - Promove para nova regra na RUBRIC.
4. Propõe aprendizados com IDs estáveis e fontes `R{reviewer}#{achado}` para:
   - `PROCESS.md`: prevenção operacional do agente;
   - `ieadpg-design/DESIGN.md`: padrão visual/interativo reutilizável;
   - `RUBRIC.md`: somente conforme as regras de promoção acima.
5. Executa `npm run learn:plan -- N`; divergência de notas/contagens, fonte ausente ou falta de um dos dois destinos bloqueia a rodada.
6. Executa `npm run learn:apply -- N`; o apply valida hashes, grava recibo em `AGENTS/LEARNING-STATE.json` e é idempotente.
7. Adiciona entrada em `ITERATIONS.md` com: rodada, notas, achados e diffs auditáveis.
8. Mensagem ao usuário com: status, nota, top 3 achados, regras adicionadas e próxima ação.
9. **Dispara Rodada N+1** somente após apply + readback + verificação verde (a menos que `max_rounds` seja atingido).

### `max_rounds`
- Default: **5 rodadas** (a partir da Rodada 1).
- Se após 5 rodadas `M < 9.0`: parar e mostrar ao usuário, pedindo decisão.
- Pode ser ajustado por flag no início.

---

## 5. Entrega

Quando `M ≥ 9.0`:
1. Mensagem final ao usuário: nota, resumo do componente, link pra demo local.
2. Arquivos: tudo commit-friendly (sem `.git` ainda, mas estrutura já pronta pra quando o user inicializar git).
3. ITERATIONS.md recebe entrada de "entrega" com nota final e timestamp.

---

## 6. Formato de saída dos reviewers (obrigatório)

Cada reviewer retorna **exatamente** este formato:

```markdown
## Review {N} — {papel}

**Nota:** {0.0–10.0}

### Achados

| # | Severity | Categoria | Localização | Finding | Fix |
|---|----------|-----------|-------------|---------|-----|
| 1 | HIGH     | Motion    | file.tsx:42 | ...     | ... |
| 2 | MED      | API       | api.ts:18   | ...     | ... |

### Verdict
{block | approve}

### Resumo
{1–3 frases: tá pronto, principal risco, principal força}
```

---

## 7. Hard rules do processo

1. **RUBRIC é fonte da verdade** — reviewers aplicam ela, não inventam.
2. **Achado novo vira aprendizado rastreável** — HIGH novo pode virar regra; MED/LOW só quando recorrente; todos mantêm fonte.
3. **Diff da rubrica é auditável** — toda adição aparece em ITERATIONS.md.
4. **Gate é objetivo** — `M ≥ 9.0` é binário; não tem "quase 9".
5. **Não pular rodada** — implementação incompleta **não vai** pro review.
6. **Não relaxar a rubrica** — se um achado não cabe, é falha do código, não da rubrica.
7. **Reduced-motion é lei** — qualquer movimento sem `prefers-reduced-motion` é HIGH.

---

## Aprendizados gerenciados do agente
- **agent.round-1.recompute-from-evidence** (Rodada 1; fontes: R1#3, R2#9, R3#6): Recalcular notas, severidades e gate diretamente dos três reviews e da verificação executada; totais escritos no diário são projeções e divergências bloqueiam a próxima rodada.
- **agent.round-1.update-all-learning-surfaces** (Rodada 1; fontes: R1#1, R2#1, R3#1): Quando a média ficar abaixo de 9, gerar e aplicar um plano idempotente que atualize o playbook do agente e o sistema de design com fontes antes de implementar a próxima rodada.
- **agent.round-1.verify-whole-gate** (Rodada 1; fontes: R1#3, R2#9, R3#6): Uma rodada só pode ser enviada a review após testes de unidade, integração/componente, build e lint do escopo; registrar falhas globais separadamente, sem chamá-las de verdes.
- **agent.round-2.production-boundaries** (Rodada 2; fontes: R2#1, R2#2, R3#1, R3#2): Antes de aprovar fluxos financeiros, provar separação entre demo e produção e rastrear cada transição de pagamento até uma fonte autoritativa; mocks nunca são defaults silenciosos.
- **agent.round-2-adversarial-boundaries** (Rodada 2; fontes: R2#4, R3#4, R3#5): Testar fronteiras adversariais completas: entradas top-level desconhecidas, eventos sem chave, planos legados e hashes de todos os inputs antes de declarar o gate verde.
