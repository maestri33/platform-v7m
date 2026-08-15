# finance — motor de comissão + payout (§4 item 4, Fatia 1)

> **ESTADO:** app de negócio do monólito. Motor de **pagar promotores/coordenadores**: creditar comissão
> → fechamento semanal → solicitação de pagamento → **PIX real** via `asaas.payout`. **Testado REAL**
> (2026-06-01): R$1 saiu fim a fim (saldo 105.53→104.53). Consome `users`/`profiles` (FK→User, pix do
> profile) e `integrations.bank.asaas.payout`. Pasta em **inglês** (`finance`, não `financeiro`). `fees`
> é a Fatia 2 (depois).

## Modelos (`finance/models.py`) — REAIS (Decimal, 2 casas), nunca float

- **`Commission`** — uma comissão creditada, aguardando o fechamento. `payee` = **FK real → `users.User`**
  (borda = `payee.external_id`; pix em `payee.profile.pix_key`). `payee_role` (`promoter`/`coordinator`),
  `source_type` (`lead`/`veteran`/`bonus`), `source_external_id` (UUID puro — lead/student §4-8/9 ainda não
  existem), `amount` (lido do `.env` no crédito), `status` (`pending`→`processed`→`paid`/`failed`).
  **Idempotência no banco:** `unique(source_type, source_external_id)`.
- **`PaymentRequest`** (a "solicitação de pagamento") — 1 por beneficiário/semana → 1 PIX.
  `external_reference` = `{ordinal-sexta-no-mês}_{MM}_{AAAA}_{payee.external_id}` (**unique** = idempotência
  do payout e do fechamento). `pix_key` = **snapshot** do profile no fechamento. `status`:
  `queued`→`submitted`→`paid`/`failed`; `awaiting_pix` (sem chave no profile) e `awaiting_balance` (asaas sem
  saldo) são **NÃO-terminais** (esperam na fila, não falham, não perdem dinheiro).

## Superfície (CONVENTION §3) — `finance/interface/`

- **`commissions.credit_commission(*, payee_external_id, payee_role, source_type, source_external_id)`** —
  ponto que `lead`/`student` vão chamar (hoje: command/teste). Resolve o User via `profiles.interface`
  (sem profile → `ValueError`, não cria comissão órfã), lê o `amount` do `.env`, idempotente por fonte.
- **`commissions.run_weekly_closing(*, reference_date=None)`** — a "sexta 18h": janela = **semana corrente**
  (seg→dom de `reference_date`, America/Sao_Paulo — corrige o bug do legado "tudo que está pending"), dispara
  o **bônus FLAT** (promotor com ≥ `threshold` indicações de lead na semana; `uuid5` determinístico → não
  duplica), agrupa por beneficiário, cria 1 `PaymentRequest` por pessoa (pula se a ref já existe).
- **`payout.process_payment_requests()`** (worker) — claim atômico + backoff; `queued` → `create_payout`
  (asaas, idempotente por `payment_id=external_reference`) → `submitted`; `submitted`/`awaiting_balance` →
  **reconcilia** lendo `get_payout` (PAID→paid e cascateia as comissões; FAILED→failed; AWAITING_BALANCE
  espera). `awaiting_pix` → re-resolve a chave do profile.

## Fluxo do dinheiro / idempotência / validação externa

- **Join asaas↔finance:** `PaymentRequest.external_reference == asaas Payment.payment_id`.
- **Validação externa de saque:** o Asaas chama o NOSSO `POST /integrations/asaas/transfer-validation/`
  ~5s após cada PIX-out; `asaas.transfer_validation.validate()` aprova só a saída que casa com um Payment
  nosso (asaas_id + kind + valor). **⚠️ exige o dev server em `0.0.0.0:80`** (alcançável), senão o Asaas
  recusa → `FAILED`. Ver `.claude` memória `asaas-payout-needs-server-0000-port80`.
- **⚠️ Idempotência:** `create_payout` por `payment_id` (= `external_reference`) — reusar uma ref já enviada
  devolve o Payment existente **sem reenviar** (e o Asaas dedupa pela mesma chave). Re-rodar o fechamento da
  mesma semana = no-op. **Não move dinheiro duas vezes.**

## Config (`.env` → settings → `finance/config.py`) — REAIS, DEV mini

