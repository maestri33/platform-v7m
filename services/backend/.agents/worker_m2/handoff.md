# Handoff Report — Milestone 2: Database Migrations & ORM Optimization

## 1. Observation
Prior to the changes:
- `makemigrations --check --dry-run` was failing with exit code 1 because the `finance` app was missing migration `0005_alter_commission_status.py`.
- In `api/staff/routers/documents.py:41-45`, `list_global_document_reviews` was querying `profiles.get(enr.user)`, `RG.objects.filter(document__user=enr.user).first()`, and `CNH.objects.filter(document__user=enr.user).first()` sequentially inside the iteration loop for each enrollment, candidate, and student document (up to 100 items per category), generating upwards of 300 queries.
- In `api/staff/routers/network.py:30-50`, `get_network_tree` was iterating over hubs and nested promoters, making individual queries for promoter profiles, `Lead.objects.filter(promoter=prom_user).count()`, `paid_count`, and `Student.objects.filter(user__enrollment__promoter=prom_user).count()`.
- In `users/roles/enrollment/service.py:1897-1910`, `list_for_hub` invoked `fee_facts(enr)` on each row, issuing 2 `PaymentRequest` queries per enrollment.
- In `users/roles/training/service.py:260-265`, `assigned_materials` was querying `Submission.objects.filter(user=user, material=a.material).order_by("-created_at").first()` in a loop over all assigned materials.
- In `users/roles/lead/service.py`, `lead_to_dict` queried `profiles.get(lead.user)` per lead when called in loops by `api/leadership/routers/leads.py`, `api/staff/routers/users.py`, and `api/tools/router.py`.

## 2. Logic Chain
1. **Migration Synchronization**:
   - Running `makemigrations finance` generated `finance/migrations/0005_alter_commission_status.py`, updating the `status` field choices on `Commission`.
   - Verified that `makemigrations --check --dry-run` exited with 0 ("No changes detected").
2. **Staff Documents Optimization (`api/staff/routers/documents.py`)**:
   - Sliced the querysets first (`[:100]`), collected all target `User` objects in batch, and populated `enr_profiles = profiles.get_map(enr_users)`.
   - Bulk-fetched `RG` and `CNH` objects via `document__user__in=enr_users` with `.select_related("document")` into dictionaries keyed by `user_id`.
   - Applied identical batching for candidate and student document loops.
3. **Staff Network Tree Optimization (`api/staff/routers/network.py`)**:
   - Fetched all promoters across all hubs in a single query: `Promoter.objects.select_related("user").filter(hub__in=hubs)`.
   - Grouped promoters by `hub_id` in memory using `defaultdict`.
   - Batch-loaded all coordinator and promoter profiles via `profiles.get_map(all_users)`.
   - Aggregated total leads and paid leads in a single database aggregation: `Lead.objects.filter(promoter__in=prom_users).values("promoter_id").annotate(total_leads=Count("id"), paid_leads=Count("id", filter=Q(status=Lead.Status.PAID)))`.
   - Aggregated student completions in a single database aggregation: `Student.objects.filter(user__enrollment__promoter__in=prom_users).values("user__enrollment__promoter_id").annotate(total_students=Count("id"))`.
4. **Enrollment Hub Listing & Fee Facts Optimization (`users/roles/enrollment/service.py`)**:
   - Implemented `batch_fee_facts(enrollments: list[Enrollment]) -> dict[str, dict]`.
   - Collected all `source_external_id`s and external references (`_fee_now_ref` and `_fee_due_ref`) in batch and executed a single query to `PaymentRequest.objects.filter(kind=PaymentRequest.Kind.FEE)`.
   - Updated `_hub_item_dict` to accept optional `fees_info` parameter, and updated `list_for_hub` to pass the preloaded fee dictionary.
5. **Training Materials Submissions Optimization (`users/roles/training/service.py`)**:
   - Fetched all submissions for assigned materials in a single query: `Submission.objects.filter(user=user, material__in=[a.material for a in assignments]).order_by("-created_at", "-id")`.
   - Indexed latest submissions by `material_id` in memory, avoiding per-material queries.
6. **Lead Service & Routers Optimization**:
   - Enhanced `lead_to_dict(lead: Lead, profile=None)` to allow injected profiles.
   - Updated `api/leadership/routers/leads.py`, `api/staff/routers/users.py`, and `api/tools/router.py` to use `profiles.get_map([lead.user for lead in leads])`.
7. **Regression Testing & Verification**:
   - Created `tests/test_orm_optimizations.py` capturing database queries via `CaptureQueriesContext` to verify query-count bounds and data accuracy.
   - Ran `uv run pytest` across the entire project, confirming all 288 tests passed.

## 3. Caveats
- `batch_fee_facts` operates in batch for `list_for_hub`. Single item calls (e.g. `fee_facts(enr)`) maintain their original signature and fallback behavior for backward compatibility.
- In `assigned_materials`, when multiple submissions exist for a material, `-created_at, -id` is used to deterministically select the most recent submission.

## 4. Conclusion
Milestone 2 objectives are fully achieved:
- Database schema and migrations are completely synchronized (0 pending migrations).
- N+1 query patterns across staff routers, leadership routers, tools routers, enrollment service, training service, and lead service have been eliminated through batch preloading and SQL aggregations.
- System integrity checks and full test suite pass with 100% success rate (288 passed, 0 failed).

## 5. Verification Method
1. **Django System Check**:
   ```pwsh
   uv run python manage.py check
   ```
   *Expected: Exit code 0, 0 errors.*
2. **Migrations Dry-Run Check**:
   ```pwsh
   uv run python manage.py makemigrations --check --dry-run
   ```
   *Expected: Exit code 0, "No changes detected".*
3. **Full Pytest Test Suite**:
   ```pwsh
   uv run pytest
   ```
   *Expected: 288 passed in ~15s.*
4. **ORM Optimization Tests**:
   ```pwsh
   uv run pytest tests/test_orm_optimizations.py -v
   ```
   *Expected: 5 passed in ~3s.*
