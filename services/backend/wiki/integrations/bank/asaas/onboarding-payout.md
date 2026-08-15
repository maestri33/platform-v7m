# asaas — onboarding (auto-cadastro do webhook) + payout

> Parte do [[asaas]]. Cobre o **onboarding/self-test** (1a-v) e o **payout PIX** (1a-vi).
> Doc oficial Asaas: https://docs.asaas.com/llms.txt

## Onboarding / self-test (`onboarding.py`, `url_verify.py`) — 1a-v

A integração roda uma **bateria de testes em todo boot** (não-bloqueante) e expõe endpoints DMZ.

- **Boot:** `apps.py` dispara `onboarding.setup()` numa thread daemon (só em `runserver`/`qcluster`;
  pula `migrate`/`test`; não trava o boot). Loga `asaas_boot_selftest`.
- **`GET /integrations/asaas/status/`** (DMZ, read-only): flags de env + testa a key puxando o saldo +
  diz se o nosso webhook já está cadastrado (casa por **URL**, não por nome — evita confundir com o
  webhook legado). Não muta nada.
- **`POST /integrations/asaas/setup/`** (DMZ): roda a bateria + (ping best-effort da `EXTERNAL_URL`) +
  **auto-cadastra o webhook** no Asaas. **Idempotente:** webhook já cadastrado → não recria;
  `?force=1` → deleta+recria (resync do `authToken`).
- **`GET /integrations/asaas/url-verify/<nonce>/`** (público): echo single-use que consome um nonce
  (`UrlVerifyNonce`), pra provar reachability da URL pública.

**Auto-cadastro:** `POST /v3/webhooks` com `authToken = ASAAS_WEBHOOK_SECRET` (o token que o Asaas
ecoa em `asaas-access-token` e o nosso `check_access_token` valida), `sendType=SEQUENTIALLY`, 26
eventos (`PAYMENT_*`/`TRANSFER_*`).

> ⚠️ **Gate da URL:** o app de dentro do host de dev **não alcança** o domínio público (egress —
> `Network unreachable`; ver skill `testar-url-via-exit-node`). Por isso o ping é **best-effort** e o
> **gate de cadastro é a presença de `EXTERNAL_URL` no `.env`**. A reachability pública real é provada
> à parte pelo exit-node Oracle (registrada nos testes/ledger).

Config (default no código via `getattr`, overridável no `.env`): `ASAAS_WEBHOOK_NAME`
(`dmz-asaas-managed`), `URL_VERIFY_NONCE_TTL` (`600`).

## Payout PIX (`payout.py`) — 1a-vi

Envia PIX (saída) pra uma chave, persistido como `Payment(kind=pixkey)`; o status é guiado por webhook.

- **`POST /integrations/asaas/payout/`** (DMZ): body `{amount, pix_key|cpf, description?, payment_id?}`.
  Cria `Payment(SUBMITTING)` → `create_transfer` → `SUBMITTED`.
- **`GET /integrations/asaas/payout/<payment_id>/`** (DMZ): lê o payout.
- **Status guiado por webhook:** o `/transfer-validation/` (mecanismo de saque) aprova casando por
  `asaas_id`; o `TRANSFER_DONE` cai em `webhooks._apply_payout` → `Payment.status = PAID`.

**Money-safe (CONVENTION §8):** persiste a intenção **antes** de chamar o Asaas; `idempotency_key =
payment_id` (re-submit → 409, nunca duplica); falha **incerta** de rede deixa `SUBMITTING` (não marca
`FAILED` às cegas) p/ reconciliação.

O envio é síncrono e idempotente. Conferir **tarifa do PIX-out** e enum de status na documentação
oficial antes de produção.

## Provado (E2E REAL — conta de teste, dinheiro real)

- Webhook auto-cadastrado e recebendo eventos reais do Asaas (ip `54.94.183.101`).
- Payout: **2× R$1,00** reais enviados (serviço + endpoint) → `TRANSFER_DONE` → `PAID`; saldo caiu R$2.
- Prints em `.claude/tests/1a-v-asaas-onboarding-autowebhook.md` e `.claude/tests/1a-vi-asaas-payout.md`.
