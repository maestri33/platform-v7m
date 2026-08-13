# Plano de evolução do notify-server — bootstrap interativo

> **Status:** rascunho. **Nada de código ainda.** Este documento é o ponto de partida pra retomar a conversa quando você quiser começar.

## O que motivou este plano

A conversa chegou num brainstorm de várias features que mudam o produto (não é mais "teste do que tem"). Pra não cair em delírio de escopo, organizei em fases, com dependências, decisões abertas e estimativa.

## Decisões que você precisa tomar antes da Fase 1

| # | Pergunta | Opções | Impacto se você não decidir |
|---|---|---|---|
| D1 | htmx 1.x (estável) ou 2.0 (alpha)? Você falou v4 mas não existe release. | 1.x é o que tem em prod; 2.0 tem features novas mas é alpha | Impossível começar a Fase 1 sem definir |
| D2 | IA pra gerar template — provider e chave? | OpenAI / Anthropic / local (ollama) / nenhum (você digita) | Fase 5 fica bloqueada |
| D3 | Sem auth no admin e dashboard — confirma? | Em prod, qualquer um na rede mexe em WhatsAppNumber, dispara envios, etc | Se decidir "manter auth", o trabalho das Fases 9 e 10 muda |
| D4 | Lista completa de features específicas do GO (você citou "chave pix / qrcode") | Hoje GO tem `send_text/media/audio/poll/check`. Quais features a mais? | Fase 2 fica parcial |
| D5 | Onde armazenar logo? | `Account.logo` (ImageField) ou `SiteSettings` (singleton) | Fase 4 |
| D6 | Onde armazenar complaints? | Model `Complaint` no notify / arquivo / Sentry comment | Fase 7 |
| D7 | Lista de canais que o "Testa tudo" deve percorrer | Só os 3 atuais? Push? SMS? | Fase 7 |

## Fases (ordem importa)

### Fase 0 — Preparação (decisões + dependências)
Sem código. Levanta D1–D7 acima, valida URLs/keys reais, planeja storage.
- **Esforço:** ~1h de conversa
- **Bloqueia:** tudo abaixo

### Fase 1 — Bootstrap interativo (substitui o que tem hoje)
Hoje: 4 checkboxes que só flipam boolean. Amanhã:
- Cada card mostra **status real** (consulta Evolution, SMTP, fila)
- Ações inline (não checkbox): "criar instância Evolution", "testar SMTP", "subir qcluster"
- Mantém `ControlPanelState` como gate
- **Esforço:** pequeno (1-2 dias)
- **Pré-requisito:** D1 (htmx) se quiser usar htmx
- **Depende de:** Fase 0

### Fase 2 — Pairing WhatsApp via QR
- View que chama `POST /instance/create` + `GET /instance/connect/{name}` da Evolution v2
- Renderiza QR code (base64 PNG inline) na página
- Polling (a cada 3s) pra detectar `connectionState: open`
- Quando conecta, cria `WhatsAppNumber` automaticamente
- "Testar envio" botão: manda um texto pro próprio número (sanity)
- **Esforço:** médio (2-3 dias)
- **Pré-requisito:** Evolution v2 acessível, saber URL/key
- **Depende de:** Fase 1

### Fase 3 — Pairing fallback GO + catálogo de features do GO
- Similar ao Fase 2 mas pro GO
- Catálogo do que o GO faz que v2 não faz (D4)
- Para cada feature, botão "configurar" que abre o form específico
- Exemplo: `chave pix` → form de upload de imagem + texto; gera `send_media` com caption
- **Esforço:** médio (2-3 dias, depende de D4)
- **Pré-requisito:** Evolution GO acessível
- **Depende de:** Fase 2

### Fase 4 — Pairing SMTP (verificação real)
- View "Testar SMTP": conecta no mailcow, faz EHLO/STARTTLS/login, reporta
- Não cadastra nada até passar
- Cadastra `MailIdentity` ao final
- **Esforço:** pequeno (1 dia)
- **Pré-requisito:** SMTP acessível
- **Depende de:** Fase 1

### Fase 5 — Logo + branding por conta
- `Account.logo` (ImageField), upload no dashboard
- `Account.color_primary` (CharField com hex)
- Renderiza nos templates de email (`mail/templates/`) e talvez em anexos WhatsApp
- **Esforço:** pequeno (1-2 dias)
- **Pré-requisito:** D5
- **Depende de:** Fase 1 (precisa ter dashboard)

### Fase 6 — Editor de template + IA
- View `/staff/templates/{account}/{event}/edit` (markdown + preview lado a lado)
- Botão "Gerar com IA" — chama API (D2) com `body_md` parcial + contexto
- IA retorna markdown pronto, user aprova
- **Esforço:** médio (2-3 dias, depende muito de D2)
- **Pré-requisito:** D2
- **Depende de:** Fase 1

