# V7M Django Backend Architecture & Apps Survey Report

**Author**: Survey Explorer 1  
**Date**: 2026-08-23  
**Target Workspace**: `c:\Users\maestri33\dev\v7m\backend-v7m`  
**Status**: Comprehensive Survey Completed (Read-Only)

---

## 1. Executive Summary

This audit examined every app in `INSTALLED_APPS`, central configuration (`core/settings.py`, `.env`, `.env.ci`, `.env.docker`), the API routing hierarchy (`api/`), and all domain modules (`core`, `users`, `hub`, `finance`, `notify`, and `integrations.*`).

The backend implements an education platform (supletivo/EJA) combining passwordless authentication (OTP/JWT RS256), two core user funnels (**Student Funnel**: Lead → Enrollment → Student → Veteran; and **Collaborator Funnel**: Candidate → Promoter with Training overlay), physical hub management, a multi-tier commission/payout financial engine, and six external integration services (Asaas, InfinitePay, ViaCEP, CPFHub, Multi-Provider AI LLM/Vision/OCR/STT, and InsightFace Facial Biometrics).

---

## 2. Settings & Environment Architecture (`core/settings.py` & `.env`)

### 2.1 Configuration Design Principles
- **Single Source of Truth**: All dynamic and secret parameters are loaded from `.env` using `django-environ` with literal `os.environ` reading for values containing `$` (e.g. Asaas API keys starting with `$aact_` and InfinitePay tags).
- **Dynamic Override System (`core.system_config.SystemConfig`)**: Platform operational settings (pricing, commission rules, API integration keys, staff seed defaults) can be modified in database (`PlatformSetting`) while cleanly falling back to `settings.py` defaults.
- **Anti-Production Safety Gate (`core.environment.resolve_environment`)**: `APP_ENV` (`prod`, `staging`, `preview`, `test`) restricts synthetic testing. `TEST_MODE=1` requires `socket.gethostname()` to match an explicit entry in `TEST_MODE_ALLOWED_HOSTS`, preventing accidental mock execution in live production.

### 2.2 Detailed Configuration Justifications

