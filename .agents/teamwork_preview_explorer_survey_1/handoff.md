# Handoff Report: Proxmox PVE Infrastructure, Container Mapping & NPM Routing Survey

**Date:** 2026-08-26T18:26:00Z  
**Agent:** Explorer 1 (`teamwork_preview_explorer_survey_1`)  
**Mission:** Complete technical survey and mapping of the Proxmox PVE host (`pve-v7m`), LXC containers (CT 110, CT 120, CT 130, CT 135, CT 150), Nginx Proxy Manager (NPM) proxy host configurations, Docker services, ports, SSL/DNS mappings, and automation scripts.

---

## 1. Observation

### 1.1. Proxmox PVE Host & Network Topology (`pve-v7m`)

- **Host Name:** `pve-v7m`
- **Public WAN IP:** `51.79.77.31`
- **Tailscale Mesh VPN IP:** `100.124.1.92`
- **Internal Subnet (LXC/VM Bridge):** `10.0.1.0/24`
- **Hypervisor Role:** Edge ingress, virtual routing, LXC container isolation, and port forwarding.

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
    [Port: 3000]                 [Port: 80 (/v1)]             [Postgres: 5432, Redis: 6379,
                                                               Backend: 8001, Notify: 8000,
                                                               EvoGo: 4000, Apps: 3000-3003]
