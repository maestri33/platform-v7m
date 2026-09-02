---
name: hindsight-memory
description: Gerenciamento e consumo de memória biomimética de longo prazo para agentes de IA via Hindsight (http://10.0.1.99:8888 / Bank padrão 'v7m'). Use sempre que precisar reter aprendizados (retain), consultar memórias (recall com busca híbrida vetorial + BM25 + grafos + tempo), ou executar reflexões profundas (reflect) sobre o projeto V7M ou outros agentes.
---

# 🧠 Hindsight Centralized Agent Memory Skill

Esta skill instrui agentes de IA sobre como interagir, reter aprendizados e consultar a memória de longo prazo no servidor centralizado do **Hindsight** (`http://10.0.1.99:8888`), sob o ecossistema do projeto **V7M**.

---

## 🏛️ 1. Coordenadas de Conexão & Infisical

* **Host API REST & MCP:** `http://10.0.1.99:8888`
* **Bank Padrão do Projeto:** `v7m`
* **Bank Global/Fallback:** `default`
* **Endpoint MCP Nativo:** `http://10.0.1.99:8888/mcp/v7m/` (ou `http://10.0.1.99:8888/mcp/{bank_id}/`)
* **Variáveis no Infisical:**
  * `HINDSIGHT_URL`: `http://10.0.1.99:8888`
  * `HINDSIGHT_BANK_ID`: `v7m`
  * `MEMORY_SERVER_IP`: `10.0.1.99`

---

## 🧬 2. Arquitetura da Memória no Hindsight

O Hindsight organiza memórias de forma biomimética:
* **World Facts**: Fatos objetivos e regras do projeto/infraestrutura.
* **Experiences**: Experiências de execuções anteriores, bugs resolvidos e interações com o usuário.
* **Observations**: Crenças e conclusões consolidadas em background baseadas em evidências acumuladas (com citações de fontes).
* **Mental Models & Knowledge Pages**: Conhecimento consolidado lido diretamente do banco (sem custo de inferência no boot do agente).

---

## 🛠️ 3. As Três Operações Nucleares

### 1️⃣ `retain` (Gravar / Aprender)
Armazena novos fatos, diretrizes ou interações. O Hindsight extrai automaticamente entidades, temporalidade e relacionamentos:
```python
from hindsight_client import Hindsight

client = Hindsight(base_url="http://10.0.1.99:8888")

client.retain(
    bank_id="v7m",
    content="O backend V7M foi refatorado para utilizar Django Ninja com autenticação JWT e rotas modulares.",
    context="backend-architecture",
    timestamp="2026-09-01T17:00:00Z"
)
```

### 2️⃣ `recall` (Consultar / Recuperar)
Executa busca híbrida em 4 vias paralelas (**Semântica Vetorial + BM25 Exato + Grafo Causal + Filtro Temporal**) com *Reciprocal Rank Fusion (RRF)*:
```python
# Busca por similaridade e relevância
results = client.recall(
    bank_id="v7m",
    query="Qual o framework de backend utilizado no projeto V7M?"
)

for item in results.results:
    print(f"[{item.type}] {item.text}")
```

### 3️⃣ `reflect` (Refletir / Raciocínio Profundo)
Realiza síntese analítica profunda conectando múltiplas memórias e observações consolidadas:
```python
response = client.reflect(
    bank_id="v7m",
    query="Sintetize a arquitetura atual do ecossistema V7M e quais os padrões definidos para novos serviços."
)
print(response)
```

---

## 🔌 4. Integração com Agentes e LLM Wrapper (LiteLLM)

### Auto-Memory com 2 Linhas de Código (`hindsight-litellm`)
Injeta memórias automaticamente no contexto de prompt antes da chamada e retém a conversa após a resposta:
```python
from openai import OpenAI
from hindsight_litellm import wrap_openai

client = wrap_openai(
    OpenAI(),
    bank_id="v7m",
    hindsight_api_url="http://10.0.1.99:8888"
)

# Hindsight injeta contexto relevante automaticamente
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Quais as regras de infraestrutura do nosso projeto?"}]
)
```

---

## 📡 5. Integração via API REST Direta

### Retain (`POST /banks/{bank_id}/memories`)
```bash
curl -X POST http://10.0.1.99:8888/banks/v7m/memories \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Nova regra de negócio definida para faturamento...",
    "context": "billing"
  }'
```

### Recall (`POST /banks/{bank_id}/recall`)
```bash
curl -X POST http://10.0.1.99:8888/banks/v7m/recall \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Como funciona o faturamento?"
  }'
```

### Reflect (`POST /banks/{bank_id}/reflect`)
```bash
curl -X POST http://10.0.1.99:8888/banks/v7m/reflect \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Quais os riscos ou pendências em aberto no faturamento?"
  }'
```

---

## 🛡️ 6. Diretrizes de Coesão para Agentes V7M

1. **Nunca use bancos de memória locais efêmeros**: Toda decisão de arquitetura, preferência do usuário ou aprendizado de debug deve ser persistida centralmente no `bank_id="v7m"`.
2. **Consulte antes de assumir**: Ao iniciar tarefas complexas de refatoração ou infraestrutura no V7M, execute um `recall` ou `reflect` para recuperar o histórico e padrões acordados.
3. **Mantenha o contexto limpo**: Ao enviar `retain`, utilize contextos objetivos (`backend`, `frontend`, `infra`, `auth`, `database`, `billing`).
