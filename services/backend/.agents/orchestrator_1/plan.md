# Plan: V7M Django Backend Audit, Cleanup & Django Ninja Standardization

## 1. Survey Phase (Phase 0)
- Dispatch 3 parallel Explorers:
  - **Explorer 1 (Architecture & Apps)**: Map apps (`core`, `users`, `hub`, `finance`, `notify`, `integrations.*`), settings, dependencies, models, and domain responsibilities.
  - **Explorer 2 (Speculative & Dead Code)**: Identify unused files, orphan functions/classes, unneeded boilerplate, redundant abstractions, unnecessary middleware/settings.
  - **Explorer 3 (Django Ninja & Tests)**: Inspect all Ninja routers, Pydantic schemas (In, PatchIn, Out, FilterSchema), services, error handling, N+1 patterns, pytest suite, and openapi docs.
- Target Output: Explorer reports in `.agents/explorer_survey_1/`, `.agents/explorer_survey_2/`, `.agents/explorer_survey_3/`.

## 2. Synthesis & Project Specification (Phase 1)
- Synthesize all findings into `PROJECT.md` with:
  - Comprehensive Architecture and Justification for each app.
  - Complete Feature Inventory.
  - Clear Milestone breakdown (M1: Settings/Core Cleanup & Architecture Justification, M2: Domain Apps & Services Standardization, M3: Django Ninja API & Pydantic v2 Refactor, M4: E2E Verification & Test Suite Hardening).
  - Interface contracts and code layout conventions.
- Initialize `TEST_INFRA.md` for the E2E testing track.

## 3. Execution & Verification (Phase 2 & 3)
- Execute implementation milestones using sub-orchestrators or worker-reviewer-challenger-auditor loops.
- Run E2E testing track in parallel to achieve 100% test pass rate across all tiers.
- Enforce strict Forensic Audit gate for zero-tolerance integrity compliance.

## 4. Final Handoff (Phase 4)
- Verify `python manage.py check`, `python manage.py makemigrations --check --dry-run`, `pytest`, and OpenAPI docs `/docs`.
- Author final `handoff.md` and deliver victory claim report.
