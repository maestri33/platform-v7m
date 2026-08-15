# API Spec — Fluxo "Tudo-Async-Até-Receber"

> **Status:** aguardando aprovação / implementação no back (Django)
> **Front (Next.js) já foi migrado** para consumir este contrato. O front tem
> fallback para os endpoints antigos caso este ainda não esteja deployado.
> **Owner do front:** `app-v7m` (este repo)
> **Versão:** 2026-08-13

## TL;DR — o que muda em uma frase

Hoje, candidato em onboarding não tem painel (é redirecionado ao wizard) e não
tem `ref_url`/leads/comissões visíveis. **Daqui pra frente, candidato com
`ref_url` já é quasi-promotor:** entra no painel, vê goal/leads/comissões, e o
pagamento fica **segurado** (acumulado, cai na próxima sexta) até que onboarding
+ aprovação estejam concluídos.

---

## Mudanças resumidas

| Hoje | Depois |
|---|---|
| Candidato em onboarding só vê wizard (redirect de `/painel`) | Candidato em onboarding **cai no `/painel`** (dashboard) |
| `ref_url` só existe pra `promoter` | `ref_url` existe desde o cadastro; candidato já pode divulgar |
| `promoter/me`, `/summary`, `/leads`, `/commissions` gateados por `role==promoter` | Endpoints liberam para qualquer sessão com `ref_url` (candidato onboarding inclusive) |
| Comissão é `pending → paid` na sexta | Comissão fica `acumulada (held)` enquanto onboarding_incomplete **ou** polo não aprovou; cai na próxima sexta |
| Treinamento é trava dura via `TrainingGate` (qualquer sessão com `training`) | `training` role só é concedida após `onboarding_complete + approved`; antes disso o front não mostra `/treinamento` |
| 5 endpoints diferentes para montar o painel | 1 endpoint unificado `GET /api/v1/collaborators/me` (recomendado) — fallback via 3 endpoints separados enquanto migra |

---

## Recomendação forte: criar `GET /api/v1/collaborators/me` (endpoint unificado)

**Por quê:** o front precisa de 3 shapes diferentes hoje (`candidate/me`,
`promoter/me`, `promoter/me/summary`) só para renderizar uma página. Unificar
corta 2 round-trips por carregamento do painel, elimina inconsistência entre
"os blocos de candidato" e "os números de promotor" e expõe o novo campo
`payout_hold` que é a chave do modelo "acumular até receber".

### Request

```
GET /api/v1/collaborators/me
Authorization: Bearer <access_token>
Accept: application/json
```

Sem body. Cache: `no-store` no front (igual aos outros endpoints autenticados).

### Response — 200 OK

```jsonc
{
  "external_id": "u-abc-123",
  "name": "Bia Promotora",
  "roles": ["candidate", "promoter"],     // ver §Roles para o que vem
  "candidate": {                            // presente se candidate
    "status": "address",                    // enum atual (started|profile|address|documents|pix|education|selfie|completed|approved|rejected)
    "approved_at": null,                    // ISO ou null
    "rejected_at": null,                    // ISO ou null
    "rejection_reason": null,               // string|null — quando status==rejected
    "onboarding_complete": false,           // derivado: todas as 5 etapas .done == true
    "steps": {
      "documents": { "done": true,  "status": "approved", "reason": null },
      "address":   { "done": false, "status": "rejected", "reason": "foto borrada" },
      "pix":       { "done": false, "status": null,       "reason": null },
      "education": { "done": false, "status": null,       "reason": null },
      "selfie":    { "done": false, "status": null,       "reason": null }
    }
  },
  "promoter": {                             // presente se ref_url existe (qualquer sessão após cadastro)
    "external_id": "p-xyz-789",
    "hub_external_id": "h-001",
    "status": "active",                      // active | suspended
    "ref_url": "https://v7m.org/r/abc123",
    "pre_matriculado": true,                 // bolsa de estudos
    "summary": {
      "week_goal": 5,
      "week_paid_leads": 2,
      "week_commission_total": "200.00",     // string decimal — manter convenção
      "bonus_amount": "500.00",
      "goal_reached": false,
      "next_closing_at": "2026-08-15T18:00:00-03:00",
      "week_start": "2026-08-10T00:00:00-03:00",
      "lifetime": {
        "total_received": "0.00",
        "total_students": 0,
        "goals_hit": 0
      },
      "payout_hold": {
        "held": true,                        // ← a chave do modelo
        "reason": "onboarding_incomplete",   // onboarding_incomplete | pending_polo_approval | none
        "amount_held": "200.00",             // soma das comissões retidas
        "next_payout_at": "2026-08-22T18:00:00-03:00"
      }
    }
  }
}
```

#### Regras de `candidate.steps[].done` e `status`

