# 📋 V7M Monorepo — Master Handoff & Technical Continuation

> **Documento Gerado em:** 26 de Agosto de 2026  
> **Propósito:** Contexto técnico absoluto, fiel ao código e em tempo de execução para continuidade imediata em uma nova sessão.

---

## 🏛️ 1. Estrutura Canônica do Monorepo

O repositório foi unificado em um **Monorepo Turborepo + pnpm workspaces**:

```text
v7m/
├── apps/                                 # Aplicações Web Frontend
│   ├── admin/                            # Cockpit Administrativo Master (Next.js 16) [Porta 3003]
│   ├── app-promotor/                     # Portal do Promotor / Afiliados (Next.js 16) [Porta 3001]
│   ├── app-supletivo/                    # Portal do Aluno, KYC & Matrícula (Next.js 16) [Porta 3020 -> 3000]
│   ├── hub/                              # Hub de Liderança Regional & Polos (Next.js 16) [Porta 3004 -> 4173]
│   ├── landing-promotor/                 # Landing Recrutamento Promotores (Astro 6) [Porta 3010]
│   └── landing-supletivo/                # Landing Venda Supletivo Brasil (Astro 6) [Porta 3011]
├── services/                             # Serviços Backend & Mensageria
│   ├── backend/                          # API Principal (Django 5.2 Ninja + QCluster) [Porta 8001 -> 8000]
│   └── notify/                           # Relay WhatsApp, Stalwart JMAP/SMTP & OmniRouter (Django Ninja) [Porta 8000]
├── packages/                             # Pacotes Compartilhados
│   ├── api-client/                       # @v7m/api-client (SDK OpenAPI TypeScript tipado gerado do Backend)
│   ├── ui/                               # @v7m/ui (Design System, Tokens CSS e Componentes Radix)
│   ├── tsconfig/                         # @v7m/tsconfig (Presets TypeScript)
│   └── eslint-config/                    # @v7m/eslint-config (Regras ESLint v9)
├── tooling/                              # Ferramentas Transversais
│   ├── qa-audit/                         # Suíte de Auditoria Transversal Master (9 Módulos Playwright)
│   └── v7m-ops/                          # Monitoramento de Containers Docker
├── specs/                                # Especificações E2E Geradas pelo Planner
│   ├── e2e-funnel-student.md             # 37 cenários (Funil, KYC, Provas, Aluno)
│   ├── e2e-promoter-portal.md            # 18 cenários do Promotor
│   ├── e2e-admin-cockpit.md              # 18 cenários do Cockpit Admin
│   ├── e2e-app-promotor-deep.md          # 26 cenários aprofundados do Promotor
│   ├── e2e-notify-dashboard.md           # 27 cenários do Notify Dashboard HTMX
│   └── README.md                         # Índice mestre de especificações
├── docker/                               # Infraestrutura
│   ├── postgres-init/                    # Scripts SQL de inicialização de bancos isolados
│   └── docker-compose.yml                # Orquestrador local com 8 serviços ativos
├── .github/workflows/                    # Pipelines CI/CD
│   ├── ci.yml                            # CI ultra-rápido com setup-uv, Schemathesis e Pytest
│   └── deploy.yml                        # Build multi-stage e publicação no GHCR
├── ARCHITECTURE.md                       # Mapa de fluxo de dados, redes e segurança
├── ENVIRONMENT_SPECS.md                  # Dicionário de variáveis Sandbox vs Produção
├── README.md                             # Guia de comandos e operação
├── package.json                          # Scripts raiz
├── pnpm-workspace.yaml                   # Definição dos workspaces
└── turbo.json                            # Pipeline declarativo Turborepo v2
```

---

## 🔌 2. Mapeamento de Portas e Containers em Execução (Docker)

Todos os containers estão ativos, saudáveis e comunicando-se pela rede interna `v7m_network`:

