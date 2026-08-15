# student / veteran — o funil final do aluno (§4 item 9)

A última fase do funil do ALUNO: o `enrollment` liberado vira **`student`**, percorre documentos → prova →
diploma e, na **retirada do diploma**, vira **`veteran`** e gera a **comissão do coordenador do polo**.
Sub-pacote de `users` (`users/roles/student`, app_label `users` — 1 migration set, igual enrollment/candidate).

> ✅ **TESTADO REAL (Portão 3, 2026-06-06)** — fluxo provado fim-a-fim por HTTP, com **IA real**, uploads reais e
> **DINHEIRO REAL** (PIX da comissão do coordenador, saldo Asaas −R$3). Detalhe: `.claude/tests/8-student-veteran.md`.
> Fonte: `specs/student_OK.md` + VISÃO + legado `~/coders/backend/student`. Decisões do Victor (2026-06-04):
> escopo = spec completo · «conferir» = ambos (doc OU taxa) · study_platform = campos estruturados.

## Máquina de status (`Student.Status`)
`AWAITING_DOCUMENTS → DOCUMENTS_UNDER_REVIEW → EXAM_RELEASED → EXAM_SCHEDULED ⇄ EXAM_FAILED →`
`AWAITING_DOCUMENTATION_DISPATCH ⇄ PENDING → AWAITING_DIPLOMA_ISSUANCE → AWAITING_PICKUP → VETERAN`

## Models (`users/roles/student/models.py`)
- **`Student`** — 1-1 User. FK real pro **hub herdado** do enrollment (origem da comissão). `status`,
  os dados estruturados da plataforma (`platform_url/login/password/notes` — credencial de plataforma EXTERNA),
  e `blood_type` (valor; a foto é um documento). `external_id` na borda.
- **`StudentDocument`** — foto + estado da validação por IA (`pending/approved/rejected/review`), 1 por (aluno, tipo).
  Tipos: `certificate`, `transcript`, `blood_type`, `address_proof`, `id_card`, `birth_certificate`,
  `military_service` (**só homem** — gate de gênero). IA **em dúvida/fora do ar → `review`**: o coordenador
  decide o sim/não (`decide_document`); a IA preserva a justificativa.
- **`StudentExam`** — `subject` + `scheduled_at` + `attempt_number` + `result` (passed/failed) + quem corrigiu.
- **`StudentDiploma`** — 1 por aluno: emissão (coordenador) + retirada (foto do aluno) + `commission_triggered_at`
  (idempotência da comissão).
- **`StudentPendency`** — o «conferir» (Victor: ambos): `kind` documento|taxa + descrição (+ `amount_cents`/
  `fee_request_id` só pra taxa). ⚠️ **taxa é só registro aqui — NÃO move dinheiro** (pagar = motor `fees`, OK do Victor).

## Fluxo
1. **Liberação** (`enrollment.release`, coordenador do hub): promove `enrollment→student`, marca a matrícula
   COMPLETED e **cria o `Student`** (AWAITING_DOCUMENTS) com os dados de plataforma + o hub herdado.
2. **Documentos** (aluno): `set_blood_type` + `upload_document(tipo, foto)` → cada um fica PENDING e dispara a
   **validação por IA assíncrona** (Django-Q `tasks.validate_document` → `ai.describe_image`). Best-effort: IA
   fora do ar/indecisa → vai pra `review` e o **coordenador decide** (`decide_document`; nunca auto-aprova).
   Todos os exigidos aprovados + tipo sanguíneo → `EXAM_RELEASED`.
3. **Prova** (aluno agenda → coordenador corrige): `schedule_exam` → `grade_exam(passed)`. Reprovou → `EXAM_FAILED`
   → reagenda (nova tentativa). Passou → `AWAITING_DOCUMENTATION_DISPATCH`.
4. **Pendências** (coordenador): `open_pendency(doc|fee)` → `PENDING`; `resolve_pendency` → sem pendência aberta
   volta a AWAITING_DOCUMENTATION_DISPATCH; `clear_documentation` → `AWAITING_DIPLOMA_ISSUANCE`.
5. **Diploma + formatura:** `issue_diploma` (coordenador) → `AWAITING_PICKUP`; `register_pickup(foto)` (aluno) →
   adiciona a role **`veteran`** (mantém `student`), marca VETERAN e **credita a comissão do coordenador**
   (`finance.credit_commission`, `Source.VETERAN`, valor do `.env`; idempotente).

## Interface (in-process — CONVENTION §3)
`create_from_enrollment` (chamada pelo release) · `get_for_user_external_id` · `to_dict` · `set_blood_type` ·
`upload_document` · `schedule_exam` · `grade_exam` · `open_pendency` · `resolve_pendency` · `list_pendencies` ·
`clear_documentation` · `issue_diploma` · `register_pickup`.

## API
- **`clients`** (role `student`): `GET /student/me`, `POST /student/blood-type`, `POST /student/documents/{tipo}`,
  `POST /student/exam/schedule`, `GET /student/pendencies`, `POST /student/diploma/pickup`.
- **`leadership`** (role `coordinator`, sempre **coordenador DO HUB do aluno**): `release` (com campos de
  plataforma), `POST /students/{ext}/documents/{doc}/decide` (sim/não do doc em `review`),
  `POST /students/{ext}/exam/grade`, `POST /students/{ext}/pendencies`, `POST /pendencies/{ext}/resolve`,
  `POST /students/{ext}/documentation/clear`, `POST /students/{ext}/diploma/issue`.

## Pendências
- Direção do dinheiro da pendência de **taxa** (cobrar aluno vs pagar instituição) + wiring real ao `fees`.
- Conjunto exato dos campos de `study_platform`.
- Versão PDF dos documentos (spec) — adiada.
