# Plan: Cleanup of Obsolete Settings in `core/settings.py` (Milestone 1 — M1.2)

## Executive Summary
This plan details the surgical cleanup of 9 obsolete, redundant, or unreferenced settings in `core/settings.py`. Every item was audited against the entire codebase, confirming 0 references via direct imports, `getattr(settings, ...)`, or `settings.<NAME>`. All active production settings (Ninja JWT, Asaas, InfinitePay, Database, CORS, Celery/Q, Static/Media, Structlog, Biometrics, AI) remain 100% operational with zero regressions.

---

## 1. Inventory & Codebase Audit of the 9 Obsolete Settings

| # | Setting in `core/settings.py` | Original Line(s) | Origin / Reason for Removal | Codebase Audit Results |
|---|---|---|---|---|
| 1 | `TEST_MODE_ASAAS_SANDBOX_URL` | 75-77 | Dead sandbox configuration. Asaas integration (`integrations.bank.asaas.client`) reads `settings.ASAAS_BASE_URL`, configured via `ASAAS_BASE_URL` in `.env`. | **0 references** across the entire codebase. |
| 2 | `GOOGLE_VISION_SERVICE_ACCOUNT_JSON` | 378-380 | Speculative auth config. Google Vision client (`integrations.ai.vision_ocr`) only implements direct API key authentication (`GOOGLE_VISION_API_KEY`, `GOOGLE_VISION_BASE_URL`). Service account JSON auth is not implemented. | **0 references** across the entire codebase. |
| 3 | `JWT_ALGORITHM` | 470 | Legacy PyJWT variable. Django Ninja JWT reads `NINJA_JWT["ALGORITHM"]`. | **0 references** outside `settings.py` line 485. Inlined into `NINJA_JWT`. |
| 4 | `JWT_ACCESS_EXPIRE_MINUTES` | 471 | Legacy PyJWT variable. Django Ninja JWT reads `NINJA_JWT["ACCESS_TOKEN_LIFETIME"]`. | **0 references** outside `settings.py` line 488. Inlined into `NINJA_JWT`. |
| 5 | `JWT_REFRESH_EXPIRE_MINUTES` | 472 | Legacy PyJWT variable. Django Ninja JWT reads `NINJA_JWT["REFRESH_TOKEN_LIFETIME"]`. | **0 references** outside `settings.py` line 489. Inlined into `NINJA_JWT`. |
| 6 | `JWT_ISSUER` | 473 | Legacy PyJWT variable. Django Ninja JWT reads `NINJA_JWT["ISSUER"]`. | **0 references** outside `settings.py` line 490. Inlined into `NINJA_JWT`. |
| 7 | `JWT_AUDIENCE` | 474 | Legacy PyJWT variable. Django Ninja JWT reads `NINJA_JWT["AUDIENCE"]`. | **0 references** outside `settings.py` line 491. Inlined into `NINJA_JWT`. |
| 8 | `SENTRY_ENVIRONMENT` | 640 | Sentry setup variable. `core.sentry.init_sentry` accepts `environment` parameter dynamically. | **0 references** outside `settings.py` line 657. Inlined into `init_sentry(...)` call. |
| 9 | `SENTRY_ENABLED` | 655 | Unused assignment. `init_sentry()` initializes the SDK for side effects; its boolean return value is never checked or imported. | **0 references** across the entire codebase. |

---

