# Plano — Migração seletiva para Cloudflare (V7M)

**Data:** 2026-09-04 · **Zona base:** `maestri.group` (`e3d9535aaed6d68490099766725d8df5`)

## Princípio

Estado (Postgres, ledger financeiro, workers) **fica no servidor próprio**.
Cloudflare assume a **borda**: DNS, tunnel, WAF, e-mail transacional, orquestração durável.

Rejeitado: mover `notify`/Docker para Cloudflare Containers — disco efêmero, dorme
após ~10 min, ingress só HTTP via Worker. Custo ~$60/mês para semântica pior.

## Estado das credenciais (verificado em 2026-09-04)

Token `CLOUDFLARE_API_TOKEN` (Infisical `supletivo/dev`) tem escopo **apenas DNS**:

| Capacidade | Status |
|---|---|
| DNS read/write | OK |
| DNSSEC leitura | OK |
| WAF / Firewall | NEGADO |
| Zone settings | NEGADO |
| Conta (Tunnel, Workers, R2, Email) | NEGADO (lista vazia) |

**Bloqueio duplo para as fases 2+:** (a) token com escopo de conta, (b) assinatura
Workers Paid ($5/mês) — ambos dependem de ação do usuário no dashboard.

## Fase 1 — Executável hoje (só DNS)

- [x] Registros DNS-AID publicados (`_a2a`/`_mcp`/`_index._agents`, SVCB + TXT)
- [ ] **1.1** DMARC ganha `rua=` — hoje é `p=none; adkim=s; aspf=s` **sem nenhum
      endereço de relatório**, ou seja: zero visibilidade. Precisa vir ANTES de
      qualquer `p=quarantine`, senão se aperta a política às cegas.
- [ ] **1.2** Implementar `--provision` em `scripts/manage-dns-aid.mjs` (worktree W1)

## Fase 2 — Depende de token de conta (sem custo novo)

- [ ] **2.1** Cloudflare Tunnel — tira `51.79.77.31` da internet pública. Maior
      ganho de segurança do plano. Grátis. `CLOUDFLARE_TUNNEL_TOKEN` já existe
      vazio em `.env.example`.
- [ ] **2.2** WAF + rate limiting no plano Free, na frente de `backend-web`.

## Fase 3 — Depende de Workers Paid ($5/mês)

- [ ] **3.1** Adapter de Cloudflare Email Sending em `services/notify/mail/`,
      atrás de feature flag, Stalwart como fallback (worktree W2).
      Custo: 3.000/mês inclusos, depois $0,35/1.000. **Produto em beta.**
- [ ] **3.2** Piloto 30 dias: fluxo não-crítico, medindo entrega vs Stalwart.
- [ ] **3.3** Workflows para orquestrar webhook Asaas (retry/idempotência).
      500k steps/mês inclusos. Só depois do piloto de e-mail.

## Não fazer

- Migrar `finance/` (8 modelos, ledger ACID) para Workers — reescrita de meses
  que piora a garantia transacional.
- Cloudflare Containers para `notify` — inadequação de modelo, custo maior.

## Worktrees

- **W1 `cf-dns-provision`** → Fase 1.2
- **W2 `cf-email-adapter`** → Fase 3.1
