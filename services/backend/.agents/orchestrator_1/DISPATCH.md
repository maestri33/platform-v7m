## 2026-08-23T19:34:59Z

You are the Project Orchestrator for the V7M Django backend audit and refactor.

Working Directory for your coordination files: c:\Users\maestri33\dev\v7m\backend-v7m\.agents\orchestrator_1\
Project Workspace: c:\Users\maestri33\dev\v7m\backend-v7m
Authoritative Original Request: c:\Users\maestri33\dev\v7m\backend-v7m\.agents\ORIGINAL_REQUEST.md

Your mission:
Lead the end-to-end audit, architectural justification, dead code elimination, and Django Ninja / Pydantic v2 consolidation for backend-v7m.

Please read `ORIGINAL_REQUEST.md` to see all detailed requirements (R1, R2, R3, R4) and acceptance criteria:
- R1: Detailed audit and architectural justification of installed apps (`core`, `users`, `hub`, `finance`, `notify`, `integrations.*`) and `core/settings.py`.
- R2: Surgical cleanup of speculative/dead code and single-use abstractions.
- R3: Strict Django Ninja and Pydantic v2 standardization (In, PatchIn, Out with ConfigDict(from_attributes=True), FilterSchema; Router/Service/Model separation; global error handling; N+1 query prevention).
- R4: Verification and tests (Django check, makemigrations check, pytest test suite, OpenAPI docs rendering).

Maintain `plan.md`, `progress.md`, and `BRIEFING.md` in your working directory `c:\Users\maestri33\dev\v7m\backend-v7m\.agents\orchestrator_1\`.
When all tasks and verifications are complete and confirmed, notify the sentinel with your final handoff and victory claim.

## 2026-08-23T20:28:41Z

Resume work at c:\Users\maestri33\dev\v7m\backend-v7m\.agents\orchestrator_1. Read handoff.md, BRIEFING.md, ORIGINAL_REQUEST.md, DISPATCH.md, and progress.md for current state.
Your parent is fd4669bd-cdfd-468e-af4a-2bb100f64e3b — use this ID for all escalation and status reporting (send_message).

Your mission as the Successor Orchestrator (Generation 2):
1. Review the completed state:
   - Milestone 1 (Dead code & settings cleanup) is DONE and verified with PASS gate.
   - Milestone 2 (Finance migration 0005 generated, N+1 query loops in documents/network/enrollment/training/leads eliminated, 288 tests passed).
2. Execute Milestone 3 (Django Ninja & Pydantic v2 Standardization):
   - Type all 60 untyped endpoints in `staff` with explicit `*Out` schemas.
   - Standardize Pydantic v2 schemas (`ConfigDict(from_attributes=True)` and explicit `PatchIn`).
   - Implement `FilterSchema` where appropriate.
   - Standardize HTTP status codes (201 for POST creations, 204 for DELETE, explicit response maps).
3. Execute Milestone 4 (Full Programmatic Verification & Final Audit):
   - Verify `uv run python manage.py check` (0 errors).
   - Verify `uv run python manage.py makemigrations --check --dry-run` (0 pending).
   - Verify `uv run pytest` (100% tests passing).
   - Validate OpenAPI 3.x schema generation on all Ninja APIs (`/docs`).
4. Perform final Forensic Integrity Audit and deliver the victory claim report to parent `fd4669bd-cdfd-468e-af4a-2bb100f64e3b`.

