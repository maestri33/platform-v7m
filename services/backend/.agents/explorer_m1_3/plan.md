# Dead Code & Legacy Keys Cleanup Plan (Milestone 1 — Subtask 1.3)

## Executive Summary
This document provides the definitive static analysis, reference verification, and exact unified deletion diffs for the 7 dead code and legacy configuration targets identified for Milestone 1.

All 7 items have been verified via workspace-wide static grep searches to confirm zero references in domain services, API presentation routers, background tasks, external interfaces, and test suites.

---

## Target 1: `integrations/bank/asaas/charge.py` (`_refund`, `refund_charge`)

### Analysis
- **File**: `integrations/bank/asaas/charge.py:169-186`
- **Objects**: `async def _refund(asaas_id)` and `def refund_charge(payment_id: str) -> Payment`
- **Grep Evidence**: 
  - `grep_search(Query="refund_charge")`: 0 calls across `api/`, `finance/`, `users/`, `hub/`, or `tests/`.
  - `grep_search(Query="_refund")`: only used inside `refund_charge`.
  - `grep_search(Query="refund_payment")`: only defined on `AsaasClient` (`client.py:170`), not used elsewhere.
- **Rationale**: The Asaas banking integration handles charges (`create_charge`, `get_charge`, `cancel_charge`) and webhooks. Refund operations on charges are not part of the active business workflow or API surface.

### Unified Diff
```diff
--- a/integrations/bank/asaas/charge.py
+++ b/integrations/bank/asaas/charge.py
@@ -166,22 +166,6 @@ def cancel_charge(payment_id: str) -> Payment:
     return row
 
 
-async def _refund(asaas_id):
-    async with get_client() as c:
-        return await c.refund_payment(asaas_id)
-
-
-def refund_charge(payment_id: str) -> Payment:
-    row = get_charge(payment_id)
-    if row.status != "PAID":
-        raise ChargeError(f"cannot_refund_status: {row.status}")
-    try:
-        asyncio.run(_refund(row.asaas_id))
-    except AsaasError as e:
-        raise ChargeError(f"asaas_charge_refund_failed: {e.body}") from e
-    row.status = "REFUNDED"
-    row.save()
-    logger.info("charge_refunded", payment_id=payment_id, asaas_id=row.asaas_id)
-    return row
-
-
 def to_dict(row: Payment) -> dict:
     return {
```

---

## Target 2: `integrations/bank/infinitepay/checkout.py` (`get_checkout`, `list_checkouts`)

### Analysis
- **File**: `integrations/bank/infinitepay/checkout.py:115-124`
- **Objects**: `def get_checkout(external_id) -> Checkout` and `def list_checkouts() -> list[Checkout]`
- **Grep Evidence**:
  - `grep_search(Query="get_checkout")`: 0 references outside definition.
  - `grep_search(Query="list_checkouts")`: 0 references outside definition.
- **Rationale**: `create_checkout` is actively called by `users/roles/lead/service.py:344`, but checkout lookup and listing helpers in `checkout.py` are dead code. Lead and checkout queries are performed via `Lead` ORM relations.

### Unified Diff
```diff
--- a/integrations/bank/infinitepay/checkout.py
+++ b/integrations/bank/infinitepay/checkout.py
@@ -112,14 +112,6 @@ def create_checkout(
     return row
 
 
-def get_checkout(external_id) -> Checkout:
-    row = Checkout.objects.filter(external_id=external_id).first()
-    if row is None:
-        raise CheckoutError("not_found")
-    return row
-
-
-def list_checkouts() -> list[Checkout]:
-    return list(Checkout.objects.order_by("-created_at"))
-
-
 def to_dict(row: Checkout) -> dict:
     return {
```

---

## Target 3: `users/documents/service.py` (`delete_photo`)

### Analysis
- **File**: `users/documents/service.py:339-351`
- **Objects**: `def delete_photo(external_id: str, slot: str) -> None`
- **Grep Evidence**:
  - `grep_search(Query="delete_photo")`: 0 references outside definition.
- **Rationale**: Document photo management is handled either via overwrite uploads (`upload_photo` which deletes existing files during replace) or admin workflows. There is no API route or service calling `delete_photo`.

### Unified Diff
```diff
--- a/users/documents/service.py
+++ b/users/documents/service.py
@@ -336,16 +336,3 @@ def upload_photo(external_id: str, slot: str, upload) -> str:
     logger.info("documents.photo_uploaded", external_id=external_id, slot=slot)
     return path
 
-
-def delete_photo(external_id: str, slot: str) -> None:
-    if slot not in _PHOTO_SLOTS:
-        raise ValidationError(f"Slot de foto inválido: {slot}.", code="SLOT_INVALID")
-    document = _get_document(external_id)
-    sub_name, field = _PHOTO_SLOTS[slot]
-    sub = getattr(document, sub_name)
-    path = getattr(sub, field)
-    if path and default_storage.exists(path):
-        default_storage.delete(path)
-    setattr(sub, field, None)
-    sub.save(update_fields=[field])
-    logger.info("documents.photo_deleted", external_id=external_id, slot=slot)
```

---

## Target 4: `users/roles/lead/service.py` (`get_lead`)

### Analysis
- **File**: `users/roles/lead/service.py:829-835`
- **Objects**: `def get_lead(external_id: str) -> Lead | None`
- **Grep Evidence**:
  - `grep_search(Query="get_lead")`: Only `get_lead_for_hub` is used (`api/leadership/routers/leads.py:29`).
  - `get_lead` is a redundant, unisolated helper never imported or called.
