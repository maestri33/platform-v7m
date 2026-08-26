# Relatório de Auditoria e Diagnóstico: APIs Django Ninja, Schemas, ORM, Serviços e Testes

**Data da Auditoria:** 2026-08-23  
**Auditor:** Survey Explorer 3  
**Escopo:** Requisitos R3 (Padronização Django Ninja e Pydantic v2) e R4 (Validação e Qualidade Estrutural) da plataforma V7M Backend.  
**Alvo:** Todas as instâncias `NinjaAPI`, routers, endpoints, schemas Pydantic v2, services de domínio, padrões de queries ORM (N+1), tratamento de exceções e suíte de testes automatizados.

---

## 1. Sumário Executivo

A auditoria cobriu 100% da superfície de APIs do backend V7M, inspecionando 7 instâncias `NinjaAPI`, 25 arquivos de router, 154 classes de Schema Pydantic, 32 arquivos de serviço/interface e 58 arquivos de testes.

### Principais Indicadores Baseline
- **Instâncias NinjaAPI ativas:** 7 (`clients`, `collaborators`, `leadership`, `staff`, `tools`, `health`, `portal`).
- **Total de Endpoints / Operações HTTP mapeadas:** 190 operações em 176 rotas únicas.
- **Integridade OpenAPI:** Todas as 7 instâncias geram OpenAPI 3.x com sucesso sem quebra de sintaxe.
- **Suíte de Testes:** 283 testes executados, 283 passaram com sucesso (tempo de execução: ~26.9s).
- **Status do Django System Check:** `uv run python manage.py check` executou com código 0 (5 avisos cosméticos de chaves opcionais de IA/Sentry).
- **Divergência de Migração Pendente:** `uv run python manage.py makemigrations --check --dry-run` detectou divergência pendente em `finance` (`0005_alter_commission_status.py`).

### Principais Vulnerabilidades e Desvios Identificados
1. **Ausência de Tipagem de Resposta (Schemas de Saída) em 60 Endpoints:** Especialmente em `api/staff/` (32 endpoints), `api/portal.py` (5 endpoints), `api/health/` (2 endpoints) e `api/clients/` (1 endpoint), onde rotas retornam dicionários e listas brutas sem `response=SchemaOut`, degradando a documentação OpenAPI para objetos genéricos vazios `{}`.
2. **Consultas N+1 Severas no ORM:** Detectados gargalos críticos em listagens do staff e liderança (`api/staff/routers/documents.py`, `api/staff/routers/network.py`, `users/roles/enrollment/service.py:fee_facts`, `users/roles/training/service.py:assigned_materials`), onde loops executam centenas de queries repetidas para `Profile`, `PaymentRequest`, `RG`, `CNH`, `Lead` e `Student`.
3. **Inexistência de `FilterSchema` e `@paginate`:** Zero uso das capacidades nativas do Django Ninja para filtros estruturados e paginação uniforme. Parâmetros de paginação e filtro são passados como argumentos soltos (`limit`, `offset`, `status`, `hub`).
4. **Padronização de Códigos de Status HTTP REST:** 188 dos 190 endpoints utilizam o código padrão `200 OK`. Rotas POST de criação de recursos (materiais de treino, polos, agendamentos, submissões) e rotas DELETE não emitem/declaram explicitamente `201 Created` ou `204 No Content`.
5. **Padrão de Testes com `TestClient`:** Nenhum teste na suíte de 283 testes utiliza `ninja.testing.TestClient`. Testes de API recorrem ao `django.test.Client` ou chamadas diretas a funções de router com classes `DummyRequest`.

---

## 2. Mapeamento Completo das APIs e Routers Django Ninja

O backend V7M estrutura suas APIs em 7 grupos segmentados por perfil de acesso e finalidade técnica:

