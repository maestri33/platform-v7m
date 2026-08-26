---
name: creative-tim-ui
description: Especialista em componentes, blocos de interface e design system do Creative Tim UI (construídos sobre shadcn/ui e Tailwind CSS). Use sempre que precisar criar, integrar, refatorar ou buscar componentes UI e blocos de páginas no monorepo V7M.
license: MIT
metadata:
  author: V7M Dev Team & Creative Tim
  version: "1.0.0"
---

# Creative Tim UI Skill — Monorepo V7M

Esta skill orienta o Antigravity no uso, criação e refatoração de componentes de interface utilizando o ecossistema **Creative Tim UI** (390+ blocos de produção baseados em **shadcn/ui**, **Radix UI** e **Tailwind CSS**).

---

## 1. Fontes de Consulta e Registries

- **Catálogo Online:** [https://www.creative-tim.com/ui](https://www.creative-tim.com/ui)
- **Documentação:** [https://www.creative-tim.com/ui/docs](https://www.creative-tim.com/ui/docs)
- **Índice para IA / LLMs:** [https://www.creative-tim.com/ui/llms.txt](https://www.creative-tim.com/ui/llms.txt)
- **Endpoint de Registry JSON:** `https://www.creative-tim.com/ui/r/<block-name>.json`

> **Dica para o Agente:** Para inspecionar a estrutura de um bloco específico em tempo de execução, você pode ler o endpoint de registry correspondente via `read_url_content` (ex: `https://www.creative-tim.com/ui/r/kpi-01.json`).

---

## 2. Comandos de Instalação no Monorepo (pnpm + Turborepo)

Ao adicionar blocos diretamente no código de uma aplicação do monorepo:

### Adicionar em uma aplicação específica (ex: `@v7m/admin` ou `@v7m/hub`)
```bash
# Via Creative Tim CLI
pnpm --filter @v7m/admin dlx @creative-tim/ui add <block-name>

# Via shadcn CLI com URL do Registry
pnpm --filter @v7m/admin dlx shadcn@latest add https://www.creative-tim.com/ui/r/<block-name>.json
```

### Adicionar múltiplos blocos
```bash
pnpm --filter @v7m/admin dlx @creative-tim/ui add kpi-01 banner-01 card-display-01
```

---

## 3. Diretrizes de Arquitetura e Integração no V7M

Quando o usuário pedir para **construir** ou **refatorar** componentes:

1. **Separação de Responsabilidades (Shared UI vs App UI):**
   - **`packages/ui` (`@v7m/ui`)**: Destinado a primitivos de design, botões, inputs, modais básicos, layouts core e tokens de temas (`src/tokens/index.css`, `src/themes/supletivo.css`, `src/themes/staff.css`).
   - **`apps/*` (ex: `apps/admin`, `apps/hub`)**: Destinado a blocos complexos, dashboards, widgets com integração à API (`@v7m/api-client`), formulários e páginas completas.

2. **Compatibilidade Técnica:**
   - **React 19 & Next.js 16+**: Utilize padrões modernos de componentes de servidor/cliente (`'use client'` apenas quando necessário).
   - **Tailwind CSS v4**: Mantenha classes e utilitários modernos sem dependências legadas de `@apply` desnecessárias.
   - **Ícones**: Utilize `lucide-react` padronizado no projeto.
   - **Primitivos Radix UI**: Utilize `@radix-ui/react-*` já configurados nas dependências.
   - **Utilitários de Classe**: Utilize `clsx` e `tailwind-merge` (ou utilitário `cn(...)`).

3. **Princípios de Design do Creative Tim:**
   - **A Regra do 95%**: Resolva o caso de uso comum com excelência. Evite sobrecarregar componentes com props e abstrações desnecessárias.
   - **Minimalismo & Restrição**: Remova divs wrappers e animações que não agregam contexto funcional.
   - **Pesquisa antes da Renderização**: Projete focado no objetivo do usuário na tela (destaque para métricas em KPIs, clareza em formulários, hierarquia visual refinada).

---

## 4. Principais Categorias e Exemplos de Blocos

| Categoria | Slug / Exemplos | Descrição / Uso Típico |
| :--- | :--- | :--- |
| **KPI & Stats** | `kpi-01`, `stats-01`, `stats-02` | Cartões de métricas, crescimento percentual, tendências e resumos |
| **Admin & Dashboard** | `account-basic-info-01`, `account-2fa-01`, `api-keys-manager` | Gestão de contas, perfis, chaves de API, sessões e permissões |
| **Billing & Finance** | `billing-information-01`, `card-display-01`, `payment-method-01` | Gestão de faturamento, cartões e histórico de transações |
| **Charts** | `charts-01`, `charts-02` | Visualização de dados e gráficos analíticos |
| **AI Agents** | `ai-chat-streaming-01`, `ai-assistant-panel`, `ai-tool-use-01` | Interfaces conversacionais com IA, painéis de assistente e logs de ferramentas |
| **Authentication** | `authentication-01`, `authentication-02`, `authentication-03` | Telas e formulários de login, registro, recuperação de senha |
| **Marketing & Hero** | `hero-01`, `banner-01`, `testimonials-01`, `pricing-01` | Banners de aviso, tabelas de planos, seções de destaque e depoimentos |
| **Content & Cards** | `card-with-avatar`, `card-with-cta-button`, `calendar-01` | Agendamentos, cartões de conteúdo e visualização em grade |

---

## 5. Workflow de Execução pelo Antigravity

Quando receber um pedido de criação ou refatoração:
1. **Identificar o Bloco**: Consulte a lista de blocos em `https://www.creative-tim.com/ui/llms.txt` ou no catálogo.
2. **Obter ou Modelar o Código**: Baixe o schema JSON do registry (`https://www.creative-tim.com/ui/r/<block>.json`) ou componha o componente seguindo os padrões do Creative Tim.
3. **Adaptar para o V7M**: Substitua eventuais caminhos genéricos pelos módulos do monorepo (`@v7m/ui`, `@v7m/api-client`, etc.) e aplique os tokens de cores do projeto.
4. **Verificar Tipagem e Linters**: Garanta que o componente passe sem erros de TypeScript e ESLint.
