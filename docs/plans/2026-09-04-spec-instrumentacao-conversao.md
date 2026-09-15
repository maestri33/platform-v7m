# Spec — Instrumentação de conversão (landing supletivo + app de matrícula)

**Data:** 2026-09-04 · **Escopo:** tornar a matrícula paga otimizável por Google Ads e Meta, com receita atribuível à origem do clique.
**Executa os itens D3, D4 e D9** de `docs/plans/2026-09-04-campanha-matriculas-4-semanas.md`, que já classifica a instrumentação como bloqueante.

**Classes:** `[verificado]` = lido no fonte · `[assumido]` = benchmark externo.

---

## 0. Estado real — mais completo do que se supunha

**São 9 eventos no `dataLayer`, não 4** `[verificado]`:

| Evento | Origem |
| --- | --- |
| `page_view` | `apps/landing-supletivo/src/scripts/main.ts:26` |
| `cta_click` | `main.ts:32` |
| `faq_open` / `faq_close` | `main.ts:39` |
| `section_view` | `main.ts:50` |
| `js_error` | `main.ts:62,65` |
| `scroll_depth` | `main.ts:78` |
| `eligibility_check` | `components/Eligibility.astro:131` |
| `promoter_discount_applied` | `scripts/dynamic-pricing.ts:106` |
| `promo_view` | `scripts/promo-countdown.ts` (adicionado em 2026-09-04) |

**Três achados que mudam o plano:**

1. **O CSP da landing já autoriza o GTM.** `apps/landing-supletivo/public/_headers:7` já tem `script-src … https://www.googletagmanager.com`, `connect-src … https://www.google-analytics.com` e `frame-src https://www.googletagmanager.com` `[verificado]`. GTM + GA4 entram sem tocar em CSP. **Meta Pixel não** — falta `https://connect.facebook.net`.
2. **O app Next.js tem zero analytics e um CSP que bloqueia tudo.** `apps/supletivo/src/app/layout.tsx:1-69` não tem tag alguma; `next.config.ts:14` e `:18` fariam qualquer tag falhar em silêncio `[verificado]`.
3. **Não existe NENHUM campo de atribuição no backend.** Só `Lead.promoter` FK (`users/roles/lead/models.py:37`). `ref`, `utm_*`, `gclid`, `fbclid` não existem em `Lead` nem em `Profile` — nem hoje, nem em migração antiga `[verificado]`.

---

## 1. Onde a atribuição quebra hoje

```
CLIQUE PAGO  ?utm_source=google&utm_campaign=X&gclid=ABC
  ▼
supletivo.net.br  [Astro estático]
  ├─ attribution.ts:64-72  captura as 8 chaves
  ├─ attribution.ts:53-62  localStorage sb_attribution + cookie sb_ref (SÓ o ref)
  ├─ attribution.ts:110-121 reescreve todos os a[data-cta] com as 8 chaves
  │
  ├─ QUEBRA 1 — cookie sb_ref é host-only (sem Domain=) e não cruza para
  │   app.supletivo.net.br. E _headers:5 Referrer-Policy mata o referrer.
  │   => o QUERY STRING é o único canal entre os dois domínios.
  ▼
app.supletivo.net.br  [Next.js 16]
  ├─ QUEBRA 2 — lead-ref.ts:36 lê SÓ `ref`. utm_*, gclid, fbclid
  │   são DESCARTADOS na porta de entrada.
  ├─ QUEBRA 3 — api.ts:198-202 checkPhone envia só { phone, ref }
  ▼
Django Ninja
  ├─ QUEBRA 4 — service.py:465 _resolve_promoter(ref) -> User.
  │   A STRING ref morre aqui. Lead não tem coluna de atribuição.
  ▼
pagamento: o browser SAI do domínio (use-lead-flow.ts:582)
  => PIX é assíncrono. Não existe página nossa no instante do pagamento.
  ▼
webhook Asaas -> mark_paid (service.py:748-782) -> Enrollment nasce em :830
  ├─ QUEBRA 5 — lead/hooks.py:11-13 descarta amount_cents
  └─ QUEBRA 6 — nenhum hook de conversão. Zero analytics no backend.
```

