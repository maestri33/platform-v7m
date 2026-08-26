# Plano de Testes E2E: Cockpit Administrativo (admin.maestri.group)

**Ambiente Alvo:** `http://127.0.0.1:3003`  
**Aplicações Envolvidas:** `apps/admin`, `services/backend`, `services/notify`  
**Escopo:** Autenticação de Staff (WhatsApp OTP e Senha Master de Contingência), Dashboard Master e Gestão de Polos, Modo Gestor (Impersonação de Coordenador), Auditoria de Matrículas e Alunos, CRM Global de Leads, Gestão de Promotores e Coordenadores, Módulo Financeiro (Fechamento Semanal, Lote PIX, Pagamento Avulso), Configurações de Preço/Comissões, Health Check de Integrações, Logs de IA/OCR e Central de Notificações.

---

## 1. Visão Geral e Arquitetura do Cockpit Administrativo

O Cockpit Administrativo (`admin.maestri.group` / porta `3003`) é o centro de comando e governança operacional da V7M:
1. **Autenticação Dual:**
   * **Canal Principal:** Login sem senha via WhatsApp OTP.
   * **Canal de Contingência:** Senha Master criptografada para acesso de emergência caso serviços de mensageria estejam indisponíveis.
2. **Dashboard Operacional com Visão Multipolar:**
   * Monitoramento de receita em tempo real, captação de leads por hora e volume de comissões geradas.
   * Criação e configuração de novos polos regionais (`CreatePoloModal`).
3. **Modo Gestor (Fast-Switch & Impersonation):**
   * Capacidade de auditar o ecossistema sob a perspectiva de qualquer coordenador ou polo específico sem logout.
4. **Auditoria de Matrículas & Validação Documental:**
   * Mesa de conferência de documentos (RG/CNH), revisão de OCR da IA e aprovação/rejeição com emissão de justificativa para o aluno.
5. **Motor Financeiro & Fechamento Semanal:**
   * Apuração automática de comissões, aplicação da regra de meta `5/5`, geração de lotes de pagamento PIX e envio para liquidação via OpenPix/Gateway.
6. **Controle de Parâmetros e Inteligência:**
   * Tabela de preços dinâmicos, metas de vendas, painel de logs de inferência de IA e templates de disparo ativo de WhatsApp.

---

## 2. Matriz de Cenários de Teste

| ID do Cenário | Módulo / Rota | Título / Objetivo | Severidade |
| :--- | :--- | :--- | :--- |
| **TC-ADMIN-001** | `/login` OTP | Autenticação padrão do Staff via WhatsApp OTP | Crítica |
| **TC-ADMIN-002** | `/login` Master | Autenticação de contingência via Senha Master | Crítica |
| **TC-ADMIN-003** | `/dashboard` Overview | Dashboard: Cards de KPI (Receita, Matrículas, Leads, Comissões e Polos) | Crítica |
| **TC-ADMIN-004** | `/dashboard` Polos | Criação de novo polo educacional via modal (`CreatePoloModal`) | Alta |
| **TC-ADMIN-005** | `/dashboard` Gestor | Modo Gestor: Impersonação e visualização filtrada por Polo | Alta |
| **TC-ADMIN-006** | `/leads` | Gestão Global de Leads: Busca, filtros por polo/status e reatribuição | Alta |
| **TC-ADMIN-007** | `/alunos` | Cadastro de Alunos: Dossiê acadêmico e histórico de interações | Alta |
| **TC-ADMIN-008** | `/matriculas` | Auditoria de Matrículas: Mesa de análise de OCR e aprovação documental | Crítica |
| **TC-ADMIN-009** | `/dashboard` Equipe | Promotores: Ranking semanal, conferência dos 5 Deveres e status | Alta |
| **TC-ADMIN-010** | `/coordenadores` | Coordenadores: Gestão de acessos, alocação de polos e performance | Média |
| **TC-ADMIN-011** | `/financeiro` Fechamento| Fechamento Semanal: Apuração de comissões, bônus e disparo de lote PIX | Crítica |
| **TC-ADMIN-012** | `/financeiro` Avulso | Pagamento Avulso: Envio de bônus ou ajuste pontual via PIX imediato | Alta |
| **TC-ADMIN-013** | `/configuracoes` Preços| Configuração de Preços: Atualização do valor dos cursos e parcelas | Crítica |
| **TC-ADMIN-014** | `/configuracoes` Metas | Configuração de Comissões: Parâmetros de comissão base e bônus 5/5 | Alta |
| **TC-ADMIN-015** | `/integracoes` | Matriz de Integrações: Status de Postgres, Redis, Evolution-Go e Gateway | Crítica |
| **TC-ADMIN-016** | `/logs` IA / OCR | Auditoria de Logs: Traces de chamadas LLM, OCR de documentos e latência | Média |
| **TC-ADMIN-017** | `/logs` Validações | Logs de Validação: Consultas na Receita Federal (CPF) e DICT (PIX) | Média |
| **TC-ADMIN-018** | `/notificacoes` | Gestão de Notificações: Edição de templates e disparos ativos em massa | Alta |

