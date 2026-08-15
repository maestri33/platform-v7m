# Mudanças no backend que o FRONTEND precisa acompanhar

> Nota viva. O backend muda aqui primeiro; cada item abaixo é algo que o app/landing
> precisa ajustar. O Victor repassa pro time de frontend. Datas em AAAA-MM-DD.

## 2026-06-24 — Leadership 100% tipado no OpenAPI + guia de integração

- **Todos os endpoints de `leadership` agora têm `response=Schema`** (`/api/v1/leadership/openapi.json` 
  publica 63 schemas, 41 paths, nenhum endpoint sem response schema).
- **Novos schemas importantes pro front:**
  - `CandidateMeOut` — `/candidates/{id}/document/decide` e `/document/reset` devolvem o /me rico do candidato.
  - `CandidateSelfieDetailOut` — `GET /candidates/{id}/selfie` agora tem foto + análise + `in_review`.
  - `ExamOut`, `DocDecisionOut`, `DiplomaIssueOut`, `RgPhotoUploadOut`, `MaterialOut`, `MaterialApproveOut`.
  - `PaginatedStudentsOut` — `GET /students` retorna `{items:[HubStudentRowOut], total, limit, offset}` tipado.
- **Retornos ajustados:** suspender/reativar promotor devolvem `HubPromoterRowOut` (com `name` e `locked`);
  abertura/resolução de pendência devolvem `StudentPendencyOut` completo; listagem de matrículas tem
  `fees: EnrollmentFeesOut` tipado ao invés de `dict` solto.
- **Health base tipado:** `GET /health` de todos os grupos devolve `HealthOut {group, version, status}`.
- **Guia completo:** ver `wiki/frontend-integracao.md` para instruções pontuais de como os apps
  **Clientes** e **Colaboradores** (promotor + coordenador) devem conversar com a API.

## 2026-06-23 — Fase "matrícula": credenciais ao virar aluno

- **Notify de credenciais (NOVO):** ao concluir a matrícula (`POST /leadership/enrollments/{id}/conclude`),
  o agora-ALUNO recebe **login + senha + link** da plataforma por WhatsApp **e** e-mail (evento
  `enrollment.credentials`; link = env `INSTITUTION_LOGIN_URL`, default SIGA). Do aluno em diante é a
  única coisa que ele recebe (antes, como lead, só tinha o recibo).
- **`PUT /staff/students/{external_id}/platform-credentials` (NOVO):** SÓ staff corrige
  login/senha/url/notes depois de concluído (coordenador não altera). Body
  `{platform_login, platform_password, platform_url?, platform_notes?}`. Login é **único por matrícula**
  → `409 PLATFORM_LOGIN_TAKEN`; aluno inexistente → `404`.
- **`GET /leadership/enrollments/{id}`** segue devolvendo **todos os dados coletados** (detail_for_hub) e
  **permanece `dict`** por ora — shape rico/aninhado; tipar depois, sem risco de sumir campo na tela do coordenador.

## 2026-06-23 — Cadastro de candidato: `ref` tolerante + diagnóstico da fila L2

**Fila L2 (candidatos aguardando aprovação) — NÃO era bug de hub.** Um candidato só entra na fila do
coordenador (`GET /leadership/candidates` e o balde `candidates_awaiting_approval` de `/reviews`)
quando **conclui a coleta** (status `completed`). Em `started`/meio do funil ele NÃO aparece — em polo
nenhum. (Diagnóstico do caso reportado: o candidato estava em `started`; o vínculo com o polo do
coordenador estava correto.)

**`POST /collaborators/auth/register` — o `hub` (o `?ref=` da landing) ficou tolerante:**
- aceita external_id de **POLO ou de PROMOTOR** (resolve pro hub do promotor — espelha o `?ref=` do funil do lead);
- `ref` ausente / inválido / malformado / de polo sem coordenador → cai no **polo padrão** (não dá mais erro nem 500);
- ⚠️ no funil do **lead** o `?ref=` é o id do **promotor**; no do **candidato** mande o external_id do
  **polo** (do coordenador) pra captação cair no coordenador certo — senão vai pro padrão.

## 2026-06-21 — Passo "educação" virou ESTRUTURADO (breaking)

`POST /enrollment/education` **não aceita mais** `last_year_studied` (texto livre). Novo payload:

