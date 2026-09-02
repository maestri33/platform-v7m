# Relatório Técnico — Auditoria de Erros, Resolução e Segregação de Escopos (Issue #89)

**Data:** 01/09/2026  
**Autor:** Antigravity / AI Agent Pair Programming  
**Branch:** `89-portal-mobile-first-scopes`  
**PR:** [#92](https://github.com/maestri33/platform-v7m/pull/92) | **Issue:** [#89](https://github.com/maestri33/platform-v7m/issues/89)  
**Ambiente Auditado:** Produção (`https://app.maestri.group`) e Monorepo Local (`services/backend` e `apps/admin`).

---

## 🔍 1. Erros Técnicos Identificados em Produção & Causa Raiz

### 1.1 `HTTP 500 Internal Server Error` em `GET /api/v1/staff/integrations`
- **Diagnóstico:** O endpoint de listagem de integrações retornava erro interno 500 (`{"detail": "Erro interno do servidor.", "code": "INTERNAL"}`).
- **Causa Raiz:** Em `services/backend/api/staff/schemas.py`, os schemas `IntegrationStatusOut` e `IntegrationDetailOut` declaravam `checks: list[dict[str, Any]] = Field(default_factory=list)`. Contudo, a função `integrations.status.list_integrations()` chama `core.validation.latest_checks()`, que retorna um dicionário indexado pelo nome do check (`dict[str, Any]`). A validação do Pydantic/Ninja falhava na serialização da resposta.
- **Solução Aplicada:** Alteração do tipo do campo `checks` para `dict[str, Any] = Field(default_factory=dict)` em ambos os schemas.

---

### 1.2 `HTTP 404 Not Found` nas Rotas do Promotor
- **Diagnóstico:** As chamadas para `GET /api/v1/collaborators/promoter/leads` e `GET /api/v1/collaborators/promoter/commissions` falhavam com 404 e caíam no fallback de rotas RSC do Next.js.
- **Causa Raiz:** O router em `services/backend/api/collaborators/routers/promoter.py` havia registrado apenas os caminhos `/promoter/me/leads` e `/promoter/me/commissions`, enquanto o cliente frontend (`api-collaborators.ts`) utilizava `/promoter/leads` e `/promoter/commissions`.
- **Solução Aplicada:** Adicionados decoradores de alias no router Ninja para responder tanto em `/promoter/leads` quanto `/promoter/me/leads`, `/promoter/commissions` e `/promoter/me/commissions`, `/promoter/summary` e `/promoter/me/summary`, além do endpoint `PUT /promoter/pix`.

---

### 1.3 `HTTP 403 Forbidden` em `GET /api/v1/collaborators/candidate/me`
- **Diagnóstico:** Múltiplos erros 403 no console do navegador ao navegar pelo painel.
- **Causa Raiz:** O hook de dados do frontend executava a consulta de candidato (`getCandidateMe`) de forma incondicional em todas as páginas, mesmo para usuários que já possuíam perfil ativo de Staff, Coordenador ou Promotor (e que não possuíam o papel transitório `candidate`).
- **Solução Aplicada:** Condicionamento da execução do React Query para disparar a consulta apenas quando o usuário não possuir papéis ativos de promotor/staff, evitando tráfego e erros desnecessários.

---

### 1.4 Bloqueio de CSP no Cloudflare Web Analytics
- **Diagnóstico:** O console reportava: `Loading the script 'https://static.cloudflareinsights.com/beacon.min.js/...' violates CSP directive: "script-src 'self' 'unsafe-inline'"`.
- **Causa Raiz:** A configuração de `Content-Security-Policy` no `apps/admin/next.config.ts` não permitia o domínio do Cloudflare Analytics.
- **Solução Aplicada:** Adicionado `https://static.cloudflareinsights.com` em `script-src` e `https://cloudflareinsights.com https://*.cloudflareinsights.com` em `connect-src`.

---

### 1.5 Fluxo de Login e Redirecionamento Estático
- **Diagnóstico:** O login redirecionava de forma estática para `/vendas`, causando redirecionamentos adicionais e falhas de transição no OTP de 6 dígitos.
- **Solução Aplicada:** Implementada a função `getHomePathForToken` em `login-client.tsx`, que decodifica as roles do JWT e encaminha imediatamente para `/dashboard` (Staff), `/hub` (Coordenador) ou `/promoter` (Promotor).

---

## 🏛️ 2. Nova Arquitetura de Escopos e Rotas

```
app.maestri.group
├── /login                   # Entrada única (WhatsApp OTP / Master Password)
├── /promoter                # Escopo exclusivo do Promotor (Mobile First)
│   ├── /promoter            # Dashboard (Link de Vendas, KPIs enxutos, Share Actions)
│   ├── /promoter/leads      # Gestão de Leads com WhatsApp direto
│   ├── /promoter/comissoes  # Extrato de comissões e gestão da Chave PIX
│   └── /promoter/treino     # Trilha de capacitação e quizzes interativos
├── /hub                     # Escopo exclusivo do Coordenador de Polo
│   ├── /hub                 # Visão Geral do Polo e Metas
│   ├── /hub/alunos          # Alunos da Unidade
│   ├── /hub/matriculas      # Matrículas do Polo
│   ├── /hub/leads           # Triagem de Leads Locais
│   ├── /hub/equipe          # Promotores Vinculados
│   ├── /hub/candidatos      # Aprovação de Candidatos
│   └── /hub/inbox           # Alertas e Mensageria
└── /admin (-> /dashboard)   # Escopo do Administrador Master
    ├── /dashboard           # Cockpit Executivo
    ├── /financeiro          # Balanço Geral e Fechamento
    ├── /documentos          # Mesa de Validação Documental
    ├── /polos               # Gestão de Polos
    ├── /coordenadores       # Gestão de Coordenadores
    ├── /integracoes         # Status e Testes de Integrações Externas
    └── /configuracoes       # Parâmetros da Plataforma
```

---

## 🧪 3. Evidências de Testes & Validação

- **Playwright Test Runner:** `tests/e2e/portal-rbac.spec.ts` -> **3/3 PASS (8.5s)**
- **Turborepo Build:** `pnpm turbo run build` -> **4/4 apps & packages compilados com sucesso (17.4s)**
