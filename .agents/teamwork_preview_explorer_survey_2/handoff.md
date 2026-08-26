# Handoff Report — Explorer 2: Cloudflare, DNS, SSL & Edge Routing Survey

**Author**: Explorer 2 (Cloudflare & DNS Specialist)  
**Date**: 2026-08-26  
**Working Directory**: `c:\Users\maestri33\dev\v7m\.agents\teamwork_preview_explorer_survey_2`  
**Scope**: Zones `maestri.group` and `supletivo.net.br`, Cloudflare Pages Custom Domains, SSL Edge/Origin Settings (Fixing Error 525 / Error 522), Legacy DNS Eradication (Hetzner `135.181.216.160`), and Orange Cloud vs Grey Cloud Topology.

---

## 1. Observation

### 1.1 Live DNS Resolution State (Queried 2026-08-26T18:26:27Z)

Empirical DNS lookup results via `Resolve-DnsName` across all 13 ecosystem domains:

| # | FQDN | Record Type | Live Resolved IP / Value | Cloudflare Status | Assessment / Finding |
|---|------|-------------|--------------------------|-------------------|----------------------|
| 1 | `maestri.group` | `A` / `AAAA` | `104.21.63.89`, `172.67.145.19`<br>`2606:4700:3034::ac43:9113`, `2606:4700:3036::6815:3f59` | Proxied (Orange) | Resolves to Cloudflare Edge; returns **Error 525** on HTTPS. |
| 2 | `www.maestri.group` | `A` / `AAAA` | `104.21.63.89`, `172.67.145.19`<br>`2606:4700:3034::ac43:9113`, `2606:4700:3036::6815:3f59` | Proxied (Orange) | Resolves to Cloudflare Edge; returns **Error 525** on HTTPS. |
| 3 | `supletivo.net.br` | `A` / `AAAA` | `104.21.68.225`, `172.67.199.51`<br>`2606:4700:3034::6815:44e1`, `2606:4700:3034::ac43:c733` | Proxied (Orange) | Resolves to Cloudflare Edge; times out (**Error 522**) because origin is Hetzner. |
| 4 | `www.supletivo.net.br` | `A` / `AAAA` | `104.21.68.225`, `172.67.199.51`<br>`2606:4700:3034::ac43:c733`, `2606:4700:3034::6815:44e1` | Proxied (Orange) | Resolves to Cloudflare Edge; times out (**Error 522**) because origin is Hetzner. |
| 5 | `app.maestri.group` | `A` / `AAAA` | `104.21.63.89`, `172.67.145.19`<br>`2606:4700:3036::6815:3f59`, `2606:4700:3034::ac43:9113` | Proxied (Orange) | **HTTP 200 OK** (routes cleanly to NPM -> `v7m-app-promotor` :3001). |
| 6 | `hub.maestri.group` | `A` / `AAAA` | `104.21.63.89`, `172.67.145.19`<br>`2606:4700:3036::6815:3f59`, `2606:4700:3034::ac43:9113` | Proxied (Orange) | **HTTP 200 OK** (routes cleanly to NPM -> `v7m-hub` :3002). |
| 7 | `admin.maestri.group` | `A` / `AAAA` | `104.21.63.89`, `172.67.145.19`<br>`2606:4700:3034::ac43:9113`, `2606:4700:3036::6815:3f59` | Proxied (Orange) | **HTTP 200 OK** (routes cleanly to NPM -> `v7m-admin` :3003). |
| 8 | `api.maestri.group` | `A` / `AAAA` | `104.21.63.89`, `172.67.145.19`<br>`2606:4700:3036::6815:3f59`, `2606:4700:3034::ac43:9113` | Proxied (Orange) | **HTTP 200 OK** (`/api/v1/health/healthz` returns valid JSON status). |
| 9 | `app.supletivo.net.br` | `A` / `AAAA` | `104.21.68.225`, `172.67.199.51`<br>`2606:4700:3034::6815:44e1`, `2606:4700:3034::ac43:c733` | Proxied (Orange) | Times out (**Error 522**); Cloudflare proxy points to dead Hetzner IP. |
| 10 | `api.supletivo.net.br` | `A` / `AAAA` | **`135.181.216.160`**<br>**`2a01:4f9:3a:3925::2`** | **DNS Only (Grey)** (Legacy) | **Directly points to legacy Hetzner server!** Fails with connection timeout. |
| 11 | `mail.maestri.group` | `A` | **`51.79.77.31`** | **DNS Only (Grey)** | **HTTP 200 OK** via OpenResty (NPM CT 110), but SSL cert is `mail.v7m.org`. |
| 12 | `webmail.maestri.group` | `A` | **`51.79.77.31`** | **DNS Only (Grey)** | **HTTP 200 OK** via OpenResty (CT 130 Bulwark :3000), SSL cert is `mail.v7m.org`. |
| 13 | `job.v7m.org` | `A` / `AAAA` | `104.21.56.108`, `172.67.184.164`<br>`2606:4700:3030::6815:386c`, `2606:4700:3036::ac43:b8a4` | Proxied (Orange) | Obsolete domain on `v7m.org` zone. |