| Instância Ninja | Prefixo de Rota (`core/urls.py`) | Auth Padrão | Quantidade de Rotas | Operações | Schemas OpenAPI |
|---|---|---|---|---|---|
| **clients** | `/api/v1/clients/` | `JWTAuth` (com gates de role) | 32 | 37 | 49 |
| **collaborators** | `/api/v1/collaborators/` | `JWTAuth` (com gates de role) | 31 | 35 | 45 |
| **leadership** | `/api/v1/leadership/` | `JWTAuth` (role `promoter`/coordenador) | 42 | 42 | 62 |
| **staff** | `/api/v1/staff/` | `JWTAuth` + `require_superuser` | 59 | 64 | 25 |
| **tools** | `/api/v1/tools/` | `tools_auth` (Header Secret + IP) | 4 | 4 | 5 |
| **health** | `/api/v1/health/` | Público / Staff para `/health/full` | 3 | 3 | 2 |
| **portal** | `/portal/` | API Key / Token de sessão | 5 | 5 | 3 |
| **TOTAL** | — | — | **176** | **190** | **154 schemas únicos** |

### 2.1. Inventário Detalhado de Módulos e Routers

#### Grupo `clients` (`api/clients/routers/`)
- `auth.py`: `/register`, `/check`, `/login`, `/refresh` (fluxo passwordless OTP do lead).
- `lead.py`: `/me`, `/checkout-url`, `/identity` (Passo 3), `/email` (Passo 5), `/checkout` (Passo 6 - escolha de pagamento).
- `enrollment.py`: `/enrollment/me`, `/enrollment/profile`, `/enrollment/address`, `/enrollment/documents/rg/photo/{slot}`, `/enrollment/documents/cnh/photo`, `/enrollment/documents/address-proof`, `/enrollment/education`, `/enrollment/selfie`, `/contract/current`.
- `student.py`: `/student/me`, `/veteran/me`, `/student/blood-type`, `/student/documents/{doc_type}`, `/student/exam/schedule`, `/student/pendencies`.
- `pricing.py`: `/pricing`, `/referral/{ref}` (preço público de vitrine e selo de indicação).
- `blocks.py`: `/me/blocks`, `/me/blocks/{block_id}`, `/me/blocks/{block_id}/resolve`.

#### Grupo `collaborators` (`api/collaborators/routers/`)
- `auth.py`: `/register`, `/check`, `/join`, `/login`, `/refresh`.
- `candidate.py`: `/candidate/me`, `/candidate/profile`, `/candidate/address`, `/candidate/documents/rg/photo/{slot}`, `/candidate/documents/cnh/photo`, `/candidate/documents/address-proof`, `/candidate/education`, `/candidate/selfie`, `/candidate/pix`, `/candidate/contract/current`.
- `promoter.py`: `/promoter/me`, `/promoter/ref-link`, `/promoter/leads`, `/promoter/commissions`, `/promoter/payouts`, `/promoter/payouts/request`, `/promoter/study/pricing`, `/promoter/study/start`.
- `training.py`: `/training/materials`, `/training/progress`, `/training/submissions`, `/training/submissions/audio`.

#### Grupo `leadership` (`api/leadership/routers/`)
- `auth.py`: `/auth/check`, `/auth/login`, `/auth/refresh`.
- `leads.py`: `/leads`, `/leads/{external_id}`.
- `enrollments.py`: `/enrollments`, `/enrollments/{external_id}`, `/enrollments/{external_id}/fee/pay`, `/enrollments/{external_id}/fee/schedule`, `/enrollments/{external_id}/conclude`, `/enrollments/{external_id}/address`, `/enrollments/{external_id}/documents/rg/photo/{slot}`, `/enrollments/{external_id}/selfie`, `/enrollments/{external_id}/profile`.
- `reviews.py`: `/reviews`, `/enrollments/{external_id}/rg/decide`, `/enrollments/{external_id}/address-proof/decide`, `/enrollments/{external_id}/selfie/decide`, `/candidates/{external_id}/selfie/decide`, `/candidates/{external_id}/selfie`, `/candidates/{external_id}/document/decide`, `/candidates/{external_id}/document/reset`.
- `students.py`: `/students`, `/students/{external_id}`, `/students/{external_id}/exam/grade`, `/students/{external_id}/documents/{document_external_id}/decide`, `/students/{external_id}/pendencies`, `/pendencies/{external_id}/resolve`, `/students/{external_id}/documentation/clear`, `/students/{external_id}/diploma/issue`, `/students/{external_id}/diploma/pickup`, `/students/{external_id}/manual-selfie`.
- `candidates.py`: `/candidates`, `/candidates/{external_id}`, `/candidates/{external_id}/approve`, `/candidates/{external_id}/reject`.
- `promoters.py`: `/promoters`, `/promoters/{external_id}`, `/promoters/{external_id}/suspend`, `/promoters/{external_id}/reactivate`, `/promoters/{external_id}/materials/{material_external_id}/approve`.

