# Handoff Report — Survey Explorer 3 (Django Ninja, Schemas, ORM, Services & Test Suite)

## 1. Observation
- **Django Ninja APIs & Endpoints:** 7 instâncias NinjaAPI (`clients`, `collaborators`, `leadership`, `staff`, `tools`, `health`, `portal`) montadas em `core/urls.py` (L51-57). Total de 190 operações HTTP em 176 rotas.
- **OpenAPI Schema Generation:** O comando programático `ninja_inst.get_openapi_schema()` executou com sucesso em todas as 7 instâncias sem erros de sintaxe ou resolução de schema.
- **Untyped Endpoints:** 60 endpoints mapeados em `find_no_response.py` não possuem argumento `response=...` em seus decoradores (ex: `api/clients/routers/student.py:51`, `api/staff/routers/documents.py:22`, `api/staff/routers/network.py:20`, `api/staff/routers/finance.py:34-185`, `api/portal.py:37-57`), retornando dicionários ou listas brutas e gerando schemas OpenAPI vazios `{}`.
- **Schemas Pydantic:** 154 classes de schema identificadas em `api/schemas/`, `api/*/schemas.py`. 45 schemas `*In`, 106 schemas `*Out`, 2 schemas `PatchIn`, e **0 classes `FilterSchema`**.
- **N+1 Query Bottlenecks:**
  - `api/staff/routers/documents.py:41-45`: Loop sobre até 100 matrículas chamando `profiles.get(enr.user)`, `RG.objects.filter(...)` e `CNH.objects.filter(...)` (até 300 queries extras).
  - `api/staff/routers/network.py:30-50`: Loop aninhado sobre polos e promotores chamando `profiles.get(coord_user)`, `promoters = Promoter.objects.filter(hub=h)`, `profiles.get(prom_user)`, `Lead.objects.filter(promoter=prom_user).count()`, `Student.objects.filter(...)` (mais de 400 queries extras para 10 polos).
  - `users/roles/enrollment/service.py:1546-1560`: `fee_facts(enr)` executa 2 consultas em `PaymentRequest` para cada matrícula em `list_for_hub` (`GET /leadership/enrollments`).
  - `users/roles/training/service.py:260-265`: `assigned_materials` executa 1 query `Submission.objects.filter(...)` por matéria atribuída.
- **Test Baseline:** `uv run pytest` executou 283 testes com resultado: `283 passed in 26.90s` (código de saída 0).
- **Django Check:** `uv run python manage.py check` executou com código 0 (5 avisos não bloqueantes de IA/Sentry).
- **Migration Check:** `uv run python manage.py makemigrations --check --dry-run` falhou com código 1 devido à migração pendente `finance\migrations\0005_alter_commission_status.py` (`Alter field status on commission`).

## 2. Logic Chain
1. *De acordo com a Observação sobre os 60 endpoints untyped*: A ausência de schemas Pydantic tipados de saída (`response=...`) impede a validação em tempo de resposta e degrada os contratos OpenAPI expostos no Swagger UI (`/docs`), violando os requisitos de padronização do Django Ninja (R3).
2. *De acordo com a Observação dos N+1 no ORM*: As rotas de listagem realizam lookups relacionais em loops (`profiles.get()`, `RG.filter()`, `count()`, `fees.latest_fee_request()`) em vez de utilizar `select_related`, `prefetch_related` ou anotações agregadas. Isso gera degradação exponencial de latência e consumo de conexões no banco de dados.
3. *De acordo com a Observação sobre a migração pendente no `finance`*: O model `Commission` teve seu campo `status` modificado sem a respectiva migração ser gerada e commitada, impedindo que checagens estritas de migração passem no CI.
4. *De acordo com a Observação sobre a suíte de testes*: A suíte de 283 testes está 100% verde e fornece uma base de regressão sólida para guiar as refatorações. Contudo, a ausência de `TestClient` em favor de chamadas diretas com mocks de request reduz o realismo dos testes de integração HTTP do Ninja.

## 3. Caveats
- O gateway de pagamentos e a biometria/IA foram testados em modo sintético (`TEST_MODE=True`, SQLite em memória), conforme padrão da suíte `pytest`.
- Apenas o código do backend V7M dentro do repositório foi analisado; integrações de terceiros foram avaliadas através de seus mocks e adaptadores locais.

## 4. Conclusion
A arquitetura de APIs Django Ninja do V7M possui uma base funcional excelente, com separação de grupos bem definida, autenticação JWT unificada e suíte de testes de 283 itens passando com 100% de sucesso. No entanto, necessita de refatoração cirúrgica em quatro frentes principais:
1. Criação e atribuição de schemas Pydantic de saída (`*Out`) para os 60 endpoints untyped (sobretudo em `staff`).
2. Eliminação de consultas N+1 via `select_related("user__profile", ...)` e queries em lote em rotas de listagem.
3. Adoção de `FilterSchema` e status codes explícitos (201 para criações, 204 para deleções).
4. Geração da migração pendente `0005_alter_commission_status.py` no app `finance`.

## 5. Verification Method
- **Verificação de Check do Django:**
  `uv run python manage.py check` (deve retornar código 0).
- **Verificação de Integridade de Migrações:**
  `uv run python manage.py makemigrations --check --dry-run` (deve passar sem divergências após gerar a migração pendente do finance).
- **Verificação da Suíte de Testes:**
  `uv run pytest` (deve manter 283+ testes passando).
- **Verificação de Geração OpenAPI:**
  Executar `.agents/explorer_survey_3/detailed_openapi_and_schema_audit.py` (deve gerar o JSON sem erros em nenhuma das 7 instâncias).
