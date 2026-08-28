# Project: V7M Ecosystem Domain Mesh, SSL & DNS Routing Architecture

## Architecture

The V7M / Maestri Group production architecture coordinates traffic ingress across Cloudflare Edge, Cloudflare Pages, Proxmox PVE (`pve-v7m`), and dedicated LXC containers.

```
                                  [ INTERNET ]
                                        │
                         ┌──────────────┴──────────────┐
                         │   Cloudflare Edge (DNS/CDN) │
                         └──────────────┬──────────────┘
                                        │
           ┌────────────────────────────┴────────────────────────────┐
           │                                                         │
   [ Orange Cloud (Proxied) ]                                [ Grey Cloud (DNS Only) ]
   - app.maestri.group                                       - mail.maestri.group
   - hub.maestri.group                                       - webmail.maestri.group
   - admin.maestri.group                                     - MX / SMTP (ports 25, 465, 587)
   - api.maestri.group
   - app.supletivo.net.br
   - api.supletivo.net.br
   - Cloudflare Pages:
     * maestri.group -> landing-promotor.pages.dev
     * supletivo.net.br -> landing-supletivo.pages.dev
           │                                                         │
           └────────────────────────────┬────────────────────────────┘
                                        ▼
                  Proxmox Host: pve-v7m (WAN: 51.79.77.31 / TS: 100.124.1.92)
                                        │
           ┌────────────────────────────┴────────────────────────────┐
           │                     Internal 10.0.1.0/24                │
           ▼                                                         ▼
    CT 110 (10.0.1.10)                                        CT 120 (10.0.1.20)
    Nginx Proxy Manager                                       Stalwart Mail Server
    [Ports: 80, 443, 81]                                      [Ports: 25, 465, 587, 8080]
           │
           ├────────────────────────────┬────────────────────────────┐
           ▼                            ▼                            ▼
    CT 130 (10.0.1.30)           CT 135 (10.0.1.35)           CT 150 (10.0.1.50)
    Bulwark Webmail              OmniRoute AI Gateway         Docker Host V7M
    [Port: 3000]                 [Port: 80 (/v1)]             [Redis: 6380, EvoGo: 4000,
                                                               Backend: 8001, Notify: 8000,
                                                               Apps: 3000,3001,3003,3004]
                                                               └──> DBs: Neon Cloud Serverless
```

---

## Feature Inventory

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Proxmox & LXC Topology Mapping | Document and configure pve-v7m (`51.79.77.31`), CT 110, CT 120, CT 130, CT 135, CT 150 | M1 | Survey |
| 2 | NPM CT 110 Proxy Hosts Routing | Provision proxy host entries for app, hub, admin, api, app.supletivo, api.supletivo, mail, webmail | M1 | Survey / R1 |
| 3 | Bulwark Webmail Proxy Route | Route `webmail.maestri.group` to CT 130 (`10.0.1.30:3000`) with Let's Encrypt SSL | M1 | Survey / R1 |
| 4 | Stalwart Mail JMAP Proxy Route | Route `mail.maestri.group` to CT 120 (`10.0.1.20:8080`) with Let's Encrypt SSL | M1 | Survey / R1 |
| 5 | Cloudflare Pages Custom Domains | Bind `maestri.group` and `www.maestri.group` to `landing-promotor.pages.dev` to resolve Error 525 | M2 | Survey / R2 |
| 6 | Supletivo Pages & DNS Configuration | Bind `supletivo.net.br` and `www.supletivo.net.br` to `landing-supletivo.pages.dev` | M2 | Survey / R2 |
| 7 | Application DNS & Cloudflare Orange Cloud | Set A records for `app`, `hub`, `admin`, `api.maestri.group` and `app`, `api.supletivo.net.br` to `51.79.77.31` (Proxied) | M2 | Survey / R2 |
| 8 | Supletivo IPv6 Clean Topology | Ensure clean IPv6 / IPv4 routing strictly via Cloudflare Proxied edge on `api.supletivo.net.br` | M2 | Survey / R2 |
| 9 | Mail DNS & Cloudflare Grey Cloud | Configure `mail.maestri.group` and `webmail.maestri.group` as Grey Cloud (DNS Only) A records to `51.79.77.31` | M2 | Survey / R2 |
| 10 | Automated Domain Mesh Test Suite | Multi-tier test harness validating DNS, TLS, HTTP status, and JSON contracts for all 12 domains | E2E-Track / M3 | Survey / R3 |
| 11 | Backend Health Contract Validation | Verify `/api/v1/health/healthz` returns `{"status": "ok", "db": true, "migrations_pending": 0}` | E2E-Track / M3 | Survey / R3 |
| 12 | Decommissioned Domain Isolation | Verify complete decoupling and DNS isolation of `job.v7m.org` from production IP `51.79.77.31` | E2E-Track / M3 | Survey / R3 |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Proxmox & NPM Configuration | Map CT containers and configure NPM (CT 110) proxy routes to CT 120, CT 130, CT 150 | none | IN_PROGRESS |
| M2 | Cloudflare DNS, Pages & SSL Resolution | Bind Pages custom domains (fix 525/522), eradicate Hetzner records, configure Orange/Grey cloud DNS | none | IN_PROGRESS |
| E2E | E2E Testing Suite & Infra | Build automated multi-tier domain mesh test harness and publish TEST_READY.md | none | IN_PROGRESS |
| M3 | Final Validation & Adversarial Hardening | Phase 1: Pass 100% E2E test suite (12 domains); Phase 2: Adversarial edge case stress testing | M1, M2, E2E | PLANNED |

---

## Interface Contracts

### 1. NPM (CT 110) Ingress Routing Table
- `app.maestri.group:80/443` -> `http://10.0.1.50:3001` (WebSockets: ON, Block Exploits: ON)
- `hub.maestri.group:80/443` -> `http://10.0.1.50:3004` (WebSockets: ON, Block Exploits: ON)
- `admin.maestri.group:80/443` -> `http://10.0.1.50:3003` (WebSockets: ON, Block Exploits: ON)
- `api.maestri.group:80/443` -> `http://10.0.1.50:8001` (WebSockets: ON, Block Exploits: ON)
- `app.supletivo.net.br:80/443` -> `http://10.0.1.50:3020` (WebSockets: ON, Block Exploits: ON)
- `api.supletivo.net.br:80/443` -> `http://10.0.1.50:8001` (WebSockets: ON, Block Exploits: ON)
- `mail.maestri.group:80/443` -> `http://10.0.1.20:8080` (Let's Encrypt SSL, Grey Cloud)
- `webmail.maestri.group:80/443` -> `http://10.0.1.30:3000` (Let's Encrypt SSL, Grey Cloud)


### 2. Backend Health Contract
- Endpoint: `GET /api/v1/health/healthz`
- Expected Response: `200 OK`
- JSON Schema:
  ```json
  {
    "status": "ok",
    "version": "0.1.0-alpha.1",
    "db": true,
    "migrations_pending": 0,
    "sha": null,
    "built_at": null
  }
  ```

---

## Code Layout

- `scripts/domain-mesh-runner.mjs`: Node.js automated test runner for all 12 domains + isolation checks
- `scripts/verify-endpoints.sh`: Bash/cURL verification suite
- `scripts/e2e-platform-test.mjs`: Monorepo service integration runner
- `services/backend/api/health/router.py`: Django Ninja Health check API
- `tooling/qa-audit/`: Consolidated QA and audit pipelines
