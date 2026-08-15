# users/address — endereço (sub-módulo do users, ciclo 3b)

> Entidade própria de endereço (CONVENTION §4: relação **invertida** — o `Profile` aponta pro
> `Address`, o endereço não pertence ao profile). Totalmente **DMZ** (spec: só dentro da plataforma).
> Reusa o tool [[wiki/integrations/tools/cep]] (ViaCEP) — não duplica lógica de CEP.

## Model (`address/models.py`, app_label `users`)
- **`Address`** (`db_table users_address`): `zipcode`(8), `street`, `number`, `complement`,
  `neighborhood`, `city`, `state`(UF 2), `country`(2, default `BR`), timestamps. **Sem** FK pra
  user/profile (quem aponta é o Profile). Campos de conteúdo nullable — **nasce vazio** no
  provisionamento e é preenchido por CEP/PATCH depois. **1 endereço por profile** (FK 1-1 no Profile).

## Endpoints DMZ (`/users/address/…`)
- `GET <external_id>/` — endereço do usuário (via `profile.address`). 404 `ADDRESS_NOT_FOUND` se não tem.
- `GET id/<address_id>/` — por id do endereço.
- `GET list/` — todos (paginação `limit`/`offset`).
- `POST <external_id>/cep/` `{cep}` — valida o CEP, busca no **ViaCEP** e **salva** (devolve o endereço).
  CEP inexistente/inválido → `422 CEP_NOT_FOUND`; ViaCEP fora → `502 CEP_SERVICE_DOWN`.
- `PATCH <external_id>/` — demais dados (`number`, `complement`, ...); valida UF se enviada.

## interface (`address/interface/`)
`create_empty` (provisionamento), `get_by_external_id`, `get_by_id`, `list_all`, `set_by_cep`,
`patch`, `as_dict`. A view embrulha isto em HTTP; o `auth` chama `create_empty` no register.

## Provisionamento
O endereço vazio nasce na **transação do `register`** (`auth/service.py`): `create_empty()` →
`profiles.attach_address(profile, address)`. (A spec falava em "webhook que cria endereço null ao
criar usuário" — virou o provisionamento direto, mais simples, mesma intenção.)

## Reusa (sem duplicar)
[[wiki/integrations/tools/cep]] (ViaCEP, API pública sem key).

## Teste real
`.claude/tests/3b-users-address-documents-profiles.md` — GET vazio → POST CEP `01001000` (ViaCEP real
→ Praça da Sé/São Paulo/SP) → PATCH → CEP inexistente 422. Tudo REAL.