| Step | `done` = | `status` derivado de |
|---|---|---|
| `documents` | `documents.rg.validation_status == "approved"` **OR** `documents.cnh.validation_status == "approved"` | `validation_status` |
| `address`   | `address_proof.status == "approved"` | `address_proof.status` |
| `pix`       | `pix_validated == true` | (sem status intermediário; `null` enquanto não validou) |
| `education` | existe registro de `profile.education_level` **AND** `profile.education_completed`/`profile.education_status` definido | (sem status intermediário; `null` enquanto não preencheu) |
| `selfie`    | `selfie.analysis_status == "approved"` | `selfie.analysis_status` |

`onboarding_complete = steps.{documents, address, pix, education, selfie}.done.all()`

> **Importante:** o front NÃO recomputa isso. O back é a fonte. O front só
> lê `steps` e `onboarding_complete`. Se o back recalcular é a única regra.

#### `payout_hold.reason` (enum)

| Valor | Significado | Comportamento do payout |
|---|---|---|
| `"none"` | Tudo OK | Payout normal na sexta da competência |
| `"onboarding_incomplete"` | Pelo menos uma etapa de onboarding pendente | **Não paga.** Mantém comissão `pending` com `held_until = próxima_sexta_18h` |
| `"pending_polo_approval"` | Onboarding 100%, mas polo ainda não aprovou | **Não paga.** Mesma regra |

> Quando `onboarding_complete=true` E `candidate.status == "approved"`, o back
> muda `reason` para `"none"` e libera o payout.

#### Comportamento esperado de payout (regra de negócio)

```
SE (candidate.onboarding_complete == false)
    → hold; reason = "onboarding_incomplete"
    → held_until = próxima sexta 18h (do acumulado)
SE (candidate.onboarding_complete == true) E (candidate.status != "approved")
    → hold; reason = "pending_polo_approval"
    → held_until = sexta seguinte após approval (estimativa, pode mover)
SE (candidate.onboarding_complete == true) E (candidate.status == "approved")
    → libera; reason = "none"
    → payout na sexta da competência (regra atual)
```

**Backlog implícito (criar jobs/CRONs no back):**
1. Job diário que recomputa `payout_hold.reason` quando o status muda.
2. Job de payout semanal (sexta 18h) que **só** paga onde `reason == "none"`.
3. Job que move `held_until` para a próxima sexta quando o motivo persiste.

---

## Alternativa: NÃO criar `/me` agora — abrir os endpoints existentes

Se for mais rápido, **libere os 3 endpoints atuais para o role `candidate`** e
o front usa a estratégia de fallback. Custa mais round-trip e expõe
`payout_hold` em cada um dos 3 (vai duplicar), mas é menos código no back.

### 1. `GET /api/v1/collaborators/candidate/me` (estender)

Mesma resposta de hoje + bloco `steps` + `onboarding_complete`. Campos
existentes (`documents`, `address`, `address_proof`, `selfie`, `pix_validated`)
ficam — são a fonte para derivar `steps`.

### 2. `GET /api/v1/collaborators/promoter/me` (abrir)

Tirar o gate de `role==promoter`. Hoje, candidato que nem chegou ao fim
responde 403. Mudar para: **se a sessão tem `ref_url` em qualquer momento
(histórico), responde 200**; senão 404. Continua devolvendo o shape atual.

### 3. `GET /api/v1/collaborators/promoter/me/summary` (estender)

Resposta de hoje + campo `payout_hold` no mesmo nível de `lifetime`.

```jsonc
{
  "week_goal": 5,
  "week_paid_leads": 2,
  "week_commission_total": "200.00",
  "bonus_amount": "500.00",
  "goal_reached": false,
  "next_closing_at": "2026-08-15T18:00:00-03:00",
  "week_start": "2026-08-10T00:00:00-03:00",
  "lifetime": { "total_received": "0.00", "total_students": 0, "goals_hit": 0 },
  "payout_hold": {                    // ← NOVO
    "held": true,
    "reason": "onboarding_incomplete",
    "amount_held": "200.00",
    "next_payout_at": "2026-08-22T18:00:00-03:00"
  }
}
```

### 4. `GET /api/v1/collaborators/promoter/me/leads` (abrir)

Tirar gate — abrir para qualquer sessão com `ref_url`.

### 5. `GET /api/v1/collaborators/promoter/me/commissions` (estender)

Cada item ganha `held_until`:

```jsonc
{
  "external_id": "c-123",
  "amount": "100.00",
  "source": "lead",
  "status": "pending",                       // pending | paid | failed
  "created_at": "2026-08-12T14:00:00-03:00",
  "paid_at": null,
  "held_until": "2026-08-22T18:00:00-03:00"  // ← NOVO; null se liberado
}
```

E no agregado do summary (item 3) o `amount_held` é a soma onde
`held_until != null`.

