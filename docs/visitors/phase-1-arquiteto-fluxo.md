# IEADPG Visitantes — Fase 1 (Agente 1: Arquiteto de Fluxo)

## 1. Tabela de status

| Fluxo | Código | Nome canônico | Significado de domínio | required_action (canônico) |
|---|---:|---|---|---|
| Online | 1 | NEW_ONLINE | Cadastro online criado e autenticável, dados principais ainda incompletos. | Completar dados principais do perfil. |
| Online | 2 | DATA_COMPLETED_ONLINE | Dados principais concluídos no fluxo online. | Completar endereço. |
| Online | 3 | ADDRESS_COMPLETED_ONLINE | Endereço concluído no fluxo online. | Completar dados religiosos. |
| Online | 4 | DATA_RELIGION_COMPLETED_ONLINE | Dados religiosos concluídos no fluxo online. | Confirmar/registrar visita presencial. |
| Online | 5 | AWAITTING_PRESENTIAL_VISIT | Jornada digital concluída; visita presencial pendente. | Registrar chegada presencial na igreja. |
| Presencial | 11 | NEW_PRESENCIAL | Visitante captado presencialmente, dados principais ainda incompletos. | Completar dados principais do perfil. |
| Presencial | 12 | DATA_COMPLETED_PRESENCIAL | Dados principais concluídos no fluxo presencial. | Completar endereço. |
| Presencial | 13 | ADDRESS_COMPLETED_PRESENCIAL | Endereço concluído no fluxo presencial. | Completar dados religiosos. |
| Presencial | 14 | DATA_RELIGION_COMPLETED_PRESENCIAL | Dados religiosos concluídos no fluxo presencial. | Encaminhar para entrega do presente. |
| Presencial | 15 | AWAITING_TO_COLLECT_YOUR_GIFT | Cadastro presencial completo, aguardando coleta/entrega do presente. | Entregar/coletar presente de boas-vindas. |

---

## 2. Tabela de transição (state machine oficial)

### 2.1 Regra geral de avanço
- **PATCH** (`/api/profiles/data`, `/api/profiles/address`, `/api/visitors/religious-data`) **apenas salva** dados.
- **POST `/api/visitors/update`** é o único endpoint que **avança exatamente 1 etapa** por chamada, validando pré-requisitos do status atual.

### 2.2 Transições válidas

| Status atual | Ação | Pré-condição | Próximo status |
|---:|---|---|---:|
| 1 | POST `/visitors/update` | Dados principais válidos | 2 |
| 2 | POST `/visitors/update` | Endereço válido | 3 |
| 3 | POST `/visitors/update` | Dados religiosos válidos | 4 |
| 4 | POST `/visitors/update` | Sem pendências religiosas | 5 |
| 5 | POST `/visitors/register` com `is_in_person=true` | Telefone idempotente e visitante existente | 15 |
| 11 | POST `/visitors/update` | Dados principais válidos | 12 |
| 12 | POST `/visitors/update` | Endereço válido | 13 |
| 13 | POST `/visitors/update` | Dados religiosos válidos | 14 |
| 14 | POST `/visitors/update` | Sem pendências religiosas | 15 |
| 15 | POST `/visitors/update` | N/A | 15 (terminal funcional) |

### 2.3 Regras de bloqueio
- Não pular etapas (ex.: 1 -> 3).
- Não retroceder status sem regra explícita de negócio aprovada.
- Em ausência de campos obrigatórios, retornar erro padronizado com `required_action` e `missing_fields`.

---

## 3. Campos obrigatórios por etapa

### Etapa de dados principais (1/11 -> 2/12)
- `full_name`
- `date_of_birth`
- `gender` (enum válido)
- `marital_status` (enum válido)

### Etapa de endereço (2/12 -> 3/13)
- `zipcode`
- `street`
- `number`
- `neighborhood`
- `city`
- `state`
- `country`

### Etapa religiosa (3/13 -> 4/14)
- `religion` (enum válido)
- Se `religion = christianity`:
  - `christianity_type` (enum válido)
  - Se `christianity_type = evangelical_protestant`:
    - `church_name`
    - `is_in_communion`