## 2. Active Settings Retained & Protected
The following active configurations were verified and must remain intact:
1. **Core / Security**: `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `AUTH_USER_MODEL`, `MIDDLEWARE`, `TEMPLATES`, `WSGI_APPLICATION`, `DEFAULT_AUTO_FIELD`.
2. **Environment Traps**: `TEST_MODE_ALLOWED_HOSTS`, `_legacy_test_mode`, `_environment`, `APP_ENV`, `TEST_MODE`, `TEST_MODE_OTP_CODE`, `TEST_DATA_TTL_HOURS`, `TEST_COLLABORATOR_PHONE`, `TEST_COLLABORATOR_CPF`, `TEST_COLLABORATOR_EMAIL`, `TEST_EXTERNAL_ADAPTERS`, `TEST_KYC_OUTCOME`.
3. **CORS Headers**: `CORS_ALLOW_ALL_ORIGINS`, `CORS_ALLOWED_ORIGINS`.
4. **Database**: `DATABASES` (`DATABASE_URL`, `CONN_MAX_AGE`, `CONN_HEALTH_CHECKS`).
5. **Static / Media**: `STATIC_URL`, `STATIC_ROOT`, `MEDIA_URL`, `MEDIA_ROOT`, `MAX_UPLOAD_MB`, `MEDIA_PRIVATE_PREFIXES`.
6. **Payment Gateways**:
   - Asaas: `ASAAS_API_KEY`, `ASAAS_BASE_URL`, `ASAAS_WEBHOOK_SECRET`, `EXTERNAL_URL`, `LANDING_BASE_URL`, `FRONTEND_URL`, `ENROLLMENT_RESUME_PATH`, `INSTITUTION_LOGIN_URL`, `ASAAS_CHARGE_DUE_DAYS`, `ASAAS_WEBHOOK_NAME`, `URL_VERIFY_NONCE_TTL`.
   - InfinitePay: `INFINITEPAY_HANDLE`, `INFINITEPAY_BASE_URL`, `INFINITEPAY_HTTP_TIMEOUT`, `INFINITEPAY_REDIRECT_URL`.
7. **External Tools**: `VIACEP_BASE_URL`, `VIACEP_TIMEOUT_SECONDS`, `CPFHUB_API_KEY`, `CPFHUB_BASE_URL`, `CPFHUB_TIMEOUT`, `BIOMETRIC_ENABLED`, `BIOMETRIC_MODEL_NAME`, `BIOMETRIC_MODEL_ROOT`, `BIOMETRIC_MATCH_THRESHOLD`, `BIOMETRIC_REVIEW_THRESHOLD`, `BIOMETRIC_LIVENESS_PROVIDER`.
8. **AI & Vision OCR**: `IA_PROVIDERS`, `IA_FALLBACK_CHAIN`, `IA_DEFAULT_TEMPERATURE`, `IA_MAX_TOKENS`, `IA_TIMEOUT`, `IA_OMNIROUTE_VISION_MODEL`, `IA_PRICES`, `GEMINI_API_KEY`, `GEMINI_BASE_URL`, `GEMINI_STT_MODEL`, `GOOGLE_VISION_API_KEY`, `GOOGLE_VISION_BASE_URL`, `MINIMAX_API_KEY`, `MINIMAX_BASE_URL`, `MINIMAX_VISION_MODEL`, `MINIMAX_DIRECT_API_KEY`, `MINIMAX_DIRECT_BASE_URL`.
9. **Internal DMZ & Notifications**: `BOT_SERVICE_SECRET`, `BOT_SERVICE_HEADER`, `TOOLS_ALLOWED_IPS`, `TRUSTED_PROXY_COUNT`, `NOTIFY_SERVER_URL`, `NOTIFY_API_KEY`, `NOTIFY_TIMEOUT`, `NOTIFY_SYNC_TIMEOUT`.
10. **Async Queue**: `Q_CLUSTER` (`name`, `orm`, `timeout`, `retry`, `max_attempts`, `workers`, `ALT_CLUSTERS`).
11. **Ninja JWT & Keys**: `JWT_PRIVATE_KEY_PATH`, `JWT_PUBLIC_KEY_PATH`, `NINJA_JWT`.
12. **Domain Rules**: `OTP_*`, `ROLE_RULES`, `COMMISSION_*`, `ENROLLMENT_*`, `TRAINING_PASS_SCORE`, `HUB_BRANDS`, `DEFAULT_HUB_BRAND`, `DEFAULT_STAFF_*`.
13. **Observability**: `structlog` setup, `_scrub_pii`, `SENTRY_DSN`, `SENTRY_RELEASE`, `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_REQUEST_BODY`.

---

## 3. Exact Line-by-Line Changes to `core/settings.py`

### Change 1: Remove `TEST_MODE_ASAAS_SANDBOX_URL`
- **Location**: Lines 75-77 in `core/settings.py`
- **Action**: Delete lines 75-77.

```python
<<<<
TEST_KYC_OUTCOME = env("TEST_KYC_OUTCOME", default="approved").strip().lower()
if TEST_KYC_OUTCOME not in {"approved", "rejected", "review"}:
    raise ValueError("TEST_KYC_OUTCOME deve ser approved, rejected ou review.")
