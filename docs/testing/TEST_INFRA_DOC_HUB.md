# E2E Test Infra: Document Hub & Live Status Indicator System

## Test Philosophy
- Requirement-driven and opaque-box.
- Direct verification of visual states, interactive navigation, OCR parsing + kinship transition, contract signature registration, RG vs CNH enforcement, and in-app document viewer modal.
- Multi-app execution against `apps/app-supletivo`, `apps/app-promotor`, and `apps/admin`.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|---------------------|:------:|:------:|:------:|:------:|
| 1 | 6-State Visual Badges (`DutyIconBadge`, `DutyMiniPill`) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 2 | Click-to-Resolve Navigation | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 3 | Dedicated Resolution Routes (`/documentos`) | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 4 | RG vs CNH Strict Regulatory Enforcement | ORIGINAL_REQUEST §R2, §R3 | 5 | 5 | ✓ | ✓ |
| 5 | AddressProofCapture with Kinship Selection | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 6 | Facial Biometrics & Liveness Capture | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 7 | Digital Contract Signing with IP/Timestamp Seal | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 8 | In-App Document Inspector Modal (GET) | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 9 | Dual Persona Folder Support (6-item Promotor vs 8-item Aluno) | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| 10 | Admin Cockpit & Table Status Integration | ORIGINAL_REQUEST §R1, §R2 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- **Test Runners**:
  - `apps/app-supletivo/tests/e2e/document-hub.spec.ts` (Playwright)
  - `apps/app-promotor/tests/e2e/document-hub.spec.ts` (Playwright)
  - `apps/admin/tests/e2e/document-inspector.spec.ts` (Playwright)
- **Commands**:
  - `pnpm --filter @v7m/app-supletivo test:e2e`
  - `pnpm --filter @v7m/app-promotor test:e2e`
  - `pnpm --filter @v7m/admin test:e2e`
  - `pnpm turbo run check-types`
  - `pnpm turbo run lint`

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Target App |
|---|----------|--------------------|------------|
| 1 | Student completes full 8-item academic folder with RG validation, third-party address proof kinship transition, and digital contract signing | F1, F2, F3, F4, F5, F6, F7, F8, F9 | `apps/app-supletivo` |
| 2 | Promoter completes 6-item folder with CNH acceptance, address proof, PIX key confirmation, and partnership contract signing | F1, F2, F3, F4, F5, F7, F8, F9 | `apps/app-promotor` |
| 3 | Admin reviews candidate dossiers, clicks table status pills, tests image zoom/rotation, and uses Document Inspector Modal for approved documents | F1, F2, F8, F10 | `apps/admin` |

## Coverage Thresholds
- Tier 1: ≥5 test cases per feature (happy-path status rendering and default drawer states).
- Tier 2: ≥5 test cases per feature (boundary/error cases: CNH rejection for student, unreadable address proof, missing signature scroll, network timeouts).
- Tier 3: Pairwise combinations (badge click -> drawer open -> sub-form resolve -> badge state change to approved).
- Tier 4: Real-world end-to-end user journeys for both personas and admin staff.
- Tier 5: Adversarial hardening and full type/lint clean pass.
