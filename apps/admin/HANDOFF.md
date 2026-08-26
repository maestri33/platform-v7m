# 📋 Cockpit Admin (`apps/admin`) — Handoff Técnico

> **Última Atualização:** 26 de Agosto de 2026  
> **Status:** Em Validação com o Usuário (Aguardando homologação de envios e testes)

---

## 🎯 1. Escopo das Alterações Recentes

### 1.1. Editor de Templates de Notificação Unificado (`/notificacoes`)
- **Remoção de Storytelling:**
  - Limpos todos os campos, toggles e formulários legados de storytelling (`storytelling`, `story_prompt`).
  - Interface simplificada e focada em Markdown com tags de interpolação (`{nome}`, `{link}`, `{valor}`, `{codigo}`).
- **Assistente de IA para Redação:**
  - Integração com `POST /api/v1/staff/notify/templates/ai-assist`.
  - Ações rápidas: *Melhorar*, *Simplificar*, *Encurtar*, *Corrigir Gramática*, *Mais Persuasivo* e *Instrução Customizada*.
  - Modal com visualização diff e botão direto de "Substituir no Editor".

### 1.2. Estúdio de Voz & Teste de TTS em Tempo Real
- **Controles de Gênero Cruzado:**
  - Simulação de destinatário:
    * `Padrão / Desconhecido` ➔ Voz Feminina (`Portuguese_SereneWoman`).
    * `Homem (M)` ➔ Voz Feminina (`Portuguese_SereneWoman` / `nova`).
    * `Mulher (F)` ➔ Voz Masculina (`Portuguese_GentleTeacher` / `onyx`).
- **Botão "🎙️ Ouvir Síntese do Texto":**
  - Aciona o endpoint `POST /api/v1/staff/notify/tts/probe`.
  - Sintetiza o texto em áudio através do OmniRoute (`http://10.0.1.35`).
  - Renderiza player `<audio controls autoPlay>` nativo para preview imediato.
- **Exibição da Cadeia de Fallback:**
  - Exibe a lista de modelos configurados no backend (`minimax/speech-01-hd`, `openai/tts-1`, `deepgram/aura-2-thalia-en`).

---

## 🛠️ 2. Arquivos Modificados / Criados

- `apps/admin/src/lib/api.ts`:
  - Adicionadas interfaces: `NotifyTtsOption`, `NotifyTtsConfigOut`, `NotifyTtsProbeIn`, `NotifyTtsProbeOut`, `NotifyAiAssistIn`, `NotifyAiAssistOut`.
  - Adicionadas funções: `notifyTtsConfig()`, `notifyTtsProbe()`, `notifyAiAssist()`.
- `apps/admin/src/app/(app)/notificacoes/use-notificacoes.ts`:
  - Hook reativo com suporte a IA (`handleAiAssist`) e estúdio de voz TTS (`handleTtsProbe`).
- `apps/admin/src/app/(app)/notificacoes/page.tsx`:
  - Interface atualizada com botões de IA, painel de Estúdio de Voz TTS com player `<audio controls>` e sem campos de storytelling.
- `apps/admin/src/components/dashboard/notifications-editor-tab.tsx`:
  - Componente legado higienizado de referências a storytelling.

---

## 🧪 3. Validação e Compilação

- **Build Next.js:** `pnpm --filter @v7m/admin build` executado com **100% de sucesso (0 erros de TypeScript)**.
- **23 páginas estáticas / dinâmicas geradas perfeitamente**.
