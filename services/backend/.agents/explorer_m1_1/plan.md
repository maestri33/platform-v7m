# Surgical Deletion & Modification Plan: Milestone 1 (Dead Code Cleanup)

## Executive Summary
This plan specifies the exact deletion and modification operations for Milestone 1:
1. **Delete**: `c:\Users\maestri33\dev\v7m\backend-v7m\get_jwt.py`
2. **Delete**: `c:\Users\maestri33\dev\v7m\backend-v7m\api\portal.py`
3. **Modify**: `c:\Users\maestri33\dev\v7m\backend-v7m\core\urls.py` (remove `portal_api` import and URL route)
4. **Retain as-is**: `c:\Users\maestri33\dev\v7m\backend-v7m\notify\models.py` (docstring-only file representing externalized notify service)
5. **Migration Integrity**: Confirmed 43 active migration files across the workspace are structurally sound; no empty migration files exist.

---

## 1. File Deletion: `get_jwt.py`

### Target Path
`c:\Users\maestri33\dev\v7m\backend-v7m\get_jwt.py`

### Rationale
- `get_jwt.py` is an orphaned scratch debugging script with hardcoded test CPF (`11144477735`).
- It attempts invalid imports (`from users.auth.jwt import jwt_service` does not exist) and queries `User.objects.get(cpf=...)` (CPF lives on `Profile`, not `User`).
- Grep across the entire codebase confirms zero callers, zero imports, and zero references in any tests or production modules.

### Action
- Delete file `get_jwt.py`.

---

## 2. File Deletion: `api/portal.py`

### Target Path
`c:\Users\maestri33\dev\v7m\backend-v7m\api\portal.py`

### Rationale
- Implements a mock Captive Portal Agent Bridge for a Wi-Fi presence agent (`/agent/grants`, `/agent/grants/ack`, `/agent/ping`, `/session/start`, `/session/stop`).
- Contains hardcoded development keys (`CAPTIVE_AGENT_KEY = "dev-presence-agent-key-001"`), hardcoded mock responses (`portal_url = "http://localhost:3000/portal"`), and an uncalled auth validation helper `_agent_authorized`.
- Unrelated to V7M educational platform domain.
- Has zero automated tests in `tests/` and zero consumers across the frontend or backend.

### Action
- Delete file `api/portal.py`.

---

## 3. File Modification: `core/urls.py`

### Target Path
`c:\Users\maestri33\dev\v7m\backend-v7m\core\urls.py`

### Specific Changes Required

#### Line 38: Remove import
**Before**:
```python
from api.health import health_api
from api.portal import portal_api
from users.roles.lead.views import checkout_redirect
```
**After**:
```python
from api.health import health_api
from users.roles.lead.views import checkout_redirect
```

#### Line 57: Remove route definition
**Before**:
```python
    path("api/v1/tools/", tools_api.urls),
    path("api/v1/health/", health_api.urls),
    path("portal/", portal_api.urls),
    # /media/ servido SEMPRE pelo Django neste host (independente de DEBUG): o notify/Evolution buscam
```
**After**:
```python
    path("api/v1/tools/", tools_api.urls),
    path("api/v1/health/", health_api.urls),
    # /media/ servido SEMPRE pelo Django neste host (independente de DEBUG): o notify/Evolution buscam
```

---

## 4. Codebase Reference Verification

### Search Scope & Results
- **`portal_api` search**:
  - Found only in `api/portal.py:7` (definition) and `core/urls.py:38, 57` (import & mount).
  - Scratch scripts in `.agents/explorer_survey_3/` imported it during exploratory audit; no production or test files reference it.
- **`portal` search**:
  - Confirmed no occurrences in `users/`, `hub/`, `finance/`, `notify/`, `integrations/`, or `tests/`.
  - The only occurrence is a Portuguese comment in `users/roles/lead/service.py:393` (`"portal da equipe"`), completely unrelated to captive portal.
- **`CAPTIVE_AGENT_KEY` search**:
  - Existed only in `api/portal.py:31`. Zero occurrences elsewhere in settings, env, or business logic.

---

## 5. Assessment of `notify/models.py` & Migrations

### Findings
1. **`notify/models.py`**:
   - Contains: `"""Sem models: auditoria, templates e entrega pertencem ao notify-server."""`
   - Historical context: Local notification models (`Trigger`, `Template`, `Notification`) were deleted in migration `notify/migrations/0006_remove_local_notify.py` when notify responsibilities moved to the external microservice `notify-server`.
   - **Recommendation**: Retain `notify/models.py` as-is with its docstring. Removing it provides no benefit and keeping it explicitly documents that `notify` is a model-less Django app, avoiding any app loader anomalies.

2. **Migration Files Check**:
   - Total migration files: 43 active migration files across 9 apps (`core`, `finance`, `hub`, `integrations.ai`, `integrations.bank.asaas`, `integrations.bank.infinitepay`, `integrations.tools.biometric`, `notify`, `users`).
   - Short deletion migrations (e.g. `core/migrations/0003_remove_unrouted_event.py`, `integrations/bank/asaas/migrations/0003_remove_outbound_job.py`, `notify/migrations/0006_remove_local_notify.py`) are valid `DeleteModel` operations, NOT empty migrations.
   - Zero empty or corrupted migration files exist in the repository.
   - `uv run python manage.py check` executes cleanly (code 0).
   - Only 1 pending schema change exists across the repository (`finance.0005_alter_commission_status.py`, scheduled for Milestone 2).
