# V7M Backend — Comprehensive Codebase Audit & Spec Survey Report
**Auditor**: Survey Spec Miner 2  
**Date**: 2026-08-23  
**Scope**: Codebase audit for dead code, speculative abstractions, unused models/fields, redundant settings/middleware, and single-use boilerplate adhering to Requirement R2 ("Simplicity First").  
**Baseline Verification**: `pytest` (283 passed), `manage.py check` (0 errors, 5 expected optional config warnings).

---

## 1. Executive Summary

A comprehensive, deep scan was performed across the entire V7M Django backend (`core/`, `users/`, `hub/`, `finance/`, `notify/`, `integrations/`, `api/`, and root scripts). The project exhibits high architectural discipline around its central invariants (money is always Decimal/centavos, idempotency via external references, JWT RS256 with token versioning, layer separation via service interfaces, and async task orchestration via Django-Q).

However, in accordance with **Requirement R2 ("Simplicity First")**, several pockets of dead code, obsolete configuration leftovers, orphaned scripts, speculative endpoints, and candidate refactorings were uncovered.

### Key Finding Totals
- **Safe to Delete Immediately**: 1 orphaned root script (`get_jwt.py`), 1 mock captive portal API module (`api/portal.py`), 9 obsolete settings in `core/settings.py`, 6 unreferenced/dead helper functions across services/schemas, and 1 empty models module (`notify/models.py`).
- **Refactor / Simplify**: Speculative AI price table in `integrations/ai/pricing.py`, redundant single-use wrappers in `users/roles/lead/checkout_links.py`, multiple single-use CLI test commands, and consolidating duplicate schema definitions across `api/schemas/` and router schemas.
- **Essential & Critical**: Centralized `Profile` and passwordless `User`, asymmetric JWT RS256 auth, 3-tier financial ledger (`Commission`, `PaymentRequest`, Asaas payout worker), multi-provider bank integration (`asaas` and `infinitepay` with webhook HMAC/signature gates), local biometric embedding gallery (`insightface` with CPU fallback), and unified staff observability (`integrations/status.py` + `ValidationCheck`).

---

