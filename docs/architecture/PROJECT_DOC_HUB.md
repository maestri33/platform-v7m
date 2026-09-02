# Project: Document Hub and Live Status Indicator System

## Architecture
The Document Hub and Live Status Indicator system provides a reactive, unified document management and verification experience across the V7M monorepo.
- **Shared UI Layer (`packages/ui`)**: Encapsulates design tokens, 6-state lifecycle indicators (`DutyIconBadge`, `DutyMiniPill`), resolution drawers (`DocumentResolutionDrawer`), inspector modals (`DocumentInspectorModal`), biometrics (`BiometricsLivenessCapture`), address capture (`AddressProofCapture`), and digital contract signing (`ContractSigner`).
- **Promoter & Unified Portal (`apps/group`)**: 6-item folder (identity [RG/CNH], selfie, address, pix, school_history, contract) with reactive header badges, `/vendas` and `/documentos` resolution routes.
- **Student Portal (`apps/supletivo`)**: 8-item regulatory academic folder (identity [strict RG only], selfie, address, school_history, civil_certificate, voter_card, military_certificate, contract) with reactive badges and `/aluno` / `/matricula` routes.
- **Master Admin (`apps/group`)**: Cockpit overview, student/candidate table rows with reactive badges, and in-app Document Inspector Modal.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | 6-State Lifecycle Visual Contract | Unified state mapping (⚪ empty, 🔵 analyzing, 🟡 needs_kinship, 🔴 needs_action, 🟠 review, 🟢 approved) with tokens, icons, and labels | M1 | R1 |
| 2 | DutyIconBadge Component | Interactive, compact status icon badge with reactive status rings/dots and click handler | M1 | R1 |
| 3 | DutyMiniPill Component | Micro status pill with dot indicator and localized state label | M1 | R1 |
| 4 | DocumentResolutionDrawer Component | In-place slide-over/drawer for document action resolution without navigation | M1 | R2 |
| 5 | DocumentInspectorModal Component | In-app GET viewer for approved documents with PDF/Image preview, Pan/Zoom (0.5x-3x), 90° rotation, metadata, download | M1 | R2 |
| 6 | ContractSigner Component | Digital contract signing module with sticky scroll reveal, digital signature capture, timestamp and IP seal | M1 | R2 |
| 7 | BiometricsLivenessCapture Component | Facial webcam capture with oval guide, liveness score indicator, camera flip, and file upload fallback | M1 | R2 |
| 8 | AddressProofCapture Refactoring | Proof-first address capture with automatic OCR extraction and one-touch kinship confirmation | M1 | R2 |
| 9 | Promoter 6-Item Resolution Route (/documentos) | Dedicated resolution route for promoter folder (identity RG/CNH, selfie, address, pix, school_history, contract) | M2 | R2, R3 |
| 10 | Student 8-Item Resolution Route (/documentos) | Dedicated resolution route for student folder (identity [RG only], selfie, address, school_history, civil, voter, military, contract) | M2 | R2, R3 |
| 11 | CNH vs RG Strict Enforcement | Promoter accepts RG or CNH; Student strictly enforces RG and blocks CNH per MEC regulatory rules | M2 | R2, R3 |
| 12 | Navigation Header Live Badges | Reactive badges embedded in AppShell (Promotor) and AppHeader (Supletivo) with click-to-drawer | M2 | R1 |
| 13 | Admin Cockpit & Table Badges | Aggregate queue badge in AppHeader and DutyMiniPill/Badge in candidate, student, and promoter tables | M3 | R1 |
| 14 | Admin Document Inspection Integration | Fast in-app GET inspector modal integrated into admin tables and review desk | M3 | R2 |
| 15 | Multi-App E2E Test Suite | Automated Playwright E2E suite testing badge navigation, OCR kinship, contract signing, RG vs CNH, and document viewer | M4 | AC1-AC4 |
| 16 | Adversarial Hardening & Type Compliance | Tier 5 adversarial edge cases, 100% check-types across 8 workspaces, 0 lint errors | M4 | AC-Tech |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | @v7m/ui Shared Components & State Machine | Implement `DutyIconBadge`, `DutyMiniPill`, `ContractSigner`, `BiometricsLivenessCapture`, `DocumentResolutionDrawer`, `DocumentInspectorModal`, refactor `AddressProofCapture`, and export from `packages/ui` | none | DONE |
| M2 | Portais Resolution Routes & Persona Enforcement | Implement `/documentos` routes, navigation header live badges, RG vs CNH validation, and drawer integration in `apps/app-promotor` & `apps/app-supletivo` | M1 | IN_PROGRESS |
| M3 | Admin Cockpit Indicators & Inspection Integration | Embed `DutyIconBadge` & `DutyMiniPill` across `apps/admin` cockpit & student/candidate tables, connect Inspector Modal | M1, M2 | PLANNED |
| M4 | E2E Testing Suite (Tiers 1-4) & Adversarial Hardening | Playwright tests across Supletivo, Promotor, Admin; verify all acceptance criteria and type-check | M1, M2, M3 | PLANNED |