| Configuration Variable | Default / Type | Purpose & Business Justification |
|---|---|---|
| `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS` | Security basics | Django core security controls. `DEBUG` defaults to `False`. |
| `APP_ENV`, `TEST_MODE_ALLOWED_HOSTS` | `prod` / host list | Environment isolation and safety lock against mock/test mode in production. |
| `DATABASE_URL`, `DB_CONN_MAX_AGE` | SQLite (dev) / PostgreSQL (prod) | Persistent connection pooling with `CONN_HEALTH_CHECKS=True` to minimize connection overhead during front-end wizard polling. |
| `JWT_PRIVATE_KEY_PATH`, `JWT_PUBLIC_KEY_PATH`, `NINJA_JWT` | RS256 PEM keys in `keys/` | Asymmetric RSA keypair for JWT token issuance and verification via `django-ninja-jwt`. |
| `OTP_TTL_S` (600s), `OTP_RATELIMIT_WINDOW_S` (60s), `OTP_RATELIMIT_HOURLY_MAX` (10/h) | OTP controls | WhatsApp OTP validation limits to balance user experience and cost/anti-abuse controls. |
| `ROLE_RULES` | JSON transition catalogue | Defines role state machine (`lead` -> `enrollment` -> `student` -> `veteran`; `candidate` -> `promoter` with `training` blocking overlay) in configuration rather than rigid schema choices. |
| `COMMISSION_DIRECT`, `COMMISSION_BONUS_FLAT`, `COMMISSION_COORDINATOR`, `COMMISSION_BONUS_THRESHOLD` | Reais (`Decimal`) | Financial parameters for promoter lead acquisition, weekly threshold bonuses, and coordinator graduation payout. |
| `ENROLLMENT_PRICE_PIX`, `ENROLLMENT_PRICE_CARD_CENTS`, `ENROLLMENT_PRICE_PROMOTER_*` | Reais (PIX) / Centavos (Card) | Standard student enrollment fees and promoter self-study enrollment fees across Asaas and InfinitePay. |
| `HUB_BRANDS`, `DEFAULT_HUB_BRAND` | List (`["wyden", "estacio", "standard"]`) | Valid institutional brand tags for physical polo locations. |
| `ASAAS_API_KEY`, `ASAAS_BASE_URL`, `ASAAS_WEBHOOK_SECRET` | Asaas integration | PIX payment gateway for student checkout charges, DICT validation, and outbound commission payouts. |
| `INFINITEPAY_HANDLE`, `INFINITEPAY_BASE_URL` | InfinitePay checkout | Credit card checkout link generation (`/links`) and payment re-check API. |
| `VIACEP_BASE_URL`, `VIACEP_TIMEOUT_SECONDS` | Public ViaCEP API | Brazilian postal code (CEP) address autocompletion. |
| `CPFHUB_API_KEY`, `CPFHUB_BASE_URL` | CPFHub API | Brazilian CPF validation and personal data resolution (full name, gender, birth date). |
| `IA_PROVIDERS`, `IA_FALLBACK_CHAIN`, `IA_PRICES` | OpenAI-compatible list | Multi-provider LLM chain with automatic failover (DeepSeek, Groq, OpenRouter, Gemini, MiniMax) and token usage cost tracking. |
| `GEMINI_API_KEY`, `GEMINI_STT_MODEL` | Google Generative AI | Speech-to-Text audio transcription for promoter training voice submissions. |
| `GOOGLE_VISION_API_KEY`, `GOOGLE_VISION_BASE_URL` | Google Cloud Vision | OCR extraction for identity documents (RG, CNH, proof of address). |
| `MINIMAX_API_KEY`, `MINIMAX_VISION_MODEL` | MiniMax Vision | Visual document classification and quality inspection. |
| `BIOMETRIC_ENABLED`, `BIOMETRIC_MODEL_ROOT`, `BIOMETRIC_MATCH_THRESHOLD` (0.35), `BIOMETRIC_REVIEW_THRESHOLD` (0.28) | InsightFace ArcFace | Local CPU facial feature vector extraction (512-dim) and cosine distance verification between document photo and selfie. |
| `NOTIFY_SERVER_URL`, `NOTIFY_API_KEY` | HTTP microservice | Asynchronous WhatsApp, Email, and TTS message delivery gateway. |
| `Q_CLUSTER` | Django-Q ORM broker | Background task execution (OCR, AI grading, biometric extraction, weekly commission closing) without requiring Redis. |

---

## 3. Detailed Audit of `INSTALLED_APPS` and Domain Modules

```
                                  ┌────────────────────────┐
                                  │      core.urls         │
                                  └───────────┬────────────┘
                                              │
         ┌──────────────────┬─────────────────┼─────────────────┬──────────────────┐
         │                  │                 │                 │                  │
┌────────▼─────────┐┌───────▼────────┐┌───────▼────────┐┌───────▼─────────┐┌───────▼────────┐
│  /api/v1/clients ││/collaborators  ││  /leadership   ││    /staff       ││    /tools      │
│  (Student Funnel)││(Promoter Funnel││(Hub Coordinator││(Platform Admin) ││ (Internal DMZ) │
└────────┬─────────┘└───────┬────────┘└───────┬────────┘└───────┬─────────┘└───────┬────────┘
         │                  │                 │                 │                  │
         └──────────────────┼─────────────────┴─────────────────┼──────────────────┘
                            │                                   │
                 ┌──────────▼───────────────────────────────────▼──────────┐
                 │                       users App                         │
                 │  - User & Profile (Identity & Contact)                  │
                 │  - Address & Document Aggregates (RG, CNH, Proofs)      │
                 │  - Roles: Lead, Enrollment, Student, Candidate, Promoter│
                 │  - Training: Material, Assignment, Submission           │
                 │  - ValidationBlock & Consent Contract                   │
                 └──────────┬───────────────────┬──────────────────────────┘
                            │                   │
         ┌──────────────────▼───┐            ┌──▼───────────────────┐
         │       hub App        │            │     finance App      │
         │ - Hub (Address, Brand│            │ - Commission Engine  │
         │   & Coordinator)     │            │ - PaymentRequest Out │
         └──────────────────────┘            └──┬───────────────────┘
                                                │
         ┌──────────────────────────────────────┴──────────────────────────────────┐
         │                           Integrations & Tools                          │
         │  - integrations.bank.asaas (PIX In/Out, DICT, Webhooks)                 │
         │  - integrations.bank.infinitepay (Credit Card Checkout Links)           │
         │  - integrations.tools.cep (ViaCEP) & cpf (CPFHub)                       │
         │  - integrations.tools.biometric (InsightFace 512-d CPU Match)           │
         │  - integrations.ai (Multi-LLM Fallback, Vision OCR, STT)                │
         │  - notify (WhatsApp & Email Messaging Gateway via notify-server)        │
         └─────────────────────────────────────────────────────────────────────────┘
```

