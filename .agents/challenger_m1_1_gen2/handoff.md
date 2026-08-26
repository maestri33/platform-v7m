# Challenge & Verification Report: Milestone 1 — Domain Mesh Mapping & Obsolete Domain Elimination

**Challenger:** Challenger 1 (Replacement Gen 2)  
**Working Directory:** `c:\Users\maestri33\dev\v7m\.agents\challenger_m1_1_gen2`  
**Date:** 2026-08-26T15:30:00Z  
**Milestone:** Milestone 1 (Domain Mesh Mapping & Obsolete Domain Elimination)  
**Verdict:** **REQUEST_CHANGES**

---

## 1. Observation

Deep adversarial scanning across all directories (including hidden dot-directories `.github/`, `.claude/`) revealed residual obsolete domain occurrences that were missed during initial survey/worker passes.

### 1.1 Confirmed Residual Obsolete Domain Leaks

1. **`apps/hub/.github/workflows/deploy.yml` (Line 41):**
   ```yaml
   41:           curl -fsS -H 'Host: hub.v7m.org' http://127.0.0.1/ | grep -q 'V7M Hub'
   ```
   *Defect:* Post-deployment health-check uses obsolete host header `hub.v7m.org` instead of `hub.maestri.group`.

2. **`apps/app-promotor/.github/workflows/diagnostics.yml` (Lines 32, 33, 42):**
   ```yaml
   32:           curl -sSI -m 8 https://app.v7m.org/ 2>&1 | head -12 | sanitize || true
   33:           echo "api/version (app.v7m.org): $(curl -fsS -m 8 https://app.v7m.org/api/version 2>&1 || echo 'FALHOU/BLOQUEADO')"
   42:           grep -rn "app\.v7m\.org\|3001" /etc/nginx /etc/caddy /etc/cloudflared /etc/haproxy 2>/dev/null | head -40 | sanitize || echo "(nada encontrado em /etc)"
   ```
   *Defect:* Diagnostic workflow tests egress and public domain against obsolete `https://app.v7m.org/` instead of `https://app.maestri.group/`.

3. **`apps/landing-promotor/.claude/skills/run-landing-promotor/SKILL.md` (Line 208):**
   ```markdown
   208:    `href` is `https://app.v7m.org` (or whatever `PUBLIC_APP_URL` says), not
   ```
   *Defect:* Agent/developer operational skill documentation refers to obsolete CTA destination `https://app.v7m.org` instead of `https://app.maestri.group`.

4. **`apps/app-promotor/.claude/plan/17-frontend-leadership.md` (Lines 7, 211):**
   ```markdown
   7: > Plataforma alvo: **app.v7m.org**. Idioma: identificadores em inglês, texto
   211: 1. **Domínio/deploy de app.v7m.org**: app único Next com route groups
   ```
   *Defect:* Architecture design plan cites target platform domain as `app.v7m.org` instead of `app.maestri.group`.

---

### 1.2 Validated Clean Components
- **`job.v7m.org`:** Confirmed **0 active occurrences** across the entire monorepo.
- **`apps/landing-promotor/src/config.ts` & `astro.config.mjs`:** Clean (`https://maestri.group`, `https://app.maestri.group`).
- **`apps/landing-supletivo/src/config.ts` & `astro.config.mjs`:** Clean (`https://supletivo.net.br`, `https://app.supletivo.net.br`, `CAREERS_URL = https://maestri.group`).
- **`apps/app-promotor/src/app/(app)/painel/page.tsx` & `src/lib/public-config.ts`:** Clean (Referral points to `https://supletivo.net.br/?ref=${session.external_id}`).
- **`apps/app-supletivo/src/app/_lead/flow-data.ts` & `lead-check.spec.ts`:** Clean (Staff gate points to `https://app.maestri.group/login`).
- **`services/notify/mail/templates/v7m.html` & `test_mail_branding.py`:** Clean (Branding points to `app.maestri.group` and `maestri.group`).
- **Landing Unit Tests:** `@v7m/landing-promotor` (13/13 passed), `@v7m/landing-supletivo` (11/11 passed), `services/notify` (5/5 passed).

---

## 2. Logic Chain

1. **Eradication Requirement:**
   - PROJECT.md and ORIGINAL_REQUEST.md require 100% elimination of legacy/obsolete domains (`job.v7m.org`, `app.v7m.org`, `hub.v7m.org`, `staff.v7m.org`, etc.) from all active workflows, deployment scripts, skills, and configuration files.
2. **Failure Analysis:**
   - Workflows in `apps/hub/.github/workflows/deploy.yml` and `apps/app-promotor/.github/workflows/diagnostics.yml` still curl `hub.v7m.org` and `app.v7m.org`. If these workflows run in production or CI, they will fail or check non-existent domains.
   - Associated skill and planning docs still cite `app.v7m.org`.
3. **Conclusion:**
   - Because active workflows contain obsolete domains, Milestone 1 cannot be approved until these 4 files are updated.

---

## 3. Caveats

- Internal corporate mail server configuration `services/notify/deploy/stalwart-mail-server.md` using `mail.v7m.org` and `v7m.org` is legitimate internal mail routing and is NOT a defect.
- The negative assertion test in `services/notify/tests/test_mail_branding.py:63` (`assert "https://app.v7m.org" not in html`) is a valid test and must be preserved.

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

Required remediation:
1. `apps/hub/.github/workflows/deploy.yml` line 41: Replace `Host: hub.v7m.org` with `Host: hub.maestri.group`.
2. `apps/app-promotor/.github/workflows/diagnostics.yml` lines 32, 33, 42: Replace `app.v7m.org` with `app.maestri.group`.
3. `apps/landing-promotor/.claude/skills/run-landing-promotor/SKILL.md` line 208: Replace `https://app.v7m.org` with `https://app.maestri.group`.
4. `apps/app-promotor/.claude/plan/17-frontend-leadership.md` lines 7, 211: Replace `app.v7m.org` with `app.maestri.group`.

---

## 5. Verification Method

To verify after worker applies fixes:

```bash
rg --hidden -i '(app|hub|staff|admin|candidato|ead|job)\.v7m\.org' \
  --glob '!**/.git/**' \
  --glob '!**/.agents/**' \
  --glob '!**/legacy/**' \
  --glob '!PROJECT.md' \
  --glob '!ORIGINAL_REQUEST.md' \
  --glob '!TEST_INFRA.md' \
  --glob '!**/.hypothesis/**' .
```
*Expected result:* Exactly 1 match in `services/notify/tests/test_mail_branding.py:63` (negative assertion test).
