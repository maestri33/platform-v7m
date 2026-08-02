#!/bin/bash
# Backup diário do Postgres do notify (M2). Retenção: 14 dumps.
# Restore (testado — ver docs/runbook.md):
#   gunzip -c /opt/backups/notify-YYYYmmdd-HHMM.sql.gz | psql "$DATABASE_URL_RESTORE"
set -euo pipefail

BACKUP_DIR="/opt/backups"
mkdir -p "$BACKUP_DIR"

# DATABASE_URL do .env do app
source <(grep -E "^DATABASE_URL=" /opt/notify-server/.env)

STAMP=$(date +%Y%m%d-%H%M)
OUT="$BACKUP_DIR/notify-$STAMP.sql.gz"

pg_dump "$DATABASE_URL" | gzip > "$OUT"
echo "backup: $OUT ($(du -h "$OUT" | cut -f1))"

# retenção
ls -1t "$BACKUP_DIR"/notify-*.sql.gz | tail -n +15 | xargs -r rm -f