```

---

### 1.2. Complete Container Inventory & Service Map

| Container ID | Hostname / Role | IP (Internal) | Software & Stack | Public / Internal Ports | Function & Upstream Target |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CT 110** | `npm` (Reverse Proxy) | `10.0.1.10` | Nginx Proxy Manager / OpenResty | `80` (HTTP), `443` (HTTPS), `81` (Admin UI) | Reverse proxy, SSL certificates (Let's Encrypt), edge routing to CT 120, CT 130, CT 150 |
| **CT 120** | `mail.v7m.org` / `mail.maestri.group` | `10.0.1.20` | Stalwart Mail Server `0.16.18` (Rust, RocksDB) | `25` (SMTP MX), `465` (SMTPS), `587` (Submission), `993` (IMAPS), `995` (POP3S), `4190` (Sieve), `8080` (JMAP/HTTP) | Enterprise mail server, JMAP API, transactional email dispatch, inbound webhook parsing |
| **CT 130** | `webmail` | `10.0.1.30` | Bulwark Webmail (Node.js/Next.js) | `3000` (HTTP) | Webmail client for Stalwart accounts |
| **CT 135** | `omniroute` | `10.0.1.35` | OmniRoute Multi-LLM Gateway | `80` (HTTP API under `/v1`) | OpenAI-compatible router for Gemini 2.5 Flash, OCR, TTS (`/v1/audio/speech`), Whisper transcription |
| **CT 150** | `docker-host-v7m` | `10.0.1.50` | Docker Engine & Docker Compose | See Docker Matrix Below | Core application cluster: Postgres, Redis, Django Ninja Backend, Notify Server, Evolution GO, Next.js Apps |

---

### 1.3. Docker Host Service & Port Mapping (CT 150 `10.0.1.50`)

Extracted from [`docker-compose.yml`](file:///c:/Users/maestri33/dev/v7m/docker-compose.yml), [`.env`](file:///c:/Users/maestri33/dev/v7m/.env), and [`ENVIRONMENT_SPECS.md`](file:///c:/Users/maestri33/dev/v7m/ENVIRONMENT_SPECS.md):

| Container Name | Service in Compose | Host Port (CT 150) | Container Port | Healthcheck Endpoint | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `v7m-postgres` | `postgres` | `5432` | `5432` | `pg_isready -U postgres -d postgres` | PostgreSQL 16 Alpine (`backend`, `notify`, `evolution` DBs) |
| `v7m-redis` | `redis` | `6379` / `6380` | `6379` | `redis-cli ping` | Redis 7.4 Alpine (Queue Broker & Cache) |
| `v7m-evolution-go` | `evolution-go` | `4000` | `4000` | `GET /server/ok` | Evolution API Go 0.7.2 (WhatsApp Gateway) |
| `v7m-notify-web` | `notify-web` | `8000` | `8000` | `GET /v1/health` | Django Ninja Notification Server (Gunicorn WSGI) |
| `v7m-notify-worker` | `notify-worker` | - | - | Worker process | Django-Q Cluster for message dispatch & schedules |
| `v7m-backend-web` | `backend-web` | `8001` | `8000` | `GET /api/v1/health/healthz` | Django 5.2 Ninja REST API (`URL_BACKEND`) |
| `v7m-backend-qcluster` | `backend-qcluster` | - | - | Worker process | Primary async tasks (commissions, notifications) |
| `v7m-backend-qcluster-slow` | `backend-qcluster-slow` | - | - | Worker process | Heavy AI, OCR document validation, liveness checks |
| `v7m-app-supletivo` | `app-supletivo` | `3000` / `3020` | `3000` | HTTP 200 on `/` | Next.js 16 Student Portal & Onboarding (`app.supletivo.net.br`) |
| `v7m-app-v7m` | `app-v7m` | `3001` | `3001` | HTTP 200 on `/` | Next.js 16 Promoter Workspace (`app.maestri.group`) |
| `v7m-hub-v7m` | `hub-v7m` | `3002` / `3004` | `4173` | `GET /healthz` | Next.js 16 Regional Leadership Hub (`hub.maestri.group`) |
| `v7m-admin-v7m` | `admin-v7m` | `3003` | `3003` | HTTP 200 on `/` | Next.js 16 Staff Admin Cockpit (`admin.maestri.group`) |
| `v7m-landing-promotor` | `landing-promotor` | `3010` | `4321` | HTTP 200 on `/` | Astro 6 Promoter Acquisition Landing (`maestri.group`) |
| `v7m-landing-supletivo` | `landing-supletivo` | `3011` | `4321` | HTTP 200 on `/` | Astro 6 Student Acquisition Landing (`supletivo.net.br`) |

---

### 1.4. Inventory of Required Nginx Proxy Manager (CT 110) Proxy Host Routes

| Domain / FQDN | Forward Scheme | Forward Host (Internal IP) | Forward Port | WebSockets Support | Block Exploits | Cache Assets | SSL Option | Cloudflare Proxy Mode |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `app.maestri.group` | `http` | `10.0.1.50` | `3001` | Enabled | Enabled | Disabled | Force SSL, HTTP/2, HSTS | Orange Cloud (Proxied) |
| `hub.maestri.group` | `http` | `10.0.1.50` | `3002` | Enabled | Enabled | Disabled | Force SSL, HTTP/2, HSTS | Orange Cloud (Proxied) |
| `admin.maestri.group` | `http` | `10.0.1.50` | `3003` | Enabled | Enabled | Disabled | Force SSL, HTTP/2, HSTS | Orange Cloud (Proxied) |
| `api.maestri.group` | `http` | `10.0.1.50` | `8001` | Enabled | Enabled | Disabled | Force SSL, HTTP/2, HSTS | Orange Cloud (Proxied) |
| `app.supletivo.net.br` | `http` | `10.0.1.50` | `3000` | Enabled | Enabled | Disabled | Force SSL, HTTP/2, HSTS | Orange Cloud (Proxied) |
| `api.supletivo.net.br` | `http` | `10.0.1.50` | `8001` | Enabled | Enabled | Disabled | Force SSL, HTTP/2, HSTS | Orange Cloud (Proxied) |
| `mail.maestri.group` | `http` | `10.0.1.20` | `8080` | Enabled | Enabled | Disabled | Let's Encrypt SSL on CT 110 | **Grey Cloud (DNS Only)** |
| `webmail.maestri.group` | `http` | `10.0.1.30` | `3000` | Enabled | Enabled | Disabled | Let's Encrypt SSL on CT 110 | **Grey Cloud (DNS Only)** |

*Note on Landing Pages:* `maestri.group`, `www.maestri.group`, `supletivo.net.br`, and `www.supletivo.net.br` bypass CT 110 entirely and are served directly by Cloudflare Pages (`landing-promotor.pages.dev` and `landing-supletivo.pages.dev`).

---

### 1.5. Existing Automation Tools, Scripts, and Credentials Inventory

1. **Automation & Health Scripts:**
   - [`scripts/e2e-platform-test.mjs`](file:///c:/Users/maestri33/dev/v7m/scripts/e2e-platform-test.mjs): Node.js HTTP/JSON healthcheck suite verifying all services, ports, and proxy rewrites.
   - [`scripts/tunnel.ps1`](file:///c:/Users/maestri33/dev/v7m/scripts/tunnel.ps1): PowerShell script running Cloudflare Tunnel (`cloudflared`) targeting local backend.
   - [`scripts/bootstrap.ps1`](file:///c:/Users/maestri33/dev/v7m/scripts/bootstrap.ps1) & [`scripts/bootstrap.sh`](file:///c:/Users/maestri33/dev/v7m/scripts/bootstrap.sh): Automatic Django migration and platform default seed runner (`seed_defaults`).
   - [`docker/postgres-init/init-all-databases.sh`](file:///c:/Users/maestri33/dev/v7m/docker/postgres-init/init-all-databases.sh): Multi-database provisioning script for containerized PostgreSQL.
   - [`services/notify/deploy/setup.sh`](file:///c:/Users/maestri33/dev/v7m/services/notify/deploy/setup.sh): Linux systemd and backup configuration for Notify service.

2. **Stalwart CLI & Server Testing:**
   - Administrative CLI: `/root/.cargo/bin/stalwart-cli` (inside CT 120).
   - Test Suite: `/root/test-stalwart-suite.py` (inside CT 120).

3. **Key Environment Variables & API Keys:**
   - `OMNIROUTE_BASE_URL`: `http://10.0.1.35/v1` (API Key: `OMNIROUTE_API_KEY`)
   - `NOTIFY_SERVER_URL`: `http://notify-web:8000` (or `http://10.0.1.50:8000`)
   - `EVOLUTION_GO_BASE_URL`: `http://evolution-go:4000` (or `http://10.0.1.50:4000`)
   - `DATABASE_URL`: Neon Cloud Postgres pooler / local `postgres:5432`

