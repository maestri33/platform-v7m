## 2026-08-26T18:29:16Z
You are Worker M1 for Milestone 1 (Proxmox & NPM Configuration).
Your working directory is: c:\Users\maestri33\dev\v7m\.agents\teamwork_preview_worker_m1
Original Request Path: c:\Users\maestri33\dev\v7m\.agents\ORIGINAL_REQUEST.md
Project Doc Path: c:\Users\maestri33\dev\v7m\PROJECT.md
Survey Report Path: c:\Users\maestri33\dev\v7m\.agents\teamwork_preview_explorer_survey_1\handoff.md

Write Boundaries (Exclusively Owned):
- `docs/infrastructure/proxmox-npm-topology.md`
- `scripts/npm-configure-routes.sh`
- `scripts/npm-routes-manifest.json`

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Instructions:
1. Read `ORIGINAL_REQUEST.md`, `PROJECT.md`, and the survey report in full.
2. Implement and document the comprehensive technical topology and automation scripts for:
   - Proxmox PVE `pve-v7m` (`51.79.77.31` / `100.124.1.92`) and internal subnet `10.0.1.0/24`.
   - CT 110 Nginx Proxy Manager configuration, including all 8 proxy hosts with exact forward hosts, ports, SSL flags, and websocket/exploit block settings:
     * `app.maestri.group` -> `http://10.0.1.50:3001`
     * `hub.maestri.group` -> `http://10.0.1.50:3002`
     * `admin.maestri.group` -> `http://10.0.1.50:3003`
     * `api.maestri.group` -> `http://10.0.1.50:8001`
     * `app.supletivo.net.br` -> `http://10.0.1.50:3000`
     * `api.supletivo.net.br` -> `http://10.0.1.50:8001`
     * `mail.maestri.group` -> `http://10.0.1.20:8080` (Let's Encrypt SSL)
     * `webmail.maestri.group` -> `http://10.0.1.30:3000` (Let's Encrypt SSL)
   - Detailed mapping for CT 120 (Stalwart), CT 130 (Bulwark), CT 135 (OmniRoute), and CT 150 (Docker Host V7M).
3. Validate scripts and configurations syntax.
4. Record your implementation, verification commands, and results in `c:\Users\maestri33\dev\v7m\.agents\teamwork_preview_worker_m1\handoff.md`.
5. Send a completion message to your parent when finished.