| Chave | DEV | PROD (pedir ao Victor) | Uso |
|---|---|---|---|
| `COMMISSION_DIRECT` | `1` | `100` | comissão por lead que pagou (promotor) |
| `COMMISSION_BONUS_FLAT` | `5` | `500` | bônus flat (≥ threshold indicações/semana) |
| `COMMISSION_COORDINATOR` | `1` | `50` | comissão por student→veteran (coordenador) |
| `COMMISSION_BONUS_THRESHOLD` | `5` | `5` | nº de indicações/semana que destrava o bônus (contagem) |
| `COMMISSION_CLOSING_WEEKDAY` / `_HOUR` | `4` / `18` | idem | sexta 18h America/Sao_Paulo |

Todos têm default (= valores mini) no `settings.py`, então o `.env` é opcional em dev. Checks
`finance.W001/W002` (**Warning**, não travam): avisam valor ≤ 0 ou threshold ≤ 0.

## Agendamento (Django-Q) — `finance/tasks.py` + command `finance_schedules`

`weekly_closing` (sexta 18h) e `process_payouts` (recorrente). Schedules criados idempotentes pelo command
`finance_schedules` (rodado 1×, não no `ready()`).

## Como validar (§8 — dinheiro REAL, pedir autorização)

```bash
python manage.py runserver 0.0.0.0:80     # ALCANÇÁVEL (não localhost) — senão a validação externa recusa
python manage.py commission_credit --payee <external_id> --role promoter --source lead
python manage.py commission_close
python manage.py commission_process       # ⚠️ dispara PIX REAL
```

Evidência: `.claude/tests/4-financeiro-motor.md` (R$1 real, aprovado pelo Victor 2026-06-01).

## Fees — pagamento de DESPESAS (Fatia 2; ⚠️ teste com PIX REAL PENDENTE)

Subsistema de **pagar despesas** (saída de dinheiro), 1º fornecedor = **a instituição que credencia o
aluno**. **Mesma fila** das comissões (`PaymentRequest`) — é tudo dinheiro saindo da mesma conta Asaas
(palavra do Victor). Plano: `plan/4-financeiro-fees.md`.

- **Fila genérica:** `PaymentRequest.kind` (`commission`|`fee`) + `method` (`pix_key`|`pix_qrcode`).
  Comissão = `commission`/`pix_key` (default, inalterado). Fee = `fee`/`pix_qrcode`. `payee`/`payee_role`/
  `week_of` são nullable (fee não tem User payee nem semana); fee usa `qrcode_payload`/`supplier_name`/
  `scheduled_for`.
- **Imediato vs agendado:** `request_fee_payment(scheduled_for=None)` = imediato (`next_attempt_at=now`);
  com data = agendado (`next_attempt_at=scheduled_for` → o worker não pega até lá). **Reusa a fila**, sem
  lógica nova de deferimento.
- **PIX por QR code:** o worker (`method=pix_qrcode`) chama `asaas.qrpay.pay_qr_code` (novo serviço,
  espelha `create_payout`, idempotente por `payment_id`). Reconciliação por **leitura ativa**
  (`qrpay.refresh_qr_payment` → `client.get_pix_transaction`) — o evento de webhook do QR-pay ainda não
  foi confirmado num teste real.
- **Valor vem do CALLER** (a conta real da instituição), nunca do `.env` (§8).
- **Superfície:** `finance/interface/fees.py::request_fee_payment(...)`; command `fee_request` (§8). A fila
  é processada pelo mesmo `commission_process` (roda qualquer `kind`).

**⚠️ «PENDÊNCIA» (Victor decide na volta):** teste com PIX REAL; confirmar o evento de webhook do QR-pay;
confirmar a fila única (vs model `Fee` separado); modelar `Supplier`/instituição; agendamento nativo do
Asaas (`scheduledDate`); métodos extra (pix por chave); enum de status do PIX-transaction.

## Rabo pra trás (vira spec/feature nova)
- Triggers reais (lead pagou / student→veteran). Atribuição do coordenador (vem do `hub`).
- Fast-path por hook do webhook asaas (hoje reconciliação ativa). Tarifa do PIX-out + enum completo de status.
- Re-resolver `pix_key` quando o profile ganhar a chave (validação Pix no Asaas/DICT vem no `candidate`).
