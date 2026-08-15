#!/bin/bash
# O4 — carga básica: N envios de e-mail self-mail (a caixa da conta default)
# em ~60s. Mede latência de ACEITE da API e a drenagem da fila. Sem WhatsApp
# de propósito (anti-ban). Rodar na LXC.
set -e
N=${1:-60}
DEST=${2:-notify@m33.live}
# Caddy faz bind no IP da LXC (não em 127.0.0.1) — gunicorn direto é :8100.
BASE=${BASE:-http://10.1.30.114}
STAMP=$(date +%s)

echo "aceitando $N envios..."
T0=$(date +%s.%N)
for i in $(seq 1 "$N"); do
    curl -s -m 10 -o /dev/null -w "%{time_total}\n" -X POST "$BASE/notify" \
        -H "Content-Type: application/json" \
        -H "Idempotency-Key: load-$STAMP-$i" \
        -d "{\"content\":\"carga O4 item $i/$N\",\"email\":\"$DEST\",\"options\":{\"subject\":\"carga $STAMP #$i\"}}"
done > /tmp/load-lat.txt
T1=$(date +%s.%N)

python3 - << EOF
lats = sorted(float(x) for x in open("/tmp/load-lat.txt"))
n = len(lats)
print(f"aceite: {n} req em {($T1-$T0):.1f}s "
      f"| p50={lats[n//2]*1000:.0f}ms p95={lats[int(n*0.95)]*1000:.0f}ms max={lats[-1]*1000:.0f}ms")
EOF

echo "drenando a fila..."
for _ in $(seq 1 24); do
    FILA=$(curl -s -m 5 "$BASE/v1/metrics" | python3 -c "import json,sys; print(json.load(sys.stdin)['fila'])")
    [ "$FILA" = "0" ] && break
    sleep 5
done

curl -s -m 5 "$BASE/v1/notifications?account_id=default&limit=500" | python3 - << EOF
import json, sys
rows = [r for r in json.load(sys.stdin) if (r.get("idempotency_key") or "").startswith("load-$STAMP")]
sent = sum(1 for r in rows if r["email_status"] == "sent")
failed = [r for r in rows if r["email_status"] == "failed"]
pend = sum(1 for r in rows if r["email_status"] in ("pending", "sending"))
print(f"resultado: {sent} sent · {len(failed)} failed · {pend} pendentes de {len(rows)}")
for r in failed[:3]:
    print("  erro:", (r.get("email_error") or "")[:100])
EOF
