# hub — o polo

O **polo** (§4 item 5). Entidade `Hub` (CONVENTION §4: `Hub → Address` por FK) + a base
administrativa que o cerca. **Fatia 1 = a fundação**: a entidade, o seed dos padrões e a superfície
do `staff`. As ações do coordenador (aprovar treino, aplicar prova, matrícula, taxas…) entram depois
no grupo `leadership` (specs `coordinator`/`promoter`).

## Modelo `Hub`
- `external_id` (UUID) — id exposto na borda da API.
- `address` (FK → `users.Address`) — endereço do polo; nasce vazio, expande depois.
- `brand` — a marca, validada contra o catálogo do `.env` (`HUB_BRANDS`: `wyden`/`estacio`/`standard`).
  **Não** é `choices` fixo no model — mesma filosofia das roles (§9): catálogo no `.env`.
- `coordinator` (FK → User, nullable) — o promotor que coordena. **Identifica o polo na captação**
  (spec hub: "coordenador (external_id)"); trocar o coordenador faz o link antigo cair no polo padrão.
- `is_default` — marca o **polo PADRÃO** (só pode haver 1, via `UniqueConstraint` condicional). É o
  fallback de captação: candidato sem `ref` cai nele.

## Interface (in-process — CONVENTION §3)
- `create_hub(brand, coordinator_external_id?, is_default?)` — cria o polo (Address vazio + marca validada).
- `list_hubs()` · `get_by_external_id(...)` · `get_default()`.
- `set_coordinator(hub_external_id, coordinator_external_id)` — designa/troca o coordenador (exige que
  seja **promotor**; garante a role `coordinator` nele).
- `default_coordinator_external_id()` — coordenador do hub padrão (fallback de captação).

## Seed — `seed_defaults`
Comando **idempotente** (`python manage.py seed_defaults`) que cria os PADRÕES: a **conta-mãe** do
Victor (staff superuser + promoter + coordinator) e o **hub padrão** (coordenado por ela). No início
tudo é centralizado nessa conta (Victor 2026-06-03). Dados no `.env` (`DEFAULT_STAFF_*`,
`DEFAULT_HUB_BRAND`). Em prod, roda no entrypoint do deploy. Não passa por CPFHub/WhatsApp (é seed
de sistema, não `register`); as roles promoter/coordinator são criadas direto (bypass do catálogo).

## Checks
`hub.W001` (HUB_BRANDS vazio) · `hub.W002` (marca padrão fora do catálogo) — só avisam, não travam o boot.

> A superfície de API (o que o staff chama) está em [[wiki/api/staff]].
