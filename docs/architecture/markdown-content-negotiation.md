# 📄 Content Negotiation for Agents (Markdown for Agents)

> **Documento Canônico**: `docs/architecture/markdown-content-negotiation.md`  
> **Status**: Ativo / Em Produção  
> **Especificação Base**: [Cloudflare Markdown for Agents](https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/) e [RFC Content Negotiation / LLMs.txt](https://isitagentready.com/.well-known/agent-skills/markdown-negotiation/SKILL.md)  
> **Issue Vinculada**: #169

---

## 🏛️ 1. Visão Geral & Motivação

Agentes autônomos de IA e spiders de LLMs consomem informação estruturada para navegação e automação. O scraping tradicional de HTML denso introduz:
- Desperdício excessivo de tokens com scripts, styles, SVGs e tags de layout.
- Risco de alucinação e falhas de parser em elementos interativos.
- Alto consumo de banda e latência de processamento no agente.

O padrão **Markdown for Agents** resolve isso através de **negociação de conteúdo HTTP**:
Quando uma requisição inclui o cabeçalho `Accept: text/markdown`, a plataforma entrega a representação Markdown limpa e estruturada do documento, enquanto navegadores convencionais continuam recebendo HTML por padrão.

---

## ⚙️ 2. Arquitetura de Negociação em Borda e Build

### 1. Build Time (Astro Integration)
Durante o build das landings (`apps/landing-promotor` e `apps/landing-supletivo`), a integração `markdown-negotiation.mjs`:
- Converte todo HTML gerado em Markdown limpo (`index.md`, `privacidade/index.md`, `termos/index.md`, etc.).
- Gera o índice canônico de agentes em `/llms.txt`.
- Emite os arquivos `_worker.js` e `_routes.json` no diretório `dist/` para execução nativa no Cloudflare Pages (Advanced Mode).
- Insere na `<head>` do HTML a tag canônica:
  ```html
  <link rel="alternate" type="text/markdown" href="https://maestri.group/index.md" />
  ```

### 2. Edge Time (Cloudflare Pages Advanced Mode Worker)
Ao receber uma requisição no Cloudflare Pages:
1. Analisa o cabeçalho `Accept` procurando por `text/markdown`.
2. Se `text/markdown` for solicitado:
   - Busca o arquivo `.md` estático correspondente em `env.ASSETS`.
   - Caso não exista em disco, faz a conversão sob demanda a partir do HTML original.
   - Retorna com os cabeçalhos obrigatórios:
     - `Content-Type: text/markdown; charset=utf-8`
     - `Vary: Accept`
     - `x-markdown-tokens: <token_count>` (estimativa heurística de 4 chars/token).
3. Se for uma requisição normal (browser/HTML):
   - Serve o arquivo HTML normalmente com `Vary: Accept` para garantir isolamento de cache em CDNs.

### 3. Local Development (`astro dev`)
A integração acopla um middleware de desenvolvimento no Vite/Astro dev server (`server.middlewares`), permitindo testar a negociação localmente:
```bash
curl -H "Accept: text/markdown" http://localhost:3010/
```

---

## 🛡️ 3. Cabeçalhos HTTP Canônicos

| Cabeçalho | Valor | Propósito |
| :--- | :--- | :--- |
| `Content-Type` | `text/markdown; charset=utf-8` | Identifica o payload como Markdown UTF-8 |
| `Vary` | `Accept` | Garante que caches e CDNs não entreguem HTML para requisições Markdown ou vice-versa |
| `x-markdown-tokens` | `<inteiro>` | Fornece estimativa de tokens do payload para agentes |

---

## 🧪 4. Validação e Testes

A suíte automatizada cobre:
- Remoção de `<script>`, `<style>`, `<noscript>` e `<svg>`.
- Conversão semântica de headings, links, ênfases e listas.
- Extração de metadados em frontmatter YAML (`title`, `description`, `url`).
- Cálculo de tokens com `estimateTokens`.
- Detecção e parser de variantes do cabeçalho `Accept: text/markdown`.
- Execução no scanner de homologação:
  ```bash
  curl -s -X POST https://isitagentready.com/api/scan \
    -H "Content-Type: application/json" \
    --data-raw '{"url":"https://maestri.group"}'
  ```
