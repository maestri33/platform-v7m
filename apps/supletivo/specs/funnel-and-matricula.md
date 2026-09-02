# Plano de Testes E2E: Funil do Aluno, Matrícula & Bloqueios

**Spec:** `specs/funnel-and-matricula.md`  
**Seed:** `tests/e2e/seed.spec.ts`  
**Aplicação:** `apps/aluno` (`app-supletivo` / Next.js 16)  
**Objetivo:** Garantir a estabilidade e cobertura do funil de matrícula guiado pelo `me_dict.status`, recuperação de `409 WRONG_STATUS`, upload de documentos com IA e banner de bloqueios ativos (`/me/blocks`).

---

## 1. Autenticação OTP & Atribuição de Lead

### 1.1. Check de WhatsApp com Atribuição de Indicação (`?ref=...`)
- **Pré-condição:** Usuário acessa `/?ref=11111111-1111-4111-8111-111111111111`.
- **Passos:**
  1. Verificar que o badge "Indicado por [Nome]" é exibido se o ref for válido.
  2. Digitar número de WhatsApp no campo de telefone.
  3. Submeter formulário (`POST /api/v1/clients/auth/check`).
- **Resultado Esperado:** Redirecionamento suave para `/login` com timer regressivo de OTP.

### 1.2. Validação de OTP e Roteamento por Roles
- **Passos:**
  1. Digitar o código OTP de 6 dígitos no `/login`.
  2. Submeter (`POST /api/v1/clients/auth/login`).
- **Resultados Esperados:**
  - Se role for `lead` → segue para `/cpf`.
  - Se role for `enrollment` → segue para `/matricula`.
  - Se role for `student` ou `veteran` → segue para `/aluno`.

---

## 2. Fluxo Lead: CPF, E-mail & Checkout Asaas

### 2.1. Confirmação de Identidade e Maioridade (`/cpf`)
- **Passos:**
  1. Inserir CPF válido e submeter (`POST /api/v1/clients/lead/identity`).
- **Resultado Esperado:** Revelação suave da identidade (nome e idade) e avanço para `/email`.

### 2.2. E-mail com Sugestão Inteligente (`/email`)
- **Passos:**
  1. Digitar e-mail com typo de domínio (ex.: `aluno@gmai.com`).
  2. Verificar sugestão de correção (`aluno@gmail.com`).
  3. Aceitar sugestão e submeter (`POST /api/v1/clients/lead/email`).
- **Resultado Esperado:** Transição para `/planos`.

### 2.3. Vitrine de Planos & Checkout Pix (`/planos` e `/checkout`)
- **Passos:**
  1. Visualizar valores da API (`GET /api/v1/clients/pricing`).
  2. Selecionar método Pix (`POST /api/v1/clients/lead/checkout`).
- **Resultado Esperado:** Exibição da chave Pix copia-e-cola e polling até confirmação do pagamento, avançando para `/matricula`.

---

## 3. Wizard de Matrícula (Documento-Primeiro)

### 3.1. Seção RG (`me.status = "rg"`)
- **Passos:**
  1. Acessar `/matricula` com status `rg`.
  2. Enviar foto do RG (`POST /enrollment/documents/rg/photo/front`).
  3. Aguardar polling da IA até `status="approved"`.
- **Resultado Esperado:** Preenchimento automático dos dados e avanço para `address`.

### 3.2. Seção Endereço & Comprovante KYC (`me.status = "address"`)
- **Passos:**
  1. Enviar foto do comprovante de residência (`POST /enrollment/address/proof`).
  2. Se `needs_kinship=true`, submeter declaração de parentesco (`POST /enrollment/address/proof/kinship`).
  3. Preencher CEP e dados faltantes (`PATCH /enrollment/address`).
- **Resultado Esperado:** Avanço para `education`.

### 3.3. Seção Escolaridade (`me.status = "education"`)
- **Passos:**
  1. Selecionar nível de ensino, série e preencher nome da última escola.
  2. Submeter (`POST /enrollment/education`).
- **Resultado Esperado:** Avanço para `selfie`.

### 3.4. Seção Selfie & Contrato Digital (`me.status = "selfie"`)
- **Passos:**
  1. Visualizar e aceitar contrato de matrícula (`GET /contract/current`).
  2. Capturar selfie in-app (`POST /enrollment/selfie`).
  3. Aguardar validação biométrica.
- **Resultado Esperado:** Transição para tela de "Aguardando Liberação do Polo".

### 3.5. Recuperação de Concorrência `409 WRONG_STATUS`
- **Passos:**
  1. Simular tentativa de submissão fora de ordem (ex.: postar selfie quando o status no servidor é `rg`).
  2. Servidor retorna `409 Conflict` com `{ code: "WRONG_STATUS", expected_status: "rg" }`.
- **Resultado Esperado:** A UI captura o erro, exibe toast informativo e redireciona automaticamente para a etapa esperada (`rg`), sem travar a aplicação.

---

## 4. Portal do Aluno & Sistema de Bloqueios (`/aluno`)

### 4.1. Exibição de Bloqueios Ativos (`/me/blocks`)
- **Passos:**
  1. Mockar retorno de bloqueio ativo (`GET /api/v1/clients/me/blocks`) com motivo "Foto com reflexo no RG".
  2. Acessar `/aluno` ou `/matricula`.
- **Resultado Esperado:** O `<ActiveBlocksBanner />` deve renderizar o card de alerta com mensagem humanizada em português e botão de ação direta.

### 4.2. Checklist de Documentos e Tipo Sanguíneo
- **Passos:**
  1. Validar listagem de documentos obrigatórios (certificado, histórico escolar, etc.).
  2. Submeter tipo sanguíneo (`POST /student/blood-type`).
- **Resultado Esperado:** Atualização do status para `exam_released` e redirecionamento para `/provas`.
