# Review R2 — Arquitetura / Componentização / Exportabilidade — Rodada 3

**Reviewer:** orquestrador (papel R2)
**Data:** 2026-08-13
**Escopo:** `src/components/dizimo/*` + `src/api/*` + `src/pages/Dizimo.tsx`

## Nota: **9.0 / 10**

A R2 matou os 4 HIGHs (mock default, cartão simula paid, copy privacidade, barrel). Refactor pra hooks foi cirúrgico. Resta micro-polimento.

---

## Achados

| # | Severity | Categoria | Localização | Finding | Fix |
|---|----------|-----------|-------------|---------|-----|
| 1 | MED | Componentização | `src/components/dizimo/DizimoCapture.tsx:28-30` | `navigateToHostedCheckout` é definido como função local (não em `lib/`). Quem for reusar `DizimoCapture` em outro app precisa duplicar. | Extrair pra `lib/hostedCheckout.ts` ou `lib/navigation.ts`. |
| 2 | MED | Componentização | `src/components/dizimo/DizimoCapture.tsx:32-50` | `StepPanel` é um sub-componente local com responsabilidade única (renderizar panel animado). Deveria ser exportado em `components/dizimo/StepPanel.tsx` pra permitir reutilização. | Mover pra arquivo próprio. |
| 3 | LOW | Tipagem | `src/components/dizimo/StatusScreens.tsx:7` | `export type StatusKey = ChargeStatus;` é redundante — `StatusKey` é literalmente `ChargeStatus`. | Remover o alias e usar `ChargeStatus` direto no consumers. |
| 4 | LOW | DRY | `src/components/dizimo/DizimoForm.tsx:28-32` | `SectionDivider` é exportado como local mas é genérico. Outros lugares (Hero, Manifesto) podem querer. | Mover pra `components/ui/SectionDivider.tsx`. |
| 5 | LOW | Documentação | `app/API.md` | Não foi atualizado com a R2 (`httpDizimoApi`, `Idempotency-Key`, novos error codes). | Atualizar `API.md` com a seção "HTTP adapter" e os novos `DizimoErrorCode`. |

---

## Verdict

**Approve** — não tem HIGH. Os 2 MEDs são puramente "poderia ser mais exportável" e o resto é polimento. Componente está arquiteturalmente sólido.

## Resumo

A R2 fez o trabalho pesado: extraiu 4 hooks/componentes, centralizou motion + money, separou `httpDizimoApi` do `dizimoApi` mock, fez o `apiClient` ser obrigatório. Restam 2 MEDs sobre **exportabilidade** (`navigateToHostedCheckout` + `StepPanel` ainda não são reutilizáveis fora do componente) e 3 LOWs de polimento.

Bloqueadores para entrega: **nenhum**.
