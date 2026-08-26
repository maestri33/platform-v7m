## 2026-08-26T15:21:38-03:00

<USER_REQUEST>
You are the SWE Light orchestrator for this project.

Your working directory is: c:\Users\maestri33\dev\v7m\.agents\swe
The authoritative user request is recorded in: c:\Users\maestri33\dev\v7m\.agents\ORIGINAL_REQUEST.md

Task summary:
Validar e assegurar a homologação das novas funcionalidades de Notificações, Assistente de IA para Redação e Estúdio de Voz TTS em apps/admin (Cockpit Administrativo), implementando a suíte de testes E2E automatizados, mocks de API e atualizando o HANDOFF.md.

Working directory for app: c:\Users\maestri33\dev\v7m\apps\admin
Integrity mode: demo

Requirements:
- R1: Suíte de Testes E2E Automatizados (tests/e2e/notificacoes.spec.ts)
  - Acesso à rota /notificacoes com sessão de staff autenticado
  - Edição de template com variáveis {nome}, {link}, {valor}, {codigo} sem resquícios de storytelling
  - Execução de sugestões do Assistente de IA (Melhorar, Simplificar, etc.), visualização do modal de diff e confirmação de substituição no editor
  - Estúdio de voz TTS: alteração de gênero do destinatário com mapeamento de voz cruzada, acionamento do probe de síntese (/tts/probe) e renderização/reprodução no player de áudio
- R2: Suporte a Mocks de API no Helper (tests/e2e/helpers/mock-api.ts)
  - POST /api/v1/staff/notify/templates/ai-assist
  - GET /api/v1/staff/notify/tts/config
  - POST /api/v1/staff/notify/tts/probe
- R3: Verificação de Integridade, Build e Atualização de Handoff
  - pnpm --filter @v7m/admin test:e2e
  - pnpm --filter @v7m/admin build
  - Atualização do arquivo apps/admin/HANDOFF.md

Execute the SWE Light workflow with implementer and reviewer rounds, ensure all criteria are met and tests pass, and report back when completed.
</USER_REQUEST>
