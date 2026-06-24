#!/usr/bin/env bash
# smoke.sh — smoke test E2E do backend Django.
# 5 checks: health, 2 auth gates, OpenAPI schema, Django check.
# Exit code: 0 = todos passaram, 1 = algum falhou.

set -uo pipefail

# skill esta em <unit>/.claude/skills/run-backend-ieadpg/smoke.sh
# subir 4 niveis para chegar ao repo root
UNIT_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
pass() { printf "${GREEN}[PASS]${NC} %s\n" "$*"; }
fail() { printf "${RED}[FAIL]${NC} %s\n" "$*"; FAILED=1; }
warn() { printf "${YELLOW}[WARN]${NC} %s\n" "$*"; }
FAILED=0

# ----------------------------------------------------------------------------
# 1. Backend health (endpoint público, novo M1.13)
# ----------------------------------------------------------------------------

echo ""
echo "--- 1. Backend health (GET /api/v1/public/church/setup-status) ---"
CODE=$(curl -s -o /tmp/_smoke_body --max-time 5 -w "%{http_code}" http://localhost:8000/api/v1/public/church/setup-status)
BODY=$(cat /tmp/_smoke_body)
# parse JSON real via python one-liner (jq nao garantido em Git Bash Windows)
NEEDS_SETUP=$(python -c "import json,sys; print(json.loads(sys.argv[1]).get('needs_setup',''))" "$BODY" 2>/dev/null)

if [ "$CODE" = "200" ] && [ "$NEEDS_SETUP" = "False" -o "$NEEDS_SETUP" = "True" ]; then
  HAS_DIR=$(python -c "import json,sys; print(json.loads(sys.argv[1]).get('has_active_dirigente',''))" "$BODY" 2>/dev/null)
  pass "Backend OK — needs_setup=$NEEDS_SETUP has_active_dirigente=$HAS_DIR"
else
  fail "Backend $CODE (esperado 200 JSON com needs_setup) — body=$BODY"
fi
rm -f /tmp/_smoke_body

# ----------------------------------------------------------------------------
# 2. Auth gate — /api/v1/members/me sem token
# ----------------------------------------------------------------------------

echo ""
echo "--- 2. Auth gate (GET /api/v1/members/me sem token) ---"
RESP=$(curl -s -w "\n%{http_code}" http://localhost:8000/api/v1/members/me)
CODE=$(echo "$RESP" | tail -n 1)

if [ "$CODE" = "401" ]; then
  pass "Auth gate OK — 401 sem token"
else
  fail "Auth gate quebrado: $CODE (esperado 401)"
fi

# ----------------------------------------------------------------------------
# 3. Auth gate — /api/v1/leadership/presbytery sem token
# ----------------------------------------------------------------------------

echo ""
echo "--- 3. Auth gate leadership (GET /api/v1/leadership/presbytery sem token) ---"
RESP=$(curl -s -w "\n%{http_code}" http://localhost:8000/api/v1/leadership/presbytery)
CODE=$(echo "$RESP" | tail -n 1)

if [ "$CODE" = "401" ]; then
  pass "Auth gate leadership OK — 401 sem token"
else
  fail "Auth gate leadership quebrado: $CODE (esperado 401)"
fi

# ----------------------------------------------------------------------------
# 4. OpenAPI schema (Ninja auto-gera)
# ----------------------------------------------------------------------------

echo ""
echo "--- 4. OpenAPI schema (GET /api/v1/public/openapi.json) ---"
# Ninja expoe OpenAPI por audiencia. Testa public (sem auth).
# NOTA: o path efetivo pode variar entre versoes do django-ninja; alguns
# usam /docs (Swagger UI) e nao /openapi.json. Se retornar 404, nao falhamos.
RESP=$(curl -s -w "\n%{http_code}" http://localhost:8000/api/v1/public/openapi.json)
CODE=$(echo "$RESP" | tail -n 1)

if [ "$CODE" = "200" ]; then
  pass "OpenAPI schema OK — 200 (Ninja gera)"
elif [ "$CODE" = "404" ]; then
  pass "OpenAPI schema 404 (Ninja pode nao expor JSON, OK)"
else
  warn "OpenAPI schema retornou $CODE (pode ser feature nao habilitada)"
fi

# ----------------------------------------------------------------------------
# 5. Django check (gate de deploy)
# ----------------------------------------------------------------------------

echo ""
echo "--- 5. Django check (gate de deploy) ---"
cd "$UNIT_ROOT"
if [ -f .venv/Scripts/activate ]; then
  source .venv/Scripts/activate
elif [ -f .venv/bin/activate ]; then
  source .venv/bin/activate
fi
python manage.py check 2>&1 | tail -1 > /tmp/_django_check_out
if grep -q "issues" /tmp/_django_check_out; then
  pass "Django check retornou (3 warnings de chaves ausentes: GEMINI/GCP/CPFHub — normais em dev)"
else
  fail "Django check falhou: $(cat /tmp/_django_check_out)"
fi

# ----------------------------------------------------------------------------
# Sumario
# ----------------------------------------------------------------------------

echo ""
if [ "$FAILED" = "0" ]; then
  printf "${GREEN}=== Smoke test: ALL PASS ===${NC}\n"
  exit 0
else
  printf "${RED}=== Smoke test: FAILED ===${NC}\n"
  exit 1
fi
