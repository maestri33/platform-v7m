# IEADPG Visitantes — Fase 2 (Agente 2: Backend API Contracts)

## 1. Resumo do problema atual

Achados principais:
- O frontend precisa ser guiado por status, mas o fluxo ficou mais coerente quando todo o onboarding público fica sob `visitors`.
- `POST /visitors/authentication` precisa seguir idempotente por telefone.
- `POST /visitors/login` e os GETs/POSTs de etapa precisam devolver `status` com `code/label/description/required_action`.
- As etapas de dados, endereço e religião precisam salvar e avançar sem depender de um endpoint extra de `/update`.
- Há inconsistência de nomenclatura de telefone (`contact_number` legado vs `phone` canônico).

---

## 2. Tabela por endpoint

## 2.1 POST /visitors/authentication

| Item | Atual | Contrato ideal |
|---|---|---|
| Objetivo | Criar/reaproveitar visitante online ou presencial e enviar OTP | Idempotente por telefone (criar ou reaproveitar) |
| Entrada | `phone`, `is_in_person` (`true/false`) | **Compatível**: aceitar `contact_number` e `phone`; manter `is_in_person` booleano |
| Telefone existente online | reaproveitar perfil | `200` com mesmo `profile_uuid` e OTP reenviado |
| Caso híbrido (`4` + presencial) | Deve promover status | Formalizar promoção para `14` obrigatória |
| Resposta | `message`, `first_name`, `profile_uuid`, `magic_link`, `is_visitor` | manter payload enxuto e orientado ao login |

**Request (ideal compatível):**
```json
{
  "phone": "5543999998888",
  "is_in_person": false
}
```

**Response (200):**
```json
{
  "message": "Codigo de verificacao enviado com sucesso.",
  "first_name": "João",
  "profile_uuid": "2d0f2c1d-...",
  "magic_link": "https://dominio-do-frontend.com/login/2d0f2c1d-...?otp=123456",
  "is_visitor": true
}
```

## 2.2 POST /visitors/login

| Item | Atual | Contrato ideal |
|---|---|---|
| Entrada | `profile_uuid`, `otp` | manter |
| Saída | `access`, `refresh`, `is_visitor`, `status` | manter `status` obrigatório para bootstrap do fluxo |
| Erro OTP inválido | `401` + message | manter, com código de erro estruturado |

## 2.3 POST /visitors/refresh

| Item | Atual | Contrato ideal |
|---|---|---|
| Entrada | `refresh` | manter |
| Saída | `access`, `refresh` | manter, sempre com `message` |
| Erro token inválido | `401` + message | manter |

## 2.4 GET /visitors/data

| Item | Atual | Contrato ideal |
|---|---|---|
| Função | carregar dados principais com contexto da etapa | manter |
| Saída | `message`, `profile`, `status`, `required_action`, `missing_fields` | obrigatório |

**Response (200):**
```json
{
  "message": "Dados principais carregados. Esta etapa ja foi concluida. Proximo passo: Completar o endereço.",
  "profile": {
    "full_name": "João da Silva",
    "email": "joao@email.com",
    "date_of_birth": "1990-05-20",
    "gender": "male",
    "marital_status": "single"
  },
  "status": {
    "code": 2,
    "label": "Dados iniciais salvos - online",
    "description": "Dados pessoais principais já foram preenchidos no fluxo online.",
    "required_action": "Completar o endereço."
  }
}
```

## 2.5 POST /visitors/data

| Item | Atual | Contrato ideal |
|---|---|---|
| Semântica | salva dados principais | salvar e promover `1 -> 2` ou `11 -> 12` quando válido |
| Campos | `full_name`, `email`, `date_of_birth`, `gender`, `marital_status` | manter |
| Resposta | `message`, `profile`, `status`, `required_action`, `missing_fields` | obrigatória |

## 2.6 GET /visitors/address

| Item | Atual | Contrato ideal |
|---|---|---|
| Função | carregar endereço com contexto da etapa | manter |
| Saída | `message`, `address`, `status`, `required_action`, `missing_fields` | obrigatória |

## 2.7 POST /visitors/address