- **Rationale**: Leadership router requires polo/hub scoping (`get_lead_for_hub`) to avoid data leaks across polo coordinators. Unscoped `get_lead` is dead code.

### Unified Diff
```diff
--- a/users/roles/lead/service.py
+++ b/users/roles/lead/service.py
@@ -826,13 +826,6 @@ def _notify_lead_paid_async(lead: Lead) -> None:
         )
 
 
-def get_lead(external_id: str) -> Lead | None:
-    return (
-        Lead.objects.select_related("user", "promoter", "checkout")
-        .filter(external_id=external_id)
-        .first()
-    )
-
-
 def list_leads(*, hub=None, status=None, created_after=None, limit=None) -> list[Lead]:
     """Lista leads (mais novos primeiro), opcionalmente filtrados por HUB (do polo), status,
```

---

## Target 5: `users/roles/lead/config.py` (`get_card_installments`)

### Analysis
- **File**: `users/roles/lead/config.py:51-55`
- **Objects**: `def get_card_installments() -> int`
- **Grep Evidence**:
  - `grep_search(Query="get_card_installments")`: 0 references outside definition.
  - `users/roles/lead/service.py:604, 608, 621, 625` uses `config.CARD_INSTALLMENTS` (constant = 12).
  - `core/system_config.py:130` calls its own `get_setting("CARD_INSTALLMENTS", 12)`.
- **Rationale**: `get_card_installments()` is an uncalled helper function; the code consistently relies on the `CARD_INSTALLMENTS` constant or `core.system_config.get_setting`.

### Unified Diff
```diff
--- a/users/roles/lead/config.py
+++ b/users/roles/lead/config.py
@@ -48,11 +48,6 @@ def promoter_price_pix() -> Decimal:
     return _money("ENROLLMENT_PRICE_PROMOTER_PIX", str(price_pix()))
 
 
-# parcelas do cartão exibidas na vitrine (o front mostra "12x de ..."). É só EXIBIÇÃO — não muda a
-# cobrança: o parcelamento REAL o cliente escolhe na página de checkout do gateway (Victor 2026-06-10).
-def get_card_installments() -> int:
-    return int(get_setting("CARD_INSTALLMENTS", 12))
-
-
+# parcelas do cartão exibidas na vitrine (o front mostra "12x de ..."). É só EXIBIÇÃO
 CARD_INSTALLMENTS = 12
```

---

## Target 6: `api/leadership/schemas.py` (`FeeFactsOut`)

### Analysis
- **File**: `api/leadership/schemas.py:164-167`
- **Objects**: `class FeeFactsOut(Schema)`
- **Grep Evidence**:
  - `grep_search(Query="FeeFactsOut")`: 0 references across routers, schemas, and tests.
  - Enrollment fee structure in leadership uses `EnrollmentFeesOut` (lines 177-182) containing `first`, `second`, `first_paid`, `second_scheduled`.
- **Rationale**: `FeeFactsOut` was a temporary or draft schema replaced by `EnrollmentFeesOut`.

### Unified Diff
```diff
--- a/api/leadership/schemas.py
+++ b/api/leadership/schemas.py
@@ -161,10 +161,6 @@ class CandidateSelfieDetailOut(Schema):
     in_review: bool
 
 
-class FeeFactsOut(Schema):
-    first_paid: bool = False
-    second_scheduled: bool = False
-
-
 class EnrollmentFeeDictOut(Schema):
     status: str
     amount: str
```

---

## Target 7: `core/system_config.py` (Legacy Evolution Keys)

### Analysis
- **File**: `core/system_config.py:47-49`
- **Objects**: Dictionary keys `"EVOLUTION_SERVER_URL"`, `"EVOLUTION_API_KEY"`, `"EVOLUTION_INSTANCE"` in `INTEGRATION_KEYS`.
- **Grep Evidence**:
  - `grep_search(Query="EVOLUTION_")`: 0 occurrences outside `core/system_config.py`.
  - Architecture note (`users/auth/service.py:157`): "O backend consulta somente o notify-server; Evolution não existe mais neste processo."
  - Direct Evolution API calls were decoupled and moved to the standalone `notify-server` service, configured via `NOTIFY_SERVER_URL` and `NOTIFY_API_KEY` (lines 45-46).
- **Rationale**: Removing these keys from `INTEGRATION_KEYS` eliminates obsolete configuration entries that no longer correspond to backend settings.

### Unified Diff
```diff
--- a/core/system_config.py
+++ b/core/system_config.py
@@ -44,9 +44,6 @@ INTEGRATION_KEYS = {
     "INFINITEPAY_BASE_URL": False,
     "NOTIFY_SERVER_URL": False,
     "NOTIFY_API_KEY": True,
-    "EVOLUTION_SERVER_URL": False,
-    "EVOLUTION_API_KEY": True,
-    "EVOLUTION_INSTANCE": False,
     "GEMINI_API_KEY": True,
     "MINIMAX_API_KEY": True,
     "GOOGLE_VISION_API_KEY": True,
```

---

## Implementation & Execution Strategy

1. **Ordering**: Apply diffs across target files in a single clean refactoring step during Milestone 1 implementation.
2. **Verification Command**:
   ```bash
   uv run pytest
   ```
   Ensure all 283 tests pass with 0 regressions.
3. **No Migration Impact**: None of the 7 targets touch database models or schema definitions. No migrations are generated or altered.
