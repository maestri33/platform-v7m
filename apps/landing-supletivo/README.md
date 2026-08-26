# Landing Page — Supletivo Brasil ("A Virada")

Landing page estática de alta conversão para o Supletivo Brasil (EJA 100% online,
Ensino Fundamental e Médio). Astro + CSS puro + JavaScript vanilla — zero
framework de UI, zero pixel de terceiros.

## Requisitos

- Node.js 20+ (testado com 22)
- npm

## Comandos

```bash
npm install        # instala dependências
npm run dev        # dev server (http://localhost:4321)
npm run build      # build estático em dist/
npm run preview    # serve o dist/ localmente
npm run assets     # regenera OG image, favicon.ico e ícones PWA
npm test           # unit (regras de atribuição/first-touch)
npm run test:e2e   # Playwright: fluxos de ref, eventos, elegibilidade, axe
                   # (requer `npm run build` antes e `npx playwright install chromium` 1x)
```

CI (GitHub Actions, `.github/workflows/ci.yml`): build → unit → e2e+axe →
Lighthouse CI com orçamento (≥95 em Perf/A11y/SEO, ≤1MB).

O `dist/` é 100% estático (HTML/CSS/JS/fontes) — funciona em qualquer servidor
de arquivos, sem adapter de Vercel/Netlify.

## Configuração

Copie `.env.example` para `.env` e ajuste:

| Variável         | O que controla                                              | Default                                                       |
| ---------------- | ----------------------------------------------------------- | ------------------------------------------------------------- |
| `PUBLIC_APP_URL` | Destino de TODOS os CTAs (app de matrícula)                 | dev: `http://localhost:3000` · build: `https://app.supletivo.net.br` |
| `SITE`           | Domínio canônico (canonical, OG, `sitemap.xml`, `robots.txt`) | `https://supletivo.net.br`                                    |

- `PUBLIC_APP_URL` é lido em `src/config.ts` (constante única `APP_URL`).
- `SITE` é lido em `astro.config.mjs`. `sitemap.xml` e `robots.txt` são gerados
  no build pela integração `integrations/seo-files.mjs`.

## Estrutura

```
├── astro.config.mjs            # site canônico, output static, integração SEO
├── integrations/seo-files.mjs  # gera sitemap.xml + robots.txt no build
├── tools/generate-assets.mjs   # gera OG image (1200x630) + apple-touch-icon
├── public/                     # favicon, og-image, fontes woff2 (latin)
└── src/
    ├── pages/index.astro       # landing (+ termos e privacidade placeholders)
    ├── layouts/Base.astro      # head SEO, JSON-LD, fontes, comentário p/ GTM
    ├── components/             # Hero, Mirror, Steps, Trust, Pricing, Virada,
    │                           # Faq, FinalCta, StickyCta, Footer, Logo...
    ├── data/faq.ts             # fonte única: FAQ visível + schema FAQPage
    ├── scripts/attribution.ts  # captura/persistência/append de ref + UTMs
    ├── scripts/track.ts        # dataLayer + track()
    ├── scripts/main.ts         # entry: eventos + animações (IO)
    └── styles/                 # tokens.css (design tokens) + global.css
```

## Atribuição (ref de afiliado + UTMs)

Implementada em `src/scripts/attribution.ts`:

- Captura `?ref=` e preserva `utm_source/medium/campaign/term/content`,
  `gclid`, `fbclid`.
- Persistência dupla: `localStorage` (chave `sb_attribution`, JSON com
  timestamp) + cookie first-party `sb_ref` (90 dias, `SameSite=Lax`).
- **First-touch**: o primeiro `ref` capturado vence; visitas sem `ref` não
  sobrescrevem. Um novo `ref` explícito na URL sobrescreve.
- Todos os `<a data-cta>` são reescritos no client anexando os parâmetros ao
  `APP_URL`. Sem JS os CTAs continuam funcionando (href limpo renderizado no
  servidor) — o append é progressive enhancement.

Teste manual (critérios de aceite):

1. Abrir `/?ref=teste123` → qualquer CTA deve conter `ref=teste123`.
2. Fechar e reabrir sem `ref` → CTA ainda carrega `ref=teste123`.
3. Abrir `/?ref=outro` → ref atualiza para `outro`.

## Analytics (dataLayer)

Nenhum pixel instalado. `window.dataLayer` recebe:

| Evento              | Payload                                                        |
| ------------------- | -------------------------------------------------------------- |
| `page_view`         | ref/UTMs capturados                                            |
| `cta_click`         | `position`: `hero` \| `preco` \| `final` \| `sticky` \| `elegibilidade` \| `conteudo` |
| `faq_open`          | `question` (texto da pergunta)                                 |
| `scroll_depth`      | `depth`: 25 \| 50 \| 75 \| 100                                 |
| `section_view`      | `section`: hero, espelho, como-funciona, elegibilidade, confianca, preco, virada, faq, final |
| `eligibility_check` | `faixa`: lt15 \| 15a17 \| 18mais                               |
| `js_error`          | `message` (erro de runtime no client, p/ monitorar via GTM)    |

GTM/GA4/Meta Pixel: inserir no ponto comentado no `<head>` de
`src/layouts/Base.astro`.

## SEO

- Title/description/OG/Twitter em `src/pages/index.astro` + `layouts/Base.astro`.
- JSON-LD: `Organization`, `Course` (AggregateOffer 999–1188 BRL) e `FAQPage`
  gerado de `src/data/faq.ts` (espelha o FAQ visível).
- `sitemap.xml` + `robots.txt` gerados no build (domínio vem de `SITE`).
- Páginas de conteúdo (orgânico de cauda longa): `/supletivo-online/`,
  `/eja-a-distancia/`, `/terminar-ensino-medio/` — linkadas no rodapé.
- `termos` e `privacidade` têm conteúdo-base completo (LGPD/CDC) —
  **revisar com jurídico** e trocar CNPJ/e-mail antes de publicar.

Regra de copy (não quebrar): **não citar nome de instituição parceira** em
copy, código, meta ou schema; **sem números de prova social**; preço sempre
"de R$ 1.615 por 12x de R$ 99 ou R$ 999 no Pix" com aviso de promoção.

## Acessibilidade & Performance

- WCAG 2.1 AA: contraste ≥ 4.5:1, foco visível, navegação por teclado,
  `<details>` nativo no FAQ, skip-link, `aria-label` no CTA sticky.
- `prefers-reduced-motion: reduce` desliga todas as animações.
- Página funcional com JS desabilitado (conteúdo + CTAs).
- Fontes self-hosted (woff2 latin, `font-display: swap`, preload das críticas).
- CSS inlinado no HTML (sem request render-blocking); JS único e minúsculo
  inlinado pelo Astro.

Headers recomendados no servidor (não são gerados pelo build):

```
Cache-Control: public, max-age=31536000, immutable   # /fonts/*, /og-image.png
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

## Regenerar OG image / ícones

`npm run assets` — baixa o TTF do Archivo Black (repositório oficial
google/fonts) na primeira execução para `tools/fonts/` e rasteriza via sharp.
O texto vira `<path>` (opentype.js), então não depende de fontes do sistema.
