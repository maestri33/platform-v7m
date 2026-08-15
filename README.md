# Plataforma V7M

Mono-repo da plataforma V7M. Os projetos mantêm seus históricos Git completos e são
importados em diretórios explícitos por domínio:

- `apps/promoter`: portal do promotor;
- `apps/client`: jornada do cliente/aluno;
- `services/backend`: API principal Django Ninja;
- `services/notfire`: notificações multi-tenant e gestão de instâncias WhatsApp.

Os repositórios antigos permanecem como fonte de rollback durante a migração. Novas
entregas devem convergir para esta raiz; os deploys serão transferidos serviço a serviço.

## Estado de validação

- Promotor: 32 E2E, 23 unitários, lint, TypeScript e build aprovados.
- Backend: 270 testes aprovados; health público e fila compatível com Windows.
- Notfire: 227 testes aprovados; tenant automático, Pix/QR e watchdog multi-instância.
- Cliente: 103 E2E no modo de produção, lint, TypeScript e build aprovados.

Consulte `docs/adr/0001-monorepo.md` para a decisão arquitetural e a sequência de migração.
