# IEADPG Visitantes — Fase 4 (Agente 3: Backend Workflow Implementation)

## 1. Objetivo

Traduzir a Fase 1 (domínio) e a Fase 2 (contratos) em organização concreta de backend, com services previsíveis, progressão centralizada e refactor incremental sem quebrar a API já exposta.

Princípios obrigatórios:
- `profiles` continua dono da identidade base.
- `visitors` continua dono do fluxo de visitante.
- PATCH salva dados e não avança etapa.
- POST `/api/visitors/update` é o único avanço oficial.
- `GET /api/visitors/me` continua como fonte de verdade do frontend.

---

## 2. Estrutura alvo do app `visitors`

Estrutura recomendada:

```txt
apps/visitors/
  api.py
  models.py
  services/
    access.py
    creation.py
    progression.py
    religion.py
    status.py
```

Responsabilidades:
- `creation.py`
  - registro online
  - registro presencial
  - idempotência por telefone
  - promoção híbrida `5 -> 15`
- `progression.py`
  - valida completude por etapa
  - avança exatamente uma etapa por chamada
- `religion.py`
  - leitura e persistência de dados religiosos
  - validações condicionais do ramo cristão
- `status.py`
  - leitura pública do status atual para o frontend
- `access.py`
  - expõe se `Profile` tem contexto de visitante habilitado

---

## 3. State machine implementada

Trilhos oficiais:
- Online: `1 -> 2 -> 3 -> 4 -> 5`
- Presencial: `11 -> 12 -> 13 -> 14 -> 15`

Regra híbrida obrigatória:
- visitante em `5`, ao fazer registro presencial idempotente, deve ir para `15`

Regra operacional:
- salvar dados não muda status
- apenas `POST /api/visitors/update` muda status

---

## 4. Workflow de registro

### 4.1 Registro online

Entrada:
- `phone`

Comportamento:
1. normaliza telefone
2. busca `Profile` existente por telefone
3. se existir:
   - reaproveita `Profile`
   - garante `Visitor`
   - retorna `reused_existing_profile=true`
4. se não existir:
   - cria `User + Profile + Phone` via `profiles`
   - cria `Visitor` com status `1`

Arquivo atual:
- [creation.py](/root/backend-ieadpg/apps/visitors/services/creation.py)

### 4.2 Registro presencial

Entrada:
- `phone`
- `is_in_person=true`

Comportamento:
1. busca `Profile` por telefone
2. se não existir:
   - cria base em `profiles`
   - cria `Visitor` com status `11`
   - grava `date_of_visit`
3. se existir:
   - reaproveita o mesmo `Profile`
   - promove status online equivalente para o trilho presencial
   - grava `date_of_visit` apenas na primeira vez

Promoções obrigatórias:
- `1 -> 11`
- `2 -> 12`
- `3 -> 13`
- `4 -> 14`
- `5 -> 15`

---

## 5. Workflow de progressão

Entrada:
- usuário autenticado

Arquivo atual:
- [progression.py](/root/backend-ieadpg/apps/visitors/services/progression.py)

Fluxo:

### Etapa 1 ou 11
Obrigatórios:
- `full_name`
- `date_of_birth`
- `gender`
- `marital_status`

Sucesso:
- `1 -> 2`
- `11 -> 12`

Erro:
- `message`
- `required_action`
- `missing_fields`
- `status`

### Etapa 2 ou 12
Obrigatórios no endereço:
- `zipcode`
- `street`
- `number`
- `neighborhood`
- `city`
- `state`
- `country`

Sucesso:
- `2 -> 3`
- `12 -> 13`

### Etapa 3 ou 13
Obrigatórios:
- `religion`
- `christianity_type` quando religião for cristianismo
- `evangelical_church_name`
- `evangelical_is_in_communion`
  quando o ramo for `evangelical_protestant`

Sucesso:
- `3 -> 4`
- `13 -> 14`

### Etapa 4 ou 14
Validação final:
- confirma novamente completude religiosa

Sucesso:
- `4 -> 5`
- `14 -> 15`

---

## 6. Leitura e gravação por domínio

### 6.1 Dados principais

App dono:
- `profiles`

Endpoints:
- `GET /api/profiles/`
- `PATCH /api/profiles/data`

Regra:
- salva dados pessoais
- não avança visitante

### 6.2 Endereço

App dono:
- `profiles`

Endpoints:
- `GET /api/profiles/address`
- `PATCH /api/profiles/address`

Regra:
- salva endereço
- não avança visitante

### 6.3 Dados religiosos

App dono:
- `visitors`

Endpoints:
- `GET /api/visitors/religious-data`
- `PATCH /api/visitors/religious-data`

Regra:
- salva dados religiosos
- não avança visitante

---

## 7. Contrato de status

O frontend deve depender de:
- `GET /api/visitors/me`

Payload obrigatório:
```json
{
  "message": "Status do visitante carregado com sucesso.",
  "status": {
    "code": 3,
    "label": "Endereço salvo - online",
    "description": "O endereço do visitante já foi preenchido no fluxo online.",
    "required_action": "Informar os dados religiosos."
  }
}
```

Fonte atual:
- [status.py](/root/backend-ieadpg/apps/visitors/services/status.py)
- [models.py](/root/backend-ieadpg/apps/visitors/models.py)

---

## 8. Estratégia de implementação incremental

Ordem segura:
1. consolidar `profiles` como fundação de identidade
2. manter `visitors` enxuto, dono apenas do fluxo de visitante
3. centralizar progressão em um service único
4. manter API fina, sem regra pesada dentro do router
5. ampliar testes por cenário crítico antes de abrir novos apps (`members`, `volunteers`)

O que não fazer:
- não mover identidade de visitante para dentro de `profiles`
- não espalhar regras de status pelos endpoints
- não deixar PATCH avançar
- não duplicar lookup de contato fora de `profiles`

---

## 9. Testes mínimos obrigatórios

Cobertura esperada:
- registro online novo
- registro online idempotente
- registro presencial novo
- promoção híbrida `5 -> 15`
- avanço `1 -> 2`
- avanço `2 -> 3`
- avanço `3 -> 4`
- avanço `4 -> 5`
- PATCH religioso sem avanço
- erro com `missing_fields`
- erro com `allowed_values`

Situação atual:
- essa cobertura já existe majoritariamente em [tests.py](/root/backend-ieadpg/apps/visitors/tests.py)

---

## 10. Pendências controladas

Ainda não resolvido nesta fase:
- locking mais rígido para concorrência extrema em chamadas simultâneas
- extração de payloads/erros comuns para schemas compartilhados
- observabilidade mais detalhada por etapa e por canal de autenticação

Essas pendências não invalidam a estrutura atual do workflow.

---

## Handoff (obrigatório)

### 1. O que ficou validado
- `visitors` já possui estrutura de services coerente com o domínio.
- `profiles` permanece como fundação de identidade e contato.
- progressão ficou centralizada em service único.
- API ficou fina e alinhada ao contrato aprovado.

### 2. O que depende do próximo agente
- Fase 5: OTP, expiração e mensageria.
- Fase 6: consumo frontend 100% guiado por status.

### 3. O que ainda está ambíguo
- política final de locking transacional para concorrência extrema.
- necessidade futura de extrair state machine para módulo dedicado fora de `models.py`.

### 4. O que NÃO deve ser alterado sem nova validação
- trilhos `1..5` e `11..15`
- regra PATCH salva / POST `update` avança
- idempotência por telefone
- `GET /api/visitors/me` como fonte única de status
