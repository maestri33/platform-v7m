# Plano: Self-Hosted GitHub Actions Runner no Proxmox

**Status**: Proposto
**Autor**: maestri33
**Data**: 2026-09-04
**Issue Relacionada**: Bloqueio de CI por spending limit do GitHub Actions

## Contexto

O GitHub Actions está com spending limit atingido / cartão recusado na conta `maestri33`.
Todos os 10 PRs abertos (incluindo PR #205) estão com CI falhando antes mesmo de iniciar.
O monorepo V7M precisa de 3 jobs de CI: Lint & Typecheck (Node 22 / pnpm), Frontend Tests + Build,
e Backend & Notify Pytest (Python 3.12 / uv / Postgres 16 / Redis 7.4).

O deploy CD (`deploy.yml`) usa Cloudflare Pages (custo zero), Neon Postgres migrations, e GHCR push —
estes dependem de secrets e APIs externas mas rodam nos mesmos runners.

## Decisão Arquitetural

Provisionar um **Self-Hosted Runner** rodando como container Docker no Proxmox (rede `10.0.1.x`),
eliminando permanentemente a dependência de minutos pagos do GitHub Actions.

O runner usará Docker-in-Docker (DinD) para suportar os `services:` containers
(Postgres 16, Redis 7.4) que o job `test-backend` exige.

---

## Step 1 — Criar LXC/VM no Proxmox para o Runner

Provisionar um container LXC privilegiado ou VM leve no Proxmox com:
- Ubuntu 24.04 LTS minimal
- 4 vCPUs / 8 GB RAM / 40 GB SSD
- IP estático na rede `10.0.1.x` (ex: `10.0.1.140`)
- Docker Engine instalado com suporte a DinD
- Acesso de saída à internet (HTTPS para github.com e ghcr.io)

## Step 2 — Instalar e registrar o GitHub Actions Runner

Instalar o runner oficial do GitHub Actions na máquina:
1. Baixar o pacote `actions-runner-linux-x64-*.tar.gz` da página do repositório
2. Configurar com `./config.sh --url https://github.com/maestri33/platform-v7m --token <TOKEN>`
3. Labels: `self-hosted,linux,x64,v7m-proxmox`
4. Instalar como systemd service (`./svc.sh install && ./svc.sh start`)
5. Instalar dependências do CI: Node.js 22, pnpm 10.34.5, Python 3.12, uv, Docker Compose

## Step 3 — Adaptar os workflows para self-hosted com fallback

Alterar `runs-on` nos 3 workflows para usar o runner self-hosted com fallback gracioso:
- `ci.yml`: jobs `quality`, `test-frontends`, `test-backend` → `runs-on: [self-hosted, linux, v7m-proxmox]`
- `deploy.yml`: jobs de deploy → manter `ubuntu-latest` como fallback (deploy precisa de secrets do GitHub)
- `require-issue.yml`: job leve → manter `ubuntu-latest` (consome <1 min)
- Remover `actions/cache` dos jobs self-hosted (cache local persistente no disco do runner)

## Step 4 — Otimizar cache local persistente no runner

Configurar cache persistente no runner para eliminar downloads repetidos:
- pnpm store: `/opt/runner-cache/pnpm-store` (symlink ou `PNPM_HOME`)
- uv cache: `/opt/runner-cache/uv` (`UV_CACHE_DIR`)
- Turborepo cache: `/opt/runner-cache/turbo` (`.turbo`)
- Docker layer cache: volume nomeado para imagens Postgres/Redis

## Step 5 — Testar e validar pipeline completa

Executar validação end-to-end:
1. Criar branch de teste, abrir PR, verificar que os 3 jobs de CI rodam no runner self-hosted
2. Medir tempo de execução vs. runners hosted (baseline: ~4min nos hosted)
3. Verificar isolamento: nenhum artefato de build anterior interfere em runs subsequentes
4. Confirmar que secrets do repositório chegam corretamente ao runner
5. Re-run dos PRs pendentes (#205, #204, #201, etc.)

## Step 6 — Documentar e adicionar monitoramento

- Documentar IP, credenciais de acesso e procedimento de manutenção
- Adicionar health check simples (cron que verifica `./run.sh --check`)
- Adicionar o runner ao inventário de infraestrutura V7M

---

## Fora de Escopo

- Migração para GitHub Enterprise ou plano pago
- Runners efêmeros com Kubernetes (complexidade desnecessária para 1 runner)
- Setup de runners para outros repositórios (apenas `platform-v7m`)
