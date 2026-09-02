---
name: openviking-memory
description: Gerenciamento, consulta semântica e gravação de memória de longo prazo e contexto de projeto na instância self-hosted do OpenViking (http://10.0.1.99:1933 / Studio em /studio). Use sempre que precisar buscar preferências, padrões de arquitetura, documentação persistida, registrar decisões técnicas ou extrair aprendizados de sessões.
---

# 🧠 OpenViking Memory & Context Database Skill

Esta skill instrui agentes de IA sobre como usar o **OpenViking** (`http://10.0.1.99:1933`) como sistema central de **Memória de Longo Prazo**, **Base de Contexto** e **Indexação Semântica**.

---

## 🏛️ 1. Detalhes de Conexão

* **Host API:** `http://10.0.1.99:1933`
* **Studio Web UI:** `http://10.0.1.99:1933/studio`
* **Swagger/Docs:** `http://10.0.1.99:1933/docs`
* **Usuário / Tenant:** `admin` / `default`
* **Token de Autenticação:** Obter via Infisical (`OPENVIKING_API_KEY`) ou Header `Authorization: Bearer <TOKEN>`

---

## 📁 2. Hierarquia e Viking URI (`viking://`)

O OpenViking organiza o contexto sob a árvore URI:

| Caminho Viking | Propósito |
| :--- | :--- |
| `viking://user/admin/memories/preferences/` | Preferências do usuário, guidelines, regras de estilo e ferramentas padrão. |
| `viking://user/admin/memories/patterns/` | Padrões de arquitetura, boas práticas identificadas e soluções reutilizáveis. |
| `viking://user/admin/memories/events/` | Marcos temporais, incidentes resolvidos e histórico de deploy. |
| `viking://resources/` | Documentação geral da infraestrutura e referências de projetos. |
| `viking://user/admin/sessions/` | Registro e transcrições de sessões de agentes. |
| `viking://user/admin/skills/` | Definições de skills e capacidades executáveis. |

---

## 🛠️ 3. Ferramentas MCP (`openviking`)

O OpenViking está integrado via MCP (`mcp_config.json`) disponibilizando as ferramentas:
* **`openviking_find(query, limit, target_uri)`**: Recuperação semântica rápida ranqueada de memórias, recursos e skills.
* **`openviking_search(query, mode="list", limit)`**: Busca semântica profunda com leitura de conteúdo e análise contextual.
* **`openviking_remember(content, category="preferences", filename)`**: Atalho para persistir novas regras, convenções ou aprendizados.
* **`openviking_read(uri)`**: Leitura do conteúdo completo de um arquivo (`viking://...`).
* **`openviking_write(uri, content, mode="replace", wait=True)`**: Gravação direta com indexação vetorial.
* **`openviking_tree(uri="viking://user/admin/memories")`**: Inspeção da árvore de memórias e diretórios.
* **`openviking_grep(query, uri)`**: Busca por texto ou regex exata.
* **`openviking_health()`**: Verificação de status e saúde do servidor.

---

## 🔍 4. Como Consultar / Recuperar Memória (Recall & Search via API REST)

### Busca Semântica em Lista (`POST /api/v1/search/search`)
Use para localizar trechos, arquivos e memórias relevantes por similaridade vetorial:
```json
{
  "query": "Como configurar o banco de dados e mensageria da plataforma?",
  "mode": "list",
  "read_content": true,
  "limit": 5
}
```

### Contexto Direto para Prompt (`POST /api/v1/search/search` com `mode: "context"`)
Gera bloco formatado com orçamentação de tokens pronto para injeção:
```json
{
  "query": "Padrões de desenvolvimento Django e HTMX",
  "mode": "context",
  "max_tokens": 1600
}
```

---

## 💾 5. Como Gravar e Persistir Memória (`POST /api/v1/content/write`)

Para salvar um novo aprendizado, preferência ou documentação:

```json
{
  "uri": "viking://user/admin/memories/patterns/django_ninja_auth.md",
  "content": "# Padrão de Autenticação Django Ninja\n...",
  "mode": "replace",
  "wait": true
}
```

* **Modos:** `"replace"` (sobrescrever/criar) ou `"append"` (anexar).
* **Parâmetro `wait: true`:** Aguarda a indexação vetorial e geração de overview terminarem antes de retornar.

---

## 📖 6. Como Ler e Navegar no Sistema de Arquivos

* **Listar diretório:** `GET /api/v1/fs/ls?uri=viking://user/admin/memories`
* **Árvore de arquivos:** `GET /api/v1/fs/tree?uri=viking://resources`
* **Ler arquivo específico:** `GET /api/v1/content/read?uri=viking://user/admin/memories/preferences/agent_guidelines.md`

---

## 🛡️ 7. Boas Práticas para Agentes

1. **Consulte a Memória no Início de Tarefas Complexas:** Antes de arquitetar novas soluções ou assumir premissas, execute uma busca semântica (`find` ou `search`) no OpenViking para verificar se já existem convenções ou decisões registradas.
2. **Registre Conclusões Importantes:** Ao finalizar uma refatoração crítica, resolução de bug complexo ou definição de nova arquitetura, salve um resumo em `viking://user/admin/memories/patterns/` usando `remember` ou `write`.
3. **Mantenha os Segredos Fora do Texto:** Nunca salve tokens ou senhas em texto puro nas memórias do OpenViking; aponte sempre para as chaves correspondentes no Infisical (`10.0.1.61:8080`).