---

## Convenção de Roles no JWT (sem mudança no payload, mudança no *quando* as roles são concedidas)

Hoje o back concede `promoter` **depois** do coordinator aprovar. Proposta:

- `candidate` — desde o cadastro. Não muda.
- `promoter` — **passa a ser concedida no momento que `onboarding_complete == true`**
  (não espera aprovação do polo). Isso destrava os endpoints de
  `promoter/me*` no candidato onboarding-completo sem precisar abrir gate
  manualmente. O back adiciona `promoter` ao JWT nesse momento.
- `training` — só depois de `promoter`. Não muda o conceito.
- `coordinator` / `staff` — inalterado.

> Alternativa: manter `candidate` como "fase" e **não** conceder `promoter`
> até a aprovação, **abrindo manualmente os 3 endpoints** acima para `candidate`
> que tem `ref_url`. Mais simples de reverter. **Recomendado para esta iteração**
> — o front funciona igual dos dois jeitos.

---

## Comportamento esperado do front (referência para QA)

Quando o front chama `getMe()` (`src/lib/api/me.ts`, novo):

1. Tenta `GET /api/v1/collaborators/me`. Se 200, usa o shape unificado.
2. Se 404 (endpoint não deployado), chama em paralelo `candidate/me`,
   `promoter/me`, `promoter/me/summary`. Se algum 403/404, segue com
   `null` naquele bloco.
3. Monta o `MeResponse` unificado client-side.

O painel (`/painel`) então decide a renderização:

```
if isOnboarding(roles) {
  if onboarding_complete == false {
    // alerta âmbar persistente + 5 tiles + link + goal (se disponível)
    // bottom-nav: 2 abas (Início · Conta)
    // TrainingGate: inativo (training role ausente)
  } else {
    // onboarding completo, aguardando polo
    // alerta verde: "Cadastro concluído — análise do polo em andamento"
    // 5 tiles todos em ✓ (sem CTA)
    // bottom-nav: 2 abas
  }
}

if isPromoter(roles) {
  // painel atual (limpo, sem alerta, sem tiles)
  // bottom-nav: 4 abas
  // TrainingGate: ativo se training
}
```

---

## Critérios de aceite (checklist p/ o time de back)

- [ ] Candidato em onboarding (`status in [started, profile, address, pix, education, selfie]`) consegue chamar `GET /me` (ou os 3 endpoints) e recebe `ref_url` + `summary.week_goal` + `summary.week_paid_leads` + `summary.payout_hold`.
- [ ] `payout_hold.held == true` e `reason == "onboarding_incomplete"` enquanto houver step com `done=false`.
- [ ] `payout_hold.held == true` e `reason == "pending_polo_approval"` quando onboarding 100% e `status != approved`.
- [ ] `payout_hold.held == false` e `reason == "none"` quando `status == approved`.
- [ ] Job de payout semanal (sexta 18h) **só processa** comissões de sessões com `payout_hold.held == false`. As outras passam para a próxima.
- [ ] Quando o status muda (etapa concluída / polo aprovou), `payout_hold.reason` é reavaliado **na mesma transação** (sem janela de inconsistência).
- [ ] Comissão criada durante onboarding já nasce com `held_until` setado.
- [ ] `me.steps[].status` para `documents` espelha `documents.{rg|cnh}.validation_status` (não tem regra nova — só expor o que já existe).
- [ ] `me.steps[].reason` para `documents`/`address`/`selfie` é o `analysis_reason` que já existe nesses blocos.
- [ ] (Se for pela rota alternativa) Os 3 endpoints `promoter/me`, `promoter/me/summary`, `promoter/me/leads` retornam 200 para sessão `candidate` com `ref_url`.

---

## Migração / rollout sugerido

1. **Back prepara** o endpoint `/me` (ou libera os 3 existentes) **sem** ainda
   mudar a regra de payout. Adiciona `payout_hold` com `held: false` por padrão.
2. **Front já está pronto** (este PR) e consome via fallback. Em produção,
   sem `/me` deployado, o painel mostra candidato onboarding sem o summary
   (degrade gracioso: só alerta + tiles + link).
3. **Back liga** `payout_hold` para candidatos em onboarding. Faz QA com 1-2
   contas de teste.
4. **Back deploya** o job de payout com a regra nova. Sobe um shadow mode
   primeiro (loga o que PAGARIA vs. o que está PAGANDO, sem mudar nada).
5. **Corta o shadow, libera pra todos.** O front passa a mostrar o valor
   segurado.
6. Front remove fallback (chamada única para `/me`).

---

## Contato

Dúvidas de contrato: este repo (`app-v7m`) tem o front que consome;
`app-v7m/.reviews/api-spec-me-unificado.md` é a fonte. PRs de ajuste no
back devem atualizar este doc.