## 2. Features Discovered & Probe Matrix

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| 1 | Core / Storage | Private Media Access Gate | Serves protected KYC documents and selfies only to owner JWT or staff reviewer | `GET /media/<path>`, Bearer JWT | Binary stream (JPEG/PNG/PDF) | 401 Unauthorized / 403 Forbidden / 404 Not Found | `core/media_views.py` |
| 2 | Core / Media | Tokenized Media Storage | Saves uploaded media under opaque, non-enumerable SHA-256 tokens | File bytes, prefix | `relative_path` (`<prefix>/<token>.<ext>`) | ValueError on invalid extension | `core/media.py` |
| 3 | Core / System | Dynamic Platform Settings | Dynamic key-value overrides backed by DB table `PlatformSetting` with typed defaults | Setting key, value | Overridden or default value | Logs warning on DB fallback | `core/system_config.py` |
| 4 | Core / Net | IP Whitelist Gate (DMZ) | Restricts internal tools endpoints to trusted proxy and loopback/private subnets | HTTP request headers (`X-Forwarded-For`, `REMOTE_ADDR`) | Boolean / IP string | 403 Forbidden | `core/net.py` |
| 5 | Core / Hooks | In-Process Event Dispatcher | Decoupled event emitter for webhooks and financial status updates | `event_name`, `**kwargs` | Dispatched handler executions | Dispatches safely, logs handler exceptions | `core/hooks.py` |
| 6 | Auth & Identity | Passwordless Custom User | Custom User model with UUID `USERNAME_FIELD` and `token_version` tracking | UUID `external_id` | User instance | Model validation error | `users/auth/models.py` |
| 7 | Auth & Identity | OTP Delivery & Validation | Rate-limited OTP generator sending numeric codes via WhatsApp / Notify | Phone, purpose, OTP code | JWT tokens or verification success | 429 RATE_LIMITED / 401 INVALID_OTP | `users/auth/otp/` |
| 8 | Auth & Identity | Asymmetric JWT RS256 Service | RS256 access and refresh token generator with token version revocation | `external_id`, `roles` | `access_token`, `refresh_token` | TokenError / Unauthorized | `users/auth/jwt/` |
| 9 | KYC & Profile | Centralized User Profile | Unified identity containing CPF, phone, WhatsApp avatar, filiação, address FK | User FK, personal info | Profile instance | Unique constraints on CPF/phone | `users/profiles/` |
| 10 | KYC & Profile | Address & ViaCEP Lookup | Address model linked to ViaCEP async integration | 8-digit CEP | Address entity dictionary | 502 CEP_SERVICE_DOWN / 422 CEP_NOT_FOUND | `users/address/` |
| 11 | KYC & Profile | Document Upload & Extraction | Multi-slot document management (RG, CNH, Certidão, Militar, Comprovante) | Multi-part image/PDF file, slot | Upload Ack + OCR analysis | 422 SLOT_INVALID / 422 FILE_TOO_LARGE | `users/documents/` |
| 12 | KYC & Profile | Asynchronous Validation Blocks | Interactive modal blocks halting wizard until candidate resolves issue | `source_type`, `action_route`, `title` | Active blocks list | Block.DoesNotExist | `users/blocks/` |
| 13 | Funnel / Lead | Lead Checkout Creation | Self-study or promoter-referred lead generating Asaas Pix or InfinitePay Card | CPF, phone, email, payment method | Checkout link, Pix QR code, short link | 409 CPF_CONFLICT / 422 VALIDATION_ERROR | `users/roles/lead/` |
| 14 | Funnel / Lead | Short Link Redirect & Receipt | Tokenized short URLs redirecting to payment gateway or paid receipt | Short token | 302 Redirect | 404 Link Not Found / 503 Provider Down | `users/roles/lead/checkout_links.py` |
| 15 | Funnel / Enrollment | Student Enrollment Wizard | Multi-step wizard: RG → Address → Education → Selfie → Review | Section data, uploads | Wizard status & section payload | 409 WRONG_STATUS / 422 INVALID_FIELD | `users/roles/enrollment/` |
| 16 | Funnel / Candidate | Promoter Candidate Onboarding | Onboarding funnel for prospective promoters with KYC and Pix verification | Profile, documents, Pix key, training | Candidate status | 409 WRONG_STATUS / 422 PIX_INVALID | `users/roles/candidate/` |
| 17 | Funnel / Promoter | Promoter Dashboard & Referral Links | Ref link generation, lead conversion tracking, and weekly commission summary | Promoter User | Summary stats, leads list, lifetime metrics | 403 NOT_A_PROMOTER | `users/roles/promoter/` |
| 18 | Funnel / Student | Active Student Platform & Exams | Study credentials, blood type, exam scheduling, pendency resolution, diploma | Student User | Platform status, exam dates, diploma pickup | 409 OPEN_PENDENCIES / 404 NOT_FOUND | `users/roles/student/` |
| 19 | LMS / Training | Training Material & Video LMS | Module assignments with video/rich text, mandatory blocking, and AI grading | Material ID, text answer or audio file | Submission grade & justification | 422 MATERIAL_INACTIVE / 409 ALREADY_GRADING | `users/roles/training/` |
| 20 | LMS / Training | Audio STT Transcription | Speech-to-text transcription of student audio answers using Gemini / MiniMax | Audio file bytes | Plain text transcription | Logs fallback on provider failure | `users/roles/training/tasks.py` |
| 21 | Hub & Hierarchy | Multi-Hub Tenancy & Brands | Hub branches with custom brand configs, unique default hub, and coordinator FK | Hub slug, brand code, address | Hub instance | IntegrityError on multiple default hubs | `hub/models.py` |
| 22 | Finance | Append-Only Commission Ledger | Immutable ledger recording direct, bonus, and coordinator commissions | Source type, source external ID, amount | Commission record | Database UniqueConstraint violation | `finance/models.py` |
| 23 | Finance | Idempotent Weekly Closing | Friday 18:00 SP closing batch aggregating unpaid commissions into payouts | Reference date | Summary of generated payouts | Idempotent no-op if already closed | `finance/interface/commissions.py` |
| 24 | Finance | Payout Worker & Asaas Reconcile | Pessimistic-locked queue processor submitting and reconciling Pix/Boleto | PaymentRequest queue | Submissions, paid/failed counts | Handles `AWAITING_BALANCE` / backoff | `finance/interface/payout.py` |
| 25 | Finance | Expense Fee Payment (QR Code) | Institution fee payout queued via Pix QR Code with due date scheduling | QR Code payload, amount | PaymentRequest (kind=fee) | 422 QR_INVALID / 409 FEE_ALREADY_PAID | `finance/interface/fees.py` |
| 26 | Finance | Ad-hoc Manual Payment | Staff-initiated Pix or Boleto payments to arbitrary external suppliers | Amount, Pix key / Boleto line, receipt | PaymentRequest (kind=manual) | ManualPaymentError / 422 | `finance/interface/manual.py` |
| 27 | Notify | Remote Notify-Server Client | Asynchronous dispatch of WhatsApp, Email, and TTS notifications | Message, template, phone, email, ctx | Remote notification UUID | Logs warning and queues task fallback | `notify/interface/` & `notify/sdk/` |
| 28 | Integrations / Bank | Asaas Pix Inbound & Outbound | Customer sync, QR code charge generation, DICT validation, and Webhook | Charge payload / Pix key | Asaas API response / payment record | AsaasError / 400 Webhook Signature Mismatch | `integrations/bank/asaas/` |
| 29 | Integrations / Bank | InfinitePay Card Checkout | Hosted checkout creation and NSU-verified webhook reconciliation | Amount in cents, customer metadata | Checkout URL & slug | 400 Invalid NSU / 502 Gateway Error | `integrations/bank/infinitepay/` |
| 30 | Integrations / Biometric | Local Facial Biometrics & Match | InsightFace CPU embeddings (512-d) and cosine similarity comparison | Document photo & Selfie photo | Match score, verification record | BiometricError / Review required | `integrations/tools/biometric/` |
| 31 | Integrations / Tools | IBGE Official Municipalities | Local JSON cache of 5,570 Brazilian municipalities with auto-complete | Query prefix | Matched city & state list | Returns empty list if query < 2 chars | `integrations/tools/ibge/` |
| 32 | Integrations / Tools | CPF Identity Validation | CPFHub integration with 3-try exponential backoff and transient retry | 11-digit CPF | CpfIdentity dataclass | CpfHubError / 502 Service Down | `integrations/tools/cpf/` |
| 33 | Observability | Unified Integration Health Board | Read-only aggregation of env keys and latest `ValidationCheck` ledger | Integration name | Health status dict & ledger records | Structural error dict on live test fail | `integrations/status.py` |
| 34 | API Group | Clients API (`/api/v1/clients/`) | Public student/lead endpoints for pricing, checkout, wizard, and student /me | Client credentials, wizard payloads | Standard JSON envelope `{detail, code}` | DomainError / 409 WRONG_STATUS | `api/clients/` |
| 35 | API Group | Collaborators API (`/api/v1/collaborators/`) | Promoter candidate onboarding, LMS training, and dashboard | Collaborator JWT | Candidate & Promoter view models | 403 FORBIDDEN_ROLE | `api/collaborators/` |
| 36 | API Group | Leadership API (`/api/v1/leadership/`) | Hub coordinator reviews, document approvals, fee payouts, and diploma pickup | Coordinator JWT (Hub scoped) | Paginated reviews & student lists | 403 NOT_HUB_COORDINATOR | `api/leadership/` |
| 37 | API Group | Staff API (`/api/v1/staff/`) | Superuser administration: system setup, finance audit, LMS, hubs, users | Staff JWT (is_superuser=True) | Administrative management schemas | 403 STAFF_ONLY | `api/staff/` |
| 38 | API Group | Tools API (`/api/v1/tools/`) | Internal microservice bridge: Lead radar and notification dispatch | `X-Service-Secret` header + DMZ IP | Leads array / Notification dispatch ACK | 401 UNAUTHORIZED / 403 FORBIDDEN_IP | `api/tools/` |

