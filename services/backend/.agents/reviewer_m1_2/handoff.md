# Milestone 1 Independent Review Report: Architectural Justification & Dead Code / Settings Cleanup

**Reviewer**: Reviewer M1.2 (Critic / Adversarial Reviewer)  
**Verdict**: **APPROVE**

---

## 1. Observation

1. **Deleted Files Verification**:
   - `c:\Users\maestri33\dev\v7m\backend-v7m\get_jwt.py`: File does not exist on disk. Grep search confirmed 0 references/imports across the entire codebase.
   - `c:\Users\maestri33\dev\v7m\backend-v7m\api\portal.py`: File does not exist on disk. Grep search confirmed 0 references across routers, services, and tests.

2. **Core Settings & URLs Audit (`core/settings.py` and `core/urls.py`)**:
   - `core/urls.py:38,57`: The previous import `from api.portal import portal_api` and route `path("portal/", portal_api.urls),` were removed cleanly.
   - `core/urls.py:50-55`: The 6 Django Ninja APIs are mounted at `/api/v1/{group}/`:
     - `clients` (`clients_api.urls`) -> 32 endpoints
     - `collaborators` (`collaborators_api.urls`) -> 31 endpoints
     - `leadership` (`leadership_api.urls`) -> 42 endpoints
     - `staff` (`staff_api.urls`) -> 59 endpoints
     - `tools` (`tools_api.urls`) -> 4 endpoints
     - `health` (`health_api.urls`) -> 3 endpoints
     - **Total OpenAPI paths**: 171 endpoints verified programmatically without schema conflicts.
   - `core/settings.py`:
     - `TEST_MODE_ASAAS_SANDBOX_URL` and `GOOGLE_VISION_SERVICE_ACCOUNT_JSON` were removed.
     - Standalone variables (`JWT_ALGORITHM`, `JWT_ACCESS_EXPIRE_MINUTES`, `JWT_REFRESH_EXPIRE_MINUTES`, `JWT_ISSUER`, `JWT_AUDIENCE`) were inlined cleanly into `NINJA_JWT` with environment fallbacks.
     - `SENTRY_ENVIRONMENT` and `SENTRY_ENABLED` assignments were inlined into `init_sentry(...)`.

3. **Dead Domain Code Cleanups**:
   - `core/system_config.py:39-54`: Legacy keys `EVOLUTION_SERVER_URL`, `EVOLUTION_API_KEY`, and `EVOLUTION_INSTANCE` were removed from `INTEGRATION_KEYS`.
   - `integrations/bank/asaas/charge.py`: Uncalled functions `_refund` and `refund_charge` were removed (0 external calls).
   - `integrations/bank/infinitepay/checkout.py`: Uncalled functions `get_checkout` and `list_checkouts` were removed (0 external calls).
   - `users/documents/service.py`: Uncalled function `delete_photo` was removed (0 external calls).
   - `users/roles/lead/service.py`: Uncalled function `get_lead` was removed (0 external calls).
   - `users/roles/lead/config.py`: Uncalled function `get_card_installments` was removed (0 external calls).
   - `api/leadership/schemas.py`: Unreferenced draft schema `FeeFactsOut` was removed (0 external references; `EnrollmentFeesOut` is active).

4. **Automated Verification Commands & Output**:
   - `uv run python manage.py check`:
     ```text
     System check identified some issues:
     WARNINGS: 5 informational warnings (0 system check errors). Exit code: 0.
     ```
   - `uv run pytest`:
     ```text
     ============================ 283 passed in 14.62s =============================
     Exit code: 0.
     ```

5. **Adversarial & Integrity Review**:
   - Zero hardcoded test outcomes or facades found.
   - Zero broken dependencies or import cycle regressions (`test_sem_ciclo_de_import` PASSED).
   - No shortcuts or fake assertions detected.

---

## 2. Logic Chain

1. From **Observation 1**, `get_jwt.py` and `api/portal.py` were non-production developer scratch files. Their removal alongside unmounting the `portal/` route in `core/urls.py` reduces attack surface and dead code with zero breaking changes.
2. From **Observation 2**, `core/urls.py` correctly routes requests to all 6 core Ninja API groups. Schema generation confirms that OpenAPI specs for all 171 paths render without validation errors.
3. From **Observation 2**, `core/settings.py` properly organizes environment variables, inlines isolated settings into their respective dictionaries (`NINJA_JWT`) and call sites (`init_sentry`), and preserves all security parameters without polluting `django.conf.settings`.
4. From **Observation 3**, every pruned helper function was verified to have 0 external callers across the entire codebase, eliminating maintenance overhead while leaving all active business flows intact.
5. From **Observation 4**, executing `manage.py check` and the full `pytest` suite confirms 100% test pass rate (283/283 tests passing) with zero regressions.

---

## 3. Caveats

- **Scope boundary**: Database migration synchronization for the `finance` app (`0005_alter_commission_status.py`) and ORM N+1 query optimizations are assigned to Milestone 2 (per `PROJECT.md`) and were not part of M1 scope.

---

## 4. Conclusion

**Verdict: APPROVE**

Milestone 1 successfully implements all architectural justifications, settings reorganizations, dead code prunings, and route cleanups with complete structural integrity and zero regressions.

---

## 5. Verification Method

To independently reproduce the verification results:

```bash
# 1. Verify Django System Checks
uv run python manage.py check

# 2. Verify Full Pytest Suite (283 tests)
uv run pytest

# 3. Verify OpenAPI Schema Generation for all 6 Ninja APIs
uv run python -c "import os, django; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings'); django.setup(); from api.clients import api as c; from api.collaborators import api as cl; from api.leadership import api as l; from api.staff import api as s; from api.tools import api as t; from api.health import health_api as h; print({name: len(api.get_openapi_schema()['paths']) for name, api in [('clients', c), ('collaborators', cl), ('leadership', l), ('staff', s), ('tools', t), ('health', h)]})"
```
