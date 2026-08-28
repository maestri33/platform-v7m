# BRIEFING — 2026-08-28T04:35:00Z

## Mission
Phase 0 Survey of apps/app-promotor and apps/app-supletivo for the Document Hub and Live Status Indicator system.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: c:\Users\maestri33\dev\v7m\.agents\explorer_survey_portals
- Original parent: f7eb88c2-2a0e-4074-8ff8-af7660be31a9
- Milestone: Phase 0 Survey (Completed)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Monorepo rules: Next.js 16 App Router, TypeScript check passing, ESLint check passing

## Current Parent
- Conversation ID: f7eb88c2-2a0e-4074-8ff8-af7660be31a9
- Updated: 2026-08-28T04:35:00Z

## Investigation State
- **Explored paths**:
  - `apps/app-promotor`: `src/app/(app)/layout.tsx`, `AppShell.tsx`, `AppNav.tsx`, `painel/page.tsx`, `documento/`, `endereco/`, `pix/`, `escolaridade/`, `selfie/`, API routes (`photo`, `address-proof`, `kinship`, `classify`, `selfie`, `pix`, `education`, `media`).
  - `apps/app-supletivo`: `src/app/matricula/` (`step-rg.tsx`, `step-address.tsx`, `step-education.tsx`, `step-selfie.tsx`, `contract-reveal.tsx`, `kinship-chat.tsx`), `src/app/aluno/` (`document-card.tsx`, `document-upload-sheet.tsx`, `status-badge.tsx`), `src/lib/api.ts`, `src/lib/session.ts`.
  - `packages/ui`: `duty-status-card.tsx`, `address-proof-capture.tsx`, `camera-capture.tsx`, `icon-badge.tsx`.
  - `apps/admin`: `src/app/(app)/documentos/page.tsx`, `dev-preview/documents/page.tsx`, `dev-preview/address/page.tsx`.
  - `apps/hub`: `hub-header.tsx`, candidate and student lists.
- **Key findings**:
  - Promoter folder requires 6 items: `identity` (RG/CNH), `selfie` (biometrics), `address` (OCR + kinship), `pix`, `school_history`, `contract` (Partnership Agreement).
  - Student folder requires 8 regulatory items: `identity` (RG ONLY strictly enforced), `selfie`, `address`, `school_history`, `civil_certificate`, `voter_card`, `military_certificate`, `contract` (EJA Contract).
  - 6 lifecycle states: `empty` (⚪), `analyzing` (🔵), `needs_kinship` (🟡), `needs_action` (🔴), `review` (🟠), `approved` (🟢).
  - Need `DutyIconBadge` & `DutyMiniPill` in headers/lists and `DocumentResolutionDrawer` for seamless in-place action resolution.
- **Unexplored areas**: None for Phase 0 survey.

## Key Decisions Made
- Fully documented findings and blueprints in `handoff.md`.

## Artifact Index
- handoff.md — Comprehensive survey report
- progress.md — Liveness and progress tracker
- DISPATCH.md — Task dispatch log
