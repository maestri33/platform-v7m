# BRIEFING — 2026-08-23T19:53:40Z

## Mission
Execute Milestone 1: Dead Code and Settings Cleanup with complete verification and zero regressions.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\maestri33\dev\v7m\backend-v7m\.agents\worker_m1\
- Original parent: f4552d2f-f124-4a09-809d-40580fce9d94
- Milestone: Milestone 1 (Architectural Justification & Dead Code / Settings Cleanup)

## 🔒 Key Constraints
- Follow minimal-change principle.
- No dummy/facade implementations, genuine removals.
- Verification commands: `uv run python manage.py check` and `uv run pytest`.
- Write handoff.md and report to parent.

## Current Parent
- Conversation ID: f4552d2f-f124-4a09-809d-40580fce9d94
- Updated: 2026-08-23T19:53:40Z

## Task Summary
- **What to build/clean**:
  1. Deleted `get_jwt.py`
  2. Deleted `api/portal.py`
  3. Cleaned `core/urls.py` (portal route & import)
  4. Cleaned `core/settings.py` (TEST_MODE_ASAAS_SANDBOX_URL, GOOGLE_VISION_SERVICE_ACCOUNT_JSON, PyJWT vars, Sentry vars)
  5. Cleaned `core/system_config.py` (EVOLUTION_*)
  6. Cleaned `integrations/bank/asaas/charge.py` (_refund, refund_charge)
  7. Cleaned `integrations/bank/infinitepay/checkout.py` (get_checkout, list_checkouts)
  8. Cleaned `users/documents/service.py` (delete_photo)
  9. Cleaned `users/roles/lead/service.py` (get_lead)
  10. Cleaned `users/roles/lead/config.py` (get_card_installments)
  11. Cleaned `api/leadership/schemas.py` (FeeFactsOut)
- **Success criteria**: Django system check passes (0 issues), pytest runs and all 283+ tests pass.
- **Interface contracts**: PROJECT.md

## Change Tracker
- **Files modified**:
  - `get_jwt.py` (deleted)
  - `api/portal.py` (deleted)
  - `core/urls.py` (removed portal_api import and route)
  - `core/settings.py` (removed TEST_MODE_ASAAS_SANDBOX_URL, GOOGLE_VISION_SERVICE_ACCOUNT_JSON, inlined PyJWT into NINJA_JWT, inlined Sentry config into init_sentry)
  - `core/system_config.py` (removed EVOLUTION_* keys)
  - `integrations/bank/asaas/charge.py` (removed _refund, refund_charge)
  - `integrations/bank/infinitepay/checkout.py` (removed get_checkout, list_checkouts)
  - `users/documents/service.py` (removed delete_photo)
  - `users/roles/lead/service.py` (removed get_lead)
  - `users/roles/lead/config.py` (removed get_card_installments)
  - `api/leadership/schemas.py` (removed FeeFactsOut)
- **Build status**: PASS (manage.py check code 0; pytest 283 passed in 12.45s)
- **Pending issues**: none

## Quality Status
- **Build/test result**: PASS (283 passed in 12.45s)
- **Lint status**: clean
- **Tests added/modified**: 0 (deletions only; test suite verifies 100% stability)

## Loaded Skills
- **Source**: None required explicitly for this cleanup task.
