# infinitepay — integrations/bank/infinitepay

> **ESTADO:** checkout (1-b) — **feito e APROVADO no Portão 3 (E2E real, 2026-06-01)**: link de R$1 pago
> por cartão → webhook real da InfinitePay → `payment_check` reconfirmou → **PAID**. 2º gateway do MVP
> §4 item 1 (o 1º é o [[asaas|asaas]]).

App Django que porta o gateway de **checkout** da **InfinitePay** do micro legado
(`~/coders/backend/infinitepay`, FastAPI) pro monólito. Label do app: `infinitepay`.
Doc oficial (Context7): `/websites/api_infinitepay_io_invoices_public_checkout`.

## ⚠️ Anti-delírio (importante)

- **A InfinitePay NÃO usa api-key.** Autentica só pelo `handle` (InfiniteTag) — quem recebe é o dono da
  conta, então não há segredo no envio. O que TRAVA o boot (`infinitepay.E001`) é faltar o handle.
- **Não há HMAC nem secret de webhook.** O HMAC `x-infinitepay-signature` + IP-allowlist do legado era
  **delírio** (a doc oficial não tem) — mesma lição do asaas. A **segurança real é o `payment_check`**:
  o webhook só marca PAID depois de reconfirmar o pagamento direto na API. O `order_nsu` (= nosso
  `external_id`, UUID opaco) liga o webhook ao checkout.
- **Handle é case-sensitive:** o nosso é `v7m` (minúsculo) — `V7M`/`V7m` dão "Merchant not found".

## Fluxo

1. **Criar** (`checkout.py`): persiste `Checkout(PENDING)` (gera `external_id` = `order_nsu`) →
   `POST /invoices/public/checkout/links {handle, items[centavos], order_nsu, redirect_url, webhook_url}`
   → grava `checkout_url` + `slug`. A intenção persiste **antes** da chamada (idempotência §8).
2. **Pagar:** o cliente paga no `checkout_url` (cartão ou pix).
3. **Webhook** (`webhooks.py`, público, sem auth): InfinitePay chama `/webhook/?order_nsu=<uuid>` com
   `transaction_nsu`+`invoice_slug` → persiste `WebhookEvent` bruto → **`payment_check` reconfirma** →
   marca `Checkout.PAID` (paid_amount, capture_method, receipt_url) → roteia pro
   warning estruturado quando nenhum consumidor reconhece o evento.

## Endpoints

- `GET /integrations/infinitepay/status/` — **DMZ.** Onboarding/health (padrão das integrações):
  `handle_in_env`, `base_url`, `external_url_in_env`, `ready`, `validation_checks`.
- `POST /integrations/infinitepay/checkout/` — **DMZ.** `{amount_cents|amount, description, customer?,
  redirect_url?}` → `Checkout` PENDING + `checkout_url`.
- `GET /integrations/infinitepay/checkout/<external_id>/` — **DMZ.** Lê o checkout.
- `POST /integrations/infinitepay/webhook/` — **PÚBLICO.** O que a InfinitePay chama de volta.

## Models

- `Checkout` — `external_id` (UUID = borda + `order_nsu`), `checkout_url`, `slug`, `status` (PENDING/PAID),
  `amount_cents`/`paid_amount_cents` (**centavos**, como a API), `capture_method`, `transaction_nsu`,
  `receipt_url`, `request/response_payload` (JSON). Status só vira PAID por `payment_check`.
- `WebhookEvent` — payload bruto + `source_ip`/`user_agent` (auditoria, como no asaas).

## Decisões / desvios do legado (CONVENTION)

- **Não portado** (delírio/adiado): HMAC/IP-allowlist (delírio), Fernet na URL (o `order_nsu` UUID já é
  opaco), fila de notificar consumidor + recibo/anti-fraude por IA — **adiados** até `ai`/`lead`/
  `enrollment` existirem (viram spec nova, WORKFLOW §15).
- Dinheiro em **centavos** (a API fala centavos), não Decimal-reais (≠ asaas, que é PIX/Decimal).

## Config (`.env`)

- `INFINITEPAY_HANDLE` — o handle (`v7m`), sem `$`. Sem ele: `infinitepay.E001` trava o boot.
- `INFINITEPAY_BASE_URL` — `https://api.infinitepay.io` (oficial; ≠ legado `api.checkout.infinitepay.io`).
- `EXTERNAL_URL` — base pública pro `webhook_url` do checkout.

## Teste (Portão 3 — E2E real)

De fora via exit-node (skill `.claude/skills/testar-url-via-exit-node`), em
`dev.m33.live`: `GET /status/` 200, checkout real criado (`b5e61eaa-…`, link `checkout.infinitepay.io/v7m`),
webhook sintético recebido (`src_ip` do exit-node). **PAID real:** Victor pagou R$1 (cartão, 105c) →
webhook do servidor real da InfinitePay (`34.150.174.252`) → `payment_check` → **PAID**.
Print em `.claude/tests/1b-infinitepay-checkout.md`.
