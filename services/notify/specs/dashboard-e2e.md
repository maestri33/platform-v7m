# Plano de Testes E2E: Notify Dashboard & Operações

**Seed**: `tests/e2e/seed.spec.ts`
**Base URL**: `http://127.0.0.1:8000`

---

## 1. Navegação Principal e Sidebar

### 1.1 Visão Geral e Indicadores de Saúde
- **Objetivo**: Garantir que a tela inicial exibe os cards de estatísticas, status dos canais e tabela de últimos envios.
- **Passos**:
  1. Acessar `/dashboard/`
  2. Verificar se o título da página contém `Notify`
  3. Verificar visibilidade dos cards: `Total de Envios`, `Entregues com Sucesso`, `Falhas Registradas`, `Mensagens Recebidas`
  4. Verificar presença do bloco `Status Operacional dos Canais`
- **Validações**:
  - Título correspondente a `Visão Geral · Notify` ou similar
  - Métricas numéricas visíveis

### 1.2 Navegação entre Módulos
- **Objetivo**: Validar transição suave entre todas as rotas da sidebar.
- **Passos**:
  1. Clicar no link de navegação `WhatsApp`
     - Validar URL `/dashboard/whatsapp/`
  2. Clicar no link de navegação `E-mail`
     - Validar URL `/dashboard/email/`
  3. Clicar no link de navegação `Envios`
     - Validar URL `/dashboard/messages/`
  4. Clicar no link de navegação `Recebidas`
     - Validar URL `/dashboard/inbox/`
  5. Clicar no link de navegação `Configurações`
     - Validar URL `/dashboard/settings/`
  6. Clicar no link de navegação `Visão Geral`
     - Validar retorno para `/` ou `/dashboard/`

---

## 2. Envios Outbound e Busca Ativa

### 2.1 Pesquisa com Debounce
- **Objetivo**: Validar busca reativa HTMX na listagem de mensagens.
- **Passos**:
  1. Acessar `/dashboard/messages/`
  2. Preencher o campo de busca com termo específico
  3. Validar atualização da tabela com resultados filtrados sem recarregar a página.

---

## 3. Gestão Multi-Tenant e Modal Nova Conta

### 3.1 Abertura e Fechamento do Modal Nova Conta
- **Objetivo**: Validar interatividade do modal de criação de tenants.
- **Passos**:
  1. Clicar no botão `Nova Conta` no topo
  2. Verificar visibilidade do modal e campos `Nome da Aplicação` e `Identificador (slug)`