## Interface Contracts
### @v7m/ui Components Export Contract
- `DutyIconBadge`: `({ documentType: DocumentTypeKey, status: DocumentStatus, size?: "sm" | "md" | "lg", onClick?: () => void, className?: string }) => JSX.Element`
- `DutyMiniPill`: `({ status: DocumentStatus, label?: string, size?: "sm" | "md", onClick?: () => void, className?: string }) => JSX.Element`
- `ContractSigner`: `({ title: string, termsText: string, persona: PersonaType, onSign: (sig: ContractSignature) => Promise<void> | void, isSubmitting?: boolean }) => JSX.Element`
- `BiometricsLivenessCapture`: `({ onCapture: (file: File, score?: number) => void, onCancel?: () => void }) => JSX.Element`
- `DocumentResolutionDrawer`: `({ isOpen: boolean, onClose: () => void, item: DocumentItem | null, persona: PersonaType, onResolve: (itemId: DocumentTypeKey, data: any) => Promise<void> | void }) => JSX.Element`
- `DocumentInspectorModal`: `({ isOpen: boolean, onClose: () => void, item: DocumentItem | null }) => JSX.Element`

### Lifecycle States Contract
```typescript
export type DocumentStatus = "empty" | "analyzing" | "needs_kinship" | "needs_action" | "review" | "approved";
```

## Code Layout
- `packages/ui/src/components/`:
  - `duty-icon-badge.tsx` (NEW)
  - `duty-mini-pill.tsx` (NEW)
  - `contract-signer.tsx` (NEW)
  - `biometrics-liveness-capture.tsx` (NEW)
  - `document-resolution-drawer.tsx` (NEW)
  - `document-inspector-modal.tsx` (NEW)
  - `duty-status-card.tsx` (UPDATED / ALIGNED)
  - `address-proof-capture.tsx` (UPDATED / ALIGNED)
  - `index.ts` (RE-EXPORTS)
- `apps/app-promotor/src/`:
  - `app/(app)/documentos/page.tsx` (NEW / ENHANCED)
  - `components/layout/AppShell.tsx` (HEADER BADGE)
- `apps/app-supletivo/src/`:
  - `app/(app)/documentos/page.tsx` or `app/aluno/documentos/page.tsx` (NEW / ENHANCED)
  - `components/ui/app-header.tsx` (HEADER BADGE)
- `apps/admin/src/`:
  - `components/ui/app-header.tsx` (HEADER BADGE)
  - `components/dashboard/students-manager-tab.tsx` (TABLE BADGES)
  - `components/dashboard/promoters-manager-tab.tsx` (TABLE BADGES)
- Tests:
  - `apps/app-supletivo/tests/e2e/document-hub.spec.ts`
  - `apps/app-promotor/tests/e2e/document-hub.spec.ts`
  - `apps/admin/tests/e2e/document-inspector.spec.ts`
