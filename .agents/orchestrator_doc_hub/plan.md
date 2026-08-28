# Project Plan: Document Hub & Live Status Indicator System

## 1. Overview & Objectives
Build a production-grade Document Hub and Live Status Indicator system across V7M Monorepo frontends (`apps/admin`, `apps/app-promotor`, `apps/app-supletivo`) with shared reactive components in `@v7m/ui`.

## 2. Requirements Decomposition
- **R1: Live Status Icon Indicators**:
  - `DutyIconBadge` & `DutyMiniPill` supporting 6 lifecycle states:
    - empty (⚪)
    - analyzing (🔵)
    - needs_kinship (🟡)
    - needs_action/rejected (🔴)
    - review (🟠)
    - approved/satisfied (🟢)
  - Interactive navigation: click to target document in Resolution Drawer/Hub.
  - Placed in dashboard navigation headers, candidate/student lists, cockpit overviews.

- **R2: Dedicated Resolution Hub & Routes (/documentos)**:
  - Route `/documentos` and inline resolution drawer.
  - Identity upload with RG vs CNH validation (Student: RG only; Promoter: RG/CNH).
  - AddressProofCapture with OCR extraction, zero manual typing, kinship/landlord selection.
  - Facial biometrics & liveness verification with score feedback.
  - Digital contract signing (Promoter Partnership Agreement vs Student EJA Enrollment Contract) with timestamp & IP seal.
  - In-app Document Inspection modal (GET) with preview (PDF/Image), zoom, and download.

- **R3: Dual Persona Architecture**:
  - Promoter: 6-item folder (identity, selfie, address, pix, school_history, contract).
  - Student: 8-item regulatory academic folder (identity [RG only], selfie, address, school_history, civil_certificate, voter_card, military_certificate, contract).

## 3. Milestones & Work Breakdown
- **Phase 0: Survey**: 3 parallel explorers to investigate `packages/ui`, `apps/app-promotor`, `apps/app-supletivo`, `apps/admin`, `packages/api-client`, and existing Playwright tests.
- **Phase 1: Project & Test Architecture**: Merge findings into `PROJECT.md` and `TEST_INFRA.md`.
- **Phase 2: Execution Track**:
  - **Milestone 1**: `@v7m/ui` core components, types, state management, and tests.
  - **Milestone 2**: `apps/app-promotor` & `apps/app-supletivo` integration (Resolution Hub `/documentos`, navigation badges, persona config).
  - **Milestone 3**: `apps/admin` integration (Cockpit indicators, candidate/student table badges, Document Inspector modal).
  - **Milestone 4**: Comprehensive E2E Playwright testing (Tiers 1-4) & Adversarial hardening (Tier 5).
- **Phase 3: Verification & Auditing**:
  - `pnpm turbo run check-types` (0 errors across 8 workspaces).
  - `pnpm turbo run lint` (0 errors).
  - `npx playwright test` (100% passing).
  - Independent forensic audit for integrity.
