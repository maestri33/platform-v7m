# Plano de Auditoria Completa de Ponta a Ponta: Admin V7M (admin-v7m)

**Data da Auditoria:** 24 de Agosto de 2026  
**Ambiente Base:** `http://localhost:3000` (Next.js 16 / React 19 / Tailwind CSS v4)  
**Seed de Autenticação / Mocks:** `tests/e2e/seed.spec.ts` (`tests/e2e/helpers/mock-api.ts`)  
**Diretriz de Design & Código:** Karpathy Guidelines (Simplicidade, Alterações Cirúrgicas, Critérios Claros de Sucesso, Resiliência a Falhas)

---

## 1. Resumo Executivo da Auditoria

O painel de administração **Admin V7M** é a central de comando operacional da plataforma V7M, abrangendo a governança de polos parceiros, matrículas EAD, rede de promotores multinível, auditoria biométrica/documental, conciliação financeira Asaas e parametrização do sistema com assistência de IA via CopilotKit.

Esta auditoria inspecionou de ponta a ponta as **12 páginas principais** e seus respectivos componentes (`buttons`, `forms`, `modals/drawers`, `selectors`, `badges/pills`, `loading feedback`, `empty states` e `error handling`).

### Veredito Geral
- **Pontos Fortes:** Arquitetura limpa, layout responsivo com visual sóbrio, forte separação de responsabilidades no guard (`useRequireStaff`), modais de confirmação financeira em 2 passos com idempotência (`ConfirmDialog` em saques e fechamentos), e mesa de conferência de documentos com atalhos de teclado ágeis.
- **Oportunidades de Melhoria:** Inconsistências pontuais em traduções de status em `StatusPill` (ex: `active`, `in_progress`, `new`), fallbacks de formatação em `SummaryValue` e `RedePage` (cálculo de conversão `undefined%`), input textual de filtro de polo em `MatriculasPage` ao invés de dropdown reativo, e pequenos ajustes em formatação de strings (`(São Paulo/)`).

---

## 2. Matriz de Avaliação por Família de Componentes (Karpathy Guidelines)

| Componente | Avaliação Atual | Critério de Sucesso & Boas Práticas | Oportunidade de Melhoria Cirúrgica |
| :--- | :--- | :--- | :--- |
| **Botões (`Button`, `SmallBtn`)** | Conforme | Possui estados `loading` com spinner animado, `disabled` para evitar requisições duplicadas e variantes semânticas (`primary`, `secondary`, `destructive`). | Padronizar `SmallBtn` em todas as tabelas para reusar variantes CVA do `Button`. |
| **Formulários (`TextField`, `SelectField`, `TextArea`)** | Conforme | Máscaras de CPF (`maskCpf`) e Telefone (`maskBrPhone`), validações de formato e integração com ViaCEP no cadastro de polos. | Adicionar máscara monetária automática em inputs de valor (ex: `ManualPaymentForm`). |
| **Modais & Drawers (`ConfirmDialog`, `GestorViewDrawer`, `DialogShell`)** | Alto Padrão | Fechamento por `Escape`, clique no backdrop, foco nos botões de ação e bloqueio de scroll. | Garantir foco automático no input inicial ao abrir o modal de resgate de telefone. |
| **Seletores (`SelectField`, `select`)** | Conforme | Acessibilidade via `aria-label`, preenchimento de opções dinâmicas a partir de `hubs` e `promoters`. | Substituir input textual de `external_id` em `/matriculas` por `SelectField` de polos cadastrados. |
| **Badges & Pílulas (`StatusPill`, `Badge`)** | Bom | Cores semânticas por tom (`green`, `amber`, `blue`, `danger`, `neutral`). | Adicionar mapeamento nativo para `active` ("Ativo"), `in_progress` ("Em curso") e `new` ("Novo"). |
| **Feedback de Loading (`Spinner`, skeletons)** | Conforme | Spinners centralizados durante carregamento inicial de listagens e botões com estado visual de processamento. | Manter a tabela existente visível com opacidade/overlay em `isRefresh` para evitar layout shift. |
| **Empty States (`EmptyState`)** | Bom | Apresenta ícone ilustrativo, mensagem clara quando a lista está vazia ou os filtros não retornam registros. | Incluir botão de "Limpar Filtros" direto dentro do componente `EmptyState`. |
| **Tratamento de Erros (`ErrorBox`, `toast`)** | Alto Padrão | Extração robusta de mensagens do backend via `getErrorMessage(e)`, toasts informativos via Sonner e caixas de alerta. | Centralizar captura de timeout e erros de rede com retry automático de 1 clique. |