| Container | Imagem / Tecnologia | Porta Host | Porta Interna | Status |
| :--- | :--- | :---: | :---: | :---: |
| **`v7m-postgres`** | `postgres:16-alpine` | `5432` | `5432` | `Up (healthy)` (dbs: `backend`, `notify`, `evolution`) |
| **`v7m-redis`** | `redis:7.4-alpine` | `6380` | `6379` | `Up (healthy)` |
| **`v7m-evolution-go`**| `evoapicloud/evolution-go:0.7.2` | `4000` | `4000` | `Up (healthy)` |
| **`v7m-notify-web`** | Django 5.2 Ninja | `8000` | `8000` | `Up (healthy)` |
| **`v7m-notify-worker`**| Django-Q Cluster Worker | — | — | `Up` |
| **`v7m-backend-web`** | Django 5.2 Ninja | `8001` | `8000` | `Up (healthy)` |
| **`v7m-backend-qcluster`** | Django-Q Main Worker | — | — | `Up` |
| **`v7m-backend-qcluster-slow`** | Django-Q AI/OCR Worker | — | — | `Up` |
| **`v7m-admin-v7m`** | Next.js 16 Standalone | `3003` | `3003` | `Up` |
| **`v7m-app-v7m`** | Next.js 16 Standalone (Promotor) | `3001` | `3001` | `Up (healthy)` |
| **`v7m-app-supletivo`**| Next.js 16 Standalone (Aluno) | `3020` | `3000` | `Up (healthy)` |
| **`v7m-hub-v7m`** | Next.js 16 Standalone (Liderança) | `3004` | `4173` | `Up (healthy)` |
| **`v7m-landing-promotor`** | Astro 6 Static | `3010` | `4321` | `Up (healthy)` |
| **`v7m-landing-supletivo`**| Astro 6 Static | `3011` | `4321` | `Up (healthy)` |

---

## 🔑 3. Credenciais & Contas Semeadas em Sandbox

- **Staff Master / Superuser**:
  - **CPF:** `11144477735` ou `09126367939`
  - **Telefone:** `(43) 99664-8750` (`5543996648750`) ou `(11) 99999-0000`
  - **Senha Master:** `1993`
  - **E-mail:** `admin@v7m.org`
  - **Roles:** `staff`, `coordinator`, `promoter`
- **Polo Padrão (Hub)**:
  - **Brand:** `standard`
  - **Coordenador:** `maestri33` (`5543996648750`)
- **Mecanismo de OTP (Passwordless)**:
  - O código OTP é gerado no backend e enviado para a fila do `notify`.
  - Como o Evolution GO local está sem chip físico pareado, a mensagem não apita no celular real (apesar de a UI exibir o toast `"Código enviado pelo WhatsApp"`).
  - **Para ler o OTP ativo em tempo real:**
    ```bash
    docker exec v7m-notify-web python manage.py shell -c "from notify.models import Notification; print(Notification.objects.latest('created_at').text)"
    ```

---

## 🧪 4. Resultados de Testes Consolidados (100% Verificados)

1. **`services/backend`**:
   - `uv run pytest`: **298 testes aprovados (0 falhas)**.
   - Schemathesis OpenAPI Fuzzing: **100% PASS** contra WSGI Django Ninja.
   - `BrazilianDataFactory`: CPFs Mod11, celulares E.164, ViaCEP e imagens KYC testados e aprovados.
2. **`services/notify`**:
   - `pytest`: **269 testes aprovados (0 falhas)**.
   - Sincronizado diretamente de `C:\Users\maestri33\dev\tools\notify` (commit `dea6c99`) com suporte a Stalwart JMAP/SMTP e cascata Evolution GO.
3. **`packages/api-client`**:
   - `pnpm --filter @v7m/api-client codegen`: **174 rotas e 227 schemas** exportados para TypeScript (`schema.d.ts` com 328 KB).
