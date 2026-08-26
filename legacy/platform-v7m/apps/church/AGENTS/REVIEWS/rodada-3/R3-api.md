# Review R3 — Contrato de API / Erros / Testes — Rodada 3

**Reviewer:** orquestrador (papel R3)
**Data:** 2026-08-13
**Escopo:** `src/api/*` + `src/components/dizimo/use{DizimoCapture,ChargeStatus}.ts`

## Nota: **9.3 / 10**

A R2 matou todos os HIGHs (idempotência, race condition, type, server-trust) com:
- `idempotency_key` UUID v4 client-side + fingerprint do payload
- `reconcileCharge` com `STATUS_PRIORITY` (pending=0 → paid=3)
- `validatedWebhookEvent` rejeita eventos sem `idempotency_key` ou `type` inválido
- `httpDizimoApi` com zod validation + `Idempotency-Key` header + `safeRedirectUrl` + `EventSource`
- `DizimoError` com `isRetryable/isUserActionable/isRecoverable`
- `notifiedPaidRef` previne onPaid duplicado
- `globalThis.setTimeout` (SSR-safe)

Resta 1 MED de validação e 2 LOWs de polish.

---

## Achados

| # | Severity | Categoria | Localização | Finding | Fix |
|---|----------|-----------|-------------|---------|-----|
| 1 | MED | Validação | `src/api/contract.ts:202-204` | Regex de email é fraca (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/` aceita `a@b.c`). Em produção, lixo entra na base. | Usar `z.string().email()` do `zod` (já está em deps). Trocar a checagem por `z.string().email().safeParse(value).success`. |
| 2 | LOW | Testes | `src/api/__tests__/dizimoApi.test.ts` | Falta teste de **idempotência em re-submit** (mesma payload → mesma idempotency_key → mesma charge). | Adicionar `it('re-submit com mesma fingerprint reusa idempotency_key')`. |
| 3 | LOW | Logging | `src/api/httpDizimoApi.ts` (geral) | Em dev, `console.debug` é chamado, mas em prod não há sink. Risco de growth descontrolado. | Respeitar `import.meta.env.DEV` ou `process.env.NODE_ENV` e rate-limit/skip em prod. |
| 4 | LOW | Documentação | `app/API.md` | Não menciona o `httpDizimoApi` adapter, nem os novos `DizimoErrorCode` (`INVALID_IDEMPOTENCY_KEY`, `IDEMPOTENCY_CONFLICT`, `INVALID_REQUEST`). | Adicionar seção "HTTP adapter" + tabela de error codes. |

---

## Verdict

**Approve** — não tem HIGH. O MED de email é real mas tem workaround imediato (zod já está em deps). Os 3 LOWs são polish + docs.

## Resumo

Idempotência (R3#1 da R1) está **correta** — UUID v4 client-side + fingerprint do payload garante que retries com payload idêntico reusam a mesma key. Race condition (R3#2 da R1) está **resolvida** — `reconcileCharge` prioriza `paid` (3) e respeita transições terminais. `WebhookEvent.charge_id` opcional (R3#3 da R1) — **resolvido**. Server-side validação (R3#4 da R1) — **resolvido** com zod no `httpDizimoApi`. Webhooks têm `idempotency_key` obrigatória (R2.R2) — **resolvido** com `validatedWebhookEvent`.

Bloqueadores para entrega: **nenhum** (o MED de email é melhor-fix, não blocker).
