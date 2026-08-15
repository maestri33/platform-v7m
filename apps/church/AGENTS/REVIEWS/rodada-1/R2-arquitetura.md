# Review R2 — Arquitetura / Componentização / Exportabilidade — Rodada 1

**Reviewer:** orquestrador (papel R2)
**Data:** 2026-08-13
**Escopo:** `src/components/dizimo/*` + `src/api/*` + `src/pages/Dizimo.tsx`

## Nota: **7.0 / 10**

Estrutura está clara: subcomponentes focados, contrato de tipos isolado, mock separado da UI. Mas o `DizimoCapture.tsx` é um **monstro de 429 linhas** que concentra 5 responsabilidades. E o **barrel export `index.ts` não exporta os subcomponentes** — quebra o requisito de "componente isolado exportável" do `plan.md`.

---

## Achados

| # | Severity | Categoria | Localização | Finding | Fix |
|---|----------|-----------|-------------|---------|-----|
| 1 | HIGH | Componentização | `DizimoCapture.tsx:1-429` | **Arquivo com 429 linhas** mistura 5 responsabilidades: estado do form, validação, submit, polling, webhook, render do form inteiro, máquina de steps. | Extrair: `useDizimoState()` (estado + validação + submit), `useChargeStatus()` (webhook + polling), `DizimoForm` (render puro do form). Orchestrator fica < 100 linhas. |
| 2 | HIGH | Exportabilidade | `index.ts` | Barrel **só exporta `DizimoCapture`**. Quem for reusar `DayPicker`, `AmountInput` ou `RecurrenceField` em outra página **não consegue** — está fora do contrato. | Exportar todos os subcomponentes nomeados: `export { DayPicker, AmountInput, RecurrenceField, ... } from './...'`. |
| 3 | HIGH | Tipagem | `StatusScreens.tsx:8` | `type StatusKey = 'paid' \| 'failed' \| 'expired' \| 'pending'` **não inclui `'processing'`** (definido em `ChargeStatus`). Se o webhook dispara `processing`, vira `pending` por fallback — esconde o estado real. | Trocar por `type StatusKey = ChargeStatus` (importar do contract). Elimina o type-cast `as StatusKey`. |
| 4 | MED | Componentização | `PixPayment.tsx:72` | `dangerouslySetInnerHTML` no meio do JSX principal. Deveria ser componente isolado `<PixQrSvg svg={...} />` com responsabilidade única. | Criar `PixQrSvg.tsx` em `components/dizimo/` com sanitização. |
| 5 | MED | Hooks | `DizimoCapture.tsx:108-161` | 2 `useEffect` separados pra webhook + polling, ambos dependendo de `[pollingActive, charge, apiClient]`. Pode duplicar listeners se o effect re-correr antes do cleanup. | Consolidar em um único `useChargeStatus({ charge, apiClient, pollingActive })` que retorna o status atual. |
| 6 | MED | Pureza | `DizimoCapture.tsx:196-206` | `handlePaymentRedirect` mistura lógica de mock com comentário. Quem ler daqui a 6 meses não vai saber que é só pra mock. | Extrair `mockCardCheckout(charge, onPaid)` em arquivo separado `lib/mockCardCheckout.ts` com `// MOCK ONLY` bem visível. |
| 7 | MED | Constantes | (4 arquivos) | `EASE_OUT = [0.23, 1, 0.32, 1] as [number, number, number, number]` declarada em **4 lugares** (`DizimoCapture`, `StatusScreens`, `RecurrenceField`, `DayPicker`, `MethodCards`, `PixPayment`, `CardRedirect`, `AmountInput`). | Criar `lib/motion.ts` com `EASE_OUT`, `EASE_IN_OUT`, `EASE_DRAWER` (do `index.css`). Single source of truth. |
| 8 | MED | DRY | `DizimoCapture.tsx:226-229` | `fieldError()` é definido dentro do render, recriado a cada render. Aceitável, mas a lógica de buscar erro por `code` se repete. | Constante fora do componente ou helper compartilhado. |
| 9 | LOW | Testes | (global) | Falta `DizimoCapture.test.tsx` com smoke test via @testing-library/react. | Adicionar na próxima rodada. |
| 10 | LOW | Componentização | `DizimoCapture.tsx:265-326` | A "divisor com gradient" (`h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent`) é repetida 3x no JSX. | Extrair `<Hairline />` ou `<SectionDivider />` em `components/ui/`. |

---

## Verdict

**Block** (até resolver HIGH #1, #2, #3).

- **HIGH #1** (429 linhas) é dívida técnica que vai explodir quando o componente crescer (CPF, endereço, etc).
- **HIGH #2** quebra o requisito explícito de "componente exportável" do `plan.md`.
- **HIGH #3** esconde estado (`processing` → `pending` silencioso).

Os MEDs (#4-#8) são polimento que se resolvem junto. LOWs podem esperar.

## Resumo

Estrutura tá no caminho certo — separação API/UI/components está clara. Mas o orquestrador tá grande demais e o barrel está incompleto. Resolver os 3 HIGHs abre caminho pra crescer sem refactor pesado.