---

## 2. Mudanças

### Bloco A — GTM na landing (D3)

| arquivo:linha | o que fazer |
| --- | --- |
| `src/config.ts` (append) | `export const GTM_ID: string \| null = import.meta.env.PUBLIC_GTM_ID?.trim() \|\| null;` — cópia literal de `landing-promotor/src/config.ts:93` |
| `src/env.d.ts` | `readonly PUBLIC_GTM_ID?: string;` |
| `src/layouts/Base.astro:7` | adicionar `GTM_ID` ao import de `../config` |
| `src/layouts/Base.astro:96-104` | substituir o comentário "Nenhum pixel instalado" pelo `{GTM_ID && (<script is:inline …>)}` — cópia de `landing-promotor/src/layouts/Base.astro:97-105` |
| `src/layouts/Base.astro:107` | `{GTM_ID && (<noscript><iframe …/></noscript>)}` logo após `<body>`, antes do skip-link |
| `.env.example` | `PUBLIC_GTM_ID=` com comentário |
| **`turbo.json:8-17`** | **adicionar `PUBLIC_GTM_ID` ao `globalEnv`** — e também `SITE`, `PUBLIC_APP_URL`, `PUBLIC_BACKEND_URL`, todas ausentes hoje |
| **`.github/workflows/deploy.yml:58-59`** | adicionar `env: PUBLIC_GTM_ID: ${{ vars.PUBLIC_GTM_ID }}` ao step "Build Astro Landings" |

**Duas armadilhas de build, ambas verificadas:**

- **`turbo.json` não lista as `PUBLIC_*` no `globalEnv`.** O Turborepo hasheia a task só pelas vars declaradas, então **um `dist/` cacheado sem GTM será replayado** depois de você adicionar a variável. Você faria deploy de um site sem tag achando que instalou. Sintoma: build verde em segundos com `>>> FULL TURBO`.
- **`deploy.yml` não passa `env:` no build.** Como o deploy é `wrangler pages deploy apps/landing-supletivo/dist`, **configurar a variável no painel do Cloudflare Pages não tem efeito nenhum** — o build acontece no GitHub Actions e o Astro inlina `PUBLIC_*` em build-time.

> Este mesmo risco de cache-replay **já existe hoje** para `SITE`, `PUBLIC_APP_URL` e `PUBLIC_BACKEND_URL`. E agora também para as `PUBLIC_PROMO_*`.

### Bloco B — GA4 (D4, cliente)

| arquivo:linha | o que fazer |
| --- | --- |
| `components/CtaButton.astro:6,20` | importar `PRICE` e adicionar `data-cta-value={PRICE.pixTotal}` |
| `scripts/main.ts:32` | `track('cta_click', { position, value: Number(cta.dataset.ctaValue) \|\| undefined, currency: 'BRL' })` |
| `scripts/main.ts:29-33` | dedupe de sessão — 5 CTAs na página, um visitante clicando em 3 gera 3 `begin_checkout` |

**Por que passar o preço por `data-*` e não importar `price.ts` no cliente:** `data/price.ts:80` é `await` de topo de módulo que faz `fetch` (`:49`) — é código de **build-time** por desenho. Importado no bundle do cliente, esse fetch rodaria no browser de cada visitante.

**Mapeamento (configuração no GTM, sem código):**

| dataLayer | GA4 | papel |
| --- | --- | --- |
| `cta_click` | `begin_checkout` (+`value`,`currency`) | conversão **secundária** — nunca alvo de lance |
| `eligibility_check` | `generate_lead` | micro-conversão secundária |
| `page_view` | `page_view` | **desligar o pageview automático da tag de config** (ver R1) |
| `scroll_depth`, `section_view`, `faq_open`, `promo_view`, `promoter_discount_applied` | custom | engajamento e público de retargeting. **Não marcar como conversão** |
| `js_error` | custom | monitor de saúde da landing |
| **`purchase`** | **`purchase`** | **não existe e não deve ser criado no cliente** |