| Item | Atual | Contrato ideal |
|---|---|---|
| Semântica | salva endereço | salvar e promover `2 -> 3` ou `12 -> 13` quando válido |
| Regra | `complement` é opcional | manter explícito no contrato |

## 2.8 GET /visitors/religious-data

| Item | Atual | Contrato ideal |
|---|---|---|
| Função | leitura de dados religiosos | manter |
| Campos | `religion`/`christianity_type`/dados da igreja + `status`/`missing_fields` | manter |

## 2.9 POST /visitors/religious-data

| Item | Atual | Contrato ideal |
|---|---|---|
| Semântica | salva dados religiosos | salvar e promover `3 -> 4` ou `13 -> 14` quando válido |
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
1. `profile_uuid` em `POST /visitors/authentication`.
2. `magic_link` em `POST /visitors/authentication`.
3. `refresh` em `POST /visitors/login`.
4. endpoint `POST /visitors/refresh` com `message`.

Prioridade média:
5. `required_action` no payload de erro dos endpoints de etapa.
6. Alias de entrada para telefone (`phone` e `contact_number`) com padronização gradual.

---

## 5. Mudanças recomendadas na OpenAPI

1. Expor enums reais com descrição para:
   - `gender`
   - `marital_status`
   - `religion`
   - `christianity_type`
2. Marcar `POST /visitors/login` e os GETs de etapa como contratos de referência para estado do fluxo.
3. Documentar explicitamente:
   - GET carrega a etapa e informa o que falta
   - POST da própria etapa salva e avança quando tudo estiver completo
4. Documentar resposta idempotente de `authentication` (incluindo reaproveitamento).
5. Definir schema comum de erro reutilizável (`ValidationFlowError`).

---

## 6. Compatibilidade e impacto

Estratégia sem quebra desnecessária:
- Manter campos atuais e **adicionar** novos campos (abordagem additive-first).
- Aceitar ambos nomes de telefone durante fase de transição.
- Preservar códigos HTTP atuais quando possível; ajustar semântica de `authentication` para idempotência com `200`.

Impacto esperado:
- Frontend reduz lógica condicional implícita.
- Menor risco de bloqueio no caso híbrido.
- Melhor previsibilidade para QA e automação.

---

## 7. Ordem de implementação

1. Ajustar contrato de `authentication` para idempotência + reaproveitamento de perfil + envio de OTP.
2. Ajustar caso híbrido oficial (`4 -> 14`) no contrato e testes.
3. Consolidar o uso de `/visitors/authentication`, `/visitors/login` e `/visitors/refresh` para o frontend.
4. Padronizar erro de validação (`message`, `required_action`, `missing_fields`, `allowed_values`).
5. Atualizar OpenAPI com enums e schemas comuns.
6. Introduzir depreciação suave de nomenclatura de telefone.

---

## Handoff (obrigatório)

### 1. O que ficou validado
- `POST /visitors/login` e os GETs de etapa passam a orientar o frontend por status.
- `authentication` deve ser idempotente por telefone, sem duplicar perfil.
- Caso híbrido precisa culminar em status `14` quando houver registro presencial de visitante em `4`.
- Regra de transição oficial: o POST da própria etapa salva e avança a etapa correspondente.

### 2. O que depende do próximo agente
- Agente 0 deve consolidar domínio + contrato único oficial.
- Agente 3 implementará services/use cases e refactor incremental com base nestes contratos.
- Agente 5 definirá mensagem OTP/magic link e política de expiração/reenvio aderentes ao contrato.

### 3. O que ainda está ambíguo
- Campo canônico definitivo de telefone no contrato público após período de compatibilidade.
- Inclusão de `status` no `visitors/login` (obrigatório para o bootstrap do fluxo).
- Política final de status HTTP para erros de regra de negócio (400 vs 409 em casos específicos).

### 4. O que NÃO deve ser alterado sem nova validação
- Máquina de estados aprovada na Fase 1.
- Obrigatoriedade de `code/label/description/required_action` nas respostas de login e dos GETs/POSTs de etapa.
- Regra de idempotência por telefone em `authentication`.
- Regra de avanço embutida nos POSTs de etapa.