TEST_MODE_ASAAS_SANDBOX_URL = env(
    "TEST_MODE_ASAAS_SANDBOX_URL", default="https://api-sandbox.asaas.com"
)
# CORS (django-cors-headers) — config no .env (CONVENTION §10: um .env, nada hardcoded).
====
TEST_KYC_OUTCOME = env("TEST_KYC_OUTCOME", default="approved").strip().lower()
if TEST_KYC_OUTCOME not in {"approved", "rejected", "review"}:
    raise ValueError("TEST_KYC_OUTCOME deve ser approved, rejected ou review.")

# CORS (django-cors-headers) — config no .env (CONVENTION §10: um .env, nada hardcoded).
>>>>
```

---

### Change 2: Remove `GOOGLE_VISION_SERVICE_ACCOUNT_JSON`
- **Location**: Lines 377-380 in `core/settings.py`
- **Action**: Delete lines 377-380 (comment and setting declaration).

```python
<<<<
GOOGLE_VISION_API_KEY = env("GOOGLE_VISION_API_KEY", default="")
GOOGLE_VISION_BASE_URL = env(
    "GOOGLE_VISION_BASE_URL", default="https://vision.googleapis.com"
)
# Alternativa de auth (prod, mais robusto): path pro JSON do service-account. Vazio => usa a api-key.
GOOGLE_VISION_SERVICE_ACCOUNT_JSON = env(
    "GOOGLE_VISION_SERVICE_ACCOUNT_JSON", default=""
)

# MiniMax — visão (descrever imagem com MiniMax-M3).
====
GOOGLE_VISION_API_KEY = env("GOOGLE_VISION_API_KEY", default="")
GOOGLE_VISION_BASE_URL = env(
    "GOOGLE_VISION_BASE_URL", default="https://vision.googleapis.com"
)

# MiniMax — visão (descrever imagem com MiniMax-M3).
>>>>
```

---

### Change 3: Remove `JWT_*` Standalone Variables & Embed Inline into `NINJA_JWT`
- **Location**: Lines 470-492 in `core/settings.py`
- **Action**: Remove standalone `JWT_ALGORITHM`, `JWT_ACCESS_EXPIRE_MINUTES`, `JWT_REFRESH_EXPIRE_MINUTES`, `JWT_ISSUER`, `JWT_AUDIENCE` and read them directly in `NINJA_JWT`.

```python
<<<<
JWT_PRIVATE_KEY_PATH = BASE_DIR / env(
    "JWT_PRIVATE_KEY_PATH", default="keys/jwt_private.pem"
)
JWT_PUBLIC_KEY_PATH = BASE_DIR / env(
    "JWT_PUBLIC_KEY_PATH", default="keys/jwt_public.pem"
)
JWT_ALGORITHM = env("JWT_ALGORITHM", default="RS256")
JWT_ACCESS_EXPIRE_MINUTES = env.int("JWT_ACCESS_EXPIRE_MINUTES", default=30)
JWT_REFRESH_EXPIRE_MINUTES = env.int("JWT_REFRESH_EXPIRE_MINUTES", default=1440)
JWT_ISSUER = env("JWT_ISSUER", default="supletivo")
JWT_AUDIENCE = env("JWT_AUDIENCE", default="")

