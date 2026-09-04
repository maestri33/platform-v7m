# A2A Protocol Agent Card Discovery Specification

> **Documento Canônico de Arquitetura e Descoberta de Agentes (Issue #179 / Linear VIC-25)**  
> **Status:** Ativo / Homologado  
> **Última Atualização:** 2026-09-04  

---

## 1. Visão Geral

O ecossistema **V7M / Maestri Group** publica o **A2A Agent Card** no endpoint padrão `/.well-known/agent-card.json` em conformidade estrita com a **A2A Protocol Specification v1.0** (Linux Foundation / Agentic AI Foundation).

Este arquivo funciona como o cartão de visita digital e autodescritivo do agente autônomo educacional e comercial da plataforma, permitindo que outros agentes de IA descubram suas capacidades, contratos de transporte, interfaces e competências operacionais.

---

## 2. Topologia de Exposição

O cartão de descoberta é servido em todos os domínios públicos do ecossistema:

| Propriedade / Domínio | Destino / Tecnologia | Caminho de Acesso | Interface Primária Anunciada |
|---|---|---|---|
| `maestri.group` | Cloudflare Pages (Astro 6) | `/.well-known/agent-card.json` | `https://api.maestri.group/api/v1` |
| `supletivo.net.br` | Cloudflare Pages (Astro 6) | `/.well-known/agent-card.json` | `https://api.supletivo.net.br/api/v1` |
| `app.maestri.group` | Next.js 16 Standalone | `/.well-known/agent-card.json` | `https://api.maestri.group/api/v1` |
| `app.supletivo.net.br` | Next.js 16 Standalone | `/.well-known/agent-card.json` | `https://api.supletivo.net.br/api/v1` |
| `api.maestri.group` | Django 5.2 Ninja Backend | `/.well-known/agent-card.json` | Dinâmico (`{request.base_url}/api/v1`) |
| `api.supletivo.net.br` | Django 5.2 Ninja Backend | `/.well-known/agent-card.json` | Dinâmico (`{request.base_url}/api/v1`) |

---

## 3. Estrutura do Esquema (A2A Agent Card)

```json
{
  "$schema": "https://a2a-protocol.org/latest/schemas/agent-card.json",
  "name": "V7M Educational & Commercial Autonomous Agent",
  "description": "Autonomous AI agent for the V7M Educational Ecosystem (Maestri Group)...",
  "version": "1.0.0",
  "provider": {
    "organization": "Maestri Group",
    "url": "https://maestri.group"
  },
  "documentationUrl": "https://maestri.group/docs",
  "supportedInterfaces": [
    {
      "url": "https://api.maestri.group/api/v1",
      "protocolBinding": "HTTP+JSON",
      "protocolVersion": "1.0"
    },
    {
      "url": "https://api.maestri.group/api/v1",
      "protocolBinding": "JSONRPC",
      "protocolVersion": "1.0"
    }
  ],
  "capabilities": {
    "streaming": false,
    "pushNotifications": false,
    "extendedAgentCard": false
  },
  "defaultInputModes": [
    "text/plain",
    "application/json"
  ],
  "defaultOutputModes": [
    "application/json"
  ],
  "skills": [
    {
      "id": "student-onboarding",
      "name": "Student Onboarding & Enrollment",
      "description": "Guides prospective students through high school equivalency (EJA) enrollment...",
      "tags": ["education", "enrollment", "eja", "onboarding", "documents"],
      "examples": ["Start enrollment for student CPF 123.456.789-00"],
      "inputModes": ["text/plain", "application/json"],
      "outputModes": ["application/json"]
    },
    {
      "id": "promoter-network-operations",
      "name": "Promoter Network Operations",
      "description": "Manages promoter commissions, lead conversion funnels, affiliate links...",
      "tags": ["promoter", "affiliate", "commissions", "funnel", "conversion"],
      "examples": ["Query commission tier and active leads for promoter"],
      "inputModes": ["application/json"],
      "outputModes": ["application/json"]
    },
    {
      "id": "academic-certification-lookup",
      "name": "Academic Certification Verification",
      "description": "Queries accredited state educational publication status, Diário Oficial registration...",
      "tags": ["certification", "diario-oficial", "diploma", "mec", "verification"],
      "examples": ["Verify certificate registration number"],
      "inputModes": ["application/json", "text/plain"],
      "outputModes": ["application/json"]
    }
  ]
}
```

---

## 4. Auditoria e Validação Automatizada

Para validar a conformidade da publicação com auditores de IA como o `isitagentready.com`:

```bash
curl -X POST https://isitagentready.com/api/scan \
  -H "Content-Type: application/json" \
  -d '{"url": "https://maestri.group"}'
```

O relatório deve apresentar `checks.discovery.a2aAgentCard.status` igual a `"pass"`.
