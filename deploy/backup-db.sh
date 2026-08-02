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

# O servidor é Postgres 18 em 10.1.20.100; esta LXC (Debian 13) só tem client
# 17 e o pgdg não publica client-18 pra ela → o dump roda NO HOST DO BANCO via
# SSH, com o pg_dump 18 local de lá. Fallback: pg_dump local (se as majors
# voltarem a bater um dia).
DB_HOST=$(echo "$DATABASE_URL" | sed -E 's#.*@([^:/]+).*#\1#')
REMOTE_DUMP="/usr/lib/postgresql/18/bin/pg_dump"

if ssh -o BatchMode=yes -o ConnectTimeout=5 "root@$DB_HOST" "test -x $REMOTE_DUMP" 2>/dev/null; then
    ssh -o BatchMode=yes "root@$DB_HOST" "$REMOTE_DUMP '$DATABASE_URL'" | gzip > "$OUT"
else
    pg_dump "$DATABASE_URL" | gzip > "$OUT"
fi
echo "backup: $OUT ($(du -h "$OUT" | cut -f1))"

# retenção
ls -1t "$BACKUP_DIR"/notify-*.sql.gz | tail -n +15 | xargs -r rm -f
