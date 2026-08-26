# V7M Hub - Coordenação E2E Test Plan

## Application Overview

Comprehensive E2E test plan for V7M Hub Coordinator Portal, covering authentication, dashboard stats, reviews inbox, candidate approvals, student journeys, and team management.

## Test Scenarios

### 1. Autenticação e Controle de Acesso

**Seed:** `tests/e2e/seed.spec.ts`

#### 1.1. Coordenador realiza login via OTP com sucesso

**File:** `tests/e2e/auth/coordinator-login.spec.ts`

**Steps:**
  1. Acessar a página inicial /
    - expect: Campo de telefone visível
  2. Preencher telefone válido '(11) 95555-5555' e clicar em 'Enviar código'
    - expect: Formulário de OTP é exibido
  3. Digitar código '123456' e clicar em 'Entrar no polo'
    - expect: Redireciona para 'Visão geral do polo' e exibe marca 'Polo Teste'

#### 1.2. Perfil não-coordenador é bloqueado antes do envio de OTP

**File:** `tests/e2e/auth/non-coordinator-blocked.spec.ts`

**Steps:**
  1. Acessar /
    - expect: Página de login carregada
  2. Preencher telefone de não-coordenador '(11) 94444-4444' e clicar em 'Enviar código'
    - expect: Exibe mensagem de erro 'Este acesso é exclusivo para coordenadores' e oculta form OTP

### 2. Central de Análises e Revisões

**Seed:** `tests/e2e/seed.spec.ts`

#### 2.1. Coordenador destrava matéria de treino de promotor na Central de Revisões

**File:** `tests/e2e/reviews/unlock-promoter-training.spec.ts`

**Steps:**
  1. Realizar login com credencial de coordenador
    - expect: Painel do coordenador visível
  2. Navegar para seção de revisões '#reviews' via link #nav-inbox
    - expect: Exibe cabeçalho 'Central de Análises & Revisões' e lista de pendências
  3. Clicar em 'Destravar Treino' e confirmar a operação no modal
    - expect: Mensagem de sucesso 'Matéria de treino aprovada e promotor destravado!' é exibida

### 3. Gestão de Equipe e Candidatos

**Seed:** `tests/e2e/seed.spec.ts`

#### 3.1. Coordenador aprova candidato pendente na equipe

**File:** `tests/e2e/team/approve-candidate.spec.ts`

**Steps:**
  1. Realizar login de coordenador
    - expect: Painel do coordenador visível
  2. Clicar no menu de equipe #nav-equipe
    - expect: Seção 'Equipe do Polo' visível com lista de candidatos
  3. Clicar no botão 'Aprovar' do primeiro candidato pendente
    - expect: Status 'Operação concluída' é exibido e candidato é atualizado
