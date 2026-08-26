# Handoff Report — Explorer M1.1 (Dead Code Cleanup & Migration Integrity)

## 1. Observation
1. **`get_jwt.py` (`c:\Users\maestri33\dev\v7m\backend-v7m\get_jwt.py:1-18`)**:
   - Contains a standalone script:
     ```python
     u = User.objects.get(cpf="11144477735")
     tokens = jwt_service.issue(str(u.external_id), active_roles(u))
     ```
   - Import `from users.auth.jwt import jwt_service` does not exist in the codebase.
   - `User` model does not have a `cpf` field (`cpf` is on `Profile`).
   - Ripper/Grep across the workspace confirms 0 references, 0 tests, and 0 imports of `get_jwt.py`.

2. **`api/portal.py` (`c:\Users\maestri33\dev\v7m\backend-v7m\api\portal.py:1-59`)**:
   - Instantiates `portal_api = NinjaAPI(title="Portal Agent API", ...)` and declares 5 stub endpoints (`/agent/grants`, `/agent/grants/ack`, `/agent/ping`, `/session/start`, `/session/stop`) returning mock literals (`{"grants": []}`, `{"pong": True}`, `{"disconnected": True}`, `{"authorized": False, "portal_url": "http://localhost:3000/portal"}`).
   - Contains hardcoded fallback key:
     `expected = str(getattr(settings, "CAPTIVE_AGENT_KEY", "dev-presence-agent-key-001") or "")`
   - Defines `_agent_authorized` on line 30 which is never referenced or called in any router endpoint.
   - Grep in `tests/` confirms 0 test files reference `portal` or `portal_api`.

3. **`core/urls.py` (`c:\Users\maestri33\dev\v7m\backend-v7m\core\urls.py:38, 57`)**:
   - Line 38: `from api.portal import portal_api`
   - Line 57: `path("portal/", portal_api.urls),`
   - No other occurrences of `portal_api` exist in `core/urls.py` or any other router in `api/`.

4. **`notify/models.py` (`c:\Users\maestri33\dev\v7m\backend-v7m\notify\models.py:1-2`)**:
   - Contains only: `"""Sem models: auditoria, templates e entrega pertencem ao notify-server."""`
   - Migration history in `notify/migrations/0006_remove_local_notify.py:13-15` explicitly executed:
     ```python
     migrations.DeleteModel(name="Trigger"),
     migrations.DeleteModel(name="Template"),
     migrations.DeleteModel(name="Notification"),
     ```
   - `uv run python manage.py check` executes with returncode 0.
   - `uv run python manage.py makemigrations --check --dry-run` reports 0 pending migrations for `notify`.

5. **Migration Directory Inspection**:
   - All 43 migration files across the 9 apps were parsed.
   - Migrations with small line counts (`core/0003_remove_unrouted_event.py`, `asaas/0003_remove_outbound_job.py`, `notify/0006_remove_local_notify.py`) are valid `DeleteModel` operations, not empty files.
   - No zero-byte or corrupt migration files exist.

---

## 2. Logic Chain
1. Based on **Observation 1**, `get_jwt.py` is non-functional scratch code that cannot execute properly and is unreferenced by any module or test. Therefore, deleting `get_jwt.py` has zero operational impact on the application or test suite.
2. Based on **Observation 2**, `api/portal.py` contains mock captive portal endpoints with uncalled authentication logic, unrelated to educational funnel or polo management, and is completely unexercised by tests.
3. Based on **Observation 3**, removing `api/portal.py` requires removing only the import at `core/urls.py:38` and the route mount at `core/urls.py:57`. Because no other routes, services, or frontend contracts consume `/portal/`, this deletion cleanly removes dead surface area without regressions.
4. Based on **Observation 4**, `notify` transitioned from local database models to an external HTTP proxy service (`notify-server`) in migration `0006`. `notify/models.py` accurately documents this architectural decision with its docstring. Keeping `notify/models.py` as-is preserves standard Django app conventions and avoids any schema drift.
5. Based on **Observation 5**, all existing migrations in the repository are syntactically valid and form a continuous dependency graph. No migration file cleanup or deletion is required.

---

## 3. Caveats
- `users/roles/lead/service.py:393` contains the word "portal" inside a Portuguese code comment (`"portal da equipe"`), which refers conceptually to the staff dashboard and is not related to `api/portal.py`. It should remain untouched.
- Milestone 2 will handle the generation of `finance/migrations/0005_alter_commission_status.py`, which is the sole pending model field migration in the repository.

---

## 4. Conclusion
1. `get_jwt.py` can and should be immediately deleted.
2. `api/portal.py` can and should be immediately deleted.
3. `core/urls.py` should be edited to remove line 38 (`from api.portal import portal_api`) and line 57 (`path("portal/", portal_api.urls),`).
4. `notify/models.py` should be retained in its current form (`"""Sem models: auditoria, templates e entrega pertencem ao notify-server."""`).
5. All 43 migration files are valid and should not be modified.

---

## 5. Verification Method
1. **File Deletion Verification**:
   - Check that `get_jwt.py` and `api/portal.py` do not exist.
   - Inspect `core/urls.py` to confirm neither `api.portal` nor `portal_api` is imported or mounted.
2. **Django System Check**:
   - Run `uv run python manage.py check` to verify Django boots cleanly without missing modules or URL configuration errors.
3. **Automated Test Suite**:
   - Run `uv run pytest` to ensure all 283+ unit and integration tests pass without regression.