# django-ninja-jwt (substitui o JWT escrito à mão — Victor 2026-06-02). RS256 REUSA o mesmo par
# PEM em keys/ (lido path-based porque o objeto `settings` ainda está sendo montado aqui). Sem
# consumidor externo de JWKS → o endpoint JWKS foi removido. issue/decode em users/auth/jwt/service.
from users.auth.jwt import keys as _jwt_keys  # noqa: E402 (import tardio: precisa dos paths acima)

_JWT_PRIVATE_PEM, _JWT_PUBLIC_PEM = _jwt_keys.read_or_create_pair(
    JWT_PRIVATE_KEY_PATH, JWT_PUBLIC_KEY_PATH
)
NINJA_JWT = {
    "ALGORITHM": JWT_ALGORITHM,
    "SIGNING_KEY": _JWT_PRIVATE_PEM,
    "VERIFYING_KEY": _JWT_PUBLIC_PEM,
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=JWT_ACCESS_EXPIRE_MINUTES),
    "REFRESH_TOKEN_LIFETIME": timedelta(minutes=JWT_REFRESH_EXPIRE_MINUTES),
    "ISSUER": JWT_ISSUER or None,
    "AUDIENCE": JWT_AUDIENCE or None,
}
====
JWT_PRIVATE_KEY_PATH = BASE_DIR / env(
    "JWT_PRIVATE_KEY_PATH", default="keys/jwt_private.pem"
)
JWT_PUBLIC_KEY_PATH = BASE_DIR / env(
    "JWT_PUBLIC_KEY_PATH", default="keys/jwt_public.pem"
)

# django-ninja-jwt (substitui o JWT escrito à mão — Victor 2026-06-02). RS256 REUSA o mesmo par
# PEM em keys/ (lido path-based porque o objeto `settings` ainda está sendo montado aqui). Sem
# consumidor externo de JWKS → o endpoint JWKS foi removido. issue/decode em users/auth/jwt/service.
from users.auth.jwt import keys as _jwt_keys  # noqa: E402 (import tardio: precisa dos paths acima)

_JWT_PRIVATE_PEM, _JWT_PUBLIC_PEM = _jwt_keys.read_or_create_pair(
    JWT_PRIVATE_KEY_PATH, JWT_PUBLIC_KEY_PATH
)
NINJA_JWT = {
    "ALGORITHM": env("JWT_ALGORITHM", default="RS256"),
    "SIGNING_KEY": _JWT_PRIVATE_PEM,
    "VERIFYING_KEY": _JWT_PUBLIC_PEM,
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=env.int("JWT_ACCESS_EXPIRE_MINUTES", default=30)
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        minutes=env.int("JWT_REFRESH_EXPIRE_MINUTES", default=1440)
    ),
    "ISSUER": env("JWT_ISSUER", default="supletivo") or None,
    "AUDIENCE": env("JWT_AUDIENCE", default="") or None,
}
>>>>
```

---

### Change 4: Remove `SENTRY_ENVIRONMENT` and `SENTRY_ENABLED`
- **Location**: Lines 627-662 in `core/settings.py`
- **Action**: Remove standalone `SENTRY_ENVIRONMENT` and `SENTRY_ENABLED =` assignment; pass `env("SENTRY_ENVIRONMENT", default=APP_ENV)` directly to `init_sentry()`.

```python
<<<<
# ── Sentry / GlitchTip (opcional — sem DSN = no-op) ──────────────────────────
# A lógica (scrub de PII, fail-closed, no-op sem DSN) mora em `core/sentry.py` e é testada em
# `tests/test_sentry.py` — aqui só a config (§10), como no `resolve_environment` acima.
# SENTRY_ENVIRONMENT default = APP_ENV: o ambiente já é resolvido/validado ali em cima (prod,
# staging, preview, test), então repetir a informação no .env só criaria chance de divergir —
# um erro do staging carimbado "prod" no painel. O override existe pra quem roda mais de um
# deploy no MESMO APP_ENV (ex.: "staging-v7m" e "staging-qa") e precisa separar os dois.
# SENTRY_RELEASE se resolve sozinho: vazio => o SHA do HEAD do checkout, que o `deploy.yml`
# deixa exatamente no commit validado pelo CI (`git reset --hard <sha>`). Ou seja, "esse erro
# começou em qual deploy?" já responde sem ninguém editar .env a cada subida. O env var existe
# como override (build sem git, imagem de container). Só consulta o git quando HÁ DSN — em
# dev/CI, onde o Sentry está desligado, nem o subprocesso roda.
SENTRY_DSN = env("SENTRY_DSN", default="")
SENTRY_ENVIRONMENT = env("SENTRY_ENVIRONMENT", default=APP_ENV)
SENTRY_RELEASE = env("SENTRY_RELEASE", default="")
SENTRY_TRACES_SAMPLE_RATE = env.float("SENTRY_TRACES_SAMPLE_RATE", default=0.1)
# Corpo do request no evento: "never" (default) o mantém FORA — o funil dá POST de cpf/telefone/
# pix e o `send_default_pii=False` do SDK não cobre o corpo. Afrouxe só em dev/staging.
SENTRY_REQUEST_BODY = env("SENTRY_REQUEST_BODY", default="never")

