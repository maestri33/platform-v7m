# 🎯 Front-End Checklist Audit & Integration (`@v7m/qa-audit`)

Este documento estabelece o guia de integração, arquitetura e execução contínua da suíte **Front-End Checklist** baseada no padrão de qualidade aberto de David Dias ([frontendchecklist.io](https://frontendchecklist.io)), acoplado nativamente via **MCP (Model Context Protocol)** e **Agent Skills**.

---

## 🏛️ 1. Arquitetura da Integração

A integração do Front-End Checklist no monorepo V7M opera em 3 camadas complementares:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                      Agentes de IA (Antigravity/IDE)                    │
│    .agents/skills/frontend-checklist-global + MCP frontend-checklist    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ (JSON-RPC Streamable HTTP)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Front-End Checklist MCP Server                      │
│                      https://mcp.frontendchecklist.io                   │
│             (385+ regras: A11y, SEO, HTML5, Performance, Security)       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   Suíte Automatizada de QA Monorepo                     │
│               tooling/qa-audit/11-frontend-checklist.mjs                │
│                        pnpm audit:frontend                              │
└─────────────────────────────────────────────────────────────────────────┘
```

1. **MCP Server (`frontend-checklist`)**:
   - Endpoint: `https://mcp.frontendchecklist.io`
   - Configurado globalmente e no workspace (`mcp_config.json`).
   - Ferramentas disponíveis: `review_code`, `audit_url`, `search_rules`, `check_rule`, `fix_rule`, `explain_rule`, `list_categories`, `get_workflow`, `get_checklist_rules`.

2. **Agent Skill (`frontend-checklist-global`)**:
   - Localização: `.agents/skills/frontend-checklist-global/`
   - Define a postura de auditoria conservadora (evitar falsos positivos em fragmentos JSX/Astro, validar semântica real antes de gerar ruído).

3. **Suíte 11 no QA Audit (`@v7m/qa-audit`)**:
   - Arquivo: `tooling/qa-audit/11-frontend-checklist.mjs`
   - Integrado ao loop master `tooling/qa-audit/run-all-audit.mjs`.
   - Atalho de execução: `pnpm audit:frontend`.

---

## 🚀 2. Como Executar

### Via terminal monorepo
```bash
# Executa a suíte 11 contra todos os layouts e páginas principais dos 4 apps
pnpm audit:frontend

# Executa dentro do pacote qa-audit
pnpm --filter @v7m/qa-audit run audit:frontend
```

### Via Agentes de IA
Agentes conectados ao MCP podem rodar revisões estáticas e pontuais usando a tool `review_code`:
```text
"Revise o componente apps/landing-supletivo/src/components/Pricing.astro utilizando a tool review_code do MCP frontend-checklist"
```

---

## 🛠️ 3. Correções Aplicadas no Monorepo (Linha de Base)

Durante a implantação inicial, a auditoria do Front-End Checklist identificou e corrigiu os seguintes pontos estruturais nos 4 frontends:

### A. Portal Unificado (`apps/group`)
- **Problema**: O layout raiz (`layout.tsx`) possuía um skip-link para `#conteudo`, mas nenhum elemento com essa tag existia, além de ausência da tag semântica `<main>` (WCAG / HTML5 landmarks).
- **Correção**: `{children}` encapsulado com `<main id="conteudo" className="flex-1">`.

### B. Portal do Aluno & Matrícula (`apps/supletivo`)
- **Problema**: O container de rolagem utilizava uma `<div>` genérica, deixando a página sem marco `<main>` e o skip-link `#conteudo` desconectado.
- **Correção**: Substituído por `<main id="conteudo" className="app-scroll">`.

### C. Landing Supletivo (`apps/landing-supletivo`)
- **Problema**: Faltava política explícita de `Referrer-Policy` no `<head>`, permitindo potencial vazamento de parâmetros de tracking em URLs externas.
- **Correção**: Adicionado `<meta name="referrer" content="strict-origin-when-cross-origin" />`.

### D. Landing Promotor (`apps/landing-promotor`)
- **Problema 1**: O iframe de fallback do Google Tag Manager (`<noscript>`) não possuía o atributo acessível `title` (obrigatório para leitores de tela).
- **Problema 2**: O snippet de inicialização continha declaração legada `var f = ...` em vez de `const/let`.
- **Problema 3**: Ausência de `Referrer-Policy`.
- **Correções**:
  - Adicionado `title="Google Tag Manager"` ao `<iframe>`.
  - Modernizado para `const f = ...`.
  - Adicionado `<meta name="referrer" content="strict-origin-when-cross-origin" />`.

---

## 📊 4. Matriz de Cobertura Atual

| Aplicação | Arquivo Alvo | Tipo | Status Front-End Checklist |
|---|---|---|---|
| `landing-supletivo` | `src/layouts/Base.astro` | Layout | ✅ PASS (131 checks) |
| `landing-supletivo` | `src/pages/index.astro` | Página | ✅ PASS (65 checks) |
| `landing-promotor` | `src/layouts/Base.astro` | Layout | ✅ PASS (136 checks) |
| `landing-promotor` | `src/pages/index.astro` | Página | ✅ PASS (65 checks) |
| `apps/group` | `src/app/layout.tsx` | Layout | ✅ PASS (136 checks) |
| `apps/group` | `src/app/page.tsx` | Página | ✅ PASS (65 checks) |
| `apps/supletivo` | `src/app/layout.tsx` | Layout | ✅ PASS (136 checks) |