#### Grupo `staff` (`api/staff/routers/`)
- `auth.py`: `/auth/check`, `/auth/login`, `/auth/refresh`.
- `hubs.py`: `/hubs`, `/hubs/{external_id}`, `/hubs/{external_id}/coordinator`, `/hubs/{external_id}/default`, `/hubs/{external_id}/address`.
- `coordinators.py`: `/coordinators`.
- `documents.py`: `/documents/reviews`, `/documents/{user_external_id}/dossier`, `/documents/{user_external_id}/decide`.
- `network.py`: `/network/tree`.
- `training.py`: `/training/submissions`, `/training/submissions/{external_id}/override`, `/training/promoters/{promoter_external_id}/unlock`.
- `materials.py`: `/training/materials`, `/training/materials/{external_id}`, `/training/materials/{external_id}/publish`, `/training/materials/{external_id}/video`.
- `finance.py`: `/finance/balance`, `/finance/summary`, `/finance/commissions`, `/finance/payouts`, `/finance/payments`, `/finance/closing/run`, `/finance/closing/health`, `/finance/closing/simulation`, `/finance/payouts/{external_id}/retry`, `/finance/payouts/{external_id}/override-pix`.
- `notify.py`: `/notify/templates`, `/notify/templates/stats`, `/notify/events`, `/notify/templates/{event}`, `/notify/templates/{event}/restore-seed`, `/notify/templates/{event}/preview`, `/notify/templates/{event}/test`, `/notify/history`.
- `system.py`: `/integrations`, `/integrations/{name}`, `/integrations/asaas/setup`, `/integrations/asaas/test`, `/system`, `/logs/ai-calls`, `/logs/checks`.
- `config.py`: `/config/setup`, `/config/seed-run`, `/integrations/{name}/test-live`.
- `users.py`: `/leads`, `/leads/{external_id}/mark-paid`, `/funnel-user`, `/enrollments`, `/students`, `/students/{external_id}/platform-credentials`, `/users`, `/users/{external_id}/phone`.

#### Grupo `tools` (`api/tools/router.py`)
- `router.py`: `/leads`, `/notifications/send`.

#### Grupo `health` (`api/health/router.py`)
- `router.py`: `/healthz`, `/health/full`.

#### Grupo `portal` (`api/portal.py`)
- `portal.py`: `/agent/grants`, `/agent/grants/ack`, `/agent/ping`, `/session/start`, `/session/stop`.

---

## 3. Conformidade Pydantic v2 e Padrões Django Ninja

### 3.1. Auditoria de Schemas Pydantic
- **Total de Schemas Identificados:** 154 classes de Schema.
- **Compatibilidade Pydantic v2:** Todas as classes utilizam o motor Pydantic v2 via herança direta de `ninja.Schema`.
- **Configuração ORM (`from_attributes`):** O Django Ninja habilita internamente `from_attributes=True` em classes derivadas de `Schema`. No entanto, os schemas do V7M não declaram explicitamente `model_config = ConfigDict(from_attributes=True)` na maioria dos modelos locais, confiando na herança implícita do Ninja.
- **Distribuição Funcional de Schemas:**
  - **Entrada (`*In`, `Create*`):** 45 schemas.
  - **Saída (`*Out`, `Response*`):** 106 schemas.
  - **Atualização Parcial (`Patch*` / `Update*`):** 2 schemas (`HubAddressPatchIn`, `NotifyTemplatePatchIn`). Na maioria das operações de patch (ex: `enrollment/profile`, `enrollment/address`, `candidate/address`), são utilizados schemas genéricos ou dicionários soltos.
  - **Filtros (`FilterSchema`):** **0 classes encontradas.** Nenhuma rota utiliza `FilterSchema` para validação e coerção de query params.