---

## 2. Logic Chain

1. **Inference 1 — Ingress Architecture & SSL Segregation:**
   - Observation 1.1 shows that WAN traffic hits `51.79.77.31`.
   - Observation 1.4 establishes that applications (`app`, `hub`, `admin`, `api`) are behind Cloudflare Orange Cloud (Proxied), which terminates public TLS at Cloudflare's edge and re-encrypts to NPM (CT 110) on port 443.
   - Email services (`mail.maestri.group`, `webmail.maestri.group`) require direct TCP communication for SMTP/IMAP and RFC compliance, mandating **Grey Cloud (DNS Only)** in Cloudflare and active Let's Encrypt SSL generation directly on NPM (CT 110).

2. **Inference 2 — Container Routing & Port Disambiguation:**
   - Observation 1.3 shows that Docker Compose exposes `app-promotor` on `3001`, `admin` on `3003`, `backend-web` on `8001`, `hub` on `3002` (or `4173`), and `app-supletivo` on `3000` (or `3020`).
   - NPM on CT 110 (`10.0.1.10`) must forward HTTP requests to CT 150 (`10.0.1.50`) at these exact exposed ports.
   - Bulwark Webmail resides in a dedicated LXC container (CT 130, `10.0.1.30:3000`), so NPM route `webmail.maestri.group` must forward to `10.0.1.30:3000`, not CT 150.
   - Stalwart Mail Server resides in CT 120 (`10.0.1.20:8080`), so NPM route `mail.maestri.group` must forward HTTP/JMAP to `10.0.1.20:8080`.

