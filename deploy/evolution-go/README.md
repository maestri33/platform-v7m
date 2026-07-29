# Evolution GO — migração para a LXC do v2 (2026-07-29)

## O que mudou

A Evolution GO saiu do **pve-dev CT 20200** e passou a rodar no **pve-prod
CT 20200 (`10.1.20.200`)**, a mesma LXC do Evolution v2.

Motivo: produção dependia de um serviço hospedado no host de DEV. Quando aquele
host ou aquele container caía, a captação de leads parava inteira — a tela 1 do
funil não passa sem verificação de número por WhatsApp.

| | Antes | Depois |
|---|---|---|
| Host | pve-dev CT 20200 (`10.3.20.200`) | pve-prod CT 20200 (`10.1.20.200`) |
| Base URL | `http://100.72.222.21:4000` (Tailscale) | `http://10.1.20.200:4000` (LAN) |
| Postgres | container local no CT | CT 20100 (`10.1.20.100`), como o v2 |
| Mídia | relay Tailscale `10.3.20.1:8114` | direto, `MEDIA_LAN_BASE=http://10.1.30.114` |

Três simplificações caíram fora com a mudança: o container de Postgres dedicado,
o relay de mídia em dois hosts (`deploy/evolution-go-media/`) e a dependência
cruzada entre datacenters.

## Arquivos

`docker-compose.yml` deste diretório é o que roda em `/opt/evolution-go` do
CT 20200. O compose do v2 (`/opt/whats`) **não foi tocado** — são dois projetos
docker independentes na mesma LXC, para que mexer num não derrube o outro.

## O que a migração ensinou (leia antes de repetir)

1. **A licença da GO não está no volume nem no `.env`.** Ela vive na tabela
   `runtime_configs` do banco `evogo_users` (`instance_id`, `api_key`, `tier`,
   `customer_id`). Subir a GO com banco vazio gera um `instance_id` novo e a API
   responde `503 LICENSE_REQUIRED` em tudo. Restaurar o dump **antes** do
   primeiro boot evita o problema; se já subiu, apague a linha gerada e insira as
   quatro do dump.

2. **A credencial da sessão WhatsApp viaja no banco `evogo_auth`** (tabelas
   `whatsmeow_*`). Com o dump restaurado, `POST /instance/connect` seguido de
   `POST /instance/reconnect` religou as sessões **sem re-pareamento**. Não
   chame `DELETE /instance/logout` nem `/instance/delete`: isso destrói a
   credencial e exige o dono do número com o celular na mão.

3. **A imagem em produção era `evoapicloud/evolution-go:latest`**, não o
   `evolution-go:v0.7.2-poolfix-0328955` que o override anunciava — o override
   tinha sido revertido em algum momento. A `:latest` já loga
   `pool configurado`, ou seja, incorporou a correção da PR #117. O poolfix local
   ficou obsoleto (e, por ser build de fonte, nem licença tinha).

4. **O Postgres agora é compartilhado**, então o bug de pool da GO deixaria de
   ser problema só dela. Mitigação aplicada:
   `ALTER ROLE evogo CONNECTION LIMIT 20` — se a GO voltar a vazar conexões, ela
   se estrangula sozinha em vez de derrubar o `notify_server` e o `evolution`.

5. **A key GLOBAL da GO não serve para enviar.** Com várias instâncias, ela
   resolve para uma arbitrária — em produção o OTP estava saindo pela instância
   `business` ("Maestri") em vez da `default` (o número do funil). Envio usa o
   **token da instância**; a key global fica só para administração
   (`EVOLUTION_GO_ADMIN_KEY`).

## Estado das instâncias após a migração

| Instância | Número | Situação |
|---|---|---|
| `default` | 554220181533 | conectada e logada (número do funil) |
| `pessoal` | 554396648750 | conectada e logada |
| `business` | 554298594793 | conectada e logada |
| `ieadpg` | 554299384069 | conectada, **não logada** — precisa de pareamento |

A credencial da `ieadpg` já não existia no `whatsmeow_device` antes da migração;
ela precisa de `POST /instance/pair` com o celular em mãos (o código expira em
~2 min). Use `POST /v1/admin/pairing-code` do notify.

## Pendência

O **CT 20200 do pve-dev está parado, não destruído**. Destrua só depois de uns
dias de produção estável — é o único rollback rápido que resta.

```bash
ssh root@pve-dev "pct destroy 20200"   # irreversível
```