### 3.2. Endpoints sem Schema de Resposta Tipado (Untyped Endpoints)

Foram identificados **60 endpoints** que não declaram `response=...` em seus decoradores, retornando dicionários ou listas brutas (`dict`, `list[dict]`):

```python
# Exemplo de anti-padrão encontrado em api/staff/routers/documents.py:21
@router.get("/documents/reviews", summary="Fila global unificada de documentos em revisão")
def list_global_document_reviews(request, hub: str | None = None, doc_type: str | None = None):
    # Retorna lista de dicts puros sem schema Out tipado
    return reviews
```

#### Lista Completa de Endpoints Desprovidos de Response Model:
1. `api/clients/routers/student.py:51` (`GET /veteran/me`)
2. `api/staff/routers/config.py:53` (`GET /config/setup`)
3. `api/staff/routers/config.py:60` (`PUT /config/setup`)
4. `api/staff/routers/config.py:68` (`POST /config/seed-run`)
5. `api/staff/routers/config.py:85` (`POST /integrations/{name}/test-live`)
6. `api/staff/routers/coordinators.py:20` (`GET /coordinators`)
7. `api/staff/routers/documents.py:22` (`GET /documents/reviews`)
8. `api/staff/routers/documents.py:135` (`GET /documents/{user_external_id}/dossier`)
9. `api/staff/routers/documents.py:219` (`POST /documents/{user_external_id}/decide`)
10. `api/staff/routers/finance.py:34` (`GET /finance/balance`)
11. `api/staff/routers/finance.py:41` (`GET /finance/summary`)
12. `api/staff/routers/finance.py:48` (`GET /finance/commissions`)
13. `api/staff/routers/finance.py:55` (`GET /finance/payouts`)
14. `api/staff/routers/finance.py:62` (`POST /finance/payments`)
15. `api/staff/routers/finance.py:122` (`POST /finance/closing/run`)
16. `api/staff/routers/finance.py:129` (`GET /finance/closing/health`)
17. `api/staff/routers/finance.py:158` (`GET /finance/closing/simulation`)
18. `api/staff/routers/finance.py:165` (`POST /finance/payouts/{external_id}/retry`)
19. `api/staff/routers/finance.py:185` (`POST /finance/payouts/{external_id}/override-pix`)
20. `api/staff/routers/materials.py:16` (`POST /training/materials`)
21. `api/staff/routers/materials.py:24` (`PUT /training/materials/{external_id}`)
22. `api/staff/routers/materials.py:32` (`GET /training/materials`)
23. `api/staff/routers/materials.py:42` (`POST /training/materials/{external_id}/publish`)
24. `api/staff/routers/materials.py:49` (`DELETE /training/materials/{external_id}`)
25. `api/staff/routers/materials.py:57` (`POST /training/materials/{external_id}/video`)
26. `api/staff/routers/network.py:20` (`GET /network/tree`)
27. `api/staff/routers/notify.py:133` (`GET /notify/templates`)
28. `api/staff/routers/notify.py:177` (`GET /notify/templates/stats`)
29. `api/staff/routers/notify.py:206` (`GET /notify/events`)
30. `api/staff/routers/notify.py:221` (`GET /notify/templates/{event}`)
31. `api/staff/routers/notify.py:263` (`PATCH /notify/templates/{event}`)
32. `api/staff/routers/notify.py:283` (`POST /notify/templates/{event}/restore-seed`)
33. `api/staff/routers/notify.py:290` (`POST /notify/templates/{event}/preview`)
34. `api/staff/routers/notify.py:331` (`POST /notify/templates/{event}/test`)
35. `api/staff/routers/notify.py:353` (`GET /notify/history`)
36. `api/staff/routers/system.py:16` (`GET /integrations`)
37. `api/staff/routers/system.py:23` (`GET /integrations/{name}`)
38. `api/staff/routers/system.py:33` (`POST /integrations/asaas/setup`)
39. `api/staff/routers/system.py:42` (`POST /integrations/asaas/test`)
40. `api/staff/routers/system.py:51` (`GET /system`)
41. `api/staff/routers/system.py:102` (`GET /logs/ai-calls`)
42. `api/staff/routers/system.py:127` (`GET /logs/checks`)
43. `api/staff/routers/training.py:20` (`GET /training/submissions`)
44. `api/staff/routers/training.py:53` (`POST /training/submissions/{external_id}/override`)
45. `api/staff/routers/training.py:77` (`POST /training/promoters/{promoter_external_id}/unlock`)
46. `api/staff/routers/users.py:22` (`GET /leads`)
47. `api/staff/routers/users.py:35` (`POST /leads/{external_id}/mark-paid`)
48. `api/staff/routers/users.py:51` (`DELETE /funnel-user`)
49. `api/staff/routers/users.py:71` (`GET /enrollments`)
50. `api/staff/routers/users.py:78` (`GET /students`)
51. `api/staff/routers/users.py:85` (`PUT /students/{external_id}/platform-credentials`)
52. `api/staff/routers/users.py:101` (`GET /users`)
53. `api/staff/routers/users.py:128` (`PUT /users/{external_id}/phone`)
54. `api/health/router.py:65` (`GET /healthz`)
55. `api/health/router.py:79` (`GET /health/full`)
56. `api/portal.py:37` (`GET /agent/grants`)
57. `api/portal.py:42` (`POST /agent/grants/ack`)
58. `api/portal.py:47` (`GET /agent/ping`)
59. `api/portal.py:52` (`POST /session/start`)
60. `api/portal.py:57` (`POST /session/stop`)