---

## 3. Auditoria Detalhada Página a Página

### 3.1. Cockpit do Administrador (`/dashboard`)
- **Objetivo:** Visão consolidada de KPIs operacionais, resumo de polos, distribuição de captação, saúde contábil e integrações ativas.
- **Componentes Analisados:** `DashboardHeader`, `KpiGrid`, `PolosOverviewCard`, `PoloStatsBreakdown`, `SummaryBreakdown`, `CreatePoloModal`, `GestorViewDrawer`, `BootstrapCopilot`.
- **Cenários de Teste Playwright:**
  1. **Renderização de KPIs e Cards:** Validar exibição dos 4 cards mestres (Polos de Atendimento, Leads em Captação, Saldo & Fechamento, Estado do Servidor).
  2. **Alternância de Abas Superiores:** Clicar em "Todos os Leads", "Alunos & Matrículas", "Promotores & Equipe", "Coordenadores" e "Mensagens & Notificações", verificando a renderização reativa sem reload.
  3. **Abertura do Drawer de Gestor:** Clicar em "Visão de Gestor" ou "Entrar como Gestor" em um polo, validar abertura lateral com métricas específicas do polo e fechamento via "Sair do Modo Gestor".
  4. **Modal de Criação de Polo:** Acionar botão "+ Novo Polo", validar campos de marca, seletor de coordenador e busca automática de endereço por CEP.
- **Oportunidades Encontradas:**
  - Em `SummaryBreakdown`, formatar valores numéricos simples do resumo financeiro em moeda BRL (`formatBRL`) e traduzir chaves ("Gross sales" → "Faturamento Bruto", "Net revenue" → "Receita Líquida").

---

### 3.2. Alunos (`/alunos`)
- **Objetivo:** Consulta de alunos com curso concluído, credenciais EAD emitidas e acompanhamento de matrículas ativas.
- **Componentes Analisados:** `StudentsManagerTab`, `Card`, `StatusPill`, `EditCredentialsModal`, seletor de polo e campo de busca.
- **Cenários de Teste Playwright:**
  1. **Filtragem Combinada (Texto + Polo):** Digitar nome do aluno no campo de busca e selecionar polo no combobox; validar que apenas registros correspondentes são renderizados.
  2. **Alternância de Sub-abas:** Alternar entre "Alunos" e "Matrículas", validando a contagem nos botões de cabeçalho.
  3. **Edição de Credenciais EAD:** Clicar em "Credenciais Plataforma", preencher login e senha no modal `EditCredentialsModal` e submeter com sucesso.
- **Oportunidades Encontradas:**
  - Remover a propriedade `label={status}` forçada na chamada `<StatusPill status={status} tone="green" />` para permitir que o dicionário interno do `StatusPill` faça a tradução de `completed` para "Concluído" e `in_progress` para "Em curso".

---

### 3.3. Matrículas (`/matriculas`)
- **Objetivo:** Listagem tabular geral de matrículas de todos os polos parceiros.
- **Componentes Analisados:** `GlobalList`, `DataTable`, `StatusPill`.
- **Cenários de Teste Playwright:**
  1. **Renderização da Tabela:** Verificar cabeçalhos de coluna (Nome, CPF, Polo, Status) e preenchimento de linhas.
  2. **Filtro de Polo:** Submeter filtro por polo e validar filtragem correta dos dados retornados.
  3. **Exibição de Status:** Validar que badges de status possuem cores e textos legíveis.
