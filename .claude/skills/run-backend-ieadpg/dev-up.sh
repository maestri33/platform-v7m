#!/usr/bin/env bash
# dev-up.sh — sobe o backend Django 6 (porta 8000) em background.
# Idempotente: se ja tiver rodando, nao duplica. Windows Git Bash.

set -e

UNIT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOG_DIR="${TEMP:-/tmp}/ieadpg-backend-logs"
mkdir -p "$LOG_DIR"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log() { printf "${GREEN}[dev-up]${NC} %s\n" "$*"; }
warn() { printf "${YELLOW}[dev-up]${NC} %s\n" "$*"; }

# Ja esta escutando em :8000?
if cmd //c "netstat -ano" 2>/dev/null | grep -q ":8000.*LISTENING"; then
  warn "Backend ja esta rodando em :8000 — pulando"
  echo "  log: $LOG_DIR/backend.log (de um startup anterior)"
  exit 0
fi

cd "$UNIT_ROOT"

# Ativa .venv (Git Bash no Windows). Se falhar, cai pra python do PATH.
if [ -f .venv/Scripts/activate ]; then
  source .venv/Scripts/activate
elif [ -f .venv/bin/activate ]; then
  source .venv/bin/activate
else
  warn ".venv nao encontrada — usando python do PATH"
fi

log "Subindo backend Django em :8000 (--noreload pra evitar auto-reload durante tests) ..."
nohup python manage.py runserver 0.0.0.0:8000 --noreload \
  > "$LOG_DIR/backend.log" 2>&1 &
echo $! > "$LOG_DIR/backend.pid"
log "Backend PID=$(cat "$LOG_DIR/backend.pid")"
log "Log: $LOG_DIR/backend.log"

# Espera 5s pelo startup e valida
for i in 1 2 3 4 5; do
  sleep 1
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/public/church/setup-status 2>/dev/null | grep -q "200"; then
    log "Backend pronto em http://localhost:8000"
    exit 0
  fi
done

warn "Backend nao respondeu em 5s — checa $LOG_DIR/backend.log"
exit 1
