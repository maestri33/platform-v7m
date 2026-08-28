## 2026-08-28T05:09:37Z
You are the Worker implementing Milestone 2 (M2: Portais Resolution Routes & Persona Enforcement) for the Document Hub and Live Status Indicator system.
Your working directory is: c:\Users\maestri33\dev\v7m\.agents\worker_m2_portals
Authoritative request file: c:\Users\maestri33\dev\v7m\.agents\ORIGINAL_REQUEST.md
Scope document: c:\Users\maestri33\dev\v7m\PROJECT.md
Portals survey: c:\Users\maestri33\dev\v7m\.agents\explorer_survey_portals\handoff.md
UI components handoff: c:\Users\maestri33\dev\v7m\.agents\worker_m1_ui\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File Boundaries & Exclusive Write Ownership:
- apps/app-promotor/src/app/(app)/documentos/page.tsx
- apps/app-promotor/src/components/layout/AppShell.tsx
- apps/app-promotor/src/components/layout/AppNav.tsx
- apps/app-supletivo/src/app/documentos/page.tsx (and/or apps/app-supletivo/src/app/aluno/documentos/page.tsx)
- apps/app-supletivo/src/components/ui/app-header.tsx

Detailed Tasks:
1. Implement the dedicated Resolution Route in `apps/app-promotor/src/app/(app)/documentos/page.tsx`:
   - 6-item folder: `identity` (RG/CNH), `selfie`, `address`, `pix`, `school_history`, `contract`.
   - Uses `DocumentHubGrid`, `DutyStatusCard`, `DutyIconBadge`, `DutyMiniPill`, `DocumentResolutionDrawer`, `DocumentInspectorModal` from `@v7m/ui`.
   - Real-time RG or CNH dual acceptance for promoters.
   - Address proof with automated OCR + kinship confirmation.
   - Facial biometrics & liveness score feedback.
   - Digital contract signing (Promoter Partnership Agreement with timestamp and IP seal).
   - In-app GET document viewer modal for approved files.
2. Update `apps/app-promotor/src/components/layout/AppShell.tsx` and `AppNav.tsx`:
   - Embed reactive `DutyIconBadge` and/or `DutyMiniPill` in the header showing overall document compliance state.
   - Clicking badge navigates to `/documentos` or opens the resolution drawer for pending documents.
3. Implement the dedicated Resolution Route in `apps/app-supletivo`:
   - Deliver `/documentos` (and/or `/aluno/documentos`) rendering the 8-item regulatory academic folder: `identity` (RG strictly enforced), `selfie`, `address`, `school_history`, `civil_certificate`, `voter_card`, `military_certificate`, `contract`.
   - Strict regulatory enforcement: Reject CNH per MEC rules; require RG/CIN.
   - AddressProofCapture with OCR extraction and kinship confirmation chips.
   - Biometrics liveness capture.
   - Digital Student EJA Enrollment Contract signing with scroll reveal unlock and digital seal.
   - Document Inspector Modal `[GET]` for approved documents.
4. Update `apps/app-supletivo/src/components/ui/app-header.tsx`:
   - Embed reactive `DutyMiniPill` showing status in header.
   - Clicking badge navigates to `/documentos` or opens the drawer.
5. Verify build and types:
   - `pnpm --filter @v7m/app-promotor check-types`
   - `pnpm --filter @v7m/app-supletivo check-types`
   - `pnpm turbo run check-types`
   - `pnpm turbo run build --filter=@v7m/app-promotor --filter=@v7m/app-supletivo`
6. Write completion handoff report to `c:\Users\maestri33\dev\v7m\.agents\worker_m2_portals\handoff.md`.
7. Send a message to parent (id: f7eb88c2-2a0e-4074-8ff8-af7660be31a9) with summary when finished.

## 2026-08-28T05:20:18Z
**Context**: Milestone 2 Portal Integration
**Content**: Checking in on progress. Have you completed reading the reference files and started implementing the portal routes in apps/app-promotor and apps/app-supletivo?
**Action**: Please report current status and proceed with implementation.