```json
{
  "level": "fundamental",   // "fundamental" | "medio"
  "grade": 9,                // fundamental: 1–9 | médio: 1–3
  "completed": true,         // concluiu o nível?
  "last_school": "Escola Estadual X",
  "city": "Curitiba",        // cidade da escola
  "state": "PR",             // UF (2 letras)
  "last_year_when": "2010"   // opcional
}
```

- `GET /enrollment/education` e o bloco `education` do `GET /enrollment/me` devolvem esse mesmo shape.
- Erros (HTTP 422): `EDUCATION_LEVEL_INVALID` (nível inválido); `EDUCATION_GRADE_OUT_OF_RANGE`
  (série fora da faixa do nível — vem com `{min, max}` no `extra`).
- UI sugerida: dropdown nível → dropdown série (muda 1–9 vs 1–3) → toggle "concluí" → escola + cidade/UF.

## 2026-06-21 — API de LIDERANÇA (coordenador) publicou o contrato (OpenAPI tipado)

Antes vários GET devolviam dict solto (`{"description":"OK"}`); agora todos têm `response=<Schema>`
publicado no OpenAPI (`/api/v1/leadership/docs` e `/openapi.json`). Shapes reais (snake_case):

- **`GET /leads`** → `list[HubLeadRowOut]`: `external_id, status, name, phone, promoter_external_id, payment_link, receipt_url` (⚠️ **não** tem cpf/email — esses só no detalhe, aninhados em `customer`).
- **`GET /leads/{id}`** → `HubLeadDetailOut`: `external_id, status, failed_reason, created_at, customer{name,phone,email,cpf}, promoter{external_id,name}, checkout{payment_method,provider,amount,is_paid,url,receipt_url,...}`.
- **`GET /enrollments`** → `list[HubEnrollmentRowOut]`: `external_id, name, phone, status` (REAL, sem máscara), `fees{...}`, `created_at`.
- **`GET /promoters`** → `list[HubPromoterRowOut]`: `external_id, name, status, locked`.
- **`GET /candidates`** → `list[CandidateAwaitingOut]`: `external_id, name, since, rejected`.

### `GET /reviews` — NORMALIZADO (tela-âncora)
Top-level = objeto de 7 baldes (`enrollment_rg, enrollment_selfie, candidate_document, candidate_selfie, student_documents, candidates_awaiting_approval, locked_promoters`). **Cada item agora é `ReviewItemOut` homogêneo**: sempre `external_id` + `type` + `kind` + extras, em vez do nome-de-id-que-muda-por-balde de antes.
- `type`: `enrollment | candidate | student | promoter`
- `kind`: `rg | selfie | document | awaiting_approval | locked_training`
- `external_id` = o id do recurso a decidir. Casos especiais: `student_documents` traz também `student_external_id` + `document_external_id`; `locked_promoters` traz `promoter_external_id` + `pending_materials`.
- O front roteia por `type`+`kind` e linka por `external_id`.

### NOVO `GET /students?status=&limit=&offset=` (A2)
Antes o coordenador só tinha `GET /students/{id}`. Agora lista alunos do polo: `response=PaginatedOut {items:[HubStudentRowOut{external_id,name,phone,status,created_at}], total, limit, offset}`.

### Catálogo de codes (A3) + paginação (A5)
A `description` do grupo leadership agora lista ~46 codes (`NOT_HUB_COORDINATOR, WRONG_STATUS, FEES_INCOMPLETE, RG_NOT_IN_REVIEW, SELFIE_NOT_IN_REVIEW, RATE_LIMITED, EDUCATION_*`, etc.) com status e extras — `switch(code)`. `/students` usa `limit/offset/total`; demais listas seguem arrays diretos.

### Gating/Login (cravado p/ o front)
- Role do coordenador = **`"coordinator"`** (não `hub_coordinator`); mas o gate DURO é coordenar um Hub (`Hub.coordinator_id == user.id`, senão 403 `NOT_HUB_COORDINATOR`).
- Login **por área**: existe `/leadership/auth/check` (dispara OTP) e `/leadership/auth/login` (exige coordenar hub). O token do collaborators **não** é o caminho pro leadership — criar handlers `/api/leadership/auth/*`.
- `is_coordinator` (do `/auth/check`) = `hub_iface.coordinated_by(user) is not None`.

- `GET /enrollment/documents/rg` agora devolve `analysis_status: null` quando **não há foto enviada**
  (antes vinha `"pending"` e o front ficava preso em "Lendo seu documento…").
- Regra pro front: `analysis_status == null` → mostrar o **formulário de upload**;
  `"pending"` → "analisando…"; `"approved"`/`"rejected"`/`"review"` → como já era.
