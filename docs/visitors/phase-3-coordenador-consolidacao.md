# IEADPG Visitantes — Fase 3 (Agente 0: Coordenador)

## 1. Resumo consolidado atual

Consolidação oficial entre Fase 1 (Domínio) e Fase 2 (Contratos):
- A state machine oficial de visitantes está definida em dois trilhos válidos:
  - Online: `1 -> 2 -> 3 -> 4 -> 5`
  - Presencial: `11 -> 12 -> 13 -> 14 -> 15`
- A regra de progressão foi unificada:
  - PATCH salva dados e **não avança etapa**
  - POST `/api/visitors/update` **avança uma etapa por chamada**
- `GET /api/visitors/me` permanece como fonte de verdade para frontend com `code`, `label`, `description`, `required_action`.
- O caso híbrido foi consolidado: visitante em `5`, ao registro presencial idempotente por telefone, deve transicionar para `15`.
- Contrato alvo orienta evolução sem quebra abrupta (additive-first), com padronização progressiva de telefone e erros.

---

## 2. O que ficou validado

1. Regra de negócio validada:
   - Sequências de status online/presencial aprovadas.
   - Regra híbrida `5 -> 15` aprovada.
2. Contrato de API direcionador:
   - `register` idempotente por telefone.
   - `me` obrigatório com metadados completos de status.
   - Padrão de erro com `message`, `required_action`, `missing_fields`, `allowed_values` (alvo).
3. Critério de consistência backend/frontend:
   - Frontend não adivinha regra; backend expõe estado explícito e determinístico.

---

## 3. Resoluções finais de contrato

1. Campo canônico público de telefone: `phone`.
   - `contact_number` permanece apenas como alias legado de compatibilidade.
   - Toda documentação nova deve usar `phone`.
2. `POST /api/auth/login` não retorna `status`.
   - O bootstrap oficial continua em `GET /api/visitors/me`.
   - Isso evita acoplamento do login ao domínio específico de visitante.
3. Política final de status HTTP:
   - `400` para erro de regra de negócio ou dado incompleto.
   - `401` para OTP/token inválido.
   - `404` para recurso/contexto inexistente.
   - `409` apenas para conflito real de unicidade/estado concorrente não idempotente.
   - `422` para payload inválido de schema/enum.
4. Política de concorrência continua pendente de endurecimento transacional específico.

---

## 4. Conflitos encontrados

### Conflito A — Idempotência vs comportamento atual de `register` online
- Contrato desejado: idempotente por telefone com reaproveitamento explícito.
- Implementação atual observada: pode retornar conflito para telefone existente no fluxo online.
- **Decisão válida (critério 1 > 2 > 3)**: prevalece idempotência por telefone no contrato consolidado.

### Conflito B — Caso híbrido travado no frontend
- Regra de negócio: visitante que compareceu presencialmente não pode permanecer em `5`.
- Sintoma atual reportado: sucesso no register presencial, mas manutenção indevida de status `5` em alguns contextos históricos.
- **Decisão válida**: ao registrar presencial de perfil já em `5`, status final obrigatório é `15`.

### Conflito C — Nomenclatura de telefone entre endpoints
- Estado atual: endpoints alternam entre `phone` e `contact_number`.
- **Decisão final**: `phone` é o campo canônico público; `contact_number` fica apenas como alias legado.

---

## 5. Próximo agente a agir

**Agente 3 — Backend Workflow Implementation**

Objetivo imediato:
- Traduzir a decisão consolidada em arquitetura de services/use cases e plano de refactor incremental, sem quebrar contratos já em uso.

Entradas obrigatórias para o Agente 3:
- Fase 1 (state machine oficial).
- Fase 2 (contratos endpoint a endpoint).
- Esta consolidação (resolução de conflitos e ambiguidades abertas).

---

## 6. Checklist de continuidade

### Checklist de bloqueio (deve ser respeitado)
- [ ] Não alterar sequência oficial de status sem nova validação formal.
- [ ] Não permitir avanço por PATCH.
- [ ] Não permitir register duplicar profile por telefone.
- [ ] Não omitir metadados completos de status em `GET /api/visitors/me`.
- [ ] Não aceitar implementação que mantenha visitante em `5` após registro presencial confirmado.

### Checklist de execução (próxima fase)
- [ ] Propor estrutura de pastas orientada a services/use-cases.
- [ ] Centralizar state machine em módulo único do app dono.
- [ ] Centralizar validações por etapa e payload de erro padronizado.
- [ ] Garantir idempotência transacional no register.
- [ ] Planejar testes backend por cenário crítico.

---

## Handoff (obrigatório)

### 1. O que ficou validado
- Domínio e contratos-base foram consolidados sem conflito com a regra de negócio aprovada.
- `me` segue como fonte única de verdade para direcionamento do frontend.
- Caso híbrido `5 -> 15` foi confirmado como obrigatório.

### 2. O que depende do próximo agente
- Agente 3: arquitetura e plano de implementação incremental do backend.
- Agente 5: padrão de OTP/magic link aderente ao contrato consolidado.

### 3. O que ainda está ambíguo
- Estratégia final de locking para concorrência simultânea em cenários extremos.

### 4. O que NÃO deve ser alterado sem nova validação
- State machine validada na Fase 1.
- Contrato-base consolidado de status em `GET /api/visitors/me`.
- Regra de idempotência por telefone em `register`.
- Regra PATCH salva / POST `update` avança.