4. **Frontends & Landings**:
   - `pnpm test` nas landings: **24 testes Vitest aprovados**.
   - `turbo run build`: **6/6 aplicações compiladas com sucesso**.
5. **Auditorias E2E com Playwright**:
   - **Suítes E2E Auto-Curadas:** 76 testes Playwright criados pelo loop Planner ➔ Generator ➔ Healer (**100% PASS**):
     - `student-funnel.spec.ts` (15 testes)
     - `admin-cockpit.spec.ts` (11 testes)
     - `promoter-portal.spec.ts` (11 testes)
     - `promoter-deep.spec.ts` (18 testes)
     - `notify-dashboard.spec.ts` (21 testes)
   - **Regressão Visual:** Baselines capturados para todos os frontends em `tooling/qa-audit`.
   - **Master QA Transversal (9 Suítes):** 81 verificações executadas (Happy Path, Injeção SQLi/XSS, Resiliência a Caos de Rede, Acessibilidade WCAG 2.1 AA via `axe-core` e Resoluções Extremas de 4K até iPhone SE).

---

## 🧹 5. Limpezas e Remoções Executadas

- **Módulos Deletados Conforme Instrução:**
  - `apps/institucional` (removido do disco, do `docker-compose.yml`, do `ci.yml` e do `deploy.yml`).
  - `services/bot` (removido do disco, do `docker-compose.yml`, do `ci.yml` e do `deploy.yml`).
- **Containers Antigos Removidos:**
  - `v7m-institucional` e `v7m-bot-supletivo` foram parados e excluídos do Docker daemon.

---

## ⚡ 6. Evolução Recente: Modelo Assíncrono & UX no App Promotor (`apps/app-promotor`)

Em 26 de Agosto de 2026, foi consolidada a transição do `app-promotor` para o **modelo assíncrono pós-cadastro/login**:

1. **Desbloqueio Imediato de Captação:**
   - O afiliado tem acesso imediato ao seu link de indicação, disparo no WhatsApp em 1 clique e QR Code presencial no `/painel` logo no primeiro segundo pós-login.
   - O cadastro de documentos, endereço, escolaridade, chave Pix e selfie permanece obrigatório para liberação de saques financeiros, mas **não bloqueia a captação de alunos**.

2. **Fechamento Semanal & Transparência Financeira:**
   - As comissões e bônus acumulam imediatamente e são repassados toda **sexta-feira às 18h** direto na chave Pix do colaborador aprovado.
   - O `/painel` e a tela `/comissoes` detalham claramente os valores acumulados vs valores em retenção aguardando aprovação do dossiê.

3. **Arquitetura de Layout & Rolagem Suave (.app-scroll):**
   - Eliminado o `<FitViewport>` que forçava escala reduzida (`0.65`) em telas móveis.
   - Substituído por rolagem vertical natural `.app-scroll`, preservando a nitidez tipográfica e garantindo áreas de toque confortáveis (≥44px / 48-56px).
   - Barra inferior (`AppNav`) fixada com respeito a safe-areas (`env(safe-area-inset-bottom)`), permanecendo sempre disponível.

4. **Headers Limpos nas Telas do Funil:**
   - Telas `/documento`, `/endereco`, `/pix`, `/escolaridade`, `/selfie` e `/treinamento` agora contam com header limpo, link direto `← Voltar ao painel`, badge sutil (`X de 5 deveres`) e opções secundárias para retorno.
   - Removido o stepper rígido linear.

5. **Treinamento Desbloqueado:**
   - Desativado o sequestro de rota do `TrainingGate` e de `readUnlockedSession`.
   - Área `/treinamento` reposicionada como Hub de Capacitação e critério de promoção a Promotor Pleno / elegibilidade de saque.

6. **Qualidade & Estabilidade Técnica:**
   - `tsc --noEmit`: 0 erros de tipagem.
   - `eslint`: 0 erros (código cirurgicamente limpo).
   - `next build` (Turbopack): Compilação de 35 rotas com 100% de sucesso.