### Bloco C — Meta Pixel + CAPI

| arquivo:linha | o que fazer |
| --- | --- |
| **`public/_headers:7`** | `script-src`: adicionar `https://connect.facebook.net`. `connect-src`: adicionar `https://www.facebook.com` |
| GTM | Pixel base no trigger `page_view`; `InitiateCheckout` no `cta_click` |

**Por que CAPI é obrigatório — 3 razões verificadas + 1 assumida:**

1. **Não existe página nossa no momento do pagamento** `[verificado]` — `use-lead-flow.ts:582` faz `window.location.assign(url)` para o gateway.
2. **PIX é assíncrono** `[verificado]` — `pix-checkout.tsx:10` declara que o webhook do Asaas é a fonte da verdade; a página só faz polling de 5s e para quando a aba perde foco. A pessoa pode pagar horas depois, de outro aparelho.
3. **Só o backend sabe o valor real** `[verificado]` — `Checkout.amount` (`lead/models.py:86`). O preço da landing é snapshot de build e pode ser descontado em runtime por `dynamic-pricing.ts:64-93`.
4. Ad-blockers e iOS ATT em público mobile Android `[assumido]`.

### Bloco D — O ponto central: `purchase` server-side

**D.1 — Modelo novo**, `users/roles/lead/models.py:63` (entre `Lead` e `Checkout`):

```python
class LeadAttribution(models.Model):
    lead = models.OneToOneField(Lead, on_delete=models.CASCADE, related_name="attribution")
    ref_raw      = models.CharField(max_length=64, blank=True)   # a string, mesmo que não resolva
    utm_source   = models.CharField(max_length=128, blank=True)
    utm_medium   = models.CharField(max_length=128, blank=True)
    utm_campaign = models.CharField(max_length=128, blank=True)
    utm_term     = models.CharField(max_length=128, blank=True)
    utm_content  = models.CharField(max_length=128, blank=True)
    gclid        = models.CharField(max_length=255, blank=True, db_index=True)
    fbclid       = models.CharField(max_length=255, blank=True)
    fbp          = models.CharField(max_length=64,  blank=True)  # cookie _fbp
    fbc          = models.CharField(max_length=255, blank=True)  # cookie _fbc
    client_ip    = models.GenericIPAddressField(null=True, blank=True)
    user_agent   = models.CharField(max_length=400, blank=True)
    landing_url  = models.URLField(max_length=500, blank=True)   # CAPI event_source_url
    sent_google  = models.DateTimeField(null=True, blank=True)   # ledger anti-duplicata
    sent_meta    = models.DateTimeField(null=True, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)
```

**Por que OneToOne e não campos em `Lead`:** `Lead` é criado no caminho quente com `.create()` e FKs não-nuláveis (`service.py:470-472`); a atribuição é opcional, larga e write-once. **`fbp`/`fbc`/`client_ip`/`user_agent` não são opcionais** — são o que dá *match quality* no CAPI; `fbclid` sozinho tem match ruim. Precedente de guardar IP/UA: `enrollment/models.py:92-93` (`consent_ip`, `consent_user_agent`).

**D.2 — Propagação**

