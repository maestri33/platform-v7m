# Runbook — notify-server (LXC 10.1.30.114, sem Docker)

Tudo via SSH `root@10.1.30.114`. App em `/opt/notify-server`, venv em `.venv`,
services systemd `notify-web` (gunicorn :8100 atrás do Caddy) e
`notify-qcluster` (fila). Postgres local da LXC. Rede: VPN-only (Caddy bind
10.1.30.114, recusa origem pública).

## Deploy

```bash
# do Mac (sem GitHub): push direto pra LXC + fast-forward
git push ssh://root@10.1.30.114/opt/notify-server <branch>:refs/heads/deploy-x
ssh root@10.1.30.114 'cd /opt/notify-server \
  && git merge --ff-only deploy-x && git branch -d deploy-x \
  && .venv/bin/pip install -q -r requirements.txt \
  && .venv/bin/python manage.py migrate --noinput \
  && .venv/bin/python manage.py notify_schedules \
  && systemctl restart notify-web notify-qcluster'
curl -s http://10.1.30.114/v1/ready   # tem que voltar {"ready": true}
```

## Rollback

```bash
ssh root@10.1.30.114 'cd /opt/notify-server \
  && git log --oneline -5             # escolher o commit bom \
  && git reset --hard <commit> \
  && .venv/bin/python manage.py migrate --noinput \
  && systemctl restart notify-web notify-qcluster'
# Migrations são aditivas (colunas/tabelas novas) — voltar o código sem
# reverter migration é seguro. Para reverter uma migration específica:
#   .venv/bin/python manage.py migrate <app> <migration_anterior>
```

## Restart / status / logs

```bash
systemctl restart notify-web notify-qcluster
systemctl status notify-web notify-qcluster
journalctl -u notify-web -f            # request logs (LOG_JSON=1 → JSON por linha)
journalctl -u notify-qcluster -f       # fila/dispatch/watchdog
tail -f /var/log/notify-server/error.log   # gunicorn (rotacionado por logrotate)
```

## Saúde

- `GET /v1/health` — vivo + DB. `GET /v1/ready` — DB + fila (503 segura deploy).
- `GET /v1/metrics` — volume 1h/24h, taxa de erro, fila.
- Painel `http://10.1.30.114/` → card "Está tudo ligado?" (watchdog 5/5min,
  botão checar agora, canário manual).
- Watchdog alerta o admin (WhatsApp/e-mail do `.env`) em queda/retorno e
  reconecta sozinho instância da GO com credencial (auto-heal, cooldown 10min).

## Backup / restore (testado)

```bash
systemctl start notify-backup.service        # backup manual agora
ls -lh /opt/backups/                          # dumps (retenção 14)
# RESTORE (em banco de teste):
createdb -T template0 notify_restore_test
gunzip -c /opt/backups/notify-<stamp>.sql.gz | psql notify_restore_test
psql notify_restore_test -c '\dt' | head      # tabelas de volta
dropdb notify_restore_test
```

## Incidentes conhecidos

- **WhatsApp todo fora + GO não reconecta**: checar Postgres da GO em
  `root@10.1.20.100` — conexões idle do role `evogo` esgotando o limite
  (`SELECT state, count(*) FROM pg_stat_activity WHERE usename='evogo' GROUP BY state;`).
  Matar idle + `docker restart evolution-go` (na 10.1.20.200) + o watchdog
  reconecta. Foi o apagão de 2026-08-02.
- **OmniRouter "não responde"**: tarpit de User-Agent (`python-httpx` é
  penalizado) e `/v1/models` pendura por design — clients usam UA
  `notify-server/1.0` e health pela raiz. Não "consertar" voltando atrás.
- **Sessão v2 zumbi** (500 "Cannot read properties"): tratada como SessionDown
  → cascata cai pra GO sozinha. Se persistir, parear de novo pelo painel (QR).
- **Instância sem sessão**: painel → aba whatsapp → QR/código → ativar.

## Fila / DLQ

- Envio `failed` esgotado: painel → envios → ver → **reenviar canais falhos**.
- Fila acumulando: watchdog alerta (> WATCHDOG_QUEUE_ALERT); inspecionar
  `journalctl -u notify-qcluster` e `GET /v1/metrics`.

## Expurgo (LGPD)

`notify_purge --dry-run` mostra o que sairia (retenção `NOTIFY_RETENTION_DAYS`,
default 90d); Schedule semanal já roda sozinha.