- **Oportunidades Encontradas:**
  - Substituir o input textual `Filtrar por polo (external_id)` por um dropdown reativo populado com os polos ativos, alinhando com a experiência do usuário das demais páginas.

---

### 3.4. Leads de Captação (`/leads`)
- **Objetivo:** Gestão de contatos em funil captados por promotores e confirmação manual de pagamentos.
- **Componentes Analisados:** `LeadsManagerTab`, `StatCard`, filtros de polo e status, botão de contato WhatsApp, `ConfirmDialog` de pagamento.
- **Cenários de Teste Playwright:**
  1. **Filtro de Status (Pagos vs Aguardando):** Filtrar por "Somente Pagos" e "Aguardando / Em Aberto", verificando a lista atualizada.
  2. **Ação Rápida de WhatsApp:** Validar que o link do botão "WhatsApp" possui target `_blank` e URL formatada `https://wa.me/55...`.
  3. **Confirmação Manual de Pagamento:** Clicar em "Confirmar Pago" em um lead pendente, revisar o texto do `ConfirmDialog` e confirmar a promoção para matrícula ativa.
- **Oportunidades Encontradas:**
  - Garantir tradução do badge de status `new` para "Novo" com tom âmbar/azul neutro.

---

### 3.5. Polos de Atendimento (`/polos`)
- **Objetivo:** Cadastro de novos polos, definição de promotor coordenador, busca de CEP e definição de polo padrão (fallback).
- **Componentes Analisados:** `CreateHubForm`, `HubCard`, `CoordinatorPanel`, `AddressPanel`, `ConfirmDialog`.
- **Cenários de Teste Playwright:**
  1. **Preenchimento Automático de CEP:** Digitar CEP `01310-100` no formulário de criação e validar autopreenchimento de Logradouro, Bairro, Cidade e UF via ViaCEP.
  2. **Criação de Novo Polo:** Preencher marca, selecionar promotor coordenador e submeter formulário; validar inserção na lista de polos.
  3. **Edição Inline de Coordenador e Endereço:** Abrir os subpainéis expansíveis `CoordinatorPanel` e `AddressPanel` no card do polo e atualizar dados.
  4. **Tornar Polo Padrão:** Acionar botão "Tornar padrão" e confirmar no modal.
- **Oportunidades Encontradas:**
  - Adicionar validação preventiva se o coordenador selecionado já for coordenador de outro polo e exibir aviso informativo.

---

### 3.6. Coordenadores & Lideranças (`/coordenadores`)
- **Objetivo:** Acompanhamento de metas, promotores na rede e resgate de telefone de coordenadores.
- **Componentes Analisados:** `StatCard`, `TextField` de busca, cards de liderança com listagem de polos, `PhoneRescueModal`.
- **Cenários de Teste Playwright:**
  1. **Métricas Agregadas:** Validar cálculo dos totais (Polos Geridos, Promotores na Rede, Alunos nos Polos, Comissões Acumuladas).
  2. **Busca por Nome/Polo:** Filtrar lista de coordenadores em tempo real.
  3. **Resgate de Telefone:** Clicar em "Resgatar / Trocar Telefone", inserir novo número com DDD no modal e confirmar a alteração.
- **Oportunidades Encontradas:**
  - Corrigir formatação de cidade/UF quando `state` não for informado para evitar renderizar `(Cidade/)`.
  - Prover fallback numérico `0` quando `h.promoters_count` ou `h.students_count` forem nulos.

---