### 3.3. Códigos de Status HTTP Explícitos
- **Criação (201):** Apenas 2 endpoints (`/clients/auth/register` e `/collaborators/auth/register`) declaram `response={201: Out}`. Endpoints como `POST /staff/training/materials`, `POST /staff/hubs`, `POST /leadership/students/{id}/diploma/issue` e submissões respondem com 200 implícito.
- **Exclusão (204):** Operações DELETE (`DELETE /staff/training/materials/{id}` e `DELETE /staff/funnel-user`) retornam dicionários com 200 em vez de `204 No Content`.
- **Mapeamento de Erros no OpenAPI:** As rotas não utilizam mapas `response={200: Out, 400: ErrorOut, 404: ErrorOut, 422: ErrorOut}`. Embora as exceções sejam capturadas globalmente por handlers centrais, a especificação OpenAPI gerada exibe apenas a resposta de sucesso `200` ou `201`.

---

## 4. Auditoria de Consultas ORM e Padrões de Gargalo N+1

A investigação identificou locais críticos onde loops em rotas e serviços realizam consultas repetidas ao banco de dados sem utilizar `select_related` ou `prefetch_related`.

### 4.1. Principais Pontos de N+1 Identificados

#### 1. Fila Global de Documentos do Staff (`api/staff/routers/documents.py:21-131`)
```python
# Observação: L41-45
for enr in enrollments[:100]:
    p = profiles.get(enr.user)                                  # 1 query por enrollment
    rg = RG.objects.filter(document__user=enr.user).first()     # 1 query por enrollment
    cnh = CNH.objects.filter(document__user=enr.user).first()   # 1 query por enrollment
```
- **Impacto:** Para uma listagem de 100 matrículas, o endpoint dispara **300 queries SQL adicionais**.
- **Solução Recomendada:** Utilizar `select_related("user__profile", "user__document__rg", "user__document__cnh")` diretamente no queryset inicial de `Enrollment`.