from core.sentry import (  # noqa: E402 — import perto da sua config (padrão do structlog acima)
    git_sha,
    init_sentry,
)

if SENTRY_DSN and not SENTRY_RELEASE:
    SENTRY_RELEASE = git_sha(BASE_DIR)

SENTRY_ENABLED = init_sentry(
    dsn=SENTRY_DSN,
    environment=SENTRY_ENVIRONMENT,
    release=SENTRY_RELEASE,
    traces_sample_rate=SENTRY_TRACES_SAMPLE_RATE,
    request_body=SENTRY_REQUEST_BODY,
)
====
# ── Sentry / GlitchTip (opcional — sem DSN = no-op) ──────────────────────────
# A lógica (scrub de PII, fail-closed, no-op sem DSN) mora em `core/sentry.py` e é testada em
# `tests/test_sentry.py` — aqui só a inicialização e config (§10).
SENTRY_DSN = env("SENTRY_DSN", default="")
SENTRY_RELEASE = env("SENTRY_RELEASE", default="")
SENTRY_TRACES_SAMPLE_RATE = env.float("SENTRY_TRACES_SAMPLE_RATE", default=0.1)
# Corpo do request no evento: "never" (default) o mantém FORA — o funil dá POST de cpf/telefone/
# pix e o `send_default_pii=False` do SDK não cobre o corpo. Afrouxe só em dev/staging.
SENTRY_REQUEST_BODY = env("SENTRY_REQUEST_BODY", default="never")

from core.sentry import (  # noqa: E402 — import perto da sua config (padrão do structlog acima)
    git_sha,
    init_sentry,
)

if SENTRY_DSN and not SENTRY_RELEASE:
    SENTRY_RELEASE = git_sha(BASE_DIR)

if SENTRY_DSN:
    init_sentry(
        dsn=SENTRY_DSN,
        environment=env("SENTRY_ENVIRONMENT", default=APP_ENV),
        release=SENTRY_RELEASE,
        traces_sample_rate=SENTRY_TRACES_SAMPLE_RATE,
        request_body=SENTRY_REQUEST_BODY,
    )
>>>>
```

---

## 4. Verification Protocol
1. Run Django system checks: `uv run python manage.py check` (must pass with 0 errors).
2. Run Django migrations check: `uv run python manage.py makemigrations --check --dry-run` (only expected `finance.0005` will show).
3. Run full test suite: `uv run pytest` (all 283 tests must pass).
4. Verify Django Ninja token issuance and decoding in `users/auth/jwt/service.py` functions normally.