### Fase 7 — Painel de solicitações (aprovar/rejeitar)
- Model `TemplateRequest`:
  - `account` (FK), `event` (slug), `body_md` (TextField), `requested_by` (CharField)
  - `status`: `pending` / `approved` / `rejected`
  - `reviewer_notes` (TextField)
  - `submitted_at`, `reviewed_at`
- View "Submeter template" (caller preenche)
- View "Aprovar/Rejeitar" (staff)
- Se aprovado, cria/atualiza `Template` e marca `TemplateRequest.status=approved`
- **Esforço:** médio (2-3 dias)
- **Pré-requisito:** —
- **Depende de:** Fase 6 (IA) ou pode vir antes (UI primeiro, IA depois)

### Fase 8 — Smoke test ponta-a-ponta + complaints
- Model `Complaint`:
  - `account` (FK), `channel` (CharField), `category` (slug), `summary`, `detail`
  - `notification` (FK opcional), `created_at`, `status`: `open`/`acknowledged`/`resolved`
- View "Testar tudo" (botão no dashboard):
  - Cria Notification com cada canal
  - Roda `dispatch.dispatch(notif.id)` em TEST_MODE=0 com **drivers injetados** (fake)
  - Se algum canal falha, cria `Complaint`
  - Renderiza resultado: ✓ whatsapp / ✗ email (TTS indisponível, veja complaint #42)
- View "Reclamações" no dashboard: lista + ações (acknowledge, resolve)
- **Esforço:** médio (2-3 dias)
- **Pré-requisito:** D6, D7
- **Depende de:** Fases 2/3/4 (precisa ter canais configurados pra testar)

### Fase 9 — Auto-destruição do bootstrap
- Quando Fase 8 passa (sem complaints abertas) **e** todas as flags estão true:
  - Chama `reopen_bootstrap` ao contrário: marca `ControlPanelState.completed_at = now()` (já existe)
  - Daí em diante `/` renderiza `dashboard.html`
- Esconde cards de bootstrap do dashboard de produção
- **Esforço:** pequeno (meio dia)
- **Pré-requisito:** —
- **Depende de:** Fases 2/3/4/8 (precisa estar tudo ok pra autodestruir)

### Fase 10 — Dashboard rico
- Continuação do que começamos (saúde, notificações, incidents)
- Adiciona: edit inline de WhatsAppNumber/MailIdentity/TtsVoices, gráfico simples de envios/dia, log de complaints abertas
- **Esforço:** médio-grande (3-5 dias, depende do escopo)
- **Pré-requisito:** —
- **Depende de:** Fase 9 (dashboard pós-bootstrap)

### Fase 11 — Sem auth (decisão de segurança)
- Duas opções:
  - **Restrito por IP / rede local** (recomendado se for dev): middleware que libera só 127.0.0.1, 10.0.0.0/8, etc
  - **Sem proteção nenhuma**: remove `@login_required` do admin, deixa dashboard aberto. NÃO recomendado.
- Se for "rede local": middleware simples +403 pra IPs externos
- **Esforço:** pequeno (1 dia)
- **Pré-requisito:** D3 confirmado
- **Depende de:** —

## Mapa de dependências (resumo)

```
Fase 0 ─┬─→ Fase 1 ─┬─→ Fase 2 ──→ Fase 3
        │          ├─→ Fase 4
        │          ├─→ Fase 5
        │          ├─→ Fase 6 ──→ Fase 7
        │          └─→ Fase 8 ──→ Fase 9 ──→ Fase 10
        └─→ Fase 11 (independente, decisão de segurança)
```

## Estimativa total (sem Fase 0)

- **Otimista:** 10 dias úteis
- **Realista:** 15-20 dias úteis
- **Se cada fase precisar de ida-e-volta com você:** 25-30 dias

## Riscos

1. **Pairing WhatsApp depende da Evolution v2 estar acessível** — se sua infra tiver firewall/rede privativa que o notify-server não enxerga, a Fase 2 não anda.
2. **IA depende de chave válida** — Fase 6 fica cara se você não tiver.
3. **Sem auth** é decisão de segurança. Se você compartilhar essa instância com mais gente, **não faça sem middleware de rede**.
4. **"Testa tudo" precisa de canais reais** — se SMTP ou Evolution estiverem fora, a Fase 8 só gera complaints, não testa de verdade.
5. **Refactor recente** (notify/channels/) ainda não foi exercitado em TEST_MODE=0 com drivers reais. Antes da Fase 8, valeria rodar com drivers fake pra garantir que não há regressão.

## Próximo passo (sugestão)

1. Você responde as 7 decisões (D1–D7)
2. Marcamos uma sessão de kickoff da Fase 0 → Fase 1
3. A gente ataca uma fase por sessão (ou uma fase por dia, depende do seu ritmo)

---

**Sem código até a Fase 1 começar.** Este documento vive no repo (`PLANO-BOOTSTRAP.md`) — se você quiser, depois de uma fase eu atualizo ele com o status.
