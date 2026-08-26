# Plataforma V7M

Mono-repo da plataforma V7M. Os projetos mantêm seus históricos Git completos e são
importados em diretórios explícitos por domínio:

- `apps/promoter`: portal do promotor;
- `apps/client`: jornada do cliente/aluno;
- `apps/church`: aplicativo público da igreja e módulos independentes de contribuição;
- `apps/church-portal`: landing page institucional da igreja;
- `services/backend`: API principal Django Ninja;
- `services/notfire`: notificações multi-tenant e gestão de instâncias WhatsApp;
- `services/church-backend`: backend legado da igreja e captive portal;
- `services/presence`: agente do gateway físico de presença e Wi-Fi.

Os repositórios antigos permanecem como fonte de rollback durante a migração. Novas
entregas devem convergir para esta raiz; os deploys serão transferidos serviço a serviço.

## Estado de validação

- Promotor: 32 E2E, 23 unitários, lint, TypeScript e build aprovados.
- Backend: 270 testes aprovados; health público e fila compatível com Windows.
- Notfire: 227 testes aprovados; tenant automático, Pix/QR e watchdog multi-instância.
- Cliente: 103 E2E no modo de produção, lint, TypeScript e build aprovados.
- Igreja: 81 testes, lint e build aprovados; módulo de dízimo usa contrato HTTP
  independente de gateway.
- Presença: 9 testes stdlib aprovados, listener com health-check e payloads HMAC.

Consulte `docs/adr/0001-monorepo.md` para a decisão arquitetural e
`docs/phase2-inventory.md` para o inventário e a ordem de execução da Fase 2.
