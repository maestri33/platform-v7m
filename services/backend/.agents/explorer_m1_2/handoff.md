# Handoff Report: Milestone 1 Settings Cleanup (M1.2)

## 1. Observation
1. **Target File**: `core/settings.py` (662 lines).
2. **Obsolete Setting Locations in `core/settings.py`**:
   - `TEST_MODE_ASAAS_SANDBOX_URL`: lines 75-77 (`TEST_MODE_ASAAS_SANDBOX_URL = env("TEST_MODE_ASAAS_SANDBOX_URL", default="https://api-sandbox.asaas.com")`).
   - `GOOGLE_VISION_SERVICE_ACCOUNT_JSON`: lines 378-380 (`GOOGLE_VISION_SERVICE_ACCOUNT_JSON = env("GOOGLE_VISION_SERVICE_ACCOUNT_JSON", default="")`).
   - `JWT_ALGORITHM`: line 470 (`JWT_ALGORITHM = env("JWT_ALGORITHM", default="RS256")`).
   - `JWT_ACCESS_EXPIRE_MINUTES`: line 471 (`JWT_ACCESS_EXPIRE_MINUTES = env.int("JWT_ACCESS_EXPIRE_MINUTES", default=30)`).
   - `JWT_REFRESH_EXPIRE_MINUTES`: line 472 (`JWT_REFRESH_EXPIRE_MINUTES = env.int("JWT_REFRESH_EXPIRE_MINUTES", default=1440)`).
   - `JWT_ISSUER`: line 473 (`JWT_ISSUER = env("JWT_ISSUER", default="supletivo")`).
   - `JWT_AUDIENCE`: line 474 (`JWT_AUDIENCE = env("JWT_AUDIENCE", default="")`).
   - `SENTRY_ENVIRONMENT`: line 640 (`SENTRY_ENVIRONMENT = env("SENTRY_ENVIRONMENT", default=APP_ENV)`).
   - `SENTRY_ENABLED`: line 655 (`SENTRY_ENABLED = init_sentry(...)`).
3. **Grep and AST Codebase Verification**:
   - Grep search for `TEST_MODE_ASAAS_SANDBOX_URL` across the entire codebase returned 0 code occurrences. `integrations.bank.asaas.client` reads `settings.ASAAS_BASE_URL`.
   - Grep search for `GOOGLE_VISION_SERVICE_ACCOUNT_JSON` returned 0 code occurrences. `integrations.ai.vision_ocr` only implements API key auth via `GOOGLE_VISION_API_KEY` and `GOOGLE_VISION_BASE_URL`.
   - Grep search for `JWT_ALGORITHM`, `JWT_ACCESS_EXPIRE_MINUTES`, `JWT_REFRESH_EXPIRE_MINUTES`, `JWT_ISSUER`, `JWT_AUDIENCE` returned 0 occurrences outside of their single reference within `NINJA_JWT` in `core/settings.py`.
   - Grep search for `SENTRY_ENVIRONMENT` and `SENTRY_ENABLED` returned 0 occurrences outside `core/settings.py`.
   - Grep search for dynamic setting access (`getattr(settings, ...)`) and `core.system_config.py` catalogs confirmed none of these 9 variables are accessed dynamically.
4. **Baseline Execution**:
   - `uv run python manage.py check`: Passed with 0 errors (5 warnings related to optional external API keys in local development).
   - `uv run pytest`: 283 tests collected, 283 passed in 17.82s.

## 2. Logic Chain
1. **Observation 1 & 3 → Inlined Settings**: `JWT_ALGORITHM`, `JWT_ACCESS_EXPIRE_MINUTES`, `JWT_REFRESH_EXPIRE_MINUTES`, `JWT_ISSUER`, `JWT_AUDIENCE` exist solely to populate `NINJA_JWT`. Because `django-ninja-jwt` reads the dictionary `NINJA_JWT` rather than top-level variables, embedding `env(...)` lookups directly into `NINJA_JWT` eliminates 5 top-level polluted settings while keeping 100% of `.env` configurability.
2. **Observation 1 & 3 → Dead Integration Settings**: `TEST_MODE_ASAAS_SANDBOX_URL` and `GOOGLE_VISION_SERVICE_ACCOUNT_JSON` are relics of past speculative code that no domain service or client ever implemented. Removing them reduces clutter and avoids confusion.
3. **Observation 1 & 3 → Sentry Settings**: `SENTRY_ENVIRONMENT` is only passed to `init_sentry()`. Passing `env("SENTRY_ENVIRONMENT", default=APP_ENV)` directly inside the function call eliminates the redundant setting. `init_sentry()` performs SDK initialization as a side effect; assigning its return value to `SENTRY_ENABLED` creates an unused variable. Calling `if SENTRY_DSN: init_sentry(...)` is cleaner and idiomatic.
4. **Observation 4 → Non-Regression**: Because all 9 variables have 0 external callers and active settings (Asaas, InfinitePay, Database, CORS, Ninja JWT, Celery/Q, Media) are completely untouched, applying these changes carries zero operational risk.

## 3. Caveats
- No code was modified in this investigation phase (read-only execution).
- The changes should be applied alongside Milestone 1 code cleanup (e.g. deleting `get_jwt.py` and cleaning dead helpers).
- The migration check (`makemigrations --check --dry-run`) reports `finance.0005_alter_commission_status`, which is expected and tracked as Feature 3 / Milestone 2.

## 4. Conclusion
- The 9 obsolete settings in `core/settings.py` are confirmed dead/redundant and safe for immediate removal.
- The exact line removals and inline dictionary replacements are documented in `.agents/explorer_m1_2/plan.md`.
- Active production settings remain robust, clean, and fully compliant with project architecture and conventions.

## 5. Verification Method
After the implementer applies the plan from `plan.md`:
1. Run `uv run python manage.py check` to verify 0 Django configuration errors.
2. Run `uv run pytest` to ensure all 283 tests pass without failure.
3. Run `uv run python -c "from django.conf import settings; from users.auth.jwt import service; print(settings.NINJA_JWT['ALGORITHM'])"` to verify `NINJA_JWT` initializes cleanly.