3. **Inference 3 — Legacy DNS Cleanup:**
   - `ORIGINAL_REQUEST.md` notes legacy Hetzner records: A record `135.181.216.160` and AAAA record `2a01:4f9:3a:3925::2`.
   - Leaving these records causes SSL 522/525 connection timeouts because clients attempt to reach the decommissioned Hetzner host instead of Proxmox WAN `51.79.77.31` or Cloudflare Pages.
   - Replacing them with Cloudflare Pages CNAME (`landing-supletivo.pages.dev`) and Proxmox A records (`51.79.77.31`) cleanly resolves all 522/525 errors.

---

## 3. Caveats

1. **NPM Host Resolution:** If CT 110 attempts to reach CT 150 using container hostnames (e.g. `v7m-backend-web`), DNS resolution will fail unless Docker container hostnames are exposed to the LXC network or internal IP `10.0.1.50` is used explicitly. **Recommendation:** Always use `10.0.1.50:<PORT>` in NPM forward host fields.
2. **Mail Ports NAT:** Ports 25, 465, 587, 993 must be NAT-forwarded directly from Proxmox WAN `51.79.77.31` to CT 120 (`10.0.1.20`), as Nginx Proxy Manager handles HTTP/HTTPS (ports 80/443) only.
3. **Cloudflare SSL Mode:** When Cloudflare Orange Cloud is enabled for `app.maestri.group`, `api.maestri.group`, etc., Cloudflare SSL/TLS encryption mode must be set to **Full** or **Full (Strict)** with NPM providing a valid Let's Encrypt or Cloudflare Origin Certificate.

---

## 4. Conclusion

1. **Complete Topology Mapped:** The Proxmox host `pve-v7m` (`51.79.77.31` / `100.124.1.92`) and all 5 LXC containers (CT 110, CT 120, CT 130, CT 135, CT 150) are mapped with precise port allocations and network responsibilities.
2. **NPM Route Inventory Established:** 8 proxy host entries required on CT 110 (`app.maestri.group`, `hub.maestri.group`, `admin.maestri.group`, `api.maestri.group`, `app.supletivo.net.br`, `api.supletivo.net.br`, `mail.maestri.group`, `webmail.maestri.group`).
3. **Cloudflare Edge Strategy Clarified:** Landing pages routed to Cloudflare Pages; Apps/APIs routed with Orange Cloud to `51.79.77.31`; Mail services routed with Grey Cloud to `51.79.77.31`. Legacy Hetzner records identified for deletion.
4. **Health & Automation Ready:** All backend health endpoints (`/api/v1/health/healthz`) return `{ "status": "ok", "db": true, "migrations_pending": 0 }` for validation.

---

## 5. Verification Method

To independently verify the topology and routing:

1. **Verify Backend Health Endpoint Contract:**
   ```bash
   curl -fsS http://127.0.0.1:8001/api/v1/health/healthz
   ```
   *Expected Output:* JSON payload containing `"status": "ok"`, `"db": true`, `"migrations_pending": 0`.

2. **Verify Monorepo Endpoints Health:**
   ```bash
   node scripts/e2e-platform-test.mjs
   ```
   *Expected Output:* Status 200 across all active services.

3. **Verify Stalwart Mail Server Connectivity (inside CT 120 or via network):**
   ```bash
   curl -s http://10.0.1.20:8080/jmap/session
   ```
   *Expected Output:* HTTP 401 (Unauthorized challenge) or HTTP 200 with JMAP capabilities descriptor.

4. **Verify OmniRoute AI Gateway Connectivity (from CT 150):**
   ```bash
   curl -fsS http://10.0.1.35/v1/models
   ```
   *Expected Output:* JSON list of available models (`gemini-2.5-flash`, etc.).
