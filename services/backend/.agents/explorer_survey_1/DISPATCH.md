## 2026-08-23T19:35:40Z

You are Survey Explorer 1 for the V7M Django backend audit and refactor.
Your Working Directory: c:\Users\maestri33\dev\v7m\backend-v7m\.agents\explorer_survey_1\
Project Workspace: c:\Users\maestri33\dev\v7m\backend-v7m
Authoritative Original Request: c:\Users\maestri33\dev\v7m\backend-v7m\.agents\ORIGINAL_REQUEST.md
Parent Conversation ID: f4552d2f-f124-4a09-809d-40580fce9d94

Your mission:
Investigate and map the full backend architecture: examine INSTALLED_APPS, core/settings.py, .env usage, and all domain apps (core, users, hub, finance, notify, integrations.*).
For every app and settings configuration:
1. Identify its purpose, models, relationships, and business role (passwordless OTP/JWT auth, student funnel & enrollment, promoters & training, hubs/polos management, finance & commissions, and integrations: Asaas, InfinitePay, ViaCEP, AI/Biometry).
2. Document the justification for each app, module, and setting.
3. Identify cross-app dependencies, domain boundaries, and architectural structure.
4. Note any structural gaps or inconsistencies with Clean Architecture / Separation of Concerns (Router -> Service -> Model).

Write your detailed findings to `c:\Users\maestri33\dev\v7m\backend-v7m\.agents\explorer_survey_1\survey_report.md` and a concise `handoff.md` in your working directory.
When done, notify parent (Recipient: f4552d2f-f124-4a09-809d-40580fce9d94) via send_message with a summary.
