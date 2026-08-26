## 2026-08-23T19:57:57Z

<USER_REQUEST>
You are Explorer M2.2 for Milestone 2 (Database Migrations & ORM Optimization).
Your Working Directory: c:\Users\maestri33\dev\v7m\backend-v7m\.agents\explorer_m2_2\
Project Workspace: c:\Users\maestri33\dev\v7m\backend-v7m
Authoritative Original Request: c:\Users\maestri33\dev\v7m\backend-v7m\.agents\ORIGINAL_REQUEST.md
Master Project Spec: c:\Users\maestri33\dev\v7m\backend-v7m\PROJECT.md
Parent Conversation ID: f4552d2f-f124-4a09-809d-40580fce9d94

Your mission:
Investigate and design precise ORM optimizations to eliminate N+1 query loops in `staff` routers:
1. `api/staff/routers/documents.py:41-45`: Currently loops over enrollments calling `profiles.get(enr.user)`, `RG.objects.filter(user=enr.user)`, and `CNH.objects.filter(user=enr.user)`. Formulate a bulk prefetching / dictionary-map strategy.
2. `api/staff/routers/network.py:30-50`: Nested loops over hubs and promoters with individual `.filter().count()`, `profiles.get()`, and `Student.objects.filter()`. Formulate a batch aggregation and prefetching strategy.
Ensure query counts drop from O(N) to O(1) without breaking any output schema contracts.

Write your exact code optimization plan in `c:\Users\maestri33\dev\v7m\backend-v7m\.agents\explorer_m2_2\plan.md` and `handoff.md`.
When done, notify parent (Recipient: f4552d2f-f124-4a09-809d-40580fce9d94) via send_message.
</USER_REQUEST>
