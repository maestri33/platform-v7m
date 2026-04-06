# IEADPG Visitantes — Fase 4 (Agente 3: Backend Workflow Implementation)

## 1. Objetivo

Traduzir a Fase 1 (domínio) e a Fase 2 (contratos) em organização concreta de backend, com services previsíveis, progressão por etapa e refactor incremental sem quebrar a API já exposta.

Princípios obrigatórios:
- `profiles` continua dono da identidade base.
- `visitors` continua dono do fluxo de visitante.
- `visitors` expõe os endpoints consumidos pelo frontend do onboarding.
- cada etapa possui um GET de leitura e um POST de submissão.
- o POST da própria etapa é responsável por salvar e avançar.

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
    religion.py
    steps.py
```

Responsabilidades:
- `creation.py`
  - registro online
  - registro presencial
  - idempotência por telefone
  - promoção híbrida `4 -> 14`
- `religion.py`
  - leitura e persistência de dados religiosos
  - validações condicionais do ramo cristão
  - promoção automática nas etapas `3/13`
- `steps.py`
  - leitura e gravação de dados principais e endereço
  - promoção automática nas etapas `1/11` e `2/12`
- `access.py`
  - expõe se `Profile` tem contexto de visitante habilitado

---

## 3. State machine implementada

Trilhos oficiais:
- Online: `1 -> 2 -> 3 -> 4`
- Presencial: `11 -> 12 -> 13 -> 14`

Regra híbrida obrigatória:
- visitante em `4`, ao fazer registro presencial idempotente, deve ir para `14`

Regra operacional:
- o POST da etapa salva os dados
- quando a etapa estiver completa, o mesmo POST promove o status correspondente

---

## 4. Workflow de registro

### 4.1 Registro online

Entrada:
- `phone`
- endpoint público: `POST /visitors/authentication`

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
- endpoint público: `POST /visitors/authentication`

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

---

## 5. Workflow de progressão

Entrada:
- usuário autenticado

Arquivos atuais:
- [steps.py](/root/backend-ieadpg/apps/visitors/services/steps.py)
- [religion.py](/root/backend-ieadpg/apps/visitors/services/religion.py)

Fluxo:

### Etapa 1 ou 11
Obrigatórios:
- `full_name`
- `date_of_birth`
- `gender`
- `marital_status`

Sucesso:
- `POST /visitors/data`
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
- `POST /visitors/address`
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
- `POST /visitors/religious-data`
- `3 -> 4`
- `13 -> 14`

### Etapa 4 ou 14
Validação final:
- etapa já concluída para o onboarding atual
- `4` orienta visita presencial
- `14` orienta retirada do brinde

---

## 6. Leitura e gravação por domínio

### 6.1 Dados principais

App dono:
- `visitors`

Endpoints:
- `GET /visitors/data`
- `POST /visitors/data`

Regra:
- retorna dados principais + contexto da etapa
- ao salvar com sucesso, promove `1 -> 2` ou `11 -> 12`

### 6.2 Endereço

App dono:
- `visitors`

Endpoints:
- `GET /visitors/address`
- `POST /visitors/address`

Regra:
- retorna endereço + contexto da etapa
- ao salvar com sucesso, promove `2 -> 3` ou `12 -> 13`

### 6.3 Dados religiosos

App dono:
- `visitors`

Endpoints:
- `GET /visitors/religious-data`
- `POST /visitors/religious-data`

Regra:
- retorna dados religiosos + contexto da etapa
- ao salvar com sucesso, promove `3 -> 4` ou `13 -> 14`

---

## 7. Contrato de status

O frontend deve depender de:
- `POST /visitors/authentication`
- `POST /visitors/login`
- `POST /visitors/refresh`
- `GET /visitors/data`
- `GET /visitors/address`
- `GET /visitors/religious-data`

Payload obrigatório:
```json
{
  "message": "Login realizado com sucesso.",
  "status": {
    "code": 3,
    "label": "Endereço salvo - online",
    "description": "O endereço do visitante já foi preenchido no fluxo online.",
    "required_action": "Informar os dados religiosos."
  }
}
```

Fonte atual:
- [auth.py](/root/backend-ieadpg/apps/visitors/services/auth.py)
- [models.py](/root/backend-ieadpg/apps/visitors/models.py)

---

## 8. Estratégia de implementação incremental

Ordem segura:
1. consolidar `profiles` como fundação de identidade
2. manter `visitors` enxuto, dono apenas do fluxo de visitante
3. concentrar a progressão no POST de cada etapa
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
- promoção híbrida `4 -> 14`
- avanço `1 -> 2`
- avanço `2 -> 3`
- avanço `3 -> 4`
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
- progressão ficou concentrada nos services de cada etapa.
- API ficou fina e alinhada ao contrato aprovado.

### 2. O que depende do próximo agente
- Fase 5: OTP, expiração e mensageria.
- Fase 6: consumo frontend 100% guiado por status.

### 3. O que ainda está ambíguo
- política final de locking transacional para concorrência extrema.
- necessidade futura de extrair state machine para módulo dedicado fora de `models.py`.

### 4. O que NÃO deve ser alterado sem nova validação
- trilhos `1..4`, `11..14` e status operacional `21`
- regra de avanço embutida no POST de cada etapa
- idempotência por telefone
- `POST /visitors/login` e os GETs de etapa como contratos de status para o frontend
