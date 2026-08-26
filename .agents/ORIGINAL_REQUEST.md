# Original User Request

## 2026-08-26T18:22:37Z

Diagnosticar, mapear e resolver integralmente a malha de roteamento, certificados SSL e DNS dos domínios do ecossistema V7M / Maestri Group entre o host Proxmox (`pve-v7m`), Nginx Proxy Manager (CT 110), Docker Host (CT 150), Cloudflare Pages e DNS Cloudflare.

Working directory: c:\Users\maestri33\dev\v7m
Integrity mode: demo

## Requirements

### R1. Diagnóstico e Mapeamento Completo do Servidor Proxmox PVE e NPM
Mapear e documentar o estado técnico real dos containers e do proxy reverso:
1. **Host Proxmox `pve-v7m` (IP WAN `51.79.77.31` / Tailscale `100.124.1.92`):**
   - CT 110 (`10.0.1.10`): Nginx Proxy Manager (exposição pública das portas 80/443).
   - CT 120 (`10.0.1.20`): Stalwart Mail Server (SMTP, IMAP, JMAP, portas 25, 465, 587, 8080).
   - CT 130 (`10.0.1.30`): Bulwark Webmail (porta 3000).
   - CT 135 (`10.0.1.35`): OmniRoute AI Gateway (porta 80).
   - CT 150 (`10.0.1.50`): Docker Host V7M (Postgres 5432, Redis 6379, Backend Ninja 8001, Notify 8000, App Aluno 3000, App Promotor 3001, Hub 3002, Admin 3003).
2. **Adequação no Nginx Proxy Manager (CT 110):**
   - Garantir proxy hosts corretos para `app.maestri.group`, `hub.maestri.group`, `admin.maestri.group`, `api.maestri.group`, `app.supletivo.net.br`, `api.supletivo.net.br`, `mail.maestri.group` e adicionar host para `webmail.maestri.group` (`10.0.1.30:3000`).

### R2. Resolução de DNS, SSL e Roteamento Edge no Cloudflare
Configurar e sanear os registros DNS e certificados SSL para as zonas `maestri.group` e `supletivo.net.br`:
1. **Landing Pages (Cloudflare Pages):**
   - `maestri.group` e `www.maestri.group`: CNAME apontando para `landing-promotor.pages.dev` (resolver Erro 525 ajustando SSL Edge/Origin e ativando domínio customizado no Pages).
   - `supletivo.net.br` e `www.supletivo.net.br`: CNAME apontando para `landing-supletivo.pages.dev`, **removendo os registros A legados da Hetzner (`135.181.216.160`)**.
2. **Aplicações e APIs (CT 150 via NPM CT 110):**
   - `app.maestri.group`, `hub.maestri.group`, `admin.maestri.group`, `api.maestri.group`: Registros A apontando para `51.79.77.31` com Proxy Laranja ativo.
   - `app.supletivo.net.br`, `api.supletivo.net.br`: Registros A apontando para `51.79.77.31` com Proxy Laranja ativo (removendo AAAA Hetzner `2a01:4f9:3a:3925::2`).
3. **Serviços de E-mail (Stalwart / Bulwark):**
   - `mail.maestri.group` e `webmail.maestri.group`: Registros A apontando para `51.79.77.31` em modo **DNS Only (Nuvem Cinza)** com certificado Let's Encrypt ativo no CT 110.

### R3. Validação End-to-End Automatizada e Testes de Resiliência
Executar scripts automatizados de verificação HTTP/HTTPS para validar que todos os 12 domínios respondem com status codes esperados sem falhas de SSL (525), Timeout (522/504) ou Bad Gateway (502).

## Acceptance Criteria

### Integridade dos Domínios e Serviços
- [ ] `https://maestri.group` e `https://www.maestri.group` retornam HTTP 200 via Cloudflare Pages (sem erro 525).
- [ ] `https://supletivo.net.br` e `https://www.supletivo.net.br` retornam HTTP 200 via Cloudflare Pages (sem erro 522).
- [ ] `https://app.maestri.group` retorna HTTP 200 roteando para `v7m-app-promotor` (`10.0.1.50:3001`).
- [ ] `https://app.supletivo.net.br` retorna HTTP 200 roteando para `v7m-app-supletivo` (`10.0.1.50:3000`).
- [ ] `https://hub.maestri.group` retorna HTTP 200 roteando para `v7m-hub` (`10.0.1.50:3002`).
- [ ] `https://admin.maestri.group` retorna HTTP 200 roteando para `v7m-admin` (`10.0.1.50:3003`).
- [ ] `https://api.maestri.group/api/v1/health/healthz` e `https://api.supletivo.net.br/api/v1/health/healthz` retornam `{"status": "ok", "db": true, "migrations_pending": 0}`.
- [ ] `https://mail.maestri.group` e `https://webmail.maestri.group` respondem com certificado SSL válido em Nuvem Cinza.
- [ ] `job.v7m.org` permanece totalmente desvinculado dos serviços de produção.

## 2026-08-26T18:25:55Z

Implementar, consolidar e homologar ponta a ponta as capacidades do backend principal (`services/backend`) conforme especificado no documento técnico `HANDOFF.md`, assegurando o funcionamento íntegro da síntese de voz (TTS) via OmniRoute com Victor Rule, o desacoplamento definitivo de storytelling, a operacionalidade dos endpoints de Staff para notificações e a aprovação de 100% dos testes automatizados.

Working directory: c:\Users\maestri33\dev\v7m\services\backend
Integrity mode: development

