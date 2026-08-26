# Plano de Testes E2E: Painel de Administração V7M (admin-v7m)
**Seed:** `tests/e2e/seed.spec.ts`
**Base URL:** `http://127.0.0.1:3109`

---

### 1. Autenticação e Guards de Acesso (`/login` e `/setup`)

#### 1.1 Redirecionamento automático quando desautenticado
**Steps:**
1. Navegar diretamente para `/dashboard` sem token de sessão.
**Expected Outcome:**
- A aplicação detecta a ausência de token no `useRequireStaff`.
- O usuário é redirecionado automaticamente para `/login`.

#### 1.2 Fluxo de Login do Staff em 2 passos (Telefone → OTP)
**Steps:**
1. Navegar para `/login`.
2. Preencher o campo "Telefone/WhatsApp" com um telefone válido `(11) 99999-9999`.
3. Clicar em "Enviar código".
4. Verificar transição para o passo "Confirme o código".
5. Preencher os 6 dígitos do OTP `123456`.
**Expected Outcome:**
- Login é autenticado com sucesso.
- O usuário é redirecionado para `/dashboard`.
- Os tokens são gravados no `localStorage` (`staff.login`).

#### 1.3 Acesso negado para usuário não-staff (403 NOT_STAFF)
**Steps:**
1. Navegar para `/login`.
2. Enviar telefone e inserir OTP de uma conta sem permissão de superuser.
**Expected Outcome:**
- Exibe mensagem de erro: "Esse acesso é restrito ao staff. Sua conta não tem permissão de administrador."
- Permanece em `/login` e a sessão é limpa.

---

### 2. Layout Principal e Navegação do Admin (`/dashboard`)

#### 2.1 Renderização do Cockpit e KPIs Principais
**Steps:**
1. Autenticar com sessão de staff válida.
2. Navegar para `/dashboard`.
**Expected Outcome:**
- Header com identidade da marca V7M e status do sistema.
- Exibição do grid de KPIs (Saldo, Matrículas, Leads, Fechamentos).
- Exibição do card de visão geral de polos.

#### 2.2 Navegação Lateral e Troca de Abas
**Steps:**
1. Navegar pelas opções do menu lateral (`AdminNav`):
   - Clicar em "Alunos" -> valida URL `/alunos` e destaque do item ativo.
   - Clicar em "Financeiro" -> valida URL `/financeiro`.
   - Clicar em "Polos" -> valida URL `/polos`.
   - Clicar em "Configurações" -> valida URL `/configuracoes`.
**Expected Outcome:**
- Navegação fluida sem reloads desnecessários.
- Marcação correta do item de navegação ativo.

#### 2.3 Logout Seguro
**Steps:**
1. No menu de navegação lateral, clicar no botão "Sair".
**Expected Outcome:**
- `clearSession()` é invocado limpando `staff.login` e `staff.session`.
- Redireciona para `/login`.

---

### 3. Gestão de Alunos e Matrículas (`/alunos`)

#### 3.1 Listagem e Busca de Alunos
**Steps:**
1. Autenticar e navegar para `/alunos`.
2. Verificar renderização da tabela com listagem de alunos e matrículas.
3. Digitar termo de busca no campo de filtro (ex: nome do aluno).
**Expected Outcome:**
- Tabela filtra os registros correspondentes em tempo real.
- Exibe badges de status (Ativo, Concluído, Pendente).

#### 3.2 Alternância de Abas e Detalhes
**Steps:**
1. Na página de alunos, alternar entre as abas "Concluídos", "Em curso" e "Credenciais EAD".
**Expected Outcome:**
- Conteúdo reativo atualiza conforme a aba selecionada.

---

### 4. Módulo Financeiro (`/financeiro`)

#### 4.1 Visualização de Saldos e Indicadores
**Steps:**
1. Autenticar e navegar para `/financeiro`.
2. Verificar indicadores de receita, saldo disponível, pendente e fechamento.
**Expected Outcome:**
- Cards com formatação monetária em BRL (`R$ ...`).
- Indicador de integridade do fechamento contábil.

#### 4.2 Lista de Lançamentos e Ações de Baixa
**Steps:**
1. Inspecionar listagem de transações / repasses.
2. Acionar modal de detalhes ou confirmação de pagamento manual.
**Expected Outcome:**
- Modal abre corretamente com os campos de validação.

---

### 5. Gestão de Polos (`/polos`)

#### 5.1 Listagem e Detalhes de Polos
**Steps:**
1. Autenticar e navegar para `/polos`.
2. Verificar listagem de polos cadastrados com seus respectivos coordenadores e endereços.
**Expected Outcome:**
- Lista exibe polos com status e tags correspondentes.

#### 5.2 Modal de Cadastro de Novo Polo
**Steps:**
1. Clicar no botão de criar/cadastrar novo polo.
2. Preencher formulário (Nome do Polo, Cidade, UF, Coordenador).
3. Submeter formulário.
**Expected Outcome:**
- Polo é criado e adicionado à lista.

---

### 6. Configurações e Logs do Sistema (`/configuracoes` e `/logs`)

#### 6.1 Auditoria e Logs do Sistema
**Steps:**
1. Autenticar e navegar para `/logs`.
2. Verificar listagem de logs e filtros de severidade / eventos.
**Expected Outcome:**
- Eventos do sistema são apresentados com timestamp e detalhes.

#### 6.2 Parâmetros de Configuração
**Steps:**
1. Navegar para `/configuracoes`.
2. Verificar seções de configuração (integrações, regras de comissão, parâmetros gerais).
**Expected Outcome:**
- Painel de configurações carregado com opções editáveis.