| # | arquivo:linha | o que fazer |
| --- | --- | --- |
| 1 | `landing/scripts/attribution.ts:60` | gravar o blob JSON completo no cookie, não só o `ref`. Em aba privada o `localStorage` falha (`:56-58` engole) e utm/gclid somem inteiros. Considerar `Domain=.supletivo.net.br` |
| 2 | `app/_lead/lead-ref.ts:35-42` | generalizar para ler as 8 chaves + cookies `_fbp`/`_fbc`; persistir em `supletivo.attr` (JSON). Manter `resolveEntryRef()` como wrapper |
| 3 | `app/_lead/lead-ref.ts:13` | 60 -> 90 dias, alinhando com `attribution.ts:29` |
| 4 | `app/lib/api.ts:198-202` | `checkPhone(phone, ref?, attribution?)` |
| 5 | `app/_lead/lead-api.ts:88-91` | repassar |
| 6 | `app/_lead/use-lead-flow.ts:351,462` | passar nas duas chamadas |
| 7-8 | `api/schemas/auth.py:12,14` | `AttributionIn` novo + `CheckIn.attribution: AttributionIn \| None = None`. **Aninhado**, não 10 campos flat |
| 9 | `api/clients/routers/auth.py:41` | passar `attribution` e derivar `client_ip`/`user_agent` do `request` |
| 10 | `users/roles/lead/service.py:472` | gravar `LeadAttribution` **em savepoint com try/except**, doutrina de `service.py:837-843`. Falha de atribuição nunca pode matar a captação |

**A atribuição vai no `/auth/check`, não no checkout.** O `Lead` nasce no primeiro passo do funil (`service.py:470`, tela do telefone), antes de CPF e e-mail. Esperar o checkout perderia todo mundo que abandona.

**D.3 — Sender**, novo pacote `services/backend/integrations/analytics/`:

| arquivo | conteúdo | padrão a copiar |
| --- | --- | --- |
| `client.py` | `httpx.Client` síncrono + erro tipado, config via `get_setting` | `notify/sdk/client.py:33-48`, `bank/asaas/client.py:19-23,225-228` |
| `google.py` | **Offline Conversion Import**: `ClickConversion` com `gclid`, `conversion_action`, `conversion_value`, `conversion_date_time`. Fallback sem gclid: Enhanced Conversions for Leads (e-mail/telefone SHA-256) | — |
| `meta.py` | `POST /{pixel_id}/events`: `event_name:"Purchase"`, `action_source:"website"`, **`event_id = str(lead.external_id)`** (dedupe), `user_data:{fbp,fbc,client_ip_address,client_user_agent,em,ph}`, `custom_data:{value: float(checkout.amount), currency:"BRL"}` | — |
| `tasks.py` | `send_purchase(lead_external_id)` com classificação permanente-vs-retentável | `notify/sdk/push.py:19-40` (`_PERMANENT_STATUSES = {400,404,422}`) |

**Não usar GA4 Measurement Protocol como canal do dinheiro:** o MP não tem campo `gclid` e exige `client_id`/sessão GA4, que o servidor não tem porque o browser já saiu.

**D.4 — O engate**, `users/roles/lead/service.py:778`, ao lado de `_notify_paid`:

```python
transaction.on_commit(
    lambda: async_task("integrations.analytics.tasks.send_purchase", str(lead.external_id))
)
```

Três razões para ser `on_commit` + fila:

- **`on_commit`**: o bloco atômico abre em `:767` e fecha em `:776`; disparar dentro enviaria conversão de pagamento que ainda pode dar rollback (`_apply_effects` levanta `LeadError` em `:797`/`:829`).
- **fila**: `mark_paid` roda sincronamente dentro da request do webhook Asaas (`asaas/views.py:36-52`). POST lento ao Google/Meta atrasaria o ack. A fila é **django-q** (`core/settings.py:122,494`), não Celery.
- **precedente idêntico**: `service.py:498-511` (`_enqueue_avatar_fetch`) já faz fire-and-forget neste mesmo módulo.

**Valor: `checkout.amount`** (`lead/models.py:86`, já vem no `select_related` de `mark_paid` em `:756`). **Não usar** `amount_cents` do webhook (descartado em `hooks.py:12`) nem `Commission.amount` (é outro número).