### 3.7. Mesa de Documentos & Biometria (`/documentos`)
- **Objetivo:** Mesa de conferência rápida de documentos com verificação facial InsightFace (ArcFace) e atalhos de teclado.
- **Componentes Analisados:** Tabela de revisões retidas, Split-screen Modal Dual-View com Pan/Zoom, controles de rotação, gauge biométrico, OCR vs cadastro e caixa de justificativa de reprovação.
- **Cenários de Teste Playwright:**
  1. **Filtro de Documentos por Categoria:** Alternar entre "Todos", "Documentos RG/CNH", "Selfies Biométricas", "Matrículas" e "Candidatos".
  2. **Abertura da Mesa Dual-View:** Clicar em "Abrir Mesa Dual-View" em um item retido e validar carregamento do dossiê com abas de foto (Frente, Verso, Selfie).
  3. **Controles de Imagem:** Validar botões `+ Zoom`, `- Zoom`, `Reset` e `↻ Girar 90°`.
  4. **Atalhos de Teclado:** Pressionar `A` para aprovação de RG, `S` para aprovação de selfie, `R` para abrir justificativa de reprovação e `Escape` para fechar modal.
- **Oportunidades Encontradas:**
  - Garantir que o campo de justificativa receba foco imediato ao pressionar `R` e exiba mensagem amigável caso a reprovação seja submetida em branco.

---

### 3.8. Rede & Hierarquia de Captação (`/rede`)
- **Objetivo:** Visualização da árvore genealógica de polos, coordenadores e promotores com taxas de conversão.
- **Componentes Analisados:** Cards de métricas consolidadas, campo de busca com debounce, nós expansíveis por polo e cards individuais de promotor.
- **Cenários de Teste Playwright:**
  1. **Expansão e Recolhimento de Nós:** Clicar no cabeçalho do polo para recolher e reabrir a listagem de promotores vinculados.
  2. **Busca na Árvore:** Buscar por nome de promotor ou polo, validando a filtragem hierárquica.
  3. **Métricas de Conversão:** Validar exibição da taxa de conversão em percentual.
- **Oportunidades Encontradas:**
  - Tratar o cálculo de conversão no card do promotor (`prom.conversion_rate ?? (prom.leads_count ? Math.round((prom.paid_count / prom.leads_count) * 100) : 0)`) para evitar a renderização de `undefined%` ou `%` isolado.

---

### 3.9. Treino LMS (`/treino`)
- **Objetivo:** Autoria de conteúdos de treinamento, auditoria de gravações de voz com IA e desbloqueio administrativo de promotores.
- **Componentes Analisados:** `MaterialForm`, `MaterialCard` (com upload de vídeo e publicação transitória), `SubmissionCard` (com player de áudio HTML5 e override de nota), painel de desbloqueio com input de `external_id`.
- **Cenários de Teste Playwright:**
  1. **Criação de Nova Matéria:** Preencher título, questão, gabarito e conteúdo em texto; salvar e validar presença na lista de matérias cadastradas.
  2. **Upload de Vídeo de Treinamento:** Selecionar arquivo de vídeo no card da matéria e validar estado de upload com feedback de sucesso.
  3. **Auditoria de Áudio de Promotor:** Na aba "Submissões & Áudios", acionar player de áudio `<audio controls>`, avaliar nota e confirmar aprovação no modal.
  4. **Desbloqueio Administrativo:** Na aba "Desbloqueio de Promotores", colar ID do promotor e acionar botão "Liberar Promotor Imediatamente".
- **Oportunidades Encontradas:**
  - Adicionar validação de tamanho máximo de arquivo no upload de vídeo antes do envio.

---

