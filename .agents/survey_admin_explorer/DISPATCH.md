## 2026-08-26T18:27:28Z
Conduct an in-depth survey of the Admin Cockpit, specifically focusing on the Notification Management & Voice Studio TTS features:
1. Explore apps/admin (routes, pages, components, especially /notificacoes, Notification Studio/Cockpit, AI Assist modal/buttons, OmniRoute TTS probe buttons/controls, audio playback, Victor Rule / cross-gender voice selection).
2. Check backend staff endpoints contract in services/backend/api/staff/routers/notify.py and services/backend/integrations/ai/tts.py to see how the frontend interacts with /api/v1/staff/notify/templates/ai-assist, /api/v1/staff/notify/tts/config, /api/v1/staff/notify/tts/probe.
3. Identify existing test files, selectors, mocks, or E2E tests in apps/admin or related test folders.
4. Report all UI elements, data-testid attributes, event handlers, state variables, and expected user journeys for R1.
Output: survey_report.md and handoff.md.
