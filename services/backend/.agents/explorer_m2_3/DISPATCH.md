## 2026-08-23T19:57:58Z

<USER_REQUEST>
You are Explorer M2.3 for Milestone 2 (Database Migrations & ORM Optimization).
Your Working Directory: c:\Users\maestri33\dev\v7m\backend-v7m\.agents\explorer_m2_3\
Project Workspace: c:\Users\maestri33\dev\v7m\backend-v7m
Authoritative Original Request: c:\Users\maestri33\dev\v7m\backend-v7m\.agents\ORIGINAL_REQUEST.md
Master Project Spec: c:\Users\maestri33\dev\v7m\backend-v7m\PROJECT.md
Parent Conversation ID: f4552d2f-f124-4a09-809d-40580fce9d94

Your mission:
Investigate and design precise ORM optimizations to eliminate N+1 query loops in domain services:
1. `users/roles/enrollment/service.py:1546-1560` (`fee_facts` called in `list_for_hub` loop): Multiple queries per enrollment to `PaymentRequest`. Design a batch prefetch / lookup map approach.
2. `users/roles/training/service.py:260-265` (`assigned_materials`): 1 query `Submission.objects.filter(...)` per material. Design a single bulk query strategy.
3. `users/roles/lead/service.py` (`lead_to_dict` / `list_leads`): Lookups on promoter, hub, address. Ensure `select_related` / `prefetch_related` is properly utilized.
Ensure zero regressions on the 283 existing unit/integration tests.

Write your exact plan in `c:\Users\maestri33\dev\v7m\backend-v7m\.agents\explorer_m2_3\plan.md` and `handoff.md`.
When done, notify parent (Recipient: f4552d2f-f124-4a09-809d-40580fce9d94) via send_message.
</USER_REQUEST>