---

## 3. Especificação Detalhada dos Casos de Teste

### Módulo: Autenticação Administrativa (`/login`)

#### TC-ADMIN-001: Autenticação Padrão via WhatsApp OTP
* **Objetivo:** Garantir acesso seguro do staff através de código OTP enviado por WhatsApp.
* **Pré-condições:** Aplicação aberta em `http://127.0.0.1:3003/login`.
* **Passos de Ação:**
  1. Acessar `http://127.0.0.1:3003/login`.
  2. Informar o número do staff `(11) 99999-0000`.
  3. Clicar em "Enviar código".
  4. Digitar o código OTP de 6 dígitos recebido.
* **Resultados Esperados:**
  * Login autorizado com gravação dos tokens em `staff.login`.
  * Redirecionamento para o `/dashboard`.

#### TC-ADMIN-002: Autenticação de Contingência com Senha Master
* **Objetivo:** Validar o bypass seguro quando o WhatsApp estiver sem sinal ou offline.
* **Passos de Ação:**
  1. Na tela de login, clicar no botão "🔒 WhatsApp sem sinal ou offline? Entrar com Senha Master".
  2. No campo "E-mail, Telefone ou CPF", digitar `maestri33@local.test` ou `11999990000`.
  3. No campo "Senha Master", digitar a senha configurada no setup (`1993`).
  4. Clicar em "Entrar com Senha Master".
* **Resultados Esperados:**
  * Validação das credenciais master no backend.
  * Redirecionamento imediato para o `/dashboard` com papel `admin`.

---

### Módulo: Dashboard e Gestão de Polos (`/dashboard`)

#### TC-ADMIN-003: Visualização de KPIs Principais
* **Objetivo:** Checar a integridade e precisão dos indicadores-chave no topo do painel.
* **Passos de Ação:**
  1. Acessar `http://127.0.0.1:3003/dashboard`.
  2. Verificar os valores em exibição:
     * Receita Total Bruta (R$).
     * Matrículas Concluídas no Mês.
     * Total de Leads Quentes nas últimas 24h.
     * Comissões Previstas para o próximo fechamento.
     * Polos Ativos no país.
* **Resultados Esperados:**
  * Indicadores carregados sem estados de `NaN` ou formatação quebrada.

#### TC-ADMIN-004: Criação de Novo Polo Educacional
* **Objetivo:** Testar a adição de uma nova unidade operacional via modal.
* **Passos de Ação:**
  1. Clicar no botão "+ Novo Polo" ou "Criar Polo".
  2. Preencher os campos no `CreatePoloModal`:
     * Nome do Polo: `Polo Regional Campinas Centro`.
     * Código: `PL-CPS-01`.
     * Estado / UF: `SP`.
     * Cidade: `Campinas`.
     * Coordenador Responsável: Selecionar da lista de coordenadores ativos.
  3. Clicar em "Salvar Polo".
* **Resultados Esperados:**
  * Toast de sucesso: "Polo cadastrado com sucesso!".
  * Atualização imediata da listagem de polos na aba "Visão Geral & Polos".

#### TC-ADMIN-005: Modo Gestor (Fast-Switch / Impersonation)
* **Objetivo:** Auditar os dados da visão específica de um coordenador de polo.
* **Passos de Ação:**
  1. Clicar no botão "Entrar como Gestor" / "Modo Gestor".
  2. A gaveta lateral `GestorViewDrawer` é aberta.
  3. Selecionar o Polo desejado (ex: `Polo São Paulo Sul`).
  4. Clicar em "Ativar Visualização do Gestor".
* **Resultados Esperados:**
  * Banner superior destacado: "Visualizando como: Gestor - Polo São Paulo Sul".
  * Todas as métricas, leads e comissões da tela passam a ser filtradas para este polo.
  * Botão "Sair do Modo Gestor" restaura a visão global do Superadmin.

---

