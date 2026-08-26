## 2026-08-23T20:42:12Z
# Original User Request

## 2026-08-23T19:34:41Z

<USER_REQUEST>
Auditar minuciosamente o backend Django da plataforma V7M, justificar cada app e configuração existente, eliminar código especulativo/desnecessário e consolidar uma arquitetura enxuta, robusta e type-safe com Django Ninja e Pydantic v2.

Working directory: c:\Users\maestri33\dev\v7m\backend-v7m
Integrity mode: development

## Requirements

### R1. Auditoria Minuciosa e Justificação Arquitetural
Auditar cada app instalado (`core`, `users`, `hub`, `finance`, `notify`, `integrations.*`) e o arquivo central `core/settings.py`. Cada módulo, app e configuração deve ter sua responsabilidade e existência devidamente justificadas em relação ao negócio do V7M (autenticação passwordless OTP/JWT, funil de alunos e matrícula, promotores e treino, gestão de polos, financeiro/comissões, e integrações com Asaas, InfinitePay, ViaCEP e IA/Biometria).

### R2. Limpeza Cirúrgica de Código Especulativo e Redundâncias
Eliminar abstrações de uso único, código morto, configurações desnecessárias ou regras excessivamente complexas que violem o princípio de simplicidade ("Simplicity First"). Garantir que cada linha e componente no repositório tenha propósito claro e direto.

### R3. Padronização Estrita com Django Ninja e Pydantic v2
Refatorar e padronizar os endpoints e contratos de API conforme as boas práticas do skill `django-ninja`:
- Schemas Pydantic isolados e tipados estritamente para entrada (`In`), atualização parcial (`PatchIn`), resposta (`Out` com `ConfigDict(from_attributes=True)`) e filtros dinâmicos (`FilterSchema`).
- Separação clara de camadas: Router/Controller (`api.py`), Camada de Serviço/Domínio (`services.py`) e Camada de Dados (`models.py`).
- Tratamento global padronizado de exceções (`ValidationError`, `HttpError`, exceções de negócio) com status HTTP explícitos e documentação OpenAPI/Swagger organizada.
- Prevenção ativa de consultas N+1 no Django ORM (`select_related`, `prefetch_related`).

### R4. Validação e Qualidade Estrutural
Garantir que todas as checagens do Django e testes automatizados passem com sucesso, validando integridade de banco de dados, migrações e endpoints da API.

## Acceptance Criteria

### Justificação e Arquitetura
- [ ] Cada app em `INSTALLED_APPS` possui justificativa técnica clara e papel delimitado.
- [ ] O `core/settings.py` e `.env` contêm apenas configurações necessárias e bem documentadas, sem complexidade especulativa.
- [ ] A arquitetura respeita a separação entre Routers (`api.py`), Serviços de Domínio (`services.py`) e Modelos ORM (`models.py`).

### Padrão Django Ninja & Schemas
- [ ] Schemas Pydantic v2 estritamente separados para criação, patch e serialização de saída (`from_attributes=True`).
- [ ] Consultas ORM com relacionamentos utilizam `select_related` / `prefetch_related` para evitar N+1.
- [ ] Todos os endpoints expõem `summary`, `tags` e respostas com status HTTP explícitos (200, 201, 204, 400, 404, 422).

### Verificação Programática
- [ ] `uv run python manage.py check` executa sem erros.
- [ ] `uv run python manage.py makemigrations --check --dry-run` passa sem divergências de schema pendentes.
- [ ] `uv run pytest` executa e passa com sucesso em toda a suíte de testes.
- [ ] O endpoint de documentação OpenAPI (`/docs`) renderiza corretamente sem conflitos de schemas.
</USER_REQUEST>

