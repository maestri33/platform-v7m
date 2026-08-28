# Original User Request

## Initial Request — 2026-08-28T04:26:23Z

Implement a comprehensive, production-grade Document Hub and Live Status Indicator system across the V7M Monorepo frontends (apps/admin, apps/app-promotor, apps/app-supletivo) using shared components from @v7m/ui.

Working directory: c:\Users\maestri33\dev\v7m
Integrity mode: development

Requirements:
### R1. Live Status Icon Indicators (DutyIconBadge & DutyMiniPill)
- Implement compact, reactive status icon indicators in the dashboard navigation headers, candidate/student lists, and cockpit overviews.
- Each badge dynamically reflects the 6 lifecycle states: empty (⚪), analyzing (🔵), needs_kinship (🟡), needs_action/rejected (🔴), review (🟠), and approved/satisfied (🟢).
- Clicking any badge instantly navigates to or opens the dedicated Resolution Hub for that specific document.

### R2. Dedicated Resolution Hub & Routes (/documentos)
- Deliver the full resolution route and drawer where users resolve all document actions without navigating away:
  - Identity Document upload with real-time CNH vs RG enforcement (students: RG only; promoters: RG/CNH).
  - Proof-first Address capture (AddressProofCapture) with automatic OCR extraction, zero manual address typing, and one-touch kinship/landlord relationship confirmation.
  - Facial Biometrics and Liveness verification with score feedback.
  - In-app digital contract signing for both roles (Promoter Partnership Agreement vs Student EJA Enrollment Contract) with timestamp and IP seal.
  - Direct in-app document inspection modal (GET) with zoom, preview (PDF/Image), and download actions for any approved file.

### R3. Dual Persona Architecture (Promotor vs Aluno)
- Support the Promoter's 6-item folder (identity, selfie, address, pix, school_history, contract).
- Support the Student's 8-item regulatory academic folder (identity [RG only], selfie, address, school_history, civil_certificate, voter_card, military_certificate, contract).

Acceptance Criteria:
### Visual & Interactive Verification
- [ ] Clicking any status badge directly opens the targeted document in the Resolution Hub.
- [ ] In-app GET document viewer successfully renders previews and download links for approved documents.
- [ ] Kinship selection modal seamlessly transitions a third-party proof of residence from needs_kinship to approved.
- [ ] Contract signing module registers digital signature and transitions status to approved.

### Technical & Quality Verification
- [ ] TypeScript check (pnpm turbo run check-types) passes with 0 errors across all 8 monorepo workspaces.
- [ ] ESLint check (pnpm turbo run lint) passes with 0 errors.
- [ ] Automated Playwright E2E suite passes (npx playwright test).
