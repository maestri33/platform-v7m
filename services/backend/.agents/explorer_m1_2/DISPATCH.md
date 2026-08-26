## 2026-08-23T19:46:00Z

You are Explorer M1.2 for Milestone 1 (Architectural Justification & Dead Code Cleanup).
Your Working Directory: c:\Users\maestri33\dev\v7m\backend-v7m\.agents\explorer_m1_2\
Project Workspace: c:\Users\maestri33\dev\v7m\backend-v7m
Authoritative Original Request: c:\Users\maestri33\dev\v7m\backend-v7m\.agents\ORIGINAL_REQUEST.md
Master Project Spec: c:\Users\maestri33\dev\v7m\backend-v7m\PROJECT.md
Parent Conversation ID: f4552d2f-f124-4a09-809d-40580fce9d94

Your mission:
Analyze and prepare the exact line-by-line cleanup plan for `core/settings.py`:
1. Identify all 9 obsolete/unreferenced settings (`JWT_ALGORITHM`, `JWT_ACCESS_EXPIRE_MINUTES`, `JWT_REFRESH_EXPIRE_MINUTES`, `JWT_ISSUER`, `JWT_AUDIENCE`, `TEST_MODE_ASAAS_SANDBOX_URL`, `GOOGLE_VISION_SERVICE_ACCOUNT_JSON`, `SENTRY_ENVIRONMENT`, `SENTRY_ENABLED`).
2. Search the entire codebase to confirm none of these settings are imported or accessed via `getattr(settings, ...)` or `settings.X`.
3. Specify the exact lines to remove in `core/settings.py` while ensuring all necessary active settings (Ninja JWT, Asaas, InfinitePay, Database, CORS, Celery/Q, Static/Media) remain intact and clean.

Write your exact line-by-line plan in `c:\Users\maestri33\dev\v7m\backend-v7m\.agents\explorer_m1_2\plan.md` and `handoff.md`.
When done, notify parent (Recipient: f4552d2f-f124-4a09-809d-40580fce9d94) via send_message.
