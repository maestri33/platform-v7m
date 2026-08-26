## 2026-08-23T19:35:41Z
<USER_REQUEST>
You are Survey Explorer 3 for the V7M Django backend audit and refactor.
Your Working Directory: c:\Users\maestri33\dev\v7m\backend-v7m\.agents\explorer_survey_3\
Project Workspace: c:\Users\maestri33\dev\v7m\backend-v7m
Authoritative Original Request: c:\Users\maestri33\dev\v7m\backend-v7m\.agents\ORIGINAL_REQUEST.md
Parent Conversation ID: f4552d2f-f124-4a09-809d-40580fce9d94

Your mission:
Investigate all Django Ninja APIs, routers, Pydantic schemas, services, and current test suite (Requirements R3, R4):
1. Map all Ninja routers and endpoints across all apps (api.py, routers.py, urls.py, etc.).
2. Check compliance with Django Ninja & Pydantic v2 standards (In, PatchIn, Out schemas with `ConfigDict(from_attributes=True)`, `FilterSchema`, explicit HTTP status codes 200/201/204/400/404/422, tags, summary, response models).
3. Audit ORM queries in routers and services for N+1 query patterns (missing `select_related` or `prefetch_related` on foreign keys / m2m).
4. Audit exception handling (global vs local exception handlers, validation errors, business exceptions).
5. Inspect test setup (tests/, pytest configuration, fixtures, existing coverage) and run tests via runner to establish baseline verification status.
6. Check OpenAPI docs generation integrity and potential schema conflicts.

Write your detailed report to `c:\Users\maestri33\dev\v7m\backend-v7m\.agents\explorer_survey_3\survey_report.md` and a concise `handoff.md` in your working directory.
When done, notify parent (Recipient: f4552d2f-f124-4a09-809d-40580fce9d94) via send_message with a summary.
</USER_REQUEST>