### 3.1 `core`
- **Purpose**: Foundational models, middleware, security gates, file storage abstractions, and platform configuration.
- **Models**:
  - `ExternalIdModel` (abstract base): Supplies immutable UUID `external_id` for boundary API representation.
  - `ValidationCheck`: Audit log tracking integration health and test checks.
  - `PlatformSetting`: Dynamic database key-value store with encryption/masking for operational settings.
- **Modules**:
  - `environment.py`: Environment verification and anti-production safety enforcement.
  - `system_config.py`: Service resolving operational overrides with fallbacks.
  - `media.py` & `media_views.py`: Storage handler generating opaque random file tokens (`<prefix>/<token>.<ext>`) and private media access gate (`MEDIA_PRIVATE_PREFIXES` requiring JWT token or reviewer role).
  - `pdf.py`: PDF page rendering to JPEG via `pypdfium2` and `Pillow` for OCR/vision consumption.
  - `net.py`: Client IP resolver parsing `X-Forwarded-For` from rightmost trusted proxies (`TRUSTED_PROXY_COUNT`) and DMZ IP range validation (`require_internal_ip`).
  - `webhook_auth.py`: Constant-time header token verification (`hmac.compare_digest`).
  - `logging_middleware.py`: Request logging with UUID correlation `x-request-id`, timing, and PII masking.
  - `sentry.py`: Observability integration with automatic Git SHA tagging and LGPD PII sanitization.

