# Relay privado de mídia — OBSOLETO (desativado em 2026-07-29)

Este relay existia porque o Evolution GO rodava no `pve-dev` e o notify no
`pve-prod`: a mídia atravessava Tailscale por dois sockets systemd.

Com a Evolution GO migrada para a mesma LXC do v2 (`10.1.20.200`), notify e
Evolution estão na mesma rede `10.1.x` e a mídia é buscada direto.
`MEDIA_LAN_BASE` voltou a ser `http://10.1.30.114`.

Os units foram desabilitados nos dois hosts (`systemctl disable --now
evolution-notify-media-proxy.socket` / `...-relay.socket`). Os arquivos ficam
versionados só como histórico — não reinstale.

Ver `deploy/evolution-go/README.md`.
