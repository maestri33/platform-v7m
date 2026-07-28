#!/usr/bin/env bash
# setup-gateway.sh — transforma um Linux (Ubuntu/Debian) no gateway do
# Captive Portal IEADPG. Pensado pro servidor "amalia" nos primeiros dias:
#
#   internet ← adaptador Wi-Fi USB (cliente da rede de casa, ex: maestri.home)
#   clientes ← wireless nativo virando AP aberto (SSID BEM-VINDO) com NAT
#
# O que ele monta:
#   - uplink: NetworkManager conecta o USB no Wi-Fi de casa
#   - AP: hostapd no wireless nativo (rede aberta, isolamento entre clientes)
#   - dnsmasq: DHCP+DNS do AP, popula o ipset do walled garden com os IPs
#     do backend e chama o agente a cada novo dispositivo (dhcp-script)
#   - firewall: NAT pro uplink; antes da liberação só backend+DNS passam e
#     HTTP cai no portal_redirect.py (302 → portal na nuvem com o MAC)
#   - systemd: captive-agent (poll/push de grants), captive-redirect,
#     captive-gateway (firewall/IP do AP no boot)
#
# Uso (na amalia):
#   sudo CAPTIVE_AGENT_KEY=... CAPTIVE_AGENT_SECRET=... HOME_PSK='senha' \
#        ./setup-gateway.sh
#
# Variáveis (padrões pensados pra amalia):
#   CAPTIVE_CLOUD_URL     default https://backend.ieadpg.org
#   CAPTIVE_AGENT_KEY     obrigatória — igual à do .env do backend
#   CAPTIVE_AGENT_SECRET  obrigatória — igual à do .env do backend
#   HOME_SSID             default maestri.home
#   HOME_PSK              senha do Wi-Fi de casa (pergunta se faltar)
#   AP_SSID               default BEM-VINDO
#   UPLINK_IFACE / AP_IFACE  default auto (detecta USB × nativo)
set -euo pipefail

[ "$(id -u)" = 0 ] || { echo "rode com sudo"; exit 1; }

CLOUD_URL="${CAPTIVE_CLOUD_URL:-https://backend.ieadpg.org}"
AGENT_KEY="${CAPTIVE_AGENT_KEY:?exporte CAPTIVE_AGENT_KEY (igual ao .env do backend)}"
AGENT_SECRET="${CAPTIVE_AGENT_SECRET:?exporte CAPTIVE_AGENT_SECRET (igual ao .env do backend)}"
HOME_SSID="${HOME_SSID:-maestri.home}"
HOME_PSK="${HOME_PSK:-}"
AP_SSID="${AP_SSID:-BEM-VINDO}"
AP_IFACE="${AP_IFACE:-auto}"
UPLINK_IFACE="${UPLINK_IFACE:-auto}"
AP_ADDR="10.53.0.1"
AP_CIDR="${AP_ADDR}/24"
DHCP_RANGE="10.53.0.50,10.53.0.250,12h"
CLOUD_HOST="$(echo "$CLOUD_URL" | sed -E 's|^https?://||; s|[:/].*||')"
DIR=/opt/captive
SRC="$(cd "$(dirname "$0")" && pwd)"

say() { echo -e "\033[1;33m[setup]\033[0m $*"; }

# ---------------------------------------------------------------------------
say "1/8 pacotes (hostapd dnsmasq ipset iptables network-manager rfkill)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq hostapd dnsmasq ipset iptables network-manager rfkill curl >/dev/null
systemctl unmask hostapd >/dev/null 2>&1 || true
systemctl stop hostapd dnsmasq >/dev/null 2>&1 || true

