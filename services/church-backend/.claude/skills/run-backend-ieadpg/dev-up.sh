#!/usr/bin/env bash
# dev-up.sh — sobe o backend Django 6 (porta 8000) em background.
# Idempotente: se ja tiver rodando, nao duplica. Windows Git Bash.

set -u

UNIT_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
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

# Usa .venv/Scripts/python.exe direto. Bypassa bug do Git Bash onde
# `source activate` ajusta PATH pra python mas NAO pra pip — pip
# continuaria vindo do Python 3.11 do sistema. Usar o python.exe
# do venv diretamente garante que `python manage.py` use 3.12 do venv.
if [ -x .venv/Scripts/python.exe ]; then
  PYTHON_BIN=".venv/Scripts/python.exe"
elif [ -x .venv/bin/python ]; then
  PYTHON_BIN=".venv/bin/python"
else
  warn ".venv nao encontrada — usando python do PATH (pode quebrar em Python errado)"
  PYTHON_BIN="python"
fi

log "Subindo backend Django em :8000 com $PYTHON_BIN (--noreload pra evitar auto-reload durante tests) ..."
nohup "$PYTHON_BIN" manage.py runserver 0.0.0.0:8000 --noreload \
  > "$LOG_DIR/backend.log" 2>&1 &
echo $! > "$LOG_DIR/backend.pid"
log "Backend PID=$(cat "$LOG_DIR/backend.pid")"
log "Log: $LOG_DIR/backend.log"

# Espera 5s pelo startup e valida (com feedback live)
for i in 1 2 3 4 5; do
  sleep 1
  printf "\r${GREEN}[dev-up]${NC} aguardando backend... (%ds)" "$i"
  if curl -s -o /dev/null -w "%{http_code}" --max-time 2 http://localhost:8000/api/v1/public/church/setup-status 2>/dev/null | grep -q "200"; then
    printf "\n"
    log "Backend pronto em http://localhost:8000"
    exit 0
  fi
done

printf "\n"
warn "Backend nao respondeu em 5s — checa $LOG_DIR/backend.log"
exit 1