---

## 3. Classification of Findings

### 3.1 Safe to Delete Immediately (Dead Code / Orphaned Code)

1. **`get_jwt.py` (Root Directory)**:
   - **Path**: `c:\Users\maestri33\dev\v7m\backend-v7m\get_jwt.py`
   - **Lines**: 1–18
   - **Observation**: Orphaned developer script left in root. Contains broken imports (`from users.auth.jwt import jwt_service` - module does not exist, it's `service.py`), invalid model query (`User.objects.get(cpf=...)` - `User` has no `cpf` field; `cpf` is on `Profile`).
   - **Impact**: Zero runtime dependency. Removing cleans the root directory.

2. **`api/portal.py` (Captive Portal Bridge)**:
   - **Path**: `c:\Users\maestri33\dev\v7m\backend-v7m\api\portal.py` & referenced in `core/urls.py:38, 57`
   - **Lines**: 1–59
   - **Observation**: Contains dummy endpoints (`/agent/grants`, `/agent/grants/ack`, `/agent/ping`, `/session/start`, `/session/stop`) returning hardcoded stub dictionaries for an unrelated captive WiFi portal project. The internal auth check `_agent_authorized` is never called on any route. No tests exist for it.
   - **Impact**: Safe to delete `api/portal.py` and unmount `path("portal/", portal_api.urls)` from `core/urls.py`.

3. **`notify/models.py` (Empty Legacy Module)**:
   - **Path**: `c:\Users\maestri33\dev\v7m\backend-v7m\notify\models.py`
   - **Lines**: 1–2
   - **Observation**: Contains only a comment `"Sem models: auditoria, templates e entrega pertencem ao notify-server."` following migration `0006_remove_local_notify`.
   - **Impact**: Harmless, but model-less apps in Django do not require a models file or can maintain it as empty.

4. **Obsolete / Unused Settings in `core/settings.py`**:
   - **`JWT_ALGORITHM`**, **`JWT_ACCESS_EXPIRE_MINUTES`**, **`JWT_REFRESH_EXPIRE_MINUTES`**, **`JWT_ISSUER`**, **`JWT_AUDIENCE`** (`core/settings.py:530-536`): Replaced by `NINJA_JWT` configuration dictionary (`core/settings.py:538-552`). These five standalone variables are never read anywhere in the codebase.
   - **`TEST_MODE_ASAAS_SANDBOX_URL`** (`core/settings.py:75`): Defined in settings but never referenced in `test_adapters.py` or Asaas client.
   - **`GOOGLE_VISION_SERVICE_ACCOUNT_JSON`** (`core/settings.py:440`): Google Vision OCR uses direct API key authentication (`GOOGLE_VISION_API_KEY`); this setting is unused.
   - **`SENTRY_ENVIRONMENT`** (`core/settings.py:657`): Sentry setup in `core/sentry.py` reads `settings.APP_ENV`, leaving `SENTRY_ENVIRONMENT` unreferenced.
   - **`SENTRY_ENABLED`** (`core/settings.py:662`): Sentry initializes conditionally based on `bool(settings.SENTRY_DSN)`.

5. **Unreferenced / Dead Utility Functions**:
   - `integrations/bank/asaas/charge.py: refund_charge` (lines 174–188): Defined but never called by any service, router, or task.
   - `integrations/bank/infinitepay/checkout.py: get_checkout, list_checkouts` (lines 115–125): Defined in client library but unreferenced.
   - `users/documents/service.py: delete_photo` (lines 339–344): Storage deletion helper unreferenced by any API endpoint.
   - `users/roles/lead/config.py: get_card_installments` (lines 53–59): Redundant calculation method unreferenced outside its file.
   - `users/roles/lead/service.py: get_lead` (lines 829–834): Unused wrapper around `Lead.objects.filter(external_id=...)`.
   - `api/leadership/schemas.py: FeeFactsOut` (lines 164–172): Schema class never used as a response or request type in any router.

---

### 3.2 Refactor / Simplify (Speculative / Over-Engineered Abstractions)

1. **Speculative AI Token Price Engine (`integrations/ai/pricing.py`)**:
   - **Observation**: `pricing.py` parses an environment string `IA_PRICES="provider:model:in:out"` to calculate fractional token costs for `AiCall.cost`. However, `IA_PRICES` is empty in production, and `AiCall.cost` is null for all calls.
   - **Recommendation**: Simplify or inline the calculation into `integrations/ai/service.py` to remove the dedicated parser until pricing tables are standardized.

2. **Single-Use Helper Scripts in Management Commands**:
   - **Observation**: Several single-use management commands exist for ad-hoc manual testing (`integrations/ai/management/commands/ai_ping.py`, `ai_providers.py`, `integrations/tools/cpf/management/commands/cpfhub_lookup.py`, `integrations/tools/cep/management/commands/viacep_lookup.py`, `users/management/commands/otp_reset_ratelimit.py`).
   - **Recommendation**: Retain only essential operational commands (`commission_close`, `finance_schedules`, `seed_defaults`, `staff_digest`, `selfie_schedules`, `payment_reminder`). Move one-off testing scripts to pytest test cases or consolidate them under `staff/routers/system.py` test actions.

3. **In-Memory Notification Template Fallback in `api/staff/routers/notify.py`**:
   - **Observation**: `notify.py` maintains hardcoded fallback dictionaries (`DEFAULT_EVENTS_CATALOG` and `DEFAULT_TEMPLATES`, lines 18–82) in Python memory if the remote `notify-server` is unreachable.
   - **Recommendation**: Keep the fallback structure lightweight, but ensure it delegates cleanly to `notify.interface.events` instead of maintaining duplicated string templates in the API router layer.

4. **Schema Duplication Across Groups**:
   - **Observation**: Minor duplicate schema shapes exist between `api/clients/schemas.py`, `api/collaborators/schemas.py`, and `api/leadership/schemas.py` (e.g. `AddressProofSectionOut`, `EducationIn`, `SelfieOut`).
   - **Recommendation**: Centralize reusable schemas into `api/schemas/` to eliminate cross-group redundancy and ensure strict Pydantic v2 consistency.

---

### 3.3 Essential (Must Keep — Core Domain & Security Foundations)

1. **Passwordless User & Profile Architecture (`users/auth/`, `users/profiles/`)**:
   - Custom `User` model using `external_id` (UUIDv4) as `USERNAME_FIELD`. Contact, personal details, and KYC metadata are properly centralized in `Profile`.

2. **Asymmetric JWT RS256 Authentication (`users/auth/jwt/`, `api/auth.py`)**:
   - Stateless token verification with private/public key pairs and immediate revocation on role elevation via `token_version`.

3. **3-Tier Financial Ledger & Idempotent Weekly Closing (`finance/`)**:
   - Immutable `Commission` entries, deterministic `external_reference` payout generation, and pessimistic-locked worker reconciling Asaas Pix/Boleto batches.

4. **Multi-Step Role Funnels (`users/roles/`)**:
   - State-machine driven wizards for `Lead` → `Enrollment` → `Student` and `Candidate` → `Promoter` with automated transition hooks and verification blocks.

5. **Multi-Gateway Payment Integration (`integrations/bank/`)**:
   - Asaas Pix/Boleto (inbound charges and outbound payouts/fees) and InfinitePay hosted checkout with cryptographic webhook signature validation.

6. **Local Biometric Gallery & Liveness Gate (`integrations/tools/biometric/`)**:
   - InsightFace facial embeddings stored per user for persistent multi-factor validation against documents and selfies.

7. **Staff Observability & Dynamic Configuration (`integrations/status.py`, `core/system_config.py`)**:
   - Centralized integration monitoring, `ValidationCheck` ledger, and database-backed dynamic parameter tuning.

---

## 4. Edge Cases & Robustness Observations

| # | Feature / Area | Input / Scenario | Observed Behavior |
|---|---|---|---|
| 1 | Financial Payouts | Asaas returns `INSUFFICIENT_BALANCE` | Does not fail terminal; switches status to `AWAITING_BALANCE`, triggers `fee.problem` hook, and retries with exponential backoff without losing money. |
| 2 | Expense Fees | Pix QR code with past due date | Automatically switches from scheduled to immediate payment execution without crashing or scheduling into the past. |
| 3 | Media Serving | User attempts to access another user's KYC document | `media_serve` validates requester JWT `external_id` against document owner; returns 403 Forbidden if not owner or coordinator/staff. |
| 4 | Lead Checkout | Rapid double-click on checkout creation | `find_or_create` pattern with database `UniqueConstraint` ensures only one `Checkout` record is created; duplicate request receives existing record. |
| 5 | Address Proof | Document uploaded by relative with different surname | AI classifies as `needs_kinship=True`; halts wizard with `KinshipIn` requirement until student provides relation justification for coordinator review. |
| 6 | Training LMS | Submitting answer to deactivated material | Rejected immediately with 422 `MATERIAL_INACTIVE` error code before audio transcription or AI grading is queued. |
| 7 | Tools API | Request from external IP address | Rejected at middleware / view boundary with 403 `FORBIDDEN_IP` even if valid `X-Service-Secret` header is provided. |
| 8 | JWT Token Refresh | Refresh token presented after role change | `token_version` in refresh token does not match user's incremented `token_version`; rejected with 401 `SESSION_EXPIRED`. |

---

## 5. Conclusion & Actionable Next Steps

The codebase is robust, well-architected, and fully functional (100% test pass rate). To achieve maximum compliance with **Requirement R2 ("Simplicity First")**:
1. Remove `get_jwt.py` and `api/portal.py` (and unmount from `core/urls.py`).
2. Clean up the 9 unused settings in `core/settings.py`.
3. Prune the 6 unreferenced helper functions across `charge.py`, `checkout.py`, `documents/service.py`, `lead/service.py`, `lead/config.py`, and `leadership/schemas.py`.
4. Consolidate overlapping Pydantic schemas in `api/schemas/`.