### 3.10. Financeiro (`/financeiro`)
- **Objetivo:** Governança da fila de saída de pagamentos, comissões geradas, pagamentos manuais avulsos (PIX/Boleto) e execução do fechamento semanal.
- **Componentes Analisados:** `PayoutsPanel`, `CommissionsPanel`, `ManualPaymentForm` (com upload de comprovante), `ClosingPanel` (com simulador em memória e diagnóstico de liquidez).
- **Cenários de Teste Playwright:**
  1. **Navegação entre Abas Financeiras:** Alternar entre "Fila de saída", "Comissões", "Pagamento avulso" e "Fechamento".
  2. **Formulário de Pagamento Avulso (PIX):** Selecionar tipo PIX, preencher valor, favorecido e chave PIX; acionar "Revisar e pagar" e conferir dados no `ConfirmDialog` antes da confirmação.
  3. **Simulação de Fechamento:** Na aba "Fechamento", clicar em "Simular Fechamento em Memória" e inspecionar a tabela detalhada de beneficiários, bônus conquistados e valores calculados.
  4. **Adiantamento do Fechamento Semanal:** Acionar "Adiantar fechamento da semana" e validar a caixa de confirmação de impacto financeiro real.
- **Oportunidades Encontradas:**
  - Incluir formatação monetária automática no campo `Valor (R$)` para prevenir digitação acidental de centavos incorretos.

---

### 3.11. Configurações da Plataforma (`/configuracoes`)
- **Objetivo:** Parametrização geral da conta-mãe (Boss), tabelas de preços do curso, regras de bolsa para promotor estudante, regras de comissão, chaves de API com testes ao vivo e liquidez.
- **Componentes Analisados:** `BootstrapCopilot`, 5 abas de configuração, `TextField` com máscaras, `IntegrationSettingBox` com reveal de secrets e teste de latência ao vivo, modal de execução de seed.
- **Cenários de Teste Playwright:**
  1. **Edição dos Dados do Boss:** Alterar nome, chave PIX e marca do polo padrão; salvar e validar persistência.
  2. **Configuração de Preços e Bolsa:** Ajustar preço do PIX e metas da bolsa do promotor estudante (mínimo de alunos e meta de quitação total).
  3. **Teste de Conexão de Integração:** Na aba "Chaves & Conexões", clicar em "Testar Conexão" no Asaas ou WhatsApp e validar feedback de sucesso/latência.
  4. **Execução de Bootstrap:** Clicar em "Executar Bootstrap / Seeds", confirmar na caixa de diálogo e verificar output formatado do seed.
- **Oportunidades Encontradas:**
  - Adicionar botão de "Copiar Chave" ao lado dos campos de API keys reveladas.

---

### 3.12. Usuários (`/usuarios`)
- **Objetivo:** Visão global dos usuários da plataforma, papéis atribuídos e resgate de acesso por telefone e credenciais.
- **Componentes Analisados:** Filtros de papéis (`lead`, `enrollment`, `student`, `veteran`, `promoter`, `coordinator`), `DataTable`, `PhoneDialog`, `CredsDialog`.
- **Cenários de Teste Playwright:**
  1. **Filtragem por Papel:** Clicar em "Promotores", "Coordenadores" e "Alunos", validando a filtragem das linhas da tabela.
  2. **Resgate de Telefone (Canal de OTP):** Clicar no botão "Telefone" de um usuário, preencher novo número de WhatsApp com DDD e salvar.
  3. **Edição de Credenciais de Aluno Concluído:** Em um aluno/veterano, clicar em "Credenciais", preencher login e senha da plataforma parceira EAD e salvar.
- **Oportunidades Encontradas:**
  - Adicionar indicador visual de validação de telefone em tempo real no `PhoneDialog`.

---

## 4. Plano Estruturado de Testes de Automação (Suites Playwright)

