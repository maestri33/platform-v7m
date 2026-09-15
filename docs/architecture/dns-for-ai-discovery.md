# 🌐 DNS for AI Discovery (DNS-AID) Architecture & Specification

## 1. Contexto & Motivação

O **DNS for AI Discovery (DNS-AID)** (`draft-mozleywilliams-dnsop-dnsaid` e **RFC 9460**) define o protocolo canônico para que agentes autônomos, crawlers de IA e ferramentas distribuídas descubram endpoints de agentes (A2A), servidores MCP, cartões de capacidade e índices de skills diretamente através da infraestrutura global de DNS, sem depender de scraping HTML.

---

## 2. Topologia de Registros DNS-AID (V7M Platform)

Para os domínios `maestri.group` e `supletivo.net.br`, a plataforma V7M publica registros estruturados sob o subdomínio `_agents`:

| Nome do Registro | Tipo | Prioridade / Target | Parâmetros SVCB / Payload |
| :--- | :---: | :--- | :--- |
| `_a2a._agents.maestri.group` | `SVCB` | `1 api.maestri.group.` | `alpn="a2a,h2,h3" port=443 path="/.well-known/agent-card.json"` |
| `_mcp._agents.maestri.group` | `SVCB` | `1 api.maestri.group.` | `alpn="mcp,h2,h3" port=443 path="/mcp"` |
| `_index._agents.maestri.group` | `SVCB` | `1 maestri.group.` | `alpn="h2,h3" port=443 path="/.well-known/agent-skills/index.json"` |
| `_index._agents.maestri.group` | `TXT` | - | `"v=dnsaid1; a2a=https://api.maestri.group/.well-known/agent-card.json; mcp=https://api.maestri.group/mcp"` |

---

## 3. Ferramental & Automação Operacional

A suíte de gerenciamento e auditoria está implementada em:
- **Script de Gerenciamento & Provisionamento**: `scripts/manage-dns-aid.mjs`
  - Auditoria via DoH (Cloudflare e Google DNS) com validação de DNSSEC (`do=1`).
  - Exportação de Blueprints BIND / Cloudflare Zone format.
  - Varredura e diagnóstico em tempo real.
- **Módulo de Auditoria Automatizada**: `tooling/qa-audit/11-dns-aid.mjs` (Suite 11 do QA Audit com 4/4 testes aprovados).
