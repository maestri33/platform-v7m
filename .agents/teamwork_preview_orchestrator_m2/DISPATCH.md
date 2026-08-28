# DISPATCH — Sub-Orchestrator M2: Cloudflare DNS, Pages Custom Domains & SSL Edge Resolution
Working Directory: c:\Users\maestri33\dev\v7m\.agents\teamwork_preview_orchestrator_m2
Project Doc: c:\Users\maestri33\dev\v7m\PROJECT.md
Original Request: c:\Users\maestri33\dev\v7m\.agents\ORIGINAL_REQUEST.md
Parent: teamwork_preview_orchestrator_1

## Scope: Milestone 2 (R2)
1. Landing Pages (Cloudflare Pages):
   - Bind `maestri.group` and `www.maestri.group` to `landing-promotor.pages.dev` (resolve Error 525).
   - Bind `supletivo.net.br` and `www.supletivo.net.br` to `landing-supletivo.pages.dev` and eliminate legacy DNS records.
2. Applications and APIs:
   - Configure A records pointing to `51.79.77.31` with Orange Cloud (Proxied) for `app.maestri.group`, `hub.maestri.group`, `admin.maestri.group`, `api.maestri.group`, `app.supletivo.net.br`, `api.supletivo.net.br`.
   - Ensure clean IPv6 / IPv4 routing on `api.supletivo.net.br`.
3. Mail Services:
   - Configure `mail.maestri.group` and `webmail.maestri.group` as Grey Cloud (DNS Only) pointing to `51.79.77.31` with Let's Encrypt certificates.
