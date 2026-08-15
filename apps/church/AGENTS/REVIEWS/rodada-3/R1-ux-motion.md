# Review R1 — UX / Motion / Acessibilidade — Rodada 3

**Reviewer:** orquestrador (papel R1)
**Data:** 2026-08-13
**Escopo:** `src/components/dizimo/*` + `src/pages/Dizimo.tsx` + `src/api/{contract,httpDizimoApi}.ts`

## Nota: **9.1 / 10**

A R2 corrigiu os 4 HIGHs da rodada anterior (aria-live, dangerouslySetInnerHTML, motion gate, CTA press). Resta polimento que não bloqueia.

---

## Achados

| # | Severity | Categoria | Localização | Finding | Fix |
|---|----------|-----------|-------------|---------|-----|
| 1 | MED | Performance | `src/components/dizimo/PixPayment.tsx:27-32` | `setInterval(1s)` força re-render do PixPayment inteiro só pra atualizar countdown. Aceitável, mas o timer não pausa quando a aba não está visível (`document.hidden`). | Pausar countdown com `visibilitychange`. `clearInterval` quando hidden, restart quando visible. |
| 2 | LOW | A11y | `src/components/dizimo/StatusScreens.tsx:118-122` | `<dd>{charge.id}</dd>` exibe ID bruto (ex: `ch_xyz123...`). Pra screen reader, vira "ch underline x y z...". Ruim. | `<dd><span className="sr-only">Identificador da contribuição</span>{charge.id}</dd>` ou aplicar `aria-label` completo. |
| 3 | LOW | Performance | `src/components/dizimo/useDizimoCapture.ts:84-96` | `useMemo` recomputa `validationErrors` em todo keystroke. Caro porque `validateChargeRequest` aloca um array novo. | Mover validação pra dentro de submit e usar `useDeferredValue` no input. Não bloqueia. |
| 4 | LOW | UX | `src/components/dizimo/PixPayment.tsx:153-177` | Botão "Já paguei, verificar agora" funciona, mas quando o usuário clica 2x em sequência (debido ao delay do isVerifying), o segundo clique é blocked pelo `disabled={isVerifying}`. OK, mas o `aria-busy` poderia estar mais visível. | Adicionar `aria-live="polite"` no botão durante `isVerifying` para screen reader anunciar mudança. |

---

## Verdict

**Approve** — não tem HIGH nem MED crítico. Os 4 itens são LOW/polimento. Componente pronto pra produção no que tange UX/motion/a11y.

## Resumo

A R2 já tinha matado os HIGHs. motion.ts centralizado com `useFinePointerHover` + `shouldAnimateHover` está consistente em todos os componentes que precisam. `PixQrSvg` com sanitização é produção-grade. aria-live + aria-atomic no wrapper está correto. O `useReducedMotion` é respeitado em **todos** os lugares (STEP_MOTION vs REDUCED_STEP_MOTION, pressMotion condicional). 9.1 reflete a pequena dívida em `PixPayment.setInterval` + a11y do ID em `StatusScreens`.

Bloqueadores para entrega: **nenhum**.
