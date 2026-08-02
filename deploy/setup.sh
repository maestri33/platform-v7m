#!/bin/bash
# Setup do notify-server numa LXC Debian/Ubuntu
# Rodar como root: bash deploy/setup.sh
set -euo pipefail

APP_DIR="/opt/notify-server"
LOG_DIR="/var/log/notify-server"

echo "=== Notify Server Setup ==="

# 1. Dependências do sistema
apt-get update -qq
apt-get install -y -qq python3 python3-venv python3-pip postgresql-client curl

# 2. Criar diretório de logs
mkdir -p "$LOG_DIR"
chown www-data:www-data "$LOG_DIR"

# 3. Setup do app
cd "$APP_DIR"

# venv
if [ ! -d .venv ]; then
    python3 -m venv .venv
fi
.venv/bin/pip install -r requirements.txt
.venv/bin/pip install gunicorn

# 4. Migrate
.venv/bin/python manage.py migrate --noinput

# 5. Seed (conta default)
.venv/bin/python manage.py notify_seed --account default 2>/dev/null || true

# 5b. Schedules do watchdog + canário (idempotente)
.venv/bin/python manage.py notify_schedules

# 6. Systemd (+ backup diário + logrotate)
cp deploy/notify-web.service /etc/systemd/system/
cp deploy/notify-qcluster.service /etc/systemd/system/
cp deploy/notify-backup.service /etc/systemd/system/
cp deploy/notify-backup.timer /etc/systemd/system/
cp deploy/logrotate-notify /etc/logrotate.d/notify
systemctl daemon-reload
systemctl enable notify-web notify-qcluster notify-backup.timer
systemctl start notify-backup.timer

# 7. Start
systemctl restart notify-web notify-qcluster

echo "=== Setup completo ==="
echo "Web: systemctl status notify-web"
echo "Queue: systemctl status notify-qcluster"
echo "Logs: journalctl -u notify-web -f"
