## 2026-08-23T19:49:37Z
You are Worker M1 for Milestone 1 (Architectural Justification & Dead Code / Settings Cleanup).
Your Working Directory: c:\Users\maestri33\dev\v7m\backend-v7m\.agents\worker_m1\
Project Workspace: c:\Users\maestri33\dev\v7m\backend-v7m
Authoritative Original Request: c:\Users\maestri33\dev\v7m\backend-v7m\.agents\ORIGINAL_REQUEST.md
Master Project Spec: c:\Users\maestri33\dev\v7m\backend-v7m\PROJECT.md
Parent Conversation ID: f4552d2f-f124-4a09-809d-40580fce9d94

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task is to implement the exact Milestone 1 dead code and settings cleanups based on the verified plans in:
- `c:\Users\maestri33\dev\v7m\backend-v7m\.agents\explorer_m1_1\plan.md`
- `c:\Users\maestri33\dev\v7m\backend-v7m\.agents\explorer_m1_2\plan.md`
- `c:\Users\maestri33\dev\v7m\backend-v7m\.agents\explorer_m1_3\plan.md`

Actions to execute:
1. Delete `c:\Users\maestri33\dev\v7m\backend-v7m\get_jwt.py`.
2. Delete `c:\Users\maestri33\dev\v7m\backend-v7m\api\portal.py`.
3. In `c:\Users\maestri33\dev\v7m\backend-v7m\core\urls.py`: remove the import `from api.portal import portal_api` (line 38) and the route `path("portal/", portal_api.urls),` (line 57).
4. In `c:\Users\maestri33\dev\v7m\backend-v7m\core\settings.py`:
   - Remove dead sandbox setting `TEST_MODE_ASAAS_SANDBOX_URL` (lines 75-77).
   - Remove `GOOGLE_VISION_SERVICE_ACCOUNT_JSON` (lines 378-380).
   - Clean obsolete PyJWT variables (`JWT_ALGORITHM`, `JWT_ACCESS_EXPIRE_MINUTES`, `JWT_REFRESH_EXPIRE_MINUTES`, `JWT_ISSUER`, `JWT_AUDIENCE`), inlining their env reads directly into `NINJA_JWT` dictionary.
   - Clean `SENTRY_ENVIRONMENT` and `SENTRY_ENABLED`, inlining cleanly into `init_sentry`.
5. In `c:\Users\maestri33\dev\v7m\backend-v7m\core\system_config.py`: remove legacy `EVOLUTION_*` keys (lines 47-49).
6. In `c:\Users\maestri33\dev\v7m\backend-v7m\integrations\bank\asaas\charge.py`: remove dead `_refund` and `refund_charge` functions.
7. In `c:\Users\maestri33\dev\v7m\backend-v7m\integrations\bank\infinitepay\checkout.py`: remove dead `get_checkout` and `list_checkouts` functions.
8. In `c:\Users\maestri33\dev\v7m\backend-v7m\users\documents\service.py`: remove dead `delete_photo` function.
9. In `c:\Users\maestri33\dev\v7m\backend-v7m\users\roles\lead\service.py`: remove dead `get_lead` function.
10. In `c:\Users\maestri33\dev\v7m\backend-v7m\users\roles\lead\config.py`: remove dead `get_card_installments` function.
11. In `c:\Users\maestri33\dev\v7m\backend-v7m\api\leadership\schemas.py`: remove dead `FeeFactsOut` class.

Verification:
- Run `uv run python manage.py check` (must return exit code 0).
- Run `uv run pytest` (all 283+ tests must pass).

Document your work in `c:\Users\maestri33\dev\v7m\backend-v7m\.agents\worker_m1\handoff.md`.
When done, notify parent (Recipient: f4552d2f-f124-4a09-809d-40580fce9d94) via send_message with test results and summary.
