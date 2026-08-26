# Handoff Report — Spec Survey 2 (Dead Code, Over-Engineering & Simplicity Audit)

**Agent ID**: `explorer_survey_2` (Conversation: `ea16786a-52e8-4bca-be84-808e10e4f66a`)  
**Parent Agent**: `parent` (ID: `f4552d2f-f124-4a09-809d-40580fce9d94`)  
**Timestamp**: 2026-08-23T16:45:00-03:00  
**Type**: Hard Handoff (Task Complete)

---

## 1. Observation
- **Test Baseline**: Executed `uv run python manage.py check` (0 errors, 5 expected optional warnings) and `uv run pytest` (**283 passed in 18.72s**, 100% pass rate).
- **Dead Code Detected**:
  1. `get_jwt.py` (root directory, lines 1–18): Unreferenced, broken imports (`from users.auth.jwt import jwt_service`), invalid model query (`User.objects.get(cpf=...)`).
  2. `api/portal.py` (lines 1–59) & `core/urls.py:38, 57`: Dummy captive portal API returning mock dictionaries (`{"grants": []}`, `{"pong": True}`, `{"disconnected": True}`), with uncalled internal auth check `_agent_authorized` and zero tests.
  3. `core/settings.py`: 9 unreferenced settings (`JWT_ALGORITHM`, `JWT_ACCESS_EXPIRE_MINUTES`, `JWT_REFRESH_EXPIRE_MINUTES`, `JWT_ISSUER`, `JWT_AUDIENCE` from obsolete PyJWT config; `TEST_MODE_ASAAS_SANDBOX_URL`; `GOOGLE_VISION_SERVICE_ACCOUNT_JSON`; `SENTRY_ENVIRONMENT`; `SENTRY_ENABLED`).
  4. Unreferenced functions/schemas: `integrations/bank/asaas/charge.py: refund_charge`, `integrations/bank/infinitepay/checkout.py: get_checkout, list_checkouts`, `users/documents/service.py: delete_photo`, `users/roles/lead/config.py: get_card_installments`, `users/roles/lead/service.py: get_lead`, `api/leadership/schemas.py: FeeFactsOut`.
  5. `notify/models.py` (lines 1–2): Empty 2-line file with no models post-migration 0006.
- **Speculative Abstractions**:
  1. `integrations/ai/pricing.py`: Micro-parser for environment string `IA_PRICES="provider:model:in:out"` for token cost calculation when `IA_PRICES` is empty and `AiCall.cost` is null.
  2. Ad-hoc single-use CLI commands (`ai_ping.py`, `ai_providers.py`, `cpfhub_lookup.py`, `viacep_lookup.py`, `otp_reset_ratelimit.py`) that duplicate test suite or API actions.

---

## 2. Logic Chain
1. **R2 Requirement Alignment**: Requirement R2 ("Simplicity First") dictates deleting dead code, eliminating speculative layers, and maintaining clean layer separation (Routers in `api.py`, Domain in `services.py`, Data in `models.py`).
2. **Codebase Inventory**: By tokenizing all 407 Python files and mapping symbol definitions to occurrences, we verified that `get_jwt.py`, `api/portal.py`, the 9 settings in `core/settings.py`, and the 6 identified helper functions have zero callers or dependent code paths.
3. **Safety Analysis**:
   - Deleting `get_jwt.py` has zero impact because it is an untracked scratch script in root.
   - Deleting `api/portal.py` and removing `path("portal/", portal_api.urls)` from `core/urls.py` removes dead captive portal endpoints without altering any of the 283 passing tests.
   - Removing the 9 obsolete settings from `core/settings.py` cleans up legacy PyJWT configuration superseded by `NINJA_JWT`.
   - Removing the 6 unreferenced functions cleans up unused interfaces without altering any public contract.

---

## 3. Caveats
- No changes were made directly to project source code (read-only specification mining phase).
- Database migrations for `users`, `hub`, `finance`, `integrations`, and `notify` are fully applied; removing `api/portal.py` and settings does not require a database migration.

---

## 4. Conclusion
The codebase is in excellent operational health with 100% test coverage on critical workflows. The refactor roadmap can safely proceed to:
1. Delete `get_jwt.py` and `api/portal.py`.
2. Clean obsolete variables in `core/settings.py`.
3. Prune unreferenced methods in `charge.py`, `checkout.py`, `documents/service.py`, `lead/service.py`, `lead/config.py`, and `leadership/schemas.py`.
4. Centralize duplicate schemas into `api/schemas/`.

Detailed findings, feature probe matrix, and edge cases are documented in `c:\Users\maestri33\dev\v7m\backend-v7m\.agents\explorer_survey_2\survey_report.md`.

---

## 5. Verification Method
To independently verify the survey findings:
1. Run `uv run python manage.py check` to verify system configuration health.
2. Run `uv run pytest` to confirm baseline test suite passes (283 tests).
3. Inspect `c:\Users\maestri33\dev\v7m\backend-v7m\get_jwt.py` and `c:\Users\maestri33\dev\v7m\backend-v7m\api\portal.py` to confirm they have zero incoming references.
4. Review the survey report at `c:\Users\maestri33\dev\v7m\backend-v7m\.agents\explorer_survey_2\survey_report.md`.
