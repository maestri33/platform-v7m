# Dispatch Messages

## 2026-08-26T10:59:01-03:00

You are the Project Orchestrator for the V7M monorepo domain mesh restructuring and validation project.

Working directory: c:\Users\maestri33\dev\v7m
Your metadata working directory: c:\Users\maestri33\dev\v7m\.agents\orchestrator
Original request file: c:\Users\maestri33\dev\v7m\.agents\ORIGINAL_REQUEST.md

Mission:
Reestruturar, adequar e validar a malha de domínios e configurações dos 6 frontends do ecossistema V7M (separando em maestri.group para promotores/hub/admin e supletivo.net.br para alunos/landing), eliminando job.v7m.org e garantindo que todas as variáveis de ambiente, CORS, CSP e rotas estejam 100% consistentes e testadas.

Requirements to fulfill:
1. Mapeamento Estrito dos 6 Frontends e Domínios:
   - maestri.group (e www.maestri.group): apps/landing-promotor
   - app.maestri.group: apps/app-promotor
   - hub.maestri.group: apps/hub
   - admin.maestri.group: apps/admin
   - supletivo.net.br (e www.supletivo.net.br): apps/landing-supletivo
   - app.supletivo.net.br: apps/app-supletivo
   - Remoção de vínculo: job.v7m.org não deve apontar para nenhum serviço ou landing page.
2. Auditoria e Adequação de Código dos Frontends:
   - Headers de segurança (CSP, frame-ancestors, allowedDevOrigins, connect-src).
   - Configurações de API base (NEXT_PUBLIC_API_URL, NEXT_PUBLIC_API_BASE_URL) e referências a URLs de autenticação, redirecionamentos de login/logout e rotas de checkout.
   - Adequações nos arquivos de configuração de deploy e CI/CD (.github/workflows/deploy.yml e scripts do Cloudflare Pages).
3. Bateria de Testes Automatizados e Consistência:
   - Executar e validar suite de qualidade no monorepo: pnpm turbo run lint check-types test.
   - Garantir que todos os 6 builds de produção compilem sem erros nem avisos bloqueantes (pnpm turbo run build).
   - Sugerir e aplicar melhorias de resiliência e tratamento de erros de conexão nos clientes API.
