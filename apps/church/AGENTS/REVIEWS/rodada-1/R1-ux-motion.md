# Review R1 — UX / Motion / Acessibilidade — Rodada 1

**Reviewer:** orquestrador (papel R1)
**Data:** 2026-08-13
**Escopo:** `src/components/dizimo/*` + `src/pages/Dizimo.tsx` + `src/api/contract.ts`

## Nota: **7.5 / 10**

O componente **funciona** e segue a identidade IEADPG com capricho. Motion está majoritariamente dentro das convenções (EASE_OUT, reduced-motion honrado, GPU-only, hover gates em todos os botões). Mas a **primeira iteração tem buracos** que vão aparecer em produção ou pra usuários com tecnologias assistivas.

---

## Achados

| # | Severity | Categoria | Localização | Finding | Fix |
|---|----------|-----------|-------------|---------|-----|
| 1 | HIGH | A11y | `DizimoCapture.tsx:407-425` | Mudança de step (form→payment→status) **não anuncia pra screen readers**. O `aria-live="polite"` está só no `StatusScreen` interno — screen reader não percebe a troca de step. | Envolver o `<AnimatePresence>` num wrapper com `aria-live="polite"` e `aria-atomic="true"`, OU mover `aria-live` pro container do orquestrador. |
| 2 | HIGH | Segurança/A11y | `PixPayment.tsx:72` | `dangerouslySetInnerHTML` injeta SVG do QR sem sanitização. No mock é determinístico; em produção (provedor externo), é vetor XSS. | Criar componente `<PixQrSvg svg={...} />` que valida que `svg` começa com `<svg`, parseia com `DOMParser`, e injeta os nodes limpos. Bloqueia tags `<script>` e event handlers. |
| 3 | HIGH | Testes | (global) | **Zero testes de componente React.** Só contract + api. Faltam smoke tests com @testing-library pra: navegação por teclado, Tab order, foco visível, screen reader labels. | Adicionar `DizimoCapture.test.tsx` com @testing-library: renderiza → preenche → submit → verifica step. |
| 4 | HIGH | UX | `PixPayment.tsx:155` | Botão "Já paguei — atualizar status" é fallback que pula o polling. Se clica, mostra "Aguardando confirmação" sem clareza do que vai acontecer. | Renomear para "Já paguei, verificar agora" + mostrar toast/spinner enquanto busca. Documentar que não é garantia de aprovação. |
| 5 | MED | A11y | `RecurrenceField.tsx:88` | Switch do shadcn recebe `aria-describedby` mas não verifico se o componente propaga. | Verificar implementação do shadcn Switch e ajustar — se não propaga, usar `<label>` envolvendo o switch. |
| 6 | MED | UX | `MethodCards.tsx:100-103` | `whileTap: { scale: 0.985 }` é quase imperceptível (R0.A1 diz 0.95-0.98). Inconsistente com `StatusScreen` (0.97) e `DayPicker` (0.94). | Padronizar em `0.97` (Apple default) e seguir a mesma constante compartilhada. |
| 7 | MED | Performance | `PixPayment.tsx:18-21` | `setInterval(1s)` que re-renderiza o componente inteiro só pra atualizar o countdown. Aceitável mas pode ser otimizado com `useSyncExternalStore` ou `<time>` puro. | Extrair countdown pra componente isolado com `React.memo`, ou usar `Intl.RelativeTimeFormat` num `<time>` puro. |
| 8 | MED | UX | `StatusScreens.tsx:8` | `type StatusKey` não inclui `'processing'`. Cai no fallback `pending` sem aviso. | Adicionar `'processing'` ao union ou exaurir todos os status de `ChargeStatus` no tipo. |
| 9 | LOW | UX | `CardRedirect.tsx:34-37` | `useEffect` re-roda a cada `secondsLeft` (intencional pro countdown). OK, mas o `setTimeout` interno não tem cleanup explícito — confiando no fato de `secondsLeft` mudar. | OK na prática, mas adicionar `useRef` pra garantir que `onRedirect` é chamado só uma vez. |
| 10 | LOW | Motion | (global) | `STEP_TRANSITION.exit: { y: -8 }` é OK, mas a entrada inicial usa `y: 12` — assimetria leve. Não é problema, só nota. | Considerar `y: 8` em ambos pra simetria. Não bloqueia. |
| 11 | MED | UX | `DizimoCapture.tsx:399` | `<PixPayment onPaid={() => setStep('status')} />` ignora o `charge` que volta. O handler deveria atualizar o estado do charge, não só navegar. | `onPaid={(c) => { setCharge(c); setStep('status'); }}` — futuro-proof. |

---

## Verdict

**Block** (até resolver HIGH #1, #2, #3, #4).

- **HIGH #1** e **#3** são não-negociáveis: a11y e testes.
- **HIGH #2** é vetor de segurança que vai aparecer quando trocar o adapter pra um provedor real.
- **HIGH #4** é UX confuso — fallback sem feedback claro gera "paguei e nada aconteceu".

Os MEDs são polimento que deve entrar na mesma rodada se houver tempo. LOWs podem esperar.

## Resumo

Componente **publicável** em mock com a11y mínima, mas tem 4 buracos HIGH que vão aparecer no primeiro usuário real com screen reader / no primeiro deploy com provedor externo. Resolver antes de publicar.
