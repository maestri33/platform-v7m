# Landing Page — Programa de Promotores (Supletivo Brasil)

Landing de **recrutamento de promotor** (não é a landing de aluno). Público:
quem quer ganhar dinheiro **indicando matrículas**. O CTA inicia o funil do
candidato a promotor (cadastro → treino → entrevista → link liberado).

Astro + CSS puro + JavaScript vanilla — zero framework de UI, zero pixel de
terceiros. Mesmo padrão técnico da `landing-supletivo`.

> ⚠️ **Não confundir com a landing de aluno.** Lá o promotor já aprovado
> compartilha `?ref=<external_id dele>` para captar alunos. Aqui o parâmetro é
> `?hub=<polo>` e serve para amarrar o **novo promotor** ao polo certo.

## A mecânica (o que a copy promete — tudo verdade)

- **Comissão por matrícula paga:** R$ 100 por matrícula paga vinda do link do
  promotor. A obrigação dele acaba aí (não acompanha o aluno).
- **Bônus de volume:** +R$ 500 a cada 5 matrículas pagas na mesma semana.
- **Pagamento semanal por Pix:** fechamento toda sexta, 18h; cai na chave Pix.
- **Ferramenta = um link só.** Sem estoque, sem mensalidade, sem vender nada.

Todos os números vêm do `.env` (fonte única) — ver [Configuração](#configuração).

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
npm test           # unit (regras de atribuição de polo / hub→ref)
npm run test:e2e   # Playwright: hub→ref, eventos, calculadora, axe
                   # (requer `npm run build` antes e `npx playwright install chromium` 1x)
```

CI (`.github/workflows/ci.yml`): build → unit → e2e+axe → Lighthouse CI
(≥95 em Perf/A11y/SEO, ≤1MB). O `dist/` é 100% estático.

## Configuração

Copie `.env.example` para `.env`:

| Variável                   | O que controla                                            | Default |
| -------------------------- | --------------------------------------------------------- | ------- |
| `PUBLIC_APP_URL`           | Destino do CTA (cadastro do candidato a promotor)         | dev `http://localhost:3000` · build `https://app.maestri.group` |
| `SITE`                     | Domínio canônico (canonical, OG, sitemap, robots)         | `https://maestri.group` |
| `PUBLIC_COMMISSION_DIRECT` | Comissão por matrícula paga (R$)                          | `100` |
| `PUBLIC_BONUS_FLAT`        | Bônus por bloco de indicações pagas na semana (R$)        | `500` |
| `PUBLIC_BONUS_THRESHOLD`   | Tamanho do bloco que destrava o bônus                     | `5` |
| `PUBLIC_BONUS_REPEATS`     | `false` = degrau único semanal; `true` = a cada bloco     | `false` |
| `PUBLIC_CLOSING_LABEL`     | Texto do fechamento semanal do Pix                        | `toda sexta, às 18h` |
| `PUBLIC_LEGAL_NAME`        | Razão/nome da PJ no rodapé                                 | `V7M Empresarial` |
| `PUBLIC_CNPJ`              | CNPJ exibido no rodapé (vazio = oculta)                   | `48.811.016/0001-00` |
| `PUBLIC_CONTACT_EMAIL`     | E-mail de contato (SAC)                                   | `contato@maestri.group` |
| `PUBLIC_CONTACT_WHATSAPP`  | WhatsApp do SAC, só dígitos com DDI/DDD (vazio = oculta)  | `5511920062177` |

Os valores de comissão são lidos em `src/config.ts` (fonte única) e usados na
seção "Quanto dá pra ganhar", na calculadora, no FAQ, nos termos e no schema.

> ⚠️ **Bônus = degrau único, semanal.** Atingiu 5 matrículas pagas na semana →
> ganha o bônus (1x); abaixo de 5, não ganha; acima de 5 (10, 50, 100) o bônus
> continua sendo pago **uma única vez** na semana, somado às comissões por
> indicação. Refletido em `PUBLIC_BONUS_REPEATS=false`. Conferir os valores em
> `finance/config.py`.

## Vínculo com o polo (hub → ref)

Implementado em `src/scripts/attribution.ts`:

- A URL pública lê **`?hub=<polo>`** (e aceita `?ref=` como alias de entrada).
- First-touch: o primeiro polo capturado vence; visitas sem polo não
  sobrescrevem; um novo `hub`/`ref` explícito sobrescreve.
- Persistência dupla: `localStorage` (`pr_attribution`) + cookie `pr_hub`
  (90 dias, `SameSite=Lax`).
- No clique do CTA, o polo é repassado ao app como **`?ref=<polo>`** — o
  parâmetro que `create_candidate` consome. O nome interno `hub` **não vaza**
  para o app. Sem polo → polo padrão (decidido na API).

Teste manual:

1. `/?hub=poloA` → qualquer CTA leva `ref=poloA` ao app.
2. Reabrir sem `hub` → CTA ainda leva `ref=poloA` (first-touch).
3. `/?hub=poloB` → atualiza para `poloB`.

## Analytics (dataLayer)

Nenhum pixel instalado. `window.dataLayer` recebe:

| Evento         | Payload                                                              |
| -------------- | ------------------------------------------------------------------- |
| `page_view`    | hub/ref/UTMs capturados                                             |
| `cta_click`    | `position`: `hero` \| `ganhos` \| `final` \| `sticky`              |
| `faq_open`     | `question`                                                          |
| `calc_use`     | (1x, quando o usuário mexe na calculadora)                          |
| `scroll_depth` | `depth`: 25 \| 50 \| 75 \| 100                                      |
| `section_view` | `section`: hero, como-funciona, ganhos, caminho, confianca, faq, final |
| `js_error`     | `message`                                                           |

GTM/GA4/Meta Pixel: inserir no ponto comentado no `<head>` de `Base.astro`.

## Estrutura

```
src/
├── pages/index.astro          # landing (+ termos e privacidade, noindex)
├── layouts/Base.astro         # head SEO, JSON-LD, fontes
├── components/                # Hero, PixPhone, Steps, Earnings (calculadora),
│                              # Path (funil), Requirements, Trust, Faq, FinalCta…
├── data/faq.ts                # fonte única: FAQ visível + schema FAQPage
├── scripts/attribution.ts     # captura/persistência de polo (hub→ref) + UTMs
├── scripts/main.ts            # eventos + animações (IO) + calculadora
└── config.ts                  # APP_URL, marca, comissão (.env), helpers de cálculo
```

## Decisões assumidas (revisar)

- **Marca:** "Supletivo Brasil · Promotor" (constante `BRAND`/`PROGRAM` em
  `src/config.ts`).
- **Prova social:** sem logos/depoimentos. O bloco de marcas do polo
  (`HUB_BRANDS` em `config.ts`) só aparece quando preenchido — pendência
  jurídica/comercial.
- **Páginas legais:** `/termos/` e `/privacidade/` são rascunhos `noindex` —
  **revisar com jurídico** e trocar CNPJ/contato antes de publicar.

## Acessibilidade & Performance

- WCAG 2.1 AA: contraste, foco visível, teclado, `<details>` nativo no FAQ,
  skip-link, slider com `aria-valuetext`.
- `prefers-reduced-motion: reduce` desliga todas as animações.
- Funcional sem JS: CTAs (href limpo), FAQ nativo, calculadora vira tabela.
- Fontes self-hosted (woff2 latin, swap, preload das críticas). CSS inlinado.

## Regenerar OG image / ícones

`npm run assets` — baixa o TTF do Archivo Black (google/fonts) na 1ª execução
e rasteriza via sharp. O texto vira `<path>` (opentype.js).
