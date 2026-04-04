# IEADPG Visitantes — Fase 2 (Agente 2: Backend API Contracts)

## 1. Resumo do problema atual

Achados principais:
- O frontend precisa ser guiado por status, mas hoje nem todos os endpoints seguem um padrão uniforme de erro/ação requerida.
- `POST /api/visitors/register` online hoje retorna conflito para telefone existente em vez de comportamento idempotente com reaproveitamento explícito.
- `GET /api/visitors/me` já retorna `status` com `code/label/description/required_action`, mas essa estrutura ainda não está imposta como contrato transversal.
- `POST /api/auth/check` retorna apenas `first_name` e `is_visitor`; faltam `profile_uuid` e `magic_link` para retomada sem fricção.
- Há inconsistência de nomenclatura de telefone (`contact_number` em visitors/register, `phone` em auth/check e profiles).

---

## 2. Tabela por endpoint

## 2.1 POST /api/visitors/register

| Item | Atual | Contrato ideal |
|---|---|---|
| Objetivo | Criar visitante online ou presencial | Idempotente por telefone (criar ou reaproveitar) |
| Entrada | `contact_number`, `is_in_person` (`yes/no`) | **Compatível**: aceitar `contact_number` e `phone`; manter `is_in_person` |
| Telefone existente online | `409` no fluxo online | `201` com `reused_existing_profile=true` e status consistente |
| Caso híbrido (`5` + presencial) | Deve promover status | Formalizar promoção para `15` obrigatória |
| Resposta | `message`, `profile_uuid`, `visitor_status` | adicionar `reused_existing_profile`, `status` completo |

**Request (ideal compatível):**
```json
{
  "contact_number": "5543999998888",
  "is_in_person": "no"
}
```

**Response (201):**
```json
{
  "message": "Visitante processado com sucesso.",
  "profile_uuid": "2d0f2c1d-...",
  "reused_existing_profile": true,
  "status": {
    "code": 1,
    "label": "Cadastro online realizado",
    "description": "Contato captado pela internet com intenção de visitar a igreja.",
    "required_action": "Completar os dados principais do cadastro."
  }
}
```

## 2.2 POST /api/auth/check

| Item | Atual | Contrato ideal |
|---|---|---|
| Objetivo | Validar telefone + enviar OTP | Mesmo objetivo, com retorno para retomada rápida |
| Entrada | `phone` | manter `phone` + aceitar `contact_number` (compatibilidade) |
| Saída | `first_name`, `is_visitor` | incluir `profile_uuid`, `magic_link`, `first_name`, `is_visitor` |

**Response (200 ideal):**
```json
{
  "message": "Código de verificação enviado com sucesso.",
  "first_name": "João",
  "profile_uuid": "2d0f2c1d-...",
  "magic_link": "https://dominio-do-frontend.com/login/2d0f2c1d-...?otp=123456",
  "is_visitor": "yes"
}
```

## 2.3 POST /api/auth/login

| Item | Atual | Contrato ideal |
|---|---|---|
| Entrada | `profile_uuid`, `otp` | manter |
| Saída | `access`, `refresh`, `is_visitor` | manter + opcional `status` do visitante para bootstrap |
| Erro OTP inválido | `401` + message | manter, com código de erro estruturado |

## 2.4 GET /api/visitors/me

| Item | Atual | Contrato ideal |
|---|---|---|
| Função | status do visitante autenticado | **Fonte de verdade do frontend** |
| Saída | `message`, `status` com `code/label/description/required_action` | manter e consolidar como obrigatório |

**Response (200):**
```json
{
  "message": "Status do visitante carregado com sucesso.",
  "status": {
    "code": 13,
    "label": "Endereço salvo - presencial",
    "description": "O endereço do visitante já foi preenchido no fluxo presencial.",
    "required_action": "Informar os dados religiosos."
  }
}
```

## 2.5 PATCH /api/profiles/data

| Item | Atual | Contrato ideal |
|---|---|---|
| Semântica | salva dados de perfil | manter (não avança etapa) |
| Enum visível | já usa Literal em schema | refletir enums no OpenAPI com descrição |
| Erro | somente `message` | erro padronizado com `allowed_values` quando enum inválido |

## 2.6 PATCH /api/profiles/address

| Item | Atual | Contrato ideal |
|---|---|---|
| Semântica | salva endereço | manter |
| Regra | não avança status | manter explícito no contrato |

## 2.7 GET /api/visitors/religious-data

| Item | Atual | Contrato ideal |
|---|---|---|
| Função | leitura de dados religiosos | manter |
| Campos | religion/christianity_type/church info | manter com enums explícitos na spec |

