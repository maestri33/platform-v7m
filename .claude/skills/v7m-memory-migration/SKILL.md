---
name: v7m-memory-migration
description: Diretiva mestre para unificação, migração, ingestão centralizada e validação de memórias e contexto do projeto V7M no Hindsight (http://10.0.1.99:8888) e OpenViking (http://10.0.1.99:1933), incluindo varredura local, categorização, reconexão de MCPs e desativação segura de bancos legados (anti-split-brain).
---

# 🎯 DIRETIVA MESTRE: UNIFICAÇÃO E MIGRAÇÃO DE MEMÓRIAS PARA O PROJETO V7M

Esta skill define o protocolo operacional mandatório para centralização, consolidação, ingestão, validação e limpeza de memórias do ecossistema **V7M** na infraestrutura centralizada (`10.0.1.99`), eliminando ilhas de memória locais, concorrência e divergência de estado (*split-brain*).

---

## 📍 1. Coordenadas da Infraestrutura Centralizada

As credenciais e URLs oficiais estão registradas no **Infisical** (`http://10.0.1.61:8080`):

| Serviço | Endpoint REST / Web UI | Endpoint MCP | Identificador / Token |
| :--- | :--- | :--- | :--- |
| **Hindsight API & MCP** | `http://10.0.1.99:8888` | `http://10.0.1.99:8888/mcp/v7m/` | Bank ID: `v7m` (Fallback: `default`) |
| **OpenViking Context & Studio** | `http://10.0.1.99:1933` (Studio: `/studio`) | `http://10.0.1.99:1933/mcp/` | Token: `ZGVmYXVsdA.YWRtaW4.MWRiNTkxYjExNWFiOGRkYzNhMGY3ZjEyZjk3ZDk0M2IwY2Q3ZDA4MjA1YmJmNTIwMzUxNGY1MTc3MzU1OTFkMw` |
| **Infisical Secrets Vault** | `http://10.0.1.61:8080` | Ferramentas Infisical MCP | Project ID: `1712fb45-2d75-4024-bc6b-0163d5e582a0` |

---

## 📋 2. Etapas Obrigatórias de Execução

```mermaid
flowchart TD
    A[ETAPA 1: Extraction Sweep] -->|Categorização| B(Preferences / Patterns / Events / Facts)
    B --> C[ETAPA 2: Ingestão Centralizada]
    C -->|Biomimética / Grafos| D[Hindsight 10.0.1.99:8888 bank=v7m]
    C -->|Documentação / Viking URI| E[OpenViking 10.0.1.99:1933]
    D & E --> F[ETAPA 3: Reconexão de MCPs e Agentes]
    F --> G[ETAPA 4: Validação Round-Trip recall/reflect/search]
    G -->|100% Sucesso| H[ETAPA 5: Decommission & Limpeza Local]
```

---

### 🔍 ETAPA 1: Varredura de Memórias Locais (Extraction Sweep)

1. Inspecione o ambiente local e projetos em busca de qualquer registro de memória, contexto, decisões técnicas ou diretrizes:
   * **Arquivos Markdown & Configurações de Agentes:**
     * `MEMORY.md`, `.cursorrules`, `CLAUDE.md`, `AGENTS.md`, `SOUL.md`, `IDENTITY.md`
     * Arquivos `.rules`, `.prompt`, `.system_prompt`
   * **Diretórios Locais de Memória / Embeddings:**
     * `.openviking/`, `.mem0/`, `.chroma/`, `.hermes/memories/`, `knowledge/`, `.claude/skills/`
   * **Bases de Dados e Logs Legados:**
     * Arquivos SQLite (`memory.db`, `memories.sqlite3`, `history.sqlite`, etc.)
     * Transcrições e logs de sessões passadas

2. Agrupe as informações extraídas em **4 Categorias Nucleares**:

| Categoria | Descrição | Destino Hindsight (`context`) | Destino OpenViking (`viking://`) |
| :--- | :--- | :--- | :--- |
| **1. Preferences** | Regras de estilo, preferências do usuário, guidelines de resposta, ferramentas padrão. | `context="preferences"` | `viking://user/admin/memories/preferences/` |
| **2. Patterns & Decisions** | Padrões de arquitetura, contratos de API, convenções de código, decisões técnicas. | `context="architecture"` ou `context="code-patterns"` | `viking://user/admin/memories/patterns/` |
| **3. Events & Incidents** | Marcos temporais, incidentes resolvidos, histórico de deploys, bugs críticos superados. | `context="events"` ou `context="incidents"` | `viking://user/admin/memories/events/` |
| **4. World Facts & Resources** | Especificações de infraestrutura, rotas, variáveis, esquemas de dados e referências do V7M. | `context="world-facts"` ou `context="v7m-spec"` | `viking://resources/v7m/` |

---

### 📥 ETAPA 2: Ingestão na Memória Centralizada (Central Ingestion)

#### 1. Ingestão no Hindsight (`http://10.0.1.99:8888`)
Envie todos os fatos, regras e experiências para o banco `v7m`:

**Via Python SDK (`hindsight_client`):**
```python
from hindsight_client import Hindsight

hs = Hindsight(base_url="http://10.0.1.99:8888")

# Ingestão de item individual
hs.retain(
    bank_id="v7m",
    content="Diretriz de Backend: APIs do V7M devem utilizar Django Ninja com validação via Pydantic v2 e autenticação JWT.",
    context="architecture",
    timestamp="2026-09-01T17:00:00Z"
)
```

**Via REST API direta (`POST /banks/{bank_id}/memories`):**
```bash
curl -X POST http://10.0.1.99:8888/banks/v7m/memories \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Diretriz de Frontend: Interfaces administrativas utilizam HTMX com Tailwind CSS e Alpine.js para estados visuais locais.",
    "context": "frontend",
    "timestamp": "2026-09-01T17:00:00Z"
  }'
```

#### 2. Ingestão no OpenViking (`http://10.0.1.99:1933`)
Grave os documentos consolidados e bases de conhecimento na árvore Viking:

**Via MCP Tools (`openviking`):**
* `openviking_remember(content="...", category="preferences", filename="user_preferences.md")`
* `openviking_write(uri="viking://user/admin/memories/patterns/django_ninja_guide.md", content="...", mode="replace", wait=True)`
* `openviking_write(uri="viking://resources/v7m/infrastructure_topology.md", content="...", mode="replace", wait=True)`

**Via REST API direta (`POST /api/v1/content/write`):**
```bash
curl -X POST http://10.0.1.99:1933/api/v1/content/write \
  -H "Authorization: Bearer ZGVmYXVsdA.YWRtaW4.MWRiNTkxYjExNWFiOGRkYzNhMGY3ZjEyZjk3ZDk0M2IwY2Q3ZDA4MjA1YmJmNTIwMzUxNGY1MTc3MzU1OTFkMw" \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "viking://user/admin/memories/patterns/v7m_architecture_master.md",
    "content": "# Arquitetura Mestre V7M\n\n- Backend: Django Ninja\n- Memória: Hindsight + OpenViking (10.0.1.99)\n- Segredos: Infisical (10.0.1.61:8080)",
    "mode": "replace",
    "wait": true
  }'
```

---

### 🔌 ETAPA 3: Reconexão dos Agentes e Configuração MCP

1. **Configuração de MCPs:** Atualize as conexões MCP nos ambientes dos agentes (`mcp_config.json` ou settings do editor/runtime):
   * **Hindsight MCP:** Apontar para `http://10.0.1.99:8888/mcp/v7m/` (ou Server SSE/HTTP).
   * **OpenViking MCP:** Apontar para `http://10.0.1.99:1933/mcp/` com o token fornecido.

2. **Consumo de Credenciais:**
   * Garantir que nenhum agente ou serviço use URLs locais como `localhost:8888` ou `localhost:1933`.
   * Puxar segredos e configurações diretamente do **Infisical** (`Project ID: 1712fb45-2d75-4024-bc6b-0163d5e582a0`).

---

### 🧪 ETAPA 4: Validação de Coesão e Integridade (Round-Trip Test)

Antes de qualquer exclusão local, execute a validação cruzada para garantir integridade e precisão:

1. **Teste de Recuperação no Hindsight (`recall`):**
   ```python
   from hindsight_client import Hindsight
   hs = Hindsight(base_url="http://10.0.1.99:8888")

   res = hs.recall(bank_id="v7m", query="Quais são as diretrizes de desenvolvimento do projeto V7M?")
   assert len(res.results) > 0, "Falha na recuperação de memórias do V7M"
   ```

2. **Teste de Raciocínio / Síntese no Hindsight (`reflect`):**
   ```python
   reflection = hs.reflect(bank_id="v7m", query="Sintetize a arquitetura atual do V7M e convenções adotadas.")
   print("Síntese Hindsight:", reflection)
   ```

3. **Teste de Busca Semântica no OpenViking:**
   ```bash
   curl -X POST http://10.0.1.99:1933/api/v1/search/search \
     -H "Authorization: Bearer ZGVmYXVsdA.YWRtaW4.MWRiNTkxYjExNWFiOGRkYzNhMGY3ZjEyZjk3ZDk0M2IwY2Q3ZDA4MjA1YmJmNTIwMzUxNGY1MTc3MzU1OTFkMw" \
     -H "Content-Type: application/json" \
     -d '{
       "query": "Quais são as diretrizes e padrões de código do V7M?",
       "mode": "list",
       "read_content": true,
       "limit": 5
     }'
   ```

4. **Critérios de Aceite:**
   * Todos os 4 grupos de conhecimento foram recuperados com fidelidade.
   * Não há omissão de regras críticas ou preferências do usuário.
   * Não há alucinações ou contradições nos outputs sintetizados.

---

### 🧹 ETAPA 5: Desativação e Limpeza da Infraestrutura Local (Decommission)

> [!CAUTION]
> Execute esta etapa **apenas** após confirmação inequívoca do sucesso na validação (Etapa 4).

1. **Desativação de Processos Locais:**
   * Finalize daemons, containers Docker ou scripts em background de memórias legadas locais que possam causar concorrência ou *split-brain*.
2. **Remoção Segura de Bancos e Caches Locais:**
   * Remova arquivos de banco locais obsoletos: `*.sqlite`, `*.sqlite3`, `*.db` de memória/embeddings.
   * Remova diretórios locais redundantes: `.chroma/`, `.mem0/`, caches temporários de vetores.
3. **Registro de Centralização:**
   * Deixe documentado no repositório (ex: no `README.md` ou `AGENTS.md` limpo) que toda a memória está centralizada no nó **`10.0.1.99`** (Hindsight `bank=v7m` e OpenViking).

---

## 🛡️ Regras Operacionais Permanentes

1. **Memória Única e Central:** Agentes e desenvolvedores nunca devem persistir regras de longo prazo em arquivos dispersos ou bancos locais isolados.
2. **Consultar antes de Assumir:** Inicie fluxos complexos realizando `recall` no Hindsight e `find`/`search` no OpenViking.
3. **Manter Segredos Protegidos:** Nunca armazene senhas ou chaves em texto puro na memória; referencie as variáveis no Infisical.