### Módulo: Auditoria de Matrículas e Alunos (`/matriculas` e `/alunos`)

#### TC-ADMIN-008: Mesa de Auditoria Documental e Validação de OCR
* **Objetivo:** Conferir fotos de documentos enviadas pelos alunos e aplicar decisão regulatória.
* **Passos de Ação:**
  1. Acessar `http://127.0.0.1:3003/matriculas`.
  2. Clicar em uma matrícula com status `documents_under_review`.
  3. Visualizar as fotos em alta resolução da frente e verso do RG/CNH.
  4. Comparar com os campos extraídos pelo motor OCR:
     * Nome completo, CPF, RG, Data de Nascimento, Filiação.
  5. Testar aprovação: Clicar em "Aprovar Documentação".
  6. Testar reprovação com justificativa: Clicar em "Rejeitar", selecionar o motivo "Foto borrada ou ilegível" e confirmar.
* **Resultados Esperados:**
  * O status da matrícula é atualizado no banco.
  * Notificação automática via WhatsApp é disparada para o aluno orientando o reenvio.

---

### Módulo: Motor Financeiro e Fechamentos (`/financeiro`)

#### TC-ADMIN-011: Fechamento Semanal e Disparo em Lote de PIX
* **Objetivo:** Validar a apuração contábil semanal e liquidação das comissões via DICT.
* **Passos de Ação:**
  1. Acessar `http://127.0.0.1:3003/financeiro`.
  2. Clicar na aba "Fechamento".
  3. Selecionar o ciclo semanal vigente (ex: `Ciclo 22 a 28 de Agosto`).
  4. Visualizar o sumário:
     * Total de Promotores Elegíveis.
     * Bônus 5/5 concedidos (R$ 500 por promotor com meta batida).
     * Valor Bruto Total a Pagar.
  5. Clicar em "Processar e Gerar Lote de Pagamentos PIX".
  6. Confirmar a digitação da Senha Master para autorização financeira.
* **Resultados Esperados:**
  * Lote gerado e despachado para a fila de execução.
  * Extrato de liquidação detalhado gerado com hash de autorização.

#### TC-ADMIN-012: Pagamento Avulso de Ajuste ou Bonificação
* **Objetivo:** Realizar um pagamento imediato para um colaborador específico fora do ciclo regular.
* **Passos de Ação:**
  1. Na aba "Pagamento Avulso", buscar o promotor pelo nome ou CPF.
  2. Informar o valor: `R$ 250,00`.
  3. Categoria: "Bonificação Especial de Vendas".
  4. Descrição / Memo interno: "Premiação por recorde de captação no Polo SP".
  5. Clicar em "Efetuar Pagamento PIX Imediato".
* **Resultados Esperados:**
  * Chave PIX é validada no DICT.
  * Execução da transação com comprovante bancário gerado na hora.

---

### Módulo: Configurações, Parâmetros e Integrações (`/configuracoes` e `/integracoes`)

#### TC-ADMIN-013 & TC-ADMIN-014: Editor de Preços do Curso e Comissões
* **Objetivo:** Ajustar dinamicamente as tabelas de preços e metas sem deploy de código.
* **Passos de Ação:**
  1. Acessar `http://127.0.0.1:3003/configuracoes`.
  2. Na aba "Preços do Curso", alterar o valor do plano "Ensino Médio" à vista de `R$ 497,00` para `R$ 547,00`.
  3. Na aba "Comissões & Metas", ajustar o bônus de 5 matrículas para `R$ 600,00`.
  4. Clicar em "Salvar Parâmetros Globais".
* **Resultados Esperados:**
  * Novos valores propagados instantaneamente para as vitrines dos portais do aluno e do promotor.

#### TC-ADMIN-015: Monitoramento de Saúde das Integrações (Health Matrix)
* **Objetivo:** Checar a latência e o status operacional de todos os microsserviços e APIs terceiras.
* **Passos de Ação:**
  1. Acessar `http://127.0.0.1:3003/integracoes`.
  2. Inspecionar o grid de conectividade:
     * `PostgreSQL Database` (OK - latência < 5ms).
     * `Redis Cache & Queues` (OK - ping pong).
     * `Evolution-Go / WhatsApp API` (Instância Conectada - OK).
     * `OpenPix Gateway API` (Conexão Ativa - Saldo OK).
     * `IA / LLM Document OCR Engine` (Disponível).
* **Resultados Esperados:**
  * Status badges verdes com indicadores de uptime e tempos de resposta.
