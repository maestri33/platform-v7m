## 2026-08-23T19:46:00Z
You are Explorer M1.3 for Milestone 1 (Architectural Justification & Dead Code Cleanup).
Your Working Directory: c:\Users\maestri33\dev\v7m\backend-v7m\.agents\explorer_m1_3\
Project Workspace: c:\Users\maestri33\dev\v7m\backend-v7m
Authoritative Original Request: c:\Users\maestri33\dev\v7m\backend-v7m\.agents\ORIGINAL_REQUEST.md
Master Project Spec: c:\Users\maestri33\dev\v7m\backend-v7m\PROJECT.md
Parent Conversation ID: f4552d2f-f124-4a09-809d-40580fce9d94

Your mission:
Analyze and prepare the exact cleanup plan for unreferenced dead functions and legacy keys:
1. `integrations/bank/asaas/charge.py: refund_charge`
2. `integrations/bank/infinitepay/checkout.py: get_checkout, list_checkouts`
3. `users/documents/service.py: delete_photo`
4. `users/roles/lead/service.py: get_lead`
5. `users/roles/lead/config.py: get_card_installments`
6. `api/leadership/schemas.py: FeeFactsOut`
7. Legacy Evolution keys in `core/system_config.py:47-49`
Confirm with static grep that zero references or tests call these dead functions, and provide the exact deletion diffs.

Write your findings and exact plan to `c:\Users\maestri33\dev\v7m\backend-v7m\.agents\explorer_m1_3\plan.md` and `handoff.md`.
When done, notify parent (Recipient: f4552d2f-f124-4a09-809d-40580fce9d94) via send_message.