# ---------------------------------------------------------------------------
say "2/8 detectando interfaces (USB = uplink · nativo = AP)"
if [ "$AP_IFACE" = auto ] || [ "$UPLINK_IFACE" = auto ]; then
  NATIVE="" USB_WLAN="" USB_ETH=""
  for path in /sys/class/net/*; do
    dev="$(basename "$path")"
    [ "$dev" = lo ] && continue
    if readlink -f "$path" | grep -q usb; then
      if [ -d "$path/wireless" ]; then USB_WLAN="$dev"; else USB_ETH="$dev"; fi
    elif [ -d "$path/wireless" ]; then
      NATIVE="$dev"
    fi
  done
  [ "$AP_IFACE" = auto ] && AP_IFACE="$NATIVE"
  [ "$UPLINK_IFACE" = auto ] && UPLINK_IFACE="${USB_WLAN:-$USB_ETH}"
fi
[ -n "$AP_IFACE" ] || { echo "wireless nativo não encontrado — defina AP_IFACE=..."; exit 1; }
[ -n "$UPLINK_IFACE" ] || { echo "adaptador USB não encontrado — defina UPLINK_IFACE=..."; exit 1; }
[ "$AP_IFACE" != "$UPLINK_IFACE" ] || { echo "AP e uplink não podem ser a mesma interface"; exit 1; }
say "   AP (nativo): $AP_IFACE · uplink (USB): $UPLINK_IFACE"
rfkill unblock wifi || true

# ---------------------------------------------------------------------------
say "3/8 uplink: conectando $UPLINK_IFACE em \"$HOME_SSID\""
if [ -d "/sys/class/net/$UPLINK_IFACE/wireless" ]; then
  if ! nmcli -t -f GENERAL.STATE device show "$UPLINK_IFACE" 2>/dev/null | grep -q "connected"; then
    [ -n "$HOME_PSK" ] || { read -r -s -p "senha do Wi-Fi $HOME_SSID: " HOME_PSK; echo; }
    nmcli device wifi rescan ifname "$UPLINK_IFACE" >/dev/null 2>&1 || true
    nmcli device wifi connect "$HOME_SSID" password "$HOME_PSK" ifname "$UPLINK_IFACE"
  else
    say "   $UPLINK_IFACE já conectado — mantendo"
  fi
else
  nmcli device connect "$UPLINK_IFACE" >/dev/null 2>&1 || true   # USB-ethernet: só DHCP
fi

# AP sai do controle do NetworkManager (hostapd assume) — runtime + boot
nmcli device set "$AP_IFACE" managed no >/dev/null 2>&1 || true
mkdir -p /etc/NetworkManager/conf.d
cat > /etc/NetworkManager/conf.d/captive-unmanaged.conf <<EOF
[keyfile]
unmanaged-devices=interface-name:$AP_IFACE
EOF
systemctl reload NetworkManager >/dev/null 2>&1 || true

# ---------------------------------------------------------------------------
say "4/8 arquivos em $DIR"
mkdir -p "$DIR"
cp "$SRC/agent.py" "$SRC/portal_redirect.py" "$DIR/"
chmod +x "$DIR/agent.py" "$DIR/portal_redirect.py"

cat > "$DIR/env" <<EOF
CAPTIVE_CLOUD_URL=$CLOUD_URL
CAPTIVE_AGENT_KEY=$AGENT_KEY
CAPTIVE_AGENT_SECRET=$AGENT_SECRET
CAPTIVE_POLL_INTERVAL=10
CAPTIVE_LISTEN_PORT=8899
CAPTIVE_REDIRECT_PORT=8081
RELEASE_CMD=$DIR/release.sh {mac}
BLOCK_CMD=$DIR/block.sh {mac}
EOF
chmod 600 "$DIR/env"

cat > "$DIR/release.sh" <<'EOF'
#!/usr/bin/env bash
# Libera o MAC no walled garden (chamado pelo agente após o OTP/credencial).
ipset add captive_allow "$1" -exist
EOF
cat > "$DIR/block.sh" <<'EOF'
#!/usr/bin/env bash
ipset del captive_allow "$1" 2>/dev/null || true
EOF

cat > "$DIR/dhcp-event.sh" <<EOF
#!/usr/bin/env bash
# dnsmasq dhcp-script: \$1=add|old|del \$2=mac \$3=ip
# "add" = dispositivo novo associou -> avisa a nuvem (passo 01-04 do fluxo).
set -a; . $DIR/env; set +a
case "\$1" in
  add) python3 $DIR/agent.py session-start "\$2" >/dev/null 2>&1 & ;;
  del) python3 $DIR/agent.py session-stop  "\$2" >/dev/null 2>&1 & ;;
esac
exit 0
EOF
chmod +x "$DIR/release.sh" "$DIR/block.sh" "$DIR/dhcp-event.sh"

cat > "$DIR/gateway-up.sh" <<EOF
#!/usr/bin/env bash
# Sobe IP do AP, ipsets e firewall do captive. Idempotente — roda no boot.
set -e
rfkill unblock wifi || true
ip link set "$AP_IFACE" up
ip addr replace "$AP_CIDR" dev "$AP_IFACE"
sysctl -qw net.ipv4.ip_forward=1

ipset create captive_allow  hash:mac  -exist   # MACs liberados
ipset create captive_walled hash:ip   -exist   # IPs do backend (walled garden)
# resolve o backend já no boot (o dnsmasq mantém atualizado depois)
for ip in \$(getent ahostsv4 "$CLOUD_HOST" | awk '{print \$1}' | sort -u); do
  ipset add captive_walled "\$ip" -exist
done

iptables -t nat -N CAPTIVE_NAT 2>/dev/null || iptables -t nat -F CAPTIVE_NAT
iptables -t nat -C PREROUTING -i "$AP_IFACE" -j CAPTIVE_NAT 2>/dev/null || \
  iptables -t nat -A PREROUTING -i "$AP_IFACE" -j CAPTIVE_NAT
# HTTP de quem ainda não foi liberado cai no redirecionador local (302 -> portal)
iptables -t nat -A CAPTIVE_NAT -p tcp --dport 80 \
  -m set ! --match-set captive_allow src \
  -m set ! --match-set captive_walled dst \
  -j REDIRECT --to-ports 8081

iptables -t nat -C POSTROUTING -o "$UPLINK_IFACE" -j MASQUERADE 2>/dev/null || \
  iptables -t nat -A POSTROUTING -o "$UPLINK_IFACE" -j MASQUERADE

iptables -N CAPTIVE_FWD 2>/dev/null || iptables -F CAPTIVE_FWD
iptables -C FORWARD -j CAPTIVE_FWD 2>/dev/null || iptables -I FORWARD 1 -j CAPTIVE_FWD
iptables -A CAPTIVE_FWD -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A CAPTIVE_FWD -i "$AP_IFACE" -m set --match-set captive_allow src -j ACCEPT
iptables -A CAPTIVE_FWD -i "$AP_IFACE" -m set --match-set captive_walled dst -j ACCEPT
iptables -A CAPTIVE_FWD -i "$AP_IFACE" -p tcp --dport 443 -j REJECT --reject-with tcp-reset
iptables -A CAPTIVE_FWD -i "$AP_IFACE" -j REJECT
EOF
chmod +x "$DIR/gateway-up.sh"

# ---------------------------------------------------------------------------
say "5/8 hostapd (SSID $AP_SSID em $AP_IFACE)"
cat > /etc/hostapd/hostapd.conf <<EOF
interface=$AP_IFACE
driver=nl80211
ssid=$AP_SSID
hw_mode=g
channel=6
country_code=BR
wmm_enabled=1
auth_algs=1
ignore_broadcast_ssid=0
# rede aberta (fluxo captive) com isolamento entre clientes
ap_isolate=1
EOF
if [ -f /etc/default/hostapd ]; then
  sed -i 's|^#\?DAEMON_CONF=.*|DAEMON_CONF="/etc/hostapd/hostapd.conf"|' /etc/default/hostapd
fi

# ---------------------------------------------------------------------------
say "6/8 dnsmasq (DHCP/DNS do AP + hook do agente + ipset do backend)"
cat > /etc/dnsmasq.d/captive.conf <<EOF
interface=$AP_IFACE
bind-interfaces
except-interface=lo
no-resolv
server=1.1.1.1
server=8.8.8.8
dhcp-authoritative
dhcp-range=$DHCP_RANGE
dhcp-option=option:router,$AP_ADDR
dhcp-option=option:dns-server,$AP_ADDR
dhcp-script=$DIR/dhcp-event.sh
# IPs do backend entram sozinhos no walled garden quando um cliente resolve o domínio
ipset=/$CLOUD_HOST/captive_walled
EOF
# systemd-resolved segue dono do DNS local do gateway (dnsmasq só atende o AP)

# ---------------------------------------------------------------------------
say "7/8 serviços systemd"
cat > /etc/systemd/system/captive-gateway.service <<EOF
[Unit]
Description=Captive portal - IP do AP, ipsets e firewall
After=network.target
Before=hostapd.service dnsmasq.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=$DIR/gateway-up.sh

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/captive-agent.service <<EOF
[Unit]
Description=Captive portal - agente local (grants push/poll)
After=network-online.target captive-gateway.service
Wants=network-online.target

[Service]
EnvironmentFile=$DIR/env
ExecStart=/usr/bin/python3 $DIR/agent.py run
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/captive-redirect.service <<EOF
[Unit]
Description=Captive portal - redirecionador HTTP (302 -> portal na nuvem)
After=captive-gateway.service

[Service]
EnvironmentFile=$DIR/env
ExecStart=/usr/bin/python3 $DIR/portal_redirect.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable captive-gateway captive-agent captive-redirect hostapd dnsmasq >/dev/null
systemctl restart captive-gateway
systemctl restart hostapd dnsmasq captive-redirect captive-agent

# ---------------------------------------------------------------------------
say "8/8 teste do vínculo com a nuvem"
set -a; . "$DIR/env"; set +a
if python3 "$DIR/agent.py" ping; then
  say "tudo no ar ✓  SSID \"$AP_SSID\" servindo · uplink $UPLINK_IFACE → $HOME_SSID"
  say "logs: journalctl -u captive-agent -u hostapd -u dnsmasq -f"
else
  say "AP no ar, mas a nuvem não respondeu — confira CAPTIVE_CLOUD_URL/chaves e journalctl -u captive-agent"
fi
