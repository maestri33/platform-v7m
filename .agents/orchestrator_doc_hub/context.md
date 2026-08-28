# Context: Document Hub & Live Status Indicator System

## Monorepo Context
- **Monorepo**: Turborepo 2 + pnpm workspaces (`pnpm@10.34.5`)
- **Key apps**:
  - `apps/admin`: Next.js 16 Standalone (port 3003)
  - `apps/app-promotor`: Next.js 16 Standalone (port 3001)
  - `apps/app-supletivo`: Next.js 16 Standalone (port 3000)
- **Key packages**:
  - `packages/ui`: Shared design system, Radix primitives, Lucide icons, Tailwind CSS
  - `packages/api-client`: SDK / API types
  - `tooling/qa-audit`: Test suite & Playwright E2E

## Document Lifecycles & States
- `empty` (⚪ / gray)
- `analyzing` (🔵 / blue)
- `needs_kinship` (🟡 / yellow-amber)
- `needs_action` / `rejected` (🔴 / red)
- `review` (🟠 / orange)
- `approved` / `satisfied` (🟢 / green)

## Personas & Item Lists
- **Promoter (6 items)**:
  1. `identity` (RG or CNH)
  2. `selfie` (Biometrics / Liveness)
  3. `address` (AddressProofCapture with kinship)
  4. `pix` (Pix key confirmation)
  5. `school_history`
  6. `contract` (Promoter Partnership Agreement)
- **Student (8 items)**:
  1. `identity` (RG strictly enforced)
  2. `selfie` (Biometrics / Liveness)
  3. `address` (AddressProofCapture with kinship)
  4. `school_history`
  5. `civil_certificate` (Certidão de Nascimento/Casamento)
  6. `voter_card` (Título de Eleitor)
  7. `military_certificate` (Certificado Militar)
  8. `contract` (Student EJA Enrollment Contract)
