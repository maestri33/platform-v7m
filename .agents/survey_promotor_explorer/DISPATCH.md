## 2026-08-26T18:27:28Z

Task:
Conduct an in-depth survey of the App Promotor (apps/app-promotor) async onboarding architecture and user journey:
1. Explore routes, layouts, pages, and components in apps/app-promotor (dashboard post-login, instant referral link generation, QR code view/copy, smooth scrolling container .app-scroll, deferred KYC / document upload flow, KYC verification status badge/banner).
2. Check how the asynchronous model works: verify that newly logged-in/registered promoters immediately reach the dashboard and get their referral link/QR code without being blocked by linear step-by-step document gates.
3. Identify selectors, classes (.app-scroll, data-testid), states, and relevant backend/mock APIs.
4. Identify existing test files, specs, or gaps in test coverage for Promotor in apps/app-promotor or tooling/qa-audit.

Output:
Write your comprehensive survey report to c:\Users\maestri33\dev\v7m\.agents\survey_promotor_explorer\survey_report.md and a concise handoff.md.
Send a completion message back to the orchestrator referencing the file paths.
