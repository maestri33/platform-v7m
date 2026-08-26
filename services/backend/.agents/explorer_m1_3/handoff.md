# Handoff Report — Explorer M1.3 (Milestone 1: Dead Code & Legacy Keys Cleanup)

## 1. Observation

A full workspace static grep audit and test suite execution (`uv run pytest`) were conducted on commit state. The test suite currently passes 100% (283 passed in ~21s).

Direct observations for each target:

1. **`integrations/bank/asaas/charge.py:169-186` (`_refund`, `refund_charge`)**:
   - `refund_charge` is defined at line 174; helper `_refund` at line 169.
   - `grep_search(Query="refund_charge")`: 0 calls across all apps and tests.
   - `grep_search(Query="_refund")`: 0 calls outside `charge.py:179`.
   - `grep_search(Query="refund_payment")`: defined in `client.py:170`, but uncalled anywhere else.

2. **`integrations/bank/infinitepay/checkout.py:115-124` (`get_checkout`, `list_checkouts`)**:
   - `get_checkout` is defined at line 115; `list_checkouts` at line 122.
   - `grep_search(Query="get_checkout")`: 0 calls across all apps and tests.
   - `grep_search(Query="list_checkouts")`: 0 calls across all apps and tests.

3. **`users/documents/service.py:339-351` (`delete_photo`)**:
   - `delete_photo` is defined at line 339.
   - `grep_search(Query="delete_photo")`: 0 calls across all apps and tests.

4. **`users/roles/lead/service.py:829-835` (`get_lead`)**:
   - `get_lead` is defined at line 829.
   - `grep_search(Query="get_lead")`: The only active caller is in `api/leadership/routers/leads.py:29`, which calls `get_lead_for_hub(...)` to guarantee hub/polo tenant isolation. `get_lead` is uncalled.

5. **`users/roles/lead/config.py:51-55` (`get_card_installments`)**:
   - `get_card_installments` is defined at line 53.
   - `grep_search(Query="get_card_installments")`: 0 calls.
   - Active callers in `users/roles/lead/service.py:604, 608, 621, 625` reference the constant `CARD_INSTALLMENTS` directly.

6. **`api/leadership/schemas.py:164-167` (`FeeFactsOut`)**:
   - `class FeeFactsOut(Schema)` is defined at line 164.
   - `grep_search(Query="FeeFactsOut")`: 0 references across routers, schemas, and tests. Active schema is `EnrollmentFeesOut` (lines 177-182).

7. **`core/system_config.py:47-49` (Legacy Evolution Keys)**:
   - `INTEGRATION_KEYS` contains `"EVOLUTION_SERVER_URL": False`, `"EVOLUTION_API_KEY": True`, `"EVOLUTION_INSTANCE": False`.
   - `grep_search(Query="EVOLUTION_")`: 0 references anywhere else in the codebase or environment files. Architecture has moved messaging to `notify-server` via `NOTIFY_SERVER_URL` and `NOTIFY_API_KEY`.

---

## 2. Logic Chain

1. **Step 1 — Static Grep Confirmation**: For each candidate function/schema/key, exhaustive regex/literal grep searches across the workspace showed zero references in active routers, domain services, or test cases.
2. **Step 2 — Functional Redundancy Check**:
   - `refund_charge`: Refund workflows are not supported or exposed in this release.
   - `get_checkout`, `list_checkouts`: InfinitePay checkouts are accessed through `Lead` relationships, not direct standalone listing.
   - `delete_photo`: Replaced by atomic replacement semantics in `upload_photo`.
   - `get_lead`: Deprecated in favor of `get_lead_for_hub` to ensure data isolation.
   - `get_card_installments`: Constant `CARD_INSTALLMENTS = 12` is used throughout the domain.
   - `FeeFactsOut`: Superseded by `EnrollmentFeesOut`.
   - Evolution keys: Superseded by `NOTIFY_SERVER_URL` and `NOTIFY_API_KEY` for the standalone notify microservice.
3. **Step 3 — Zero Regression Risk**: Removing these items produces no side effects, requires no database migration, and leaves all existing contracts intact.

---

## 3. Caveats

- **No Caveats**: All 7 targets are completely independent of active runtime paths and test suites. No database migrations are affected.

---

## 4. Conclusion

All 7 dead code and legacy configuration targets are safe to delete immediately in Milestone 1.

The complete unified deletion patches are cataloged in `.agents/explorer_m1_3/plan.md`.

Summary of deletions:
- `integrations/bank/asaas/charge.py`: delete lines 169–186 (`_refund`, `refund_charge`)
- `integrations/bank/infinitepay/checkout.py`: delete lines 115–124 (`get_checkout`, `list_checkouts`)
- `users/documents/service.py`: delete lines 339–351 (`delete_photo`)
- `users/roles/lead/service.py`: delete lines 829–835 (`get_lead`)
- `users/roles/lead/config.py`: delete lines 51–55 (`get_card_installments`)
- `api/leadership/schemas.py`: delete lines 164–167 (`FeeFactsOut`)
- `core/system_config.py`: delete lines 47–49 (`EVOLUTION_*` keys)

---

## 5. Verification Method

To independently verify after changes are applied:
1. Run static grep to confirm complete removal:
   ```bash
   git grep "refund_charge"
   git grep "get_checkout"
   git grep "delete_photo"
   git grep "def get_lead("
   git grep "get_card_installments"
   git grep "FeeFactsOut"
   git grep "EVOLUTION_SERVER_URL"
   ```
2. Run Django checks and test suite:
   ```bash
   uv run python manage.py check
   uv run pytest
   ```
   Expected: 283 passed, 0 failures, 0 warnings.
