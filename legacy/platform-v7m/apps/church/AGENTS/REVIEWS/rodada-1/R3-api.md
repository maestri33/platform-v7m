# Review R3 — Contrato de API / Erros / Testes — Rodada 1

**Reviewer:** orquestrador (papel R3)
**Data:** 2026-08-13
**Escopo:** `src/api/contract.ts`, `src/api/dizimoApi.ts`, `src/api/__tests__/*`

## Nota: **7.0 / 10**

Contrato está **bem tipado** e documentado (`API.md` é um bônus). Mock cobre os casos principais. Mas tem **2 buracos HIGH** que vão explodir em produção: idempotência ausente e conflito webhook/polling.

---

## Achados

| # | Severity | Categoria | Localização | Finding | Fix |
|---|----------|-----------|-------------|---------|-----|
| 1 | HIGH | API | `DizimoCapture.tsx:165-194` | `handleSubmit` chama `createCharge` sem **idempotency key**. Se o usuário clica 2x em "Continuar" (ou a request demora e ele re-tenta), o backend recebe 2 charges. Em produção, isso é **dinheiro cobrado 2x**. | Adicionar `idempotencyKey` (uuid gerado no client ao iniciar submit) e guardar em ref. Re-usar no retry. Documentar em `API.md`. |
| 2 | HIGH | Concorrência | `dizimoApi.ts:158-178` | Webhook (`schedulePaymentWebhook`) e polling (`getCharge`) **podem conflitar**. Se webhook dispara e polling lê logo depois, último a escrever ganha. Race condition em produção = tela mostra "pago" e下一秒 "expirado". | Adicionar lock simples (mutex) ou um reducer que reconcilia baseado no `status` mais avançado. Em mock: checar timestamp. |
| 3 | HIGH | Tipos | `contract.ts:103-110` | `WebhookEvent.charge_id: string` é obrigatório no tipo, mas `recurrence.canceled` define `charge_id: ''` (string vazia) — inconsistência. Deveria ser opcional e omitido. | Trocar pra `charge_id?: string` e atualizar os call-sites que testam `event.charge_id !== charge.id` (já estão safe com `!==`). |
| 4 | HIGH | Validação | `dizimoApi.ts:92-95` | `createCharge` chama `validateChargeRequest` (que já foi chamado no client). Server confia no client. Em produção: problema de segurança. | Em produção, server-side **sempre** re-valida. Em mock, manter mas adicionar `// MOCK ONLY` comment. Já documentado, mas reforçar. |
| 5 | MED | API | `dizimoApi.ts:140-178` | `generateMockQrSvg` e `generateCopyPaste` **geram dados que não passam na validação do BCB real**. Em produção, vão rejeitar. | Já documentado como mock. OK. Mas adicionar `// ⚠️ MOCK ONLY — não usar em produção, real BR Code vem do provedor Pix` no topo das duas funções. |
| 6 | MED | Testes | `__tests__/dizimoApi.test.ts` | **Falta teste de polling** (verificar que `getCharge` é chamado e atualiza status). Falta teste de race condition (webhook + polling). | Adicionar `it('polling detecta mudança de status')` e `it('webhook + polling não causam race')`. |
| 7 | MED | SSR | `dizimoApi.ts:159` | `setTimeout` global. Se o código rodar em SSR (Next.js, etc), `window` não existe. Hoje o projeto é Vite SPA, mas se virar Next, quebra. | Trocar `setTimeout` por `globalThis.setTimeout` (existe em SSR também). |
| 8 | MED | API | `contract.ts:155-160` | Regex de email é notoriously fraca (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/` aceita `a@b.c`). Em produção, isso vira lixo na base. | Usar `zod.email()` ou lib mais robusta. Por ora, adicionar TODO explícito. |
| 9 | MED | Logging | `dizimoApi.ts` (geral) | Sem logging. Em produção, debugar é inferir. | Adicionar `console.debug` por operação (em dev only) — `[dizimoApi] createCharge ch_xyz 10000 BRL`. |
| 10 | MED | Erros | `contract.ts:118-130` | `DizimoError` tem `isRecoverable()` mas não tem `isRetryable()` (rate limit), `isUserActionable()` (vs. systemic), etc. | Adicionar `isUserActionable()` e separar `isRetryable()` de `isRecoverable()`. |
| 11 | MED | Webhook | `contract.ts:103-110` | Webhook não tem `idempotency_key`. Em produção, se o provedor re-envia, cliente processa 2x. | Adicionar `idempotency_key?: string` no evento. Cliente checa antes de processar. |
| 12 | LOW | Tipos | `contract.ts:79-84` | `PixPaymentData.qr_code_svg: string` é "SVG inline". Mas se o provedor devolver URL de imagem, o tipo está errado. | Renomear pra `qr_code_payload: string` (genérico) e a UI decide se é SVG inline ou `<img src>`. |
| 13 | LOW | Estado | `dizimoApi.ts:25-37` | `MockState` é `let` global mutável. Em testes paralelos (`vitest --threads`), vira race. | Encapsular em factory ou usar `vitest --no-threads`. Por ora, OK. |

---

## Verdict

**Block** (até resolver HIGH #1, #2, #3, #4).

- **HIGH #1** (idempotência) é **dinheiro**. Não pode esperar.
- **HIGH #2** (race condition) vai aparecer em produção quando webhook + polling competirem.
- **HIGH #3** é inconsistência de tipo que esconde bugs.
- **HIGH #4** é "OK pra mock, bloqueia pra produção" — flag com `MOCK ONLY`.

Os MEDs (#5-#11) são polimento. LOWs podem esperar.

## Resumo

Mock é honesto sobre ser mock, e o contrato está documentado e tipado. Mas tem 2 problemas de **design** (idempotência, race condition) que vão cobrar a conta quando trocar o adapter pra provedor real. Resolver antes de declarar a Rodada 2 como ok.