### Etapa final (4/14 -> 5/15)
- Sem novos campos obrigatórios.
- Apenas valida consistência final da etapa religiosa.

---

## 4. Regras especiais

1. **Fonte de verdade para frontend**: `GET /api/visitors/me` deve sempre retornar o objeto de status com:
   - `code`
   - `label`
   - `description`
   - `required_action`

2. **Determinismo de transição**:
   - Mesma entrada + mesmo estado = mesma saída.
   - `register` deve ser idempotente por telefone.

3. **Idempotência**:
   - Requisição repetida não duplica perfil nem visitante.
   - Deve sinalizar reaproveitamento (`reused_existing_profile=true`, definido no Agente 2).

4. **Status terminal funcional**:
   - `15` é terminal para onboarding de visitante.
   - Novas fases (ex.: pós-presente) exigem novos códigos e validação formal.

---

## 5. Caso híbrido (definição oficial)

### Cenário
- Visitante conclui online e alcança status `5`.
- Depois comparece presencialmente.
- Recepção chama `POST /api/visitors/register` com `is_in_person=true` e mesmo telefone.

### Regra oficial
- Reutilizar o mesmo `profile_uuid` (idempotência por telefone).
- Converter status de `5` para `15` imediatamente.
- Preencher `date_of_visit` se estiver vazio.
- Retornar sucesso explícito de reaproveitamento e novo status.

### Justificativa
- O objetivo de `5` é “aguardando visita presencial”.
- Ao ocorrer a visita, esse estado deixa de ser verdadeiro; manter em `5` cria inconsistência e trava fluxo guiado por status.

---

## 6. Riscos e ambiguidades

1. **Ambiguidade de nomenclatura de telefone** (`phone` vs `contact_number`) entre endpoints.
2. **Ambiguidade de payload em `auth/check`** (campos opcionais ainda não formalizados no contrato).
3. **Enumeração parcial na OpenAPI** para `gender`, `marital_status`, `religion`, `christianity_type`.
4. **Hipótese marcada**: tratar `15` como terminal funcional é coerente com o fluxo atual; validar com negócio se há pós-etapa obrigatória.
5. **Hipótese marcada**: transição híbrida `5 -> 15` via `register presencial` deve prevalecer sobre qualquer atualização concorrente.

---

## 7. Decisão recomendada

1. **Aprovar oficialmente a máquina de estados acima** como única fonte de domínio.
2. **Aprovar regra de transição**: PATCH salva, POST `/visitors/update` avança 1 etapa.
3. **Aprovar caso híbrido obrigatório**: `5 -> 15` em `register presencial` com mesmo telefone.
4. **Encaminhar para Agente 2** formalizar contratos endpoint a endpoint, incluindo erros e idempotência explícita.

---

## Handoff (obrigatório)

### 1. O que ficou validado
- Fluxos oficiais: online `1 -> 2 -> 3 -> 4 -> 5` e presencial `11 -> 12 -> 13 -> 14 -> 15`.
- Regra de avanço: PATCH salva, POST `/visitors/update` avança uma etapa.
- Caso híbrido oficial: visitante em `5`, ao registrar presencial com mesmo telefone, deve ir para `15`.
- Frontend deve seguir estritamente o status de `GET /api/visitors/me`.

### 2. O que depende do próximo agente
- Formalização dos contratos de API por endpoint (Agente 2), com payloads/erros padrão e compatibilidade.
- Definição final do schema de resposta para idempotência e reaproveitamento de perfil.
- Ajustes OpenAPI para enums e campos obrigatórios.

### 3. O que ainda está ambíguo
- Campo canônico de telefone no contrato público (`phone` ou `contact_number`).
- Extensão exata de resposta em `auth/check` (`profile_uuid`, `magic_link`, `first_name` em todos os cenários).
- Política final de concorrência para chamadas simultâneas de `register` + `update`.

### 4. O que NÃO deve ser alterado sem nova validação
- Sequência de status aprovada para online e presencial.
- Semântica de que PATCH não avança etapa.
- Regra híbrida `5 -> 15` no registro presencial idempotente.
- Obrigatoriedade de `code`, `label`, `description`, `required_action` em `GET /api/visitors/me`.