## Requirements

### R1. Síntese de Voz (TTS) & Regra de Gênero Cruzado (Victor Rule)
Consolidar e assegurar a execução robusta da síntese de voz no backend consumindo o endpoint OpenAI-compatible do OmniRoute (`POST http://10.0.1.35/v1/audio/speech`). Implementar e validar a regra cruzada de gênero (Victor Rule: destinatário masculino `M` recebe voz feminina `Portuguese_SereneWoman`/`nova`; feminino `F` recebe voz masculina `Portuguese_GentleTeacher`/`onyx`; nulo/indefinido recebe voz feminina padrão), a cadeia de fallback resiliente (`minimax/speech-01-hd` -> `openai/tts-1` -> `deepgram/aura-2-thalia-en`), o armazenamento com deduplicação por hash SHA-256 em `/media/ai/tts/<hash>.ogg` e geração de áudio sintético em caso de fallback offline.

### R2. Desacoplamento de Storytelling & Limpeza de Pipeline
Garantir a total remoção de storytelling do modelo `notify.Template`, validando que as migrações de banco de dados (`0008_remove_storytelling.py`) e os pontos de chamada em `notify.interface.events.send_event` operem limpos, sem chamadas síncronas residuais de IA de storytelling ou parâmetros obsoletos.

### R3. Endpoints Staff de Gestão e Diagnóstico de Notificações
Garantir o funcionamento e contratos dos endpoints de Staff em `api.staff.routers.notify`:
- `POST /api/v1/staff/notify/templates/ai-assist`: Assistente de redação e refatoração de templates via OmniRoute (`auto/best-fast`).
- `GET /api/v1/staff/notify/tts/config`: Inspeção da configuração de TTS, provedores e regra cruzada.
- `POST /api/v1/staff/notify/tts/probe`: Diagnóstico em tempo real da cadeia de áudio com retorno da URL pública do áudio gerado.

### R4. Homologação Ponta a Ponta e Suíte de Testes
Garantir a execução com 100% de sucesso da suíte de testes unitários e de integração (`pytest` / `uv run pytest`), assegurando a integridade dos schemas Pydantic v2 e conformidade com os contratos OpenAPI.

## Acceptance Criteria

### TTS & OmniRoute Integration
- [ ] O módulo `integrations.ai.tts` aplica estritamente a Victor Rule de acordo com o gênero do destinatário.
- [ ] A cadeia de fallback percorre os modelos configurados caso o primário falhe, sem interrupção de serviço.
- [ ] O probe de TTS (`POST /api/v1/staff/notify/tts/probe` e `probe_tts()`) responde com HTTP 200, retornando status detalhado e URL pública do áudio gerado.

### Templates & Pipeline de Disparo
- [ ] O modelo `Template` não possui campos `storytelling` ou `story_prompt`.
- [ ] O envio de eventos via `send_event` despacha as notificações com renderização contextual de templates e injeção do anexo de áudio TTS quando configurado.

### Qualidade & Testes
- [ ] A suíte de testes do backend (`uv run pytest`) executa com zero falhas.
- [ ] Schemas de entrada e saída Pydantic v2 validam os payloads de Staff e Notify sem erros de tipagem ou validação 422 indevida.

## 2026-08-26T18:25:58Z

Executar auditoria transversal E2E completa com Playwright e auto-cura de cenários cobrindo as recentes evoluções do ecossistema V7M: Estúdio de Voz TTS & Assistente de IA no Cockpit Admin, Onboarding Assíncrono no Portal do Promotor e Funil do Aluno/KYC.

Working directory: c:\Users\maestri33\dev\v7m
Integrity mode: development

## Requirements

### R1. Auditoria E2E do Cockpit Admin & Voice Studio TTS
Auditar e validar os fluxos em `apps/admin`:
- Gestão de Notificações (`/notificacoes`) e cockpit de disparo.
- Assistente de IA para redação e refatoração de templates (`ai-assist`).
- OmniRoute TTS probe e validação da reprodução de áudio / geração em tempo real.
- Aplicação da regra cruzada de voz (cross-gender / Victor Rule) na interface e payloads.

### R2. Auditoria E2E do Modelo Assíncrono no App Promotor
Auditar e validar os fluxos em `apps/app-promotor`:
- Painel imediato pós-login sem bloqueios lineares de documentos/KYC.
- Acesso e geração instantânea do Link de Indicação e QR Code.
- Navegação fluida com container de rolagem suave (`.app-scroll`).
- Validação de envio diferido/assíncrono de documentação e status visual de verificação.

### R3. Suíte Transversal Master & Auto-Cura Playwright
Auditar e consolidar a suíte mestre em `tooling/qa-audit` e `specs/`:
- Cobertura transversal de cenários E2E (Funil do Aluno/KYC, Portal do Promotor, Cockpit Admin, Notify Dashboard).
- Execução de auto-cura automática para seletores, esperas assíncronas e asserções resilientes.
- Garantia de 0 erros não tratados no console do navegador durante as execuções.

## Acceptance Criteria
- [ ] Todas as suítes Playwright em `tooling/qa-audit` e `apps/` executadas com 100% de aprovação (0 falhas).
- [ ] Cenários para Estúdio de Voz TTS e Assistente de IA validados ponta a ponta.
- [ ] Fluxo assíncrono do Promotor validado ponta a ponta sem bloqueios impeditivos de navegação.
- [ ] Nenhum erro de runtime não tratado no console durante as interações.
- [ ] Relatório consolidado de auditoria, cobertura e auto-cura gerado.

