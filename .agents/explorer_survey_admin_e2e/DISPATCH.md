## 2026-08-28T04:26:58Z

Phase 0 Survey for the Document Hub and Live Status Indicator system.
Working directory: c:\Users\maestri33\dev\v7m\.agents\explorer_survey_admin_e2e
Authoritative request file: c:\Users\maestri33\dev\v7m\.agents\ORIGINAL_REQUEST.md

Mission:
1. Thoroughly explore `apps/admin`:
   - Explore navigation, dashboard/cockpit views, candidate/promotor/student list tables, and how document status badges can be integrated.
   - Check existing document inspection/verification views in admin, and requirements for the Document Inspector Modal (GET) with preview (PDF/Image), zoom, and download actions.
2. Thoroughly explore the test infrastructure:
   - Check `tooling/qa-audit` and any Playwright configs (`playwright.config.ts`), test scripts in root `package.json`, running ports (e.g. 3000, 3001, 3003), and existing tests.
   - Outline how E2E tests can run against all 3 apps to verify live badge rendering, clicking badge -> opens resolution hub, address OCR + kinship selection, contract signing, RG vs CNH validation, and document preview modal.
3. Write a comprehensive survey report to `c:\Users\maestri33\dev\v7m\.agents\explorer_survey_admin_e2e\handoff.md`.
4. Update `c:\Users\maestri33\dev\v7m\.agents\explorer_survey_admin_e2e\progress.md` with your status.
5. Send a message to parent (id: f7eb88c2-2a0e-4074-8ff8-af7660be31a9) with a summary when finished.
