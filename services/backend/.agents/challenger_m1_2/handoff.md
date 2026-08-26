# Milestone 1 Challenger Handoff Report: Security & Configuration Challenge

## 1. Observation

### A. System Checks and Test Suite
- Executed `uv run python manage.py check`:
  ```
  System check identified some issues:
  WARNINGS:
  ?: (ai.W001) GEMINI_API_KEY ausente — a modalidade Gemini (STT) fica indisponível (as demais funcionam).
  ?: (ai.W003) GOOGLE_VISION_API_KEY ausente — a modalidade Google Vision (OCR) fica indisponível (as demais funcionam).
  ?: (biometric.W002) Modelo InsightFace 'buffalo_l' não baixado em \opt\test\models\insightface\models\buffalo_l.
  ?: (biometric.W003) Diretório do modelo não existe: \opt\test\models\insightface (será criado no 1º uso).
  ?: (sentry.W001) APP_ENV=prod sem SENTRY_DSN — o backend sobe, mas exceção em produção morre no log JSON do host.
  System check identified 5 issues (0 silenced).
  Exit code: 0
  ```
- Executed `uv run pytest`:
  ```
  ============================ 283 passed in 15.22s =============================
  Exit code: 0
  ```

### B. JWT Authentication & Token Lifecycle Empirical Verification
- Inspected `core/settings.py:473-485` (`NINJA_JWT`):
  ```python
  NINJA_JWT = {
      "ALGORITHM": env("JWT_ALGORITHM", default="RS256"),
      "SIGNING_KEY": _JWT_PRIVATE_PEM,
      "VERIFYING_KEY": _JWT_PUBLIC_PEM,
      "ACCESS_TOKEN_LIFETIME": timedelta(
          minutes=env.int("JWT_ACCESS_EXPIRE_MINUTES", default=30)
      ),
      "REFRESH_TOKEN_LIFETIME": timedelta(
          minutes=env.int("JWT_REFRESH_EXPIRE_MINUTES", default=1440)
      ),
      "ISSUER": env("JWT_ISSUER", default="supletivo") or None,
      "AUDIENCE": env("JWT_AUDIENCE", default="") or None,
  }
  ```
- Verified token issuance and validation:
  - `jwt_service.issue(ext_id, ['candidate'])` creates standard RS256 token pairs containing `external_id`, `roles`, and `token_version`.
  - Signature tampering test: forged tokens with invalid cryptographic signatures immediately raise `jwt_service.TokenError`.
  - Token revocation test: bumping `user.token_version` from 1 to 2 causes `JWTAuth.authenticate` to return `None` (401), invalidating stale tokens immediately.
  - User deactivation test: setting `user.is_active = False` causes `JWTAuth.authenticate` to return `None` (401), preventing deactivated accounts from accessing protected endpoints.
  - Token type confusion test: presenting a `RefreshToken` to `JWTAuth.authenticate` returns `None` (401), as `AccessToken` decoding enforces token type.
  - Role gates (`api.auth.require_roles` and `api.auth.require_superuser`) correctly reject unauthorized principals with HTTP 403 (`FORBIDDEN_ROLE` and `STAFF_ONLY`).

### C. Captive Portal & Dead Code Removal Verification
- Checked unmounted routes:
  - `GET /portal/`, `GET /portal/agent/ping`, `GET /portal/agent/grants`, `GET /portal/session/start`, `GET /portal/session/stop`, `GET /api/portal/`, `GET /get_jwt.py` all return HTTP 404 with structured JSON error `{ "detail": "Não encontrado.", "code": "NOT_FOUND" }` when `DEBUG=False`.
  - `api/portal.py` and `get_jwt.py` do not exist on the filesystem.
  - No references to `portal_api` remain in `core/urls.py` or any active API routers.
- Checked legacy Evolution keys in `core/system_config.py`:
  - `INTEGRATION_KEYS` no longer contains `EVOLUTION_SERVER_URL`, `EVOLUTION_API_KEY`, or `EVOLUTION_INSTANCE`.
  - `get_all_platform_config()` and `GET /api/v1/staff/config/setup` execute with HTTP 200 and return sanitized integration maps without error or legacy keys.
  - Non-superuser requests to `/api/v1/staff/config/setup` receive HTTP 403.
- Checked removed dead code functions & settings:
  - Grep searches across all production code confirmed 0 dangling references for `_refund`, `refund_charge`, `get_checkout`, `list_checkouts`, `delete_photo`, `get_lead`, `get_card_installments`, `FeeFactsOut`, `TEST_MODE_ASAAS_SANDBOX_URL`, `GOOGLE_VISION_SERVICE_ACCOUNT_JSON`.

---

## 2. Logic Chain

1. **JWT Security Stance (Observation B)**:
   - Inlining `JWT_*` settings into `NINJA_JWT` preserved cryptographic parameters (RS256, PEM keys, lifetimes) while cleaning global settings.
   - Empirical token tampering, version incrementation, and user deactivation tests prove that token validation fail-closed guarantees remain fully functional and uncompromised.
   - Role enforcement and superuser gating behave according to the specification.

2. **Route and Attack Surface Cleanliness (Observation C)**:
   - Captive portal endpoints (`/portal/*`) and mock token generation scripts (`get_jwt.py`) were eliminated without leaving orphaned URL patterns or broken imports.
   - All legacy Evolution config keys were successfully purged from `system_config.py` without breaking active staff configuration endpoints or notification clients.
   - All 11 targeted dead code items have zero lingering references in the codebase.

3. **Regression Absence & Baseline Integrity (Observation A)**:
   - `manage.py check` reports 0 errors.
   - Pytest executes 283 tests with 100% success rate, confirming zero regressions.

---

## 3. Caveats

- Milestone 2 is scheduled to create the pending `finance` migration (`0005_alter_commission_status.py`) and perform ORM N+1 optimizations.
- Milestone 3 is scheduled to standardize typed Pydantic v2 `*Out` schemas across 60 endpoints.
- These future milestones do not affect or invalidate the completed cleanups of Milestone 1.

---

## 4. Conclusion

**Verdict: APPROVE**

Milestone 1 satisfies all security, architectural, and dead code cleanup requirements. JWT authentication, role authorization, and route handling operate with strict fail-closed security. No security regressions or dead code artifacts were found.

---

## 5. Verification Method

To independently reproduce and verify this assessment, execute:

```bash
# 1. System checks
uv run python manage.py check

# 2. Test suite
uv run pytest

# 3. Security verification script
uv run python -c "
import django, os, uuid, json
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.test import Client, override_settings
from users.auth.models import User
from users.auth.jwt import service as jwt_service
from api.auth import JWTAuth, require_roles, require_superuser
from core import system_config

# Check JWT
u = User.objects.create(external_id=str(uuid.uuid4()), is_active=True, token_version=1)
pair = jwt_service.issue(u.external_id, ['candidate'])
assert jwt_service.decode(pair['access_token'])['external_id'] == u.external_id

# Check version bump revocation
u.token_version = 2
u.save()
assert JWTAuth().authenticate(None, pair['access_token']) is None

# Check 404 on deleted portal routes
c = Client()
with override_settings(DEBUG=False):
    assert c.get('/portal/').status_code == 404
    assert c.get('/api/portal/').status_code == 404

u.delete()
print('ALL VERIFICATIONS PASSED')
"
```
