#!/bin/bash
# M2 — prova de restore: restaura o último dump num banco descartável NO HOST
# DO BANCO (o Postgres do notify mora em outro container) e conta o que voltou.
# Rodar como root na LXC do notify. Não toca no banco de produção.
set -e
source <(grep -E "^DATABASE_URL=" /opt/notify-server/.env)
DB_HOST=$(echo "$DATABASE_URL" | sed -E 's#.*@([^:/]+).*#\1#')

echo "=== backup agora ==="
systemctl start notify-backup.service
ls -lh /opt/backups/notify-*.sql.gz | tail -1
DUMP=$(ls -1t /opt/backups/notify-*.sql.gz | head -1)

echo "=== restore em banco descartável (em $DB_HOST) ==="
ssh -o BatchMode=yes "root@$DB_HOST" "su - postgres -c 'dropdb --if-exists notify_restore_test; createdb -T template0 notify_restore_test'"
gunzip -c "$DUMP" | ssh -o BatchMode=yes "root@$DB_HOST" "su - postgres -c 'psql -q notify_restore_test'" >/dev/null 2>&1 || true
TABELAS=$(ssh -o BatchMode=yes "root@$DB_HOST" "su - postgres -c \"psql -t notify_restore_test -c \\\"SELECT count(*) FROM information_schema.tables WHERE table_schema='public'\\\"\"" | tr -d ' ')
LINHAS=$(ssh -o BatchMode=yes "root@$DB_HOST" "su - postgres -c \"psql -t notify_restore_test -c 'SELECT count(*) FROM notify_notification'\"" | tr -d ' ')
echo "restore ok: $TABELAS tabelas, $LINHAS notificacoes recuperadas de $(basename "$DUMP")"
ssh -o BatchMode=yes "root@$DB_HOST" "su - postgres -c 'dropdb notify_restore_test'"
echo "banco de teste removido"