```typescript
// Estrutura recomendada de suites para execução contínua de CI/CD
suites: [
  {
    name: "Autenticação e Acesso Staff",
    seedFile: "tests/e2e/seed.spec.ts",
    tests: [
      {
        file: "tests/e2e/auth.spec.ts",
        name: "Redirecionamento automático quando desautenticado",
        steps: [
          { perform: "Acessar /dashboard sem token no localStorage", expect: ["Redirecionar para /login"] }
        ]
      },
      {
        file: "tests/e2e/auth.spec.ts",
        name: "Login com Sucesso via OTP e Guarda useRequireStaff",
        steps: [
          { perform: "Preencher telefone e submeter OTP 123456", expect: ["Autenticar sessão e navegar para /dashboard"] }
        ]
      }
    ]
  },
  {
    name: "Módulo de Polos e Lideranças",
    seedFile: "tests/e2e/seed.spec.ts",
    tests: [
      {
        file: "tests/e2e/polos.spec.ts",
        name: "Cadastro completo de polo com busca de CEP",
        steps: [
          { perform: "Preencher marca 'polo-teste', CEP '01310100' e selecionar coordenador", expect: ["Polo criado com sucesso e listado na página"] }
        ]
      },
      {
        file: "tests/e2e/coordenadores.spec.ts",
        name: "Resgate de telefone do coordenador",
        steps: [
          { perform: "Abrir modal de resgate e atualizar telefone com DDD", expect: ["Telefone atualizado e exibido no card"] }
        ]
      }
    ]
  },
  {
    name: "Módulo Financeiro e Fechamento",
    seedFile: "tests/e2e/seed.spec.ts",
    tests: [
      {
        file: "tests/e2e/financeiro.spec.ts",
        name: "Simulação de Fechamento em Memória",
        steps: [
          { perform: "Acessar aba Fechamento e clicar em Simular Fechamento", expect: ["Tabela detalhada de simulação exibida com total de obrigações"] }
        ]
      },
      {
        file: "tests/e2e/financeiro.spec.ts",
        name: "Confirmação de Pagamento Avulso PIX com Modal de Segurança",
        steps: [
          { perform: "Preencher PIX de R$ 50,00 e clicar em Revisar e Pagar", expect: ["Modal de confirmação aberto com valor e destinatário corretos"] }
        ]
      }
    ]
  },
  {
    name: "Mesa Documental e LMS",
    seedFile: "tests/e2e/seed.spec.ts",
    tests: [
      {
        file: "tests/e2e/documentos.spec.ts",
        name: "Inspeção Dual-View e Atalhos de Teclado",
        steps: [
          { perform: "Abrir mesa de documento retido e pressionar tecla 'A'", expect: ["Documento aprovado e fila atualizada"] }
        ]
      },
      {
        file: "tests/e2e/treino.spec.ts",
        name: "Auditoria de Áudio e Avaliação de Resposta",
        steps: [
          { perform: "Acessar aba Submissões e aprovar resposta com nota 10.0", expect: ["Nota gravada e status alterado para Aprovado"] }
        ]
      }
    ]
  }
]
```

---

## 5. Roteiro de Melhorias Cirúrgicas Recomendadas (Action Plan)

### Prioridade Alta (Quick Wins Cirúrgicos)
1. **`src/components/ui/status-pill.tsx`**: Expandir o dicionário de status para cobrir `active` ("Ativo"), `in_progress` ("Em curso"), `new` ("Novo") e `concluido` ("Concluído").
2. **`src/components/dashboard/students-manager-tab.tsx`**: Remover a prop `label={status}` nas chamadas de `StatusPill` para permitir a tradução automática.
3. **`src/app/(app)/rede/page.tsx`**: Tratar fallback de cálculo da taxa de conversão por promotor para evitar `undefined%`.
4. **`src/app/(app)/coordenadores/page.tsx`**: Ajustar formatação condicional de `city/state` para não deixar barra solta quando não houver estado.

### Prioridade Média (Refinamento de UX & Consistência)
1. **`src/app/(app)/matriculas/page.tsx`**: Trocar o input de texto do filtro de polo por um combobox `SelectField` alimentado com os polos cadastrados.
2. **`src/app/(app)/dashboard/page.tsx`**: Formatar valores numéricos no `SummaryBreakdown` como moeda BRL e traduzir termos em inglês.
3. **`src/app/(app)/financeiro/_components/money-actions.tsx`**: Inserir máscara monetária dinâmica no campo de valor do pagamento avulso.

---
*Plano de auditoria finalizado e documentado de acordo com as Karpathy Guidelines.*
