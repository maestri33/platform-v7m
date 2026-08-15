# core/validation — registro de validações (flags rastreáveis)

> Pedido do Victor: **todo teste que a gente roda fica salvo, com a respectiva flag + horário**, pra
> **rastrear no futuro** se algo der errado. Não é teste automatizado — é um **carimbo** do que já
> validamos (inclusive validação "artificial" via link externo).

## O que é

- **`core/models.py` → `ValidationCheck`** — append-only (histórico): `scope` (ex.: `asaas`), `name`
  (ex.: `webhook_external`), `passed` (bool), `mode` (`artificial` | `real` | `link` | …), `detail`,
  `checked_at`. Index por `(scope, name, -checked_at)`. Migração `core/0002`.
- **`core/validation.py`** — `record_check(scope, name, passed, mode, detail)` grava; `latest_checks(scope)`
  devolve o **último** resultado por `name` (é o que o `/status/` mostra).
- **`manage.py record_check <scope> <name> --passed|--failed --mode <m> --detail "<txt>"`** — carimba
  qualquer teste. Ex.:
  ```bash
  manage.py record_check asaas webhook_external --passed --mode artificial \
    --detail "POST /webhook/ via exit-node chegou: WebhookEvent id=4 src_ip=136.248.104.94"
  ```

## Onde aparece

O `/status/` de cada integração (DMZ) inclui `validation_checks` = último resultado por `name`. Hoje,
em `asaas`: `status_external` (link) e `webhook_external` (artificial) — provando que o webhook foi
validado pela via externa (ver [[../integrations/bank/asaas|asaas]] e
`.claude/tests/1a-iii-asaas-webhook.md`).

## Por quê

Rastreabilidade: se um dia o webhook/saque parar de funcionar, o histórico de `ValidationCheck`
mostra **o que** já foi validado, **quando** e **como** (artificial vs real) — ponto de partida pra
investigar regressão.