## 2.8 PATCH /api/visitors/religious-data

| Item | Atual | Contrato ideal |
|---|---|---|
| Semântica | salva dados religiosos | manter |
| Regra condicional | campos extras por ramo cristão | manter + documentar validações condicionais na OpenAPI |

## 2.9 POST /api/visitors/update

| Item | Atual | Contrato ideal |
|---|---|---|
| Semântica | avança status conforme completude | manter como único avanço oficial |
| Erro de pendência | `message`, `status`, `missing_fields` | manter + incluir `required_action` no erro padrão |

---

## 3. Erros padronizados

Formato recomendado (4xx):
```json
{
  "message": "Ainda faltam dados principais do perfil.",
  "required_action": "Completar os dados principais do cadastro.",
  "missing_fields": ["full_name", "date_of_birth"],
  "allowed_values": {
    "gender": ["female", "male"],
    "marital_status": ["single", "married", "divorced", "widowed", "stable_union", "not_informed"]
  }
}
```

Regras:
- `message`: humano, em pt-BR.
- `required_action`: obrigatório quando o erro bloquear avanço de fluxo.
- `missing_fields`: obrigatório para bloqueio por completude.
- `allowed_values`: obrigatório quando houver violação de enum.

---

## 4. Campos que precisam ser adicionados

Prioridade alta:
1. `reused_existing_profile: boolean` em `POST /api/visitors/register`.
2. `status` completo (objeto) em `POST /api/visitors/register`.
3. `profile_uuid` em `POST /api/auth/check`.
4. `magic_link` em `POST /api/auth/check`.

Prioridade média:
5. `required_action` no payload de erro dos endpoints de avanço/validação.
6. Alias de entrada para telefone (`phone` e `contact_number`) com padronização gradual.

---

## 5. Mudanças recomendadas na OpenAPI

1. Expor enums reais com descrição para:
   - `gender`
   - `marital_status`
   - `religion`
   - `christianity_type`
2. Marcar `GET /api/visitors/me` como endpoint de referência de estado do fluxo.
3. Documentar explicitamente:
   - PATCH salva e não avança
   - POST `/api/visitors/update` avança 1 etapa
4. Documentar resposta idempotente de `register` (incluindo reaproveitamento).
5. Definir schema comum de erro reutilizável (`ValidationFlowError`).

---

## 6. Compatibilidade e impacto

Estratégia sem quebra desnecessária:
- Manter campos atuais e **adicionar** novos campos (abordagem additive-first).
- Aceitar ambos nomes de telefone durante fase de transição.
- Preservar códigos HTTP atuais quando possível; ajustar semântica de `register` para idempotência com `201`.

Impacto esperado:
- Frontend reduz lógica condicional implícita.
- Menor risco de bloqueio no caso híbrido.
- Melhor previsibilidade para QA e automação.

---

## 7. Ordem de implementação

1. Ajustar contrato de `register` para idempotência + `reused_existing_profile` + `status` completo.
2. Ajustar caso híbrido oficial (`5 -> 15`) no contrato e testes.
3. Evoluir `auth/check` para retornar `profile_uuid`, `magic_link`, `first_name`.
4. Padronizar erro de validação (`message`, `required_action`, `missing_fields`, `allowed_values`).
5. Atualizar OpenAPI com enums e schemas comuns.
6. Introduzir depreciação suave de nomenclatura de telefone.

---

## Handoff (obrigatório)

### 1. O que ficou validado
- `GET /api/visitors/me` permanece fonte de verdade para status.
- `register` deve ser idempotente por telefone, sem duplicar perfil.
- Caso híbrido precisa culminar em status `15` quando houver registro presencial de visitante em `5`.
- Regra de transição oficial: PATCH salva; POST `/visitors/update` avança etapa.

### 2. O que depende do próximo agente
- Agente 0 deve consolidar domínio + contrato único oficial.
- Agente 3 implementará services/use cases e refactor incremental com base nestes contratos.
- Agente 5 definirá mensagem OTP/magic link e política de expiração/reenvio aderentes ao contrato.

### 3. O que ainda está ambíguo
- Campo canônico definitivo de telefone no contrato público após período de compatibilidade.
- Inclusão de `status` no `auth/login` (opcional recomendado vs obrigatório).
- Política final de status HTTP para erros de regra de negócio (400 vs 409 em casos específicos).

### 4. O que NÃO deve ser alterado sem nova validação
- Máquina de estados aprovada na Fase 1.
- Obrigatoriedade de `code/label/description/required_action` no status de `me`.
- Regra de idempotência por telefone em `register`.
- Regra de avanço centralizada em `POST /visitors/update`.