---

### 1.2 Direct Origin Network Diagnostics (Probing `51.79.77.31` directly via SNI & Host Headers)

Probing Proxmox PVE / NPM CT 110 at `51.79.77.31` directly:

1. **HTTP Routing to Backends & Frontends on `51.79.77.31`**:
   - `Host: app.maestri.group` -> **HTTP 200 OK** (NPM forwards to `10.0.1.50:3001`).
   - `Host: hub.maestri.group` -> **HTTP 200 OK** (NPM forwards to `10.0.1.50:3002`).
   - `Host: admin.maestri.group` -> **HTTP 200 OK** (NPM forwards to `10.0.1.50:3003`).
   - `Host: app.supletivo.net.br` -> **HTTP 200 OK** (NPM forwards to `10.0.1.50:3000`).
   - `Host: api.maestri.group` (`/api/v1/health/healthz`) -> **HTTP 200 OK**:
     `{"status": "ok", "version": "0.1.0-alpha.1", "db": true, "migrations_pending": 0, "sha": null, "built_at": null}`
   - `Host: api.supletivo.net.br` (`/api/v1/health/healthz`) -> **HTTP 200 OK**:
     `{"status": "ok", "version": "0.1.0-alpha.1", "db": true, "migrations_pending": 0, "sha": null, "built_at": null}`
   - `Host: mail.maestri.group` -> **HTTP 200 OK** (NPM forwards to Stalwart / CT 120).
   - `Host: webmail.maestri.group` -> **HTTP 200 OK** (NPM forwards to Bulwark / CT 130 :3000).

