# Relay privado de mídia para o Evolution GO

Fluxo:

`Evolution GO (CT pve-dev) → 10.3.20.1:8114 → Tailscale → 100.79.28.123:8114 → notify CT:80`

Instalação:

1. No `pve-prod`, copiar `pve-prod/*` para `/etc/systemd/system/`.
2. No `pve-dev`, copiar `pve-dev/*` para `/etc/systemd/system/`.
3. Em ambos, executar `systemctl daemon-reload` e habilitar o respectivo
   `.socket` com `systemctl enable --now`.
4. Configurar `MEDIA_LAN_BASE=http://10.3.20.1:8114` no `notify-server`.

Os listeners ficam restritos às interfaces Tailscale/LAN indicadas, sem
publicar a mídia na interface WAN.