#### 2. Árvore Genealógica de Captação / Downline (`api/staff/routers/network.py:19-89`)
```python
# Observação: L30-50
for h in hubs_qs:
    coord_prof = profiles.get(coord_user) if coord_user else None
    promoters = Promoter.objects.select_related("user").filter(hub=h) # 1 query por polo
    for prom in promoters:
        prom_prof = profiles.get(prom_user)                          # 1 query por promotor
        leads = Lead.objects.filter(promoter=prom_user)
        leads_count = leads.count()                                  # 1 query COUNT por promotor
        paid_count = leads.filter(status=Lead.Status.PAID).count()   # 1 query COUNT por promotor
        students_count = Student.objects.filter(user__enrollment__promoter=prom_user).count() # 1 query
```
- **Impacto:** Em um cenário com 10 polos e 10 promotores cada, este endpoint executa mais de **420 queries SQL**.
- **Solução Recomendada:** Pré-carregar os perfis com `select_related("coordinator__profile", "coordinator__address")`, realizar prefetch dos promotores com seus perfis e calcular as métricas agregadas via subqueries/anotações do Django ORM (`annotate(total_leads=Count('leads'), paid_leads=Count('leads', filter=Q(leads__status='paid')))`).

#### 3. Listagem de Matrículas do Polo e Situação de Taxas (`users/roles/enrollment/service.py:1546-1560`, `1897-1910`)
```python
# Observação em fee_facts(enr) chamada para cada matrícula listada:
def fee_facts(enr: Enrollment) -> dict:
    first = fees.latest_fee_request(_fee_now_ref(enr))   # 1 query na tabela PaymentRequest
    second = fees.latest_fee_request(_fee_due_ref(enr))  # 1 query na tabela PaymentRequest
```
- **Impacto:** Cada item retornado em `GET /leadership/enrollments` executa **2 queries adicionais** em `finance_paymentrequest`. Para 50 matrículas, são 100 queries avulsas.
- **Solução Recomendada:** Executar uma query agregada em lote no `PaymentRequest` com `external_reference__in=[...]` e indexar em memória antes de montar a lista de respostas.

#### 4. Progresso de Treinamento de Colaboradores (`users/roles/training/service.py:254-266`)
```python
# Observação: L260-265
for a in qs:
    last = (
        Submission.objects.filter(user=user, material=a.material)
        .order_by("-created_at")
        .first()                                         # 1 query por material
    )
```
- **Impacto:** 1 query por matéria atribuída ao colaborador no endpoint `GET /collaborators/training/materials`.
- **Solução Recomendada:** Buscar todas as últimas submissões do usuário em uma única consulta indexada por `material_id`.

#### 5. Serialização de Leads (`users/roles/lead/service.py:861-874`)
```python
# Observação: L864
def lead_to_dict(lead: Lead) -> dict:
    p = profiles.get(lead.user)                          # 1 query por lead
```
- **Impacto:** Chamado em listagens de leads de polos e staff (`api/leadership/routers/leads.py:21`), disparando 1 query por lead.
- **Solução Recomendada:** Utilizar `profiles.get_map([l.user for l in leads])` ou `select_related("user__profile")`.

---

## 5. Auditoria de Tratamento de Exceções e Erros

### 5.1. Arquitetura de Exceções Global
O tratamento global de exceções está concentrado em `api/base.py` na função fábrica `build_group`, garantindo um envelope padronizado para respostas HTTP de erro:

```json
{
  "detail": "Mensagem amigável ou lista de erros de validação",
  "code": "CODIGO_DO_ERRO",
  "expected_status": "rg",
  "retry_after_s": 60
}
```

