# Original User Request

## 2026-08-26T13:58:36Z

Reestruturar, adequar e validar a malha de domínios e configurações dos 6 frontends do ecossistema V7M (separando em maestri.group para promotores/hub/admin e supletivo.net.br para alunos/landing), eliminando job.v7m.org e garantindo que todas as variáveis de ambiente, CORS, CSP e rotas estejam 100% consistentes e testadas.

Working directory: c:\Users\maestri33\dev\v7m
Integrity mode: development

## Requirements

### R1. Mapeamento Estrito dos 6 Frontends e Domínios
Alinhar a arquitetura dos frontends exatamente com a seguinte especificação de domínios:
1. maestri.group (e www.maestri.group): Landing page institucional & captação de promotores (apps/landing-promotor).
2. app.maestri.group: Portal do Promotor / V7M App (apps/app-promotor).
3. hub.maestri.group: Portal de Gestão de Polos e Lideranças (apps/hub).
4. admin.maestri.group: Painel Administrativo da Staff (apps/admin).
5. supletivo.net.br (e www.supletivo.net.br): Landing page de captação de alunos EJA (apps/landing-supletivo).
6. app.supletivo.net.br: Portal do Aluno (apps/app-supletivo).
7. Remoção de vínculo: job.v7m.org não deve apontar para nenhum serviço ou landing page.

### R2. Auditoria e Adequação de Código dos Frontends
Verificar e atualizar em cada um dos 6 frontends:
- Headers de segurança (CSP, frame-ancestors, allowedDevOrigins, connect-src).
- Configurações de API base (NEXT_PUBLIC_API_URL, NEXT_PUBLIC_API_BASE_URL) e referências a URLs de autenticação, redirecionamentos de login/logout e rotas de checkout.
- Adequações nos arquivos de configuração de deploy e CI/CD (.github/workflows/deploy.yml e scripts do Cloudflare Pages).

### R3. Bateria de Testes Automatizados e Consistência
- Executar e validar suite de qualidade no monorepo: pnpm turbo run lint check-types test.
- Garantir que todos os 6 builds de produção compilem sem erros nem avisos bloqueantes (pnpm turbo run build).
- Sugerir e aplicar melhorias de resiliência e tratamento de erros de conexão nos clientes API.

## Acceptance Criteria

### Integridade dos Domínios e Configurações
- [ ] O domínio job.v7m.org está totalmente desvinculado das landing pages e deploys.
- [ ] Os 6 frontends possuem seus domínios canônicos, CSPs e endpoints configurados corretamente para maestri.group e supletivo.net.br.
- [ ] O workflow de CI/CD .github/workflows/deploy.yml reflete o mapeamento dos 6 projetos no Cloudflare Pages.

### Qualidade e Compilação
- [ ] pnpm turbo run lint executa com 0 erros em todo o monorepo.
- [ ] pnpm turbo run check-types valida todos os tipos TypeScript com 0 erros.
- [ ] pnpm turbo run build compila com sucesso todos os 6 frontends (landing-promotor, landing-supletivo, app-promotor, app-supletivo, hub, admin).
- [ ] Relatório consolidado com todas as adequações, melhorias e próximos passos estruturados.

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