---

---

## 🎙️ 7. Evolução Recente: Notificações no Backend, TTS no OmniRoute & Voice Studio no Admin

Em 26 de Agosto de 2026, foi concluída a migração da arquitetura de notificações e TTS:

1. **Centralização de Templates no Backend (`services/backend`):**
   - Todos os templates de notificação residem exclusivamente no banco de dados do Backend (`notify.Template` e `notify.Trigger`).
   - Removida qualquer dependência de templates ou edição no serviço de mensageria `notify`.
   - Remoção definitiva de storytelling (`storytelling`, `story_prompt`), simplificando a modelagem e o fluxo de despacho.
   - Assistente de IA integrado ao Admin (`POST /api/v1/staff/notify/templates/ai-assist`) com opções de melhorar, simplificar, encurtar e corrigir gramática.

2. **Síntese de Voz (TTS) 100% no Backend via OmniRoute (`http://10.0.1.35`):**
   - Módulo `services/backend/integrations/ai/tts.py` conectando exclusivamente ao endpoint OpenAI-compatible do OmniRoute em `POST http://10.0.1.35/v1/audio/speech`.
   - **Regra Cruzada de Gênero (Victor Rule):**
     * Destinatário Homem (`gender == "M"`) ➔ Recebe **Voz Feminina** (`Portuguese_SereneWoman` / `nova`).
     * Destinatária Mulher (`gender == "F"`) ➔ Recebe **Voz Masculina** (`Portuguese_GentleTeacher` / `onyx`).
     * Desconhecido (`gender == None`) ➔ Recebe **Voz Feminina Padrão**.
   - **Cadeia de Fallback Resiliente (`TTS_CHAIN`):**
     * 1. `minimax/speech-01-hd`
     * 2. `openai/tts-1`
     * 3. `deepgram/aura-2-thalia-en`
   - Cache de áudio no storage público `/media/ai/tts/<hash>.ogg` com deduplicação SHA-256 e fallback local sintético para desenvolvimento.

3. **Estúdio de Voz & Teste de TTS no Cockpit Admin (`apps/admin`):**
   - Painel integrado no editor de notificações (`/notificacoes`) com seletor de gênero simulado.
   - Botão **"🎙️ Ouvir Síntese do Texto"** chamando `POST /api/v1/staff/notify/tts/probe`.
   - Player `<audio controls autoPlay>` nativo para preview imediato do áudio sintetizado e diagnóstico de provedores.

4. **Documentos de Handoff Específicos por App/Serviço:**
   - [`apps/admin/HANDOFF.md`](file:///c:/Users/maestri33/dev/v7m/apps/admin/HANDOFF.md)
   - [`services/backend/HANDOFF.md`](file:///c:/Users/maestri33/dev/v7m/services/backend/HANDOFF.md)
   - [`services/notify/HANDOFF.md`](file:///c:/Users/maestri33/dev/v7m/services/notify/HANDOFF.md)

---

## 🚀 8. Comandos Essenciais para o Próximo Chat

```bash
# 1. Verificar status dos containers
docker ps

# 2. Executar compilação do monorepo
pnpm build

# 3. Executar testes unitários dos frontends
pnpm test

# 4. Executar testes do Backend
cd services/backend && uv run pytest -v

# 5. Executar testes do Notify
cd services/notify && .\.venv\Scripts\pytest.exe -v

# 6. Executar suíte Playwright E2E
pnpm --filter @v7m/qa-audit run audit

# 7. Obter último OTP gerado no banco (para login no Hub ou Funil)
docker exec v7m-notify-web python manage.py shell -c "from notify.models import Notification; print(Notification.objects.latest('created_at').text)"

# 8. Testar síntese de TTS e diagnóstico do OmniRoute
docker exec v7m-backend-web python manage.py shell -c "from integrations.ai.tts import probe_tts; print(probe_tts())"
```