### 5.2. Handlers Registrados por Instância Ninja
As instâncias `clients`, `collaborators`, `leadership`, `staff`, `tools` e `health` possuem os seguintes exception handlers registrados:
1. `DomainError`: Converte exceções de negócio da camada de domínio em status HTTP específico (`exc.status`, padrão 409/422/404) preservando `exc.code` e `exc.extra`.
2. `AuthenticationError`: Converte falhas de JWT/Bearer em HTTP 401 `{detail: "Não autenticado...", code: "UNAUTHORIZED"}`.
3. `NinjaValidationError`: Converte payloads inválidos em HTTP 422 `{detail: exc.errors, code: "VALIDATION_ERROR"}`.
4. `HttpError`: Converte erros HTTP explícitos em envelope JSON `{detail: str(exc), code: "ERROR"}` com o respectivo `status_code`.
5. `Exception` (catch-all): Converte exceções não tratadas em HTTP 500 `{detail: "Erro interno do servidor.", code: "INTERNAL"}` garantindo que tracebacks HTML nunca vazem para o cliente.

### 5.3. Hierarquia de Exceções de Domínio (`users/exceptions.py`)
- `DomainError` (Base, status HTTP configurável, default 422)
  - `ValidationError` (422)
  - `NotFound` (404)
  - `Unauthorized` (401)
  - `Forbidden` (403)
  - `Conflict` (409)
  - `RateLimited` (429)
  - `BadGateway` (502)

**Diagnóstico:** A arquitetura de exceções e o envelope de erro estão sólidos e consistentes no runtime. A única lacuna é a ausência de documentação desses schemas de erro (`ErrorOut`) nos decorators OpenAPI das rotas.

---

## 6. Auditoria da Suíte de Testes Automatizados

### 6.1. Configuração e Infraestrutura de Testes
- **Arquivo de Configuração:** `pytest.ini` (`DJANGO_SETTINGS_MODULE=core.settings`, `addopts = -v --tb=short`, `python_files = test_*.py`).
- **Banco de Dados de Teste:** `sqlite:///:memory:` injetado em `tests/conftest.py` garantindo isolamento total e rapidez na execução.
- **Fixtures Disponíveis em `conftest.py`:**
  - `test_settings` (autouse: habilita `TEST_MODE=True`, `APP_ENV="test"`, tokens de serviço sintéticos).
  - `client` (`django.test.Client`).
  - `bot_headers` (`HTTP_X_BOT_SERVICE_TOKEN`).

### 6.2. Execução da Suíte Baseline
- **Comando executado:** `uv run pytest`
- **Resultado:** **283 passed in 26.90s** (100% de sucesso).
- **Categorias de Testes Existentes:**
  - Testes unitários e de domínio de regras de negócio (funil de matrículas, cálculo de comissões, validação de documentos OCR/IA, provas, agendamentos, autenticação OTP/JWT).
  - Testes de segurança e controle de acesso (`test_media_gate.py`, `test_tools_auth.py`, `test_session_revocation.py`).
  - Testes de webhooks de pagamento (`test_webhooks.py`, `test_g4_webhook.py`).
  - Testes de mascaramento PII e integração Sentry (`test_sentry.py`).

### 6.3. Oportunidades de Melhoria na Suíte de Testes
1. **Adoção de `ninja.testing.TestClient`:** Vários testes de endpoints do staff e liderança (ex: `tests/test_staff_documents_and_network_endpoints.py`) instanciam classes mock `DummyRequest` e invocam as funções de view diretamente. A substituição por `TestClient(staff_api)` validará autenticação Ninja, serialização Pydantic e headers reais.
2. **Cobertura Específica de Schemas de Filtro e Paginação:** Como não há uso atual de `FilterSchema`, testes para filtros dinâmicos de listagem deverão ser adicionados quando o padrão for implementado.

---

## 7. Integridade OpenAPI e Conflitos de Schema

### 7.1. Validação de Geração do Schema OpenAPI
A inspeção programática executou `get_openapi_schema()` em todas as 7 instâncias NinjaAPI:
- **`api-clients` (v1.0):** 32 rotas, 37 operações, 49 schemas de componentes. Geração íntegra.
- **`api-collaborators` (v1.0):** 31 rotas, 35 operações, 45 schemas de componentes. Geração íntegra.
- **`api-leadership` (v1.0):** 42 rotas, 42 operações, 62 schemas de componentes. Geração íntegra.
- **`api-staff` (v1.0):** 59 rotas, 64 operações, 25 schemas de componentes. Geração íntegra.
- **`api-tools` (v1.0):** 4 rotas, 4 operações, 5 schemas de componentes. Geração íntegra.
- **`api-health` (v1.0):** 3 rotas, 3 operações, 2 schemas de componentes. Geração íntegra.
- **`portal` (v1.0.0):** 5 rotas, 5 operações, 3 schemas de componentes. Geração íntegra.

