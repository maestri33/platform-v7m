# Handoff Report — Survey Explorer 1 (Architecture & Apps Audit)

**Agent**: Survey Explorer 1  
**Target Directory**: `c:\Users\maestri33\dev\v7m\backend-v7m\.agents\explorer_survey_1\`  
**Date**: 2026-08-23  
**Status**: Task Complete (Hard Handoff)

---

## 1. Observation

1. **Installed Applications (`core/settings.py:86-120`)**:
   - `django.contrib.admin`, `django.contrib.auth`, `django.contrib.contenttypes`, `django.contrib.sessions`, `django.contrib.messages`, `django.contrib.staticfiles`
   - `corsheaders`, `django_q`, `ninja_jwt`
   - `core.apps.CoreConfig`
   - `integrations.bank.asaas.apps.AsaasConfig`, `integrations.bank.infinitepay.apps.InfinitepayConfig`, `integrations.tools.cep.apps.CepConfig`, `integrations.tools.cpf.apps.CpfConfig`, `integrations.ai.apps.AiConfig`, `integrations.tools.biometric.apps.BiometricConfig`
   - `notify.apps.NotifyConfig`, `users.apps.UsersConfig`, `finance.apps.FinanceConfig`, `hub.apps.HubConfig`

2. **System Checks & Migrations Execution**:
   - `uv run python manage.py check` succeeded with exit code 0 (5 non-fatal configuration warnings for optional keys/paths).
   - `uv run python manage.py makemigrations --check --dry-run` failed with exit code 1, reporting:
     ```
     Migrations for 'finance':
       finance\migrations\0005_alter_commission_status.py
         ~ Alter field status on commission
     ```
   - `uv run pytest` executed successfully:
     ```
     ============================ 283 passed in 19.26s =============================
     ```

3. **Domain Models & Sub-packages**:
   - `users`: `users.auth` (`User`, `UserManager`, `OtpCode`, `OtpRateLimit`), `users.profiles` (`Profile`), `users.address` (`Address`), `users.documents` (`Document`, `RG`, `CNH`, `Certificate`, `Military`, `AddressProof`), `users.blocks` (`ValidationBlock`), `users.roles` (`UserRole`, `Candidate`, `Enrollment`, `EducationalData`, `Lead`, `Checkout`, `Promoter`, `Student`, `StudentDocument`, `StudentExam`, `StudentDiploma`, `StudentPendency`, `Material`, `MaterialAssignment`, `Submission`).
   - `hub`: `Hub` (links to `Address`, `User` coordinator, `brand`).
   - `finance`: `Commission` (direct, veteran, bonus), `PaymentRequest` (commission, fee, manual).
   - `notify`: Stateless proxy to `notify-server` via `notify/interface/send.py`.
   - `integrations.bank.asaas`: `Customer`, `PixKey`, `Payment`, `WebhookEvent`, `UrlVerifyNonce`.
   - `integrations.bank.infinitepay`: `Checkout`, `WebhookEvent`.
   - `integrations.tools.biometric`: `FaceBiometric`, `FaceVerification`.
   - `integrations.ai`: `AiCall`.

4. **Dead / Extraneous Code**:
   - `get_jwt.py` in root references `User.objects.get(cpf=...)` (which fails because `cpf` is in `Profile`) and outdated imports.
   - `api/portal.py` (mounted at `/portal/` in `core/urls.py:57`) implements a stubbed captive portal presence agent API with hardcoded `CAPTIVE_AGENT_KEY`.
   - `core/system_config.py:47-49` retains `EVOLUTION_SERVER_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE` keys despite Evolution being superseded by `notify-server`.

5. **API Layer Partitioning (`core/urls.py:51-56`)**:
   - `/api/v1/clients/` (Lead, Enrollment, Student, Veteran, Pricing, Blocks)
   - `/api/v1/collaborators/` (Candidate, Training, Promoter)
   - `/api/v1/leadership/` (Coordinator desk: Reviews, Students, Candidates, Promoters, Enrollments, Leads)
   - `/api/v1/staff/` (Superuser: Hubs, Materials, Finance, Users, Config, Notify, System, Health)
   - `/api/v1/tools/` (DMZ: Leads radar, Notifications send)
   - `/api/v1/health/` (Public `/healthz`)

---

## 2. Logic Chain

1. From **Observation 1**, every app in `INSTALLED_APPS` directly supports one of the core business facets: authentication/identity (`users`), polo operations (`hub`), commission accounting/payouts (`finance`), external messaging (`notify`), payment gateways (`asaas`, `infinitepay`), identity/address resolution (`cep`, `cpf`), computer vision/LLM (`ai`), and biometric verification (`biometric`). There are no unreferenced or unused third-party Django apps.
2. From **Observation 2**, the Django test suite is healthy (283 passing tests), but schema divergence exists in `finance` where model status choices were updated without running `makemigrations`.
3. From **Observation 3**, domain boundaries are clean. `users` holds identity and processes; `hub` holds physical locations; `finance` isolates financial ledgers; `integrations` encapsulates external vendor protocols; `core` provides horizontal primitives (`ExternalIdModel`, `PlatformSetting`, media, PDF, net).
4. From **Observation 4**, `get_jwt.py` and `api/portal.py` are leftover developer artifacts / speculative endpoints that should be cleanly pruned.
5. From **Observation 5**, the API structure strictly follows Django Ninja best practices with separate route files and centralized error handling in `api/base.py`.

---

## 3. Caveats

- Direct load testing on the InsightFace ArcFace CPU biometric model was not performed during this survey (it operates as a lazy-loaded CPU engine).
- Live external webhook endpoints (Asaas, InfinitePay) were audited based on code implementation and existing unit/integration mocks, not live external HTTP traffic.
- Full survey details are documented in `survey_report.md`.

---

## 4. Conclusion

The V7M Django backend is well-structured and follows a clean separation of concerns. To achieve production readiness and complete compliance with the refactoring goals:
1. Generate the pending migration for `finance` (`0005_alter_commission_status.py`).
2. Remove speculative/obsolete files (`get_jwt.py`, `api/portal.py`, legacy Evolution keys in `core/system_config.py`).
3. Refactor all API schemas to strict Pydantic v2 schemas with `ConfigDict(from_attributes=True)` and explicit `PatchIn` schemas for partial updates.
4. Ensure all paginated list queries consistently use `select_related` and `prefetch_related`.

---

## 5. Verification Method

To independently verify all findings:
1. `uv run python manage.py check` — Verifies core settings and system checks.
2. `uv run python manage.py makemigrations --check --dry-run` — Demonstrates the pending migration in `finance`.
3. `uv run pytest` — Executes the full test suite (283 tests passing).
4. Inspect `survey_report.md` in this directory for detailed breakdowns of all models, settings, and endpoints.
