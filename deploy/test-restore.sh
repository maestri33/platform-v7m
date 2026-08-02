#!/bin/bash
# M2 — prova de restore: restaura o último dump num banco descartável e conta
# o que voltou. Rodar como root na LXC. Não toca no banco de produção.
set -e
echo "=== backup agora ==="
systemctl start notify-backup.service
ls -lh /opt/backups/notify-*.sql.gz | tail -1
DUMP=$(ls -1t /opt/backups/notify-*.sql.gz | head -1)
echo "=== restore em banco descartável ==="
su - postgres -c "dropdb --if-exists notify_restore_test; createdb -T template0 notify_restore_test"
gunzip -c "$DUMP" | su - postgres -c "psql -q notify_restore_test" >/dev/null 2>&1 || true
TABELAS=$(su - postgres -c "psql -t notify_restore_test -c \"SELECT count(*) FROM information_schema.tables WHERE table_schema='public'\"" | tr -d ' ')
LINHAS=$(su - postgres -c "psql -t notify_restore_test -c 'SELECT count(*) FROM notify_notification'" | tr -d ' ')
echo "restore ok: $TABELAS tabelas, $LINHAS notificacoes recuperadas de $DUMP"
su - postgres -c "dropdb notify_restore_test"
echo "banco de teste removido"