### 7.2. Detecção de Conflitos e Inconsistências de Nomes
Não foram detectadas colisões de nomes de schemas no OpenAPI. A convenção de namespaces (`urls_namespace=f"api-{name}"`) isola cada grupo. Contudo, em virtude da ausência de tipagem em 60 endpoints no grupo `staff`, o Swagger UI de `/api/v1/staff/docs` omite a estrutura de retorno de mais de 50% dos seus endpoints.

---

## 8. Divergência de Migração Pendente

A execução de `uv run python manage.py makemigrations --check --dry-run` acusou divergência pendente no app `finance`:
- **Arquivo de migração faltante:** `finance/migrations/0005_alter_commission_status.py`
- **Operação:** `Alter field status on commission` (alteração de choices/tamanho do campo `status` no model `Commission`).
- **Ação necessária na fase de refatoração:** Gerar e commitar a migração `0005_alter_commission_status.py` para garantir que `makemigrations --check` passe no CI.

---

## 9. Plano de Ação Recomendado para a Fase de Refatoração

Para atingir plena conformidade com os requisitos R3 e R4 e as diretrizes do skill `django-ninja`:

### A. Schemas e Tipagem Estrita
1. **Tipar os 60 endpoints untyped:** Criar schemas `*Out` dedicados para cada endpoint de staff, portal e health em `api/staff/schemas.py`, `api/portal.py` e `api/health/router.py`.
2. **Declarar Pydantic v2 `ConfigDict`:** Adicionar `model_config = ConfigDict(from_attributes=True)` explicitamente nos schemas de saída que serializam models Django.
3. **Implementar `FilterSchema` e `@paginate`:** Substituir paginação manual (`limit`, `offset`) e filtros soltos por classes `FilterSchema` nos endpoints de listagem de alunos, matrículas, leads, comissões, submissões e auditoria.
4. **Padronizar Schemas de Patch:** Criar schemas dedicados `PatchIn` com campos opcionais (`field: str | None = None`) para todas as rotas `PATCH`.

### B. Resolução de Gargalos ORM N+1
1. **Otimizar `api/staff/routers/documents.py`:** Aplicar `select_related("user__profile", "user__document__rg", "user__document__cnh")` nas consultas de matrícula e candidatos.
2. **Otimizar `api/staff/routers/network.py`:** Reestruturar o cálculo da árvore downline para utilizar anotações agregadas (`Count`) e pré-carregamento em lote de coordenadores e promotores.
3. **Otimizar `fee_facts` em `users/roles/enrollment/service.py`:** Coletar todas as referências de taxa do polo e buscar `PaymentRequest` em uma única query `IN (...)`.
4. **Otimizar `training/materials` e `submissions`:** Eliminar o loop `Submission.objects.filter(...)` por matéria, indexando submissões anteriores em memória.

### C. Padronização de Status HTTP e Documentação OpenAPI
1. Configurar `response={201: SchemaOut}` para todos os endpoints POST de criação de recursos.
2. Configurar `response={204: None}` para todos os endpoints DELETE.
3. Declarar respostas de erro (`{400: ErrorOut, 404: ErrorOut, 422: ErrorOut}`) nos endpoints principais para enriquecer o contrato OpenAPI.

### D. Banco de Dados e Testes
1. Criar e versionar a migração pendente `finance/migrations/0005_alter_commission_status.py`.
2. Modernizar os testes diretos de router em `tests/test_staff_documents_and_network_endpoints.py` para utilizarem `ninja.testing.TestClient`.