### 3.2 `users`
- **Purpose**: Unified identity, profiles, addresses, documents, validation blocks, consent tracking, and all lifecycle role funnels.
- **Sub-packages & Models**:
  - `users.auth`: `User` (custom `AUTH_USER_MODEL` using `external_id` as `USERNAME_FIELD`, `token_version` for instant session revocation), `OtpCode` (SHA256 hashed code, rate-limited), `OtpRateLimit`.
  - `users.profiles`: `Profile` (1:1 with User; holds CPF, phone, email, full name, birth date, mother's name, marital status, education level, Pix key, WhatsApp profile image URL, and `selfie_needs_meeting` flag).
  - `users.address`: `Address` (standalone Brazilian postal address with zipcode, street, number, neighborhood, city, state, country).
  - `users.documents`: `Document` (1:1 aggregate root with User), `RG`, `CNH`, `Certificate` (birth/marriage/death), `Military` (reservista for males), `AddressProof` (with kinship relation support).
  - `users.blocks`: `ValidationBlock` (blocking validation error flag for client-side modal alerts requiring user action).
  - `users.consent`: `consent/contract.py` (versioned service agreement generation and SHA256 audit hash).
  - `users.roles`: `UserRole` (stores user active roles and historical assignments), `catalog.py` (transition validator).
  - `users.roles.lead`: `Lead` (captured student prospect attributed to a promoter `ref`, status: pending/paid/failed), `Checkout` (payment intent for Asaas PIX or InfinitePay credit card, short link token).
  - `users.roles.enrollment`: `Enrollment` (created upon lead payment; collects wizard steps: RG, Address, Education, Selfie, Awaiting Release; linked to Hub), `EducationalData` (prior schooling level, completed flag, last school).
  - `users.roles.student`: `Student` (active matriculated student; study platform credentials, blood type), `StudentDocument` (supporting docs evaluated by AI), `StudentExam` (scheduled exam, coordinator grading), `StudentDiploma` (issued diploma PDF and student pickup photo), `StudentPendency` (academic document or financial fee pendency).
  - `users.roles.candidate`: `Candidate` (onboarding collaborator; hub-bound, DICT-validated Pix key, document OCR, selfie, coordinator approval).
  - `users.roles.promoter`: `Promoter` (active promoter capturing leads via `?ref=<external_id>`, `pre_matriculado` scholarship tracking).
  - `users.roles.training`: `Material` (training module with rich content blocks, question, and expected answer), `MaterialAssignment` (promoter assignment acting as panel blocking overlay), `Submission` (promoter text or audio response graded 0-10 by AI).

### 3.3 `hub`
- **Purpose**: Physical polo / hub representation and management.
- **Models**:
  - `Hub`: Physical polo entity linking to `users.Address` (FK), institutional `brand` (validated against `settings.HUB_BRANDS`), `coordinator` (`users.User` FK), and `is_default` flag (fallback for unreferred leads/candidates).

### 3.4 `finance`
- **Purpose**: Financial commissions, bonus calculation, weekly closing aggregation, and outbound payout orchestration.
- **Models**:
  - `Commission`: Direct lead acquisition commission, veteran graduation commission, and weekly volume threshold bonus in Reais (`Decimal`).
  - `PaymentRequest`: Weekly aggregated payout ticket per payee or supplier fee ticket (`kind`: commission, fee, manual; `method`: pix_key, pix_qrcode, boleto; `status`: queued, awaiting_pix, submitted, awaiting_balance, paid, failed).
- **Tasks & Schedules**: Weekly Friday 18:00 commission closing cron, automated retry queue, Asaas payout dispatcher.

### 3.5 `notify`
- **Purpose**: Central messaging communication gateway.
- **Models**: Stateless (no database models; delegates message persistence and carrier dispatch to `notify-server`).
- **Interfaces**: `send()` (async Django-Q task or sync) and `send_adhoc()` for WhatsApp, Email, and TTS voice notes.

### 3.6 `integrations` Sub-Apps
- **`integrations.bank.asaas`**:
  - Models: `Customer`, `PixKey` (DICT lookup), `Payment` (inbound charge / outbound PIX / boleto), `WebhookEvent`, `UrlVerifyNonce`.
  - Capabilities: PIX QR code generation, charge polling, webhook signature verification, transfer 2FA validation.
- **`integrations.bank.infinitepay`**:
  - Models: `Checkout`, `WebhookEvent`.
  - Capabilities: Hosted credit card checkout link generation (`/links`), order NSU correlation, webhook verification, payment recheck.
- **`integrations.tools.cep`**:
  - Module: `scripts/viacep.py` for asynchronous zipcode lookup with error normalisation.
- **`integrations.tools.cpf`**:
  - Module: `scripts/cpfhub.py` for CPF lookup, retry backoff, and identity parsing (name, gender, birth date).
- **`integrations.tools.biometric`**:
  - Models: `FaceBiometric` (512-dim embedding templates), `FaceVerification` (audit comparison logs).
  - Module: InsightFace ArcFace CPU engine, cosine similarity scoring, liveness verification.
- **`integrations.ai`**:
  - Models: `AiCall` (telemetry, tokens, caller, latency, cost).
  - Module: Multi-provider LLM chain (`providers.py`, `client.py`), Vision document inspector (`minimax.py`), Google Vision OCR (`vision_ocr.py`), Gemini STT (`gemini.py`), pricing calculator (`pricing.py`).

---

## 4. API Layer Architecture (`api/`)

The API is partitioned into 5 role-based OpenAPI namespaces under `/api/v1/`:

1. **`clients` (`/api/v1/clients/`)**:
   - Routers: `pricing`, `auth` (check, login, refresh), `lead` (identity confirmation, email, checkout), `enrollment` (wizard steps: RG, address, education, selfie, status), `student` (platform access, documents, exam scheduling, diploma, veteran `/me`), `blocks` (validation blocks).
2. **`collaborators` (`/api/v1/collaborators/`)**:
   - Routers: `auth`, `candidate` (profile, address, document upload, Pix validation, selfie), `training` (materials list, audio/text submission), `promoter` (dashboard stats, captured leads, referral links, auto-enrollment).
3. **`leadership` (`/api/v1/leadership/`)**:
   - Routers: `auth`, `leads`, `enrollments` (student releases, fee scheduling), `reviews` (central review desk: RG, selfie, candidate docs, student docs, locked training), `students` (paginated student list, exam grading, document decisions, pendencies, diploma issuance/pickup), `candidates` (candidate review & approval/rejection), `promoters` (hub promoter overview).
4. **`staff` (`/api/v1/staff/`)**:
   - Routers: `auth`, `hubs` (hub CRUD, coordinator assignment), `materials` (LMS material authoring & broadcast), `finance` (commission close execution, manual payment requests, Asaas balance), `users` (dossiers, session revocation), `coordinators`, `config` (dynamic platform settings & integration keys), `notify` (ad-hoc messages, templates), `documents`, `network`, `training`, `system`, `health` (deep diagnostics).
5. **`tools` (`/api/v1/tools/`)**:
   - Internal DMZ routes authenticated via `BOT_SERVICE_SECRET` and internal IP allowlist (`/leads` integration radar, `/notifications/send`).
6. **`health` (`/api/v1/health/`)**:
   - Public unauthenticated `/healthz` endpoint (database ping, pending migrations check, build git SHA).

---

## 5. Architectural Evaluation & Gap Analysis

### 5.1 Adherence to Clean Architecture (Router -> Service -> Model)
- **Strengths**:
  - Clear domain layer isolation: Routers in `api/<group>/routers/` cleanly delegate business workflows to domain services in `users/roles/<role>/service.py`, `finance/interface/`, and `hub/interface/`.
  - Unified exception handling: `DomainError`, `AuthenticationError`, `ValidationError`, and `HttpError` are intercepted in `api/base.py:build_group`, ensuring consistent JSON error responses `{detail, code, ...}` across all status codes (400, 401, 403, 404, 409, 422, 500).
  - Strong encapsulation of external integrations inside `integrations/`, preventing raw third-party SDK calls from leaking into API routers.

### 5.2 Identified Structural Gaps & Inconsistencies

1. **Pending Migration (`finance`)**:
   - Running `uv run python manage.py makemigrations --check --dry-run` detects an ungenerated migration: `finance\migrations\0005_alter_commission_status.py` due to updated `Commission.status` choices or fields in `finance/models.py`.
2. **Obsolete / Dead Files**:
   - `get_jwt.py` in the workspace root contains broken, non-functional code (`User.objects.get(cpf=...)` and deprecated import syntax).
   - `api/portal.py` (Captive Portal Agent Bridge) defines unauthenticated mock Wi-Fi captive portal endpoints (`/agent/grants`, `/session/start`) mounted at `/portal/` in `core/urls.py` with hardcoded fallback keys (`CAPTIVE_AGENT_KEY`). This is speculative/extraneous to V7M educational platform domain.
3. **Legacy Configuration in `core/system_config.py`**:
   - `core/system_config.py` retains `EVOLUTION_SERVER_URL`, `EVOLUTION_API_KEY`, and `EVOLUTION_INSTANCE` in `INTEGRATION_KEYS` even though direct Evolution API integration has been removed from this repository and superseded by the standalone `notify-server`.
4. **Pydantic Schema Serialization & Typing**:
   - While all schemas are Pydantic v2 / Django Ninja schemas, many service functions manually assemble nested dictionaries before returning them to routers instead of leveraging `ConfigDict(from_attributes=True)` or `ModelSchema` on ORM instances.
   - Input schemas are mostly well-defined, but partial update endpoints (patching) should be explicitly typed with `PatchIn` schemas across all domain routers.
5. **N+1 Query Prevention**:
   - List endpoints in `api/leadership/routers/students.py`, `api/leadership/routers/candidates.py`, and `api/staff/routers/` perform multi-relation access and should strictly ensure `select_related('user__profile', 'hub')` and `prefetch_related('documents', 'exams', 'pendencies')` across all query paths.
   - `core/media.py:owner_external_id_for_path` executes sequential table scans across multiple unindexed character fields.

---

## 6. Conclusion & Recommendations

The V7M backend architecture is fundamentally sound, modular, and well-separated into cohesive domains. To achieve complete compliance with the requirements:
1. Generate the pending migration for `finance`.
2. Remove dead/speculative code (`get_jwt.py`, `api/portal.py`, legacy Evolution references in `system_config.py`).
3. Standardize all Ninja schemas to strict Pydantic v2 conventions (`In`, `PatchIn`, `Out` with `ConfigDict(from_attributes=True)`).
4. Verify query plans on all paginated listing endpoints to eliminate any hidden N+1 queries.
