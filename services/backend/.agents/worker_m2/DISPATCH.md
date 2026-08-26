## 2026-08-23T20:20:20Z
You are Worker M2 for Milestone 2 (Database Migrations & ORM Optimization).
Your Working Directory: c:\Users\maestri33\dev\v7m\backend-v7m\.agents\worker_m2\
Project Workspace: c:\Users\maestri33\dev\v7m\backend-v7m
Authoritative Original Request: c:\Users\maestri33\dev\v7m\backend-v7m\.agents\ORIGINAL_REQUEST.md
Master Project Spec: c:\Users\maestri33\dev\v7m\backend-v7m\PROJECT.md
Parent Conversation ID: f4552d2f-f124-4a09-809d-40580fce9d94

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task is to implement the Milestone 2 database migrations and ORM N+1 query optimizations:

1. Database Migrations:
   - Run `uv run python manage.py makemigrations finance` to generate `finance/migrations/0005_alter_commission_status.py`.
   - Verify `uv run python manage.py makemigrations --check --dry-run` exits with returncode 0 (No changes detected).

2. ORM N+1 Query Optimizations:
   - `api/staff/routers/documents.py:41-45`: Optimize list loops for enrollments and candidates by preloading `Profile`, `RG`, and `CNH` using bulk lookups / dictionaries (e.g. `Profile.objects.filter(user__in=users)`, `RG.objects.filter(document__user__in=users)`, `CNH.objects.filter(document__user__in=users)` mapped by user_id) instead of querying inside the loop.
   - `api/staff/routers/network.py:30-50`: Optimize hub & promoter tree listing by batch-loading profiles and aggregating lead/student counts in bulk rather than individual queries in nested loops.
   - `users/roles/enrollment/service.py:1546-1560` (`fee_facts`): Optimize `list_for_hub` by collecting external references in batch and loading `PaymentRequest` objects in a single query map (`PaymentRequest.objects.filter(external_reference__in=refs)`).
   - `users/roles/training/service.py:260-265` (`assigned_materials`): Fetch all user submissions in a single query ordered by `-created_at` and map to materials in memory.
   - `users/roles/lead/service.py` (`lead_to_dict` / `list_leads_for_hub`): Ensure `select_related` or batch profile maps are used.

Verification:
- Run `uv run python manage.py check` (must return code 0).
- Run `uv run python manage.py makemigrations --check --dry-run` (must return code 0).
- Run `uv run pytest` (all 283+ tests must pass).

Document your work in `c:\Users\maestri33\dev\v7m\backend-v7m\.agents\worker_m2\handoff.md`.
When done, notify parent (Recipient: f4552d2f-f124-4a09-809d-40580fce9d94) via send_message with test outputs and summary.