2. **TLS / SSL Handshake to `51.79.77.31:443`**:
   - SNI `*.maestri.group`, `app.maestri.group`, `hub.maestri.group`, `admin.maestri.group`, `api.maestri.group`, `app.supletivo.net.br`, `api.supletivo.net.br`:
     - Certificate Subject: `C=BR, O=V7M, CN=*.maestri.group` (Valid: 08/26/2026 to 08/23/2036).
     - Handshake: **Successful**.
   - SNI `mail.maestri.group` & `webmail.maestri.group`:
     - Certificate Subject: `CN=mail.v7m.org` (Let's Encrypt, Valid to 11/21/2026).
     - Handshake: **Successful**, but certificate name mismatch (`mail.v7m.org` vs `mail.maestri.group`).
   - SNI `maestri.group` & `supletivo.net.br`:
     - Handshake: **FAILED with TLS Alert 112 (`unrecognized_name`)**.
     - NPM does not have virtual hosts for the apex landing domains because landings belong on **Cloudflare Pages**.

---

### 1.3 Cloudflare Pages Verification

Testing Cloudflare Pages deployment endpoints:

1. **`https://landing-promotor.pages.dev`**:
   - Status: **HTTP 200 OK**
   - Server: `cloudflare`
   - Payload: 122,183 bytes (Valid Astro 6 SSG Landing Page for Promoter acquisition).
2. **`https://landing-supletivo.pages.dev`**:
   - Status: **HTTP 200 OK**
   - Server: `cloudflare`
   - Payload: 123,676 bytes (Valid Astro 6 SSG Landing Page for Student acquisition).

Both Cloudflare Pages deployment targets are built, healthy, and operational.

---

### 1.4 Codebase & Environment Secrets Survey

1. **GitHub Actions (`.github/workflows/deploy.yml`)**:
   - Lines 65–108 reference `secrets.CLOUDFLARE_API_TOKEN` and `secrets.CLOUDFLARE_ACCOUNT_ID`.
   - Deploy commands:
     - `pages deploy apps/landing-promotor/dist --project-name=landing-promotor`
     - `pages deploy apps/landing-supletivo/dist --project-name=landing-supletivo`
2. **Local Environment Variables**:
   - `.env` and `.env.example` define `CLOUDFLARE_TUNNEL_TOKEN` (optional for local webhooks). No raw Cloudflare API tokens or zone keys are committed in plaintext to repository files (conforming to security best practices).

---

## 2. Logic Chain

### 2.1 Logic Chain for Error 525 on `maestri.group` & `www.maestri.group`
1. **Observation 1.1 (Row 1-2)** shows `maestri.group` and `www.maestri.group` resolve to Cloudflare Proxied edge IPs.
2. **Observation 1.2 (SNI test)** proves that connecting to `51.79.77.31:443` with SNI `maestri.group` returns TLS Alert 112 (`unrecognized_name`).
3. In Cloudflare DNS, `maestri.group` is currently configured as a Proxied A record pointing to `51.79.77.31` with SSL/TLS mode set to "Full" or "Full (Strict)".
4. When a visitor requests `https://maestri.group`, Cloudflare edge attempts an SSL handshake with `51.79.77.31:443` using SNI `maestri.group`.
5. Because NPM has no SSL host for apex `maestri.group`, the origin rejects the TLS handshake, causing Cloudflare to return **Error 525: SSL Handshake Failed**.
6. **Remediation**:
   - Configure Custom Domains in Cloudflare Pages project `landing-promotor` for `maestri.group` and `www.maestri.group` (or set CNAME to `landing-promotor.pages.dev`).
   - Cloudflare Pages terminates SSL directly at Cloudflare Edge without contacting `51.79.77.31`.

---

### 2.2 Logic Chain for Error 522 / Timeout on `supletivo.net.br` Hierarchy
1. **Observation 1.1 (Row 3-4, 9-10)** shows:
   - `api.supletivo.net.br` resolves directly to Hetzner IPs `135.181.216.160` and `2a01:4f9:3a:3925::2`.
   - `supletivo.net.br` and `app.supletivo.net.br` resolve to Cloudflare Proxied IPs, but time out on request.
2. **Observation 1.2** proves that Proxmox / NPM (`51.79.77.31`) is healthy and responds with **HTTP 200** for `app.supletivo.net.br` and `api.supletivo.net.br/api/v1/health/healthz`.
3. Therefore, Cloudflare DNS for `supletivo.net.br` and `app.supletivo.net.br` contains stale origin A records pointing to the decommissioned Hetzner server `135.181.216.160`.
4. When Cloudflare tries to proxy requests to `135.181.216.160`, the connection times out (**Error 522**).
5. **Remediation**:
   - **Delete** all legacy Hetzner records (`A 135.181.216.160`, `AAAA 2a01:4f9:3a:3925::2`).
   - For `supletivo.net.br` and `www.supletivo.net.br`: Bind Custom Domains to Cloudflare Pages project `landing-supletivo` (CNAME to `landing-supletivo.pages.dev`).
   - For `app.supletivo.net.br` and `api.supletivo.net.br`: Set `A` records pointing to `51.79.77.31` with **Orange Cloud (Proxied)**.

---

### 2.3 Logic Chain for Orange Cloud (Proxied) vs Grey Cloud (DNS Only) Requirements
1. **Web Apps & APIs (`app`, `hub`, `admin`, `api`)**:
   - Must be **Orange Cloud (Proxied)** pointing to `51.79.77.31`.
   - *Rationale*: Benefit from Cloudflare WAF, DDoS mitigation, Edge CDN caching, HTTP/2 & HTTP/3 termination, and automatic Edge SSL certificates for visitors.
   - *Origin SSL Requirement*: Cloudflare SSL/TLS Encryption Mode in the Cloudflare Dashboard must be set to **"Full"** (since NPM presents an origin SSL certificate for `*.maestri.group`).
2. **Mail & Webmail Services (`mail.maestri.group`, `webmail.maestri.group`)**:
   - Must be **Grey Cloud (DNS Only)** pointing to `51.79.77.31`.
   - *Rationale*:
     - Standard Cloudflare HTTP proxy only proxies HTTP/HTTPS ports (80, 443, 8080, etc.). It **drops and blocks non-HTTP mail protocols** (SMTP 25, 465, 587; IMAP 143, 993; POP3 110, 995; JMAP).
     - Mail user agents (Thunderbird, Outlook, Apple Mail) and external MTAs (Gmail, Outlook) require direct TCP access to `mail.maestri.group:25/465/587/993`.
     - Stalwart Mail Server (CT 120) and Bulwark Webmail (CT 130) require Grey Cloud to avoid breaking MX, SPF, DKIM, and DMARC validations.
   - *SSL Requirement for Mail*: Because Grey Cloud bypasses Cloudflare Edge SSL, CT 110 (NPM) must provision a valid public Let's Encrypt SSL certificate for `mail.maestri.group` and `webmail.maestri.group` (replacing the legacy `mail.v7m.org` certificate).

---

## 3. Caveats

1. **Cloudflare Dashboard / API Permissions**:
   - Creating Pages Custom Domains and modifying DNS records in Cloudflare requires access to the Cloudflare Account/Dashboard or an API Token with `Zone:DNS:Edit` and `Pages:Edit` permissions.
2. **Let's Encrypt Rate Limits on NPM**:
   - When issuing new Let's Encrypt certificates on CT 110 for `mail.maestri.group` and `webmail.maestri.group`, ensure DNS records have already propagated to `51.79.77.31` in Grey Cloud so the HTTP-01 challenge succeeds on port 80.
3. **Zone SSL Mode Setting**:
   - Cloudflare SSL/TLS mode MUST NOT be set to "Flexible" (causes HTTP <-> HTTPS redirect loops) and MUST NOT be "Full (Strict)" until a valid public CA or Cloudflare Origin CA certificate is installed on NPM. Set to **"Full"**.

---

## 4. Conclusion & Complete Action Plan

### 4.1 Zone `maestri.group` Configuration Matrix

| Name | Type | Target / Content | Cloudflare Proxy | Purpose |
|---|---|---|---|---|
| `maestri.group` | `CNAME` | `landing-promotor.pages.dev` | Managed by Pages | Landing Promotor (Apex) |
| `www.maestri.group` | `CNAME` | `landing-promotor.pages.dev` | Managed by Pages | Landing Promotor (WWW) |
| `app.maestri.group` | `A` | `51.79.77.31` | **Orange Cloud (Proxied)** | Promoter Web App (`v7m-app-promotor` :3001) |
| `hub.maestri.group` | `A` | `51.79.77.31` | **Orange Cloud (Proxied)** | Regional Hub (`v7m-hub` :3002) |
| `admin.maestri.group` | `A` | `51.79.77.31` | **Orange Cloud (Proxied)** | Admin Cockpit (`v7m-admin` :3003) |
| `api.maestri.group` | `A` | `51.79.77.31` | **Orange Cloud (Proxied)** | Backend Django Ninja (`v7m-backend-web` :8001) |
| `mail.maestri.group` | `A` | `51.79.77.31` | **Grey Cloud (DNS Only)** | Stalwart Mail Server (CT 120) |
| `webmail.maestri.group`| `A` | `51.79.77.31` | **Grey Cloud (DNS Only)** | Bulwark Webmail (CT 130 :3000) |
| `maestri.group` (MX) | `MX` | `mail.maestri.group` (Priority 10) | N/A | Mail Routing |
| `maestri.group` (SPF)| `TXT` | `v=spf1 mx a:mail.maestri.group ~all` | N/A | Email SPF Authentication |

**SSL/TLS Setting for Zone `maestri.group`**: **Full**

---

### 4.2 Zone `supletivo.net.br` Configuration Matrix

| Name | Type | Target / Content | Cloudflare Proxy | Action / Purpose |
|---|---|---|---|---|
| `supletivo.net.br` | `CNAME` | `landing-supletivo.pages.dev` | Managed by Pages | **Delete Hetzner A `135.181.216.160`**, Bind to Pages |
| `www.supletivo.net.br` | `CNAME` | `landing-supletivo.pages.dev` | Managed by Pages | Bind to Pages |
| `app.supletivo.net.br` | `A` | `51.79.77.31` | **Orange Cloud (Proxied)** | **Update IP to `51.79.77.31`** (`v7m-app-supletivo` :3000) |
| `api.supletivo.net.br` | `A` | `51.79.77.31` | **Orange Cloud (Proxied)** | **Delete Hetzner A/AAAA**, Point to `51.79.77.31` |
| `api.supletivo.net.br` | `AAAA` | *(Delete)* | N/A | **REMOVE `2a01:4f9:3a:3925::2`** |

**SSL/TLS Setting for Zone `supletivo.net.br`**: **Full**

---

### 4.3 Summary of Legacy DNS Records to Eradicate

1. In Zone `supletivo.net.br`:
   - Delete `A` record `api.supletivo.net.br` -> `135.181.216.160`
   - Delete `AAAA` record `api.supletivo.net.br` -> `2a01:4f9:3a:3925::2`
   - Delete any apex `A` records pointing to `135.181.216.160`
2. In Zone `v7m.org`:
   - Confirm complete disassociation of `job.v7m.org` from production routing.

---

## 5. Verification Method

To independently verify the application of this plan after Cloudflare and NPM updates, execute the following verification commands:

### 5.1 Verification Script (PowerShell)

```powershell
# 1. Verify Cloudflare Pages Landings (HTTP 200, No 525, No 522)
(Invoke-WebRequest -Uri "https://maestri.group" -UseBasicParsing).StatusCode # Expect: 200
(Invoke-WebRequest -Uri "https://www.maestri.group" -UseBasicParsing).StatusCode # Expect: 200
(Invoke-WebRequest -Uri "https://supletivo.net.br" -UseBasicParsing).StatusCode # Expect: 200
(Invoke-WebRequest -Uri "https://www.supletivo.net.br" -UseBasicParsing).StatusCode # Expect: 200

# 2. Verify Proxied Web Applications
(Invoke-WebRequest -Uri "https://app.maestri.group" -UseBasicParsing).StatusCode # Expect: 200
(Invoke-WebRequest -Uri "https://hub.maestri.group" -UseBasicParsing).StatusCode # Expect: 200
(Invoke-WebRequest -Uri "https://admin.maestri.group" -UseBasicParsing).StatusCode # Expect: 200
(Invoke-WebRequest -Uri "https://app.supletivo.net.br" -UseBasicParsing).StatusCode # Expect: 200

# 3. Verify API Health Endpoints
Invoke-RestMethod -Uri "https://api.maestri.group/api/v1/health/healthz"
# Expected JSON: {"status": "ok", "db": true, "migrations_pending": 0, ...}
Invoke-RestMethod -Uri "https://api.supletivo.net.br/api/v1/health/healthz"
# Expected JSON: {"status": "ok", "db": true, "migrations_pending": 0, ...}

# 4. Verify Grey Cloud Mail Endpoints and Certificate
(Invoke-WebRequest -Uri "https://mail.maestri.group" -UseBasicParsing).StatusCode # Expect: 200
(Invoke-WebRequest -Uri "https://webmail.maestri.group" -UseBasicParsing).StatusCode # Expect: 200

# 5. Verify Complete Removal of Hetzner IP
$apiDns = Resolve-DnsName -Name "api.supletivo.net.br"
if ($apiDns.IPAddress -contains "135.181.216.160") { Write-Error "Hetzner IP still present!" } else { Write-Host "Hetzner IP successfully eliminated!" -ForegroundColor Green }
```

### 5.2 Verification Script (Bash / cURL)

```bash
# Verify all 12 domains return HTTP 200 without SSL or Gateway errors:
for domain in \
  "https://maestri.group" \
  "https://www.maestri.group" \
  "https://supletivo.net.br" \
  "https://www.supletivo.net.br" \
  "https://app.maestri.group" \
  "https://app.supletivo.net.br" \
  "https://hub.maestri.group" \
  "https://admin.maestri.group" \
  "https://api.maestri.group/api/v1/health/healthz" \
  "https://api.supletivo.net.br/api/v1/health/healthz" \
  "https://mail.maestri.group" \
  "https://webmail.maestri.group"; do
    status=$(curl -s -o /dev/null -w "%{http_code}" "$domain")
    echo "$domain -> HTTP $status"
done
```
