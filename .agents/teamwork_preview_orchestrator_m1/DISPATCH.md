# DISPATCH — Sub-Orchestrator M1: Proxmox & NPM Configuration
Working Directory: c:\Users\maestri33\dev\v7m\.agents\teamwork_preview_orchestrator_m1
Project Doc: c:\Users\maestri33\dev\v7m\PROJECT.md
Original Request: c:\Users\maestri33\dev\v7m\.agents\ORIGINAL_REQUEST.md
Parent: teamwork_preview_orchestrator_1

## Scope: Milestone 1 (R1)
1. Proxmox PVE `pve-v7m` (`51.79.77.31` / Tailscale `100.124.1.92`) and container validation (CT 110, CT 120, CT 130, CT 135, CT 150).
2. Provision and verify all 8 Nginx Proxy Manager (CT 110) proxy host configurations:
   - `app.maestri.group` -> `http://10.0.1.50:3001`
   - `hub.maestri.group` -> `http://10.0.1.50:3002`
   - `admin.maestri.group` -> `http://10.0.1.50:3003`
   - `api.maestri.group` -> `http://10.0.1.50:8001`
   - `app.supletivo.net.br` -> `http://10.0.1.50:3000`
   - `api.supletivo.net.br` -> `http://10.0.1.50:8001`
   - `mail.maestri.group` -> `http://10.0.1.20:8080` (Let's Encrypt SSL)
   - `webmail.maestri.group` -> `http://10.0.1.30:3000` (Let's Encrypt SSL)
3. Document routing configs and verify proxy routes.