**Filtrar `lead.self_study`** (`lead/models.py:51`): auto-matrícula de promotor não vem de mídia paga e envenenaria o Smart Bidding.

---

## 3. Dupla contagem e perda de atribuição

| # | risco | mitigação |
| --- | --- | --- |
| R1 | `page_view` dobrado (tag de config + `main.ts:26`) | Desligar "Send a page view event" na tag de configuração |
| R2 | `faq_open`/`faq_close` do mesmo listener de `toggle` | Não marcar como conversão |
| R3 | `cta_click` sem dedupe — 5 CTAs (`Hero:100`, `Pricing:54`, `Eligibility:61`, `FinalCta:78`, `StickyCta:19`) | Dedupe por sessão + manter `begin_checkout` secundário |
| R4 | `purchase` cliente + servidor: `/pix/[token]` fica `phase==="paid"` para sempre e **cada recarga** refaria o evento (`pix-checkout.tsx:31-33,112`) | **`purchase` é exclusivamente server-side.** Se algum dia entrar no cliente, usar o mesmo `event_id` |
| R5 | Retentativa do webhook + retry do django-q | Check-and-set em `sent_google`/`sent_meta` **antes** do POST. (`mark_paid` já é idempotente em `:764-765`) |
| R6 | `initAttribution()` roda 2x (`main.ts:18` e `dynamic-pricing.ts:42`) | Latente. Passar o `attr` resolvido para `initDynamicPricing(attr)` |
| R7 | Estorno infla receita (`hooks.py:24-33` tem `mark_refunded`, nada avisa as plataformas) | Meta: Purchase negativo. Google: conversion adjustment. Desejável |
| R8 | First-touch x last-touch misturados: `ref` é first-touch, UTMs são merged (`attribution.ts:89-102`) | Guardar o blob com timestamp e não reconciliar no servidor |
| R9 | Assimetria 90d (landing) x 60d (app) | Alinhar em 90d |
| R10 | `ref` inválido só vira `logger.warning` (`service.py:186-188`) | O campo `ref_raw` resolve a auditoria |
| R11 | Aba privada: `localStorage` falha e o cookie tem só o `ref` | Blob completo no cookie (D.2 #1) |
| R13 | Cookies host-only nas duas pontas + `Referrer-Policy: strict-origin-when-cross-origin` | É por isso que a QUEBRA 2 é fatal, não cosmética |

---

## 4. Como provar que cada tag dispara

| # | provar | como |
| --- | --- | --- |
| V1 | GTM entrou no `dist/` | `npx astro build && grep -c googletagmanager dist/index.html` -> `2`. Se o turbo disser `FULL TURBO`, o teste é inválido: `pnpm turbo run build --force` |
| V2 | Degradação silenciosa sem a var | Build sem `PUBLIC_GTM_ID` -> grep `0`, sem `GTM-undefined`, sem erro |
| V3 | `dataLayer` preservado | `pnpm --filter @v7m/landing-supletivo test:e2e` — `tests/e2e/landing.spec.ts:38-93` já assere os eventos. Tem de continuar verde |
| V4 | GTM lê os eventos | GTM Preview em `/?utm_source=teste&gclid=TESTE123` |
| V5 | Sem `page_view` duplicado | GA4 DebugView: exatamente um por carregamento |
| V6 | `begin_checkout` com valor | Clicar no CTA -> `value=999`, `currency=BRL` |
| V7 | Pixel não bloqueado pelo CSP | Console sem violação para `connect.facebook.net`; Test Events recebe `PageView` |
| V8 | Atribuição atravessa o domínio | Cookie `supletivo.attr` com as 4 chaves |
| V9 | Atribuição chega ao banco | `LeadAttribution.objects.latest("created_at")` com `gclid`, `utm_source`, `client_ip`, `user_agent` |
| V10 | Atribuição não quebra a captação | Forçar exceção na escrita e asserir que o `Lead` nasceu e o `/auth/check` deu 200 |
| V11 | `purchase` dispara no webhook | POST no webhook com `asaas-access-token` e payload `PAYMENT_CONFIRMED` real -> `Lead.status==PAID`, Enrollment criado, task enfileirada, Test Events com `value == Checkout.amount` |
| V12 | Idempotência | Reentregar o webhook 3x -> um único timestamp em `sent_meta`, um `Purchase` no Events Manager |
| V13 | Nada dispara antes do commit | Fazer `_apply_effects` levantar `LeadError` e asserir zero tasks |
| V14 | `self_study` excluído | Lead `self_study=True` pago -> nenhuma conversão enviada |
| V15 | Google recebe | Google Ads -> Conversões, com o `gclid` de teste (latência de horas) |

Skill de apoio: `run-landing-supletivo`.

---

## 5. Bloqueante vs. desejável

| # | item | esforço | por quê |
| --- | --- | --- | --- |
| **B0** | **Ops: verificar domínio na Meta + criar conversion action no Google Ads + OAuth2/developer token** | 0 código, **dias de espera** | Caminho crítico. **Começar no dia 0** |
| **B1** | GTM na landing (Bloco A, 8 arquivos) | S — 2-3h | Sem container não existe tag |
| **B2** | GA4 + `begin_checkout` com valor (Bloco B) | S — 2-4h | Maioria na UI do GTM |
| **B3** | Meta Pixel + alargar CSP (Bloco C) | S — 1-2h | Sem pixel não há `_fbp`/`_fbc`, e sem eles o CAPI tem match ruim |
| **B4** | Cadeia de propagação (D.1 + D.2, 10 pontos + migração) | M — 1-2 dias | **É a quebra que mata tudo** |
| **B5** | Sender + engate (D.3 + D.4) | M — 1-2 dias | Sem `purchase`, as plataformas só otimizam por `cta_click` — que mediu 0 matrículas |
| **B6** | Ledger anti-duplicata + filtro `self_study` | S — 2-3h | Sai junto com B5; sem isso o sinal nasce sujo |

**Ordem:** B0 no dia 0 (paralelo, é espera) -> B1 -> B2 -> B3 -> B4 -> B5 -> B6.

**Não confundir "GTM instalado" com "mídia paga otimizável".** B1–B3 são baratos e visíveis mas por si só não permitem otimização por conversão real; B4–B5 é que fazem isso, e não podem ser testados de ponta a ponta antes de B0 concluir.

**Desejável:** instrumentar o app Next.js (exige mexer no CSP de `next.config.ts:14,18`) · ajuste de estorno (R7) · Enhanced Conversions para cliques sem `gclid` · consolidar a leitura dupla de `initAttribution()` (R6) · atualizar `pages/privacidade.astro` (enviar e-mail/telefone hasheados a terceiros é tratamento de dado pessoal que a política tem de declarar, LGPD) · remover `registerLead` (`app/lib/api.ts:274-286`, sem nenhum caller).

---

## 6. Bugs achados de passagem

1. **`api/staff/routers/users.py:54-67`** (`mark_lead_paid`) levanta `AttributeError` em toda chamada: invoca `lead_iface.get_by_external_id` (`:58`), que não existe, e lê `lead.payment_id` (`:61`) e `lead.payment.provider` (`:64`), que não existem em `Lead` (o certo é `lead.checkout.provider_payment_id` / `.provider`). **É justamente o endpoint que a equipe usaria para forçar um pagamento e testar a conversão.**
2. **`users/roles/lead/hooks.py:11-13`** aceita `amount_cents` e nunca o repassa a `mark_paid`. Não é bug funcional (`Checkout.amount` é melhor), mas o parâmetro mente sobre o contrato.
3. **`turbo.json:8-17`** já está com `SITE`, `PUBLIC_APP_URL` e `PUBLIC_BACKEND_URL` fora do `globalEnv` — o risco de cache-replay descrito no Bloco A **já existe hoje**.
