# Design System — V7M Promotor

> Fonte da verdade única do design do app do promotor V7M.
> Implementação: `src/app/globals.css` + `@theme inline` Tailwind v4.
> Este doc descreve regras e papéis — a implementação em `globals.css` é a
> referência canônica para valores exatos (este doc aponta, não duplica).

## Identidade

**Direção:** Dark luxury — dourado metálico sobre preto/grafite, superfícies
claras em branco/cinza quente. **Sem cor de bandeira do Brasil.**

**Marca:** Preto · Dourado · Prata (três eixos). O dourado é o único acento; o
prata entra como eixo novo de sofisticação (bordas, ícones, texto secundário).

**Skin:** Esta identidade serve os **3 grupos** role-gated do app —
collaborators (candidato→promotor), leadership (coordenador), staff (futuro).
Não há identidade separada por área (decisão Q4 do plano de leadership, resolvida
2026-07-13).

**Estilo macro:** Trust & Authority (direção do ui-ux-pro-max) — credenciais
visíveis, métricas com lastro, antes/depois documentado.

---

## Paleta

### Neutros (preto → branco)

| Token | Hex | Papel |
|-------|-----|-------|
| `--black` | `#0b0b0c` | Tinta primária sobre claro, fundo da aurora |
| `--char` | `#141416` | Superfície escura principal (auth, header) |
| `--char-2` | `#1d1d20` | Cards sobre escuro |
| `--paper` | `#ffffff` | Superfície branca pura |
| `--paper-soft` | `#f5f4f1` | Fundo claro padrão (bg do app) |
| `--line-light` | `#e7e4dd` | Bordas sobre claro |

### Dourado (acento único)

| Token | Hex | Papel |
|-------|-----|-------|
| `--gold` | `#d9b15a` | Acento primário, foco ring, borda hover |
| `--gold-soft` | `#f0d493` | Destaque claro, borda hover em escuro |
| `--gold-deep` | `#a87b2e` | Hover de borda em claro |
| `--gold-ink` | `#8a6526` | Texto dourado legível sobre claro (AA) |
| `--gold-grad` | `135deg, #f4dca0→#d9b15a→#b07f30→#ecc97f` | CTA, botão primário, file-selector-button |

### Prata (eixo novo)

| Token | Hex | Papel |
|-------|-----|-------|
| `--silver` | `#c8ccd2` | Ícones, elementos secundários |
| `--silver-dark` | `#9aa0a8` | Texto secundário alternativo |
| `--silver-light` | `#e6e8ec` | Fundo sutil |

### Texto secundário

| Token | Hex | Papel | Contraste |
|-------|-----|-------|-----------|
| `--muted-on-dark` | `#b4b4bb` | Texto secundário sobre escuro | AA sobre `--char` |
| `--muted-on-light` | `#5c5c63` | Texto secundário sobre claro | AA sobre `--paper`/`--paper-soft` |

### Status semânticos

Cada status tem **dois tokens**: o base (texto/ícone sobre fundo claro) e o
`-soft` (legível sobre fundo escuro).

| Status | Base (claro) | Soft (escuro) | Uso |
|--------|-------------|---------------|-----|
| Ok | `--ok #2f8f5b` | `--ok-soft #79d39b` | Sucesso, aprovado |
| Danger | `--danger #c0392b` | `--danger-soft #ff9a8f` | Erro, rejeitado |
| Warn | `--warn #b07a13` | `--warn-soft #f0c361` | Pendente, atenção |
| Info | `--info #2f6fb0` | `--info-soft #93c2ee` | Neutro, em análise |

### Papéis semânticos (tema)

Tokens que **flipam com o tema** (ver §Dark Mode). Definidos em `:root` como
papéis, mapeados para os tokens concretos conforme claro/escuro.

| Papel | Claro | Escuro |
|-------|-------|--------|
| `--bg` | `var(--paper-soft)` | `var(--char)` |
| `--surface` | `var(--paper)` | `var(--char-2)` |
| `--surface-alt` | `var(--paper-soft)` | `var(--char)` |
| `--text` | `var(--black)` | `var(--paper)` |
| `--text-muted` | `var(--muted-on-light)` | `var(--muted-on-dark)` |
| `--border` | `var(--line-light)` | `rgb(231 228 221 / 0.15)` |
| `--border-hover` | `var(--gold-deep)` | `var(--gold-soft)` |

### Tailwind v4 (`@theme inline`)

Tokens expostos como utilities: `bg-brand-gold`, `text-brand-ink`,
`border-brand-silver`, etc. A camada `--color-brand-*` é **alias de migração
legada** (do app dos alunos) — apontam para os mesmos valores, permitindo
remap mecânico futuro.

---

## Tipografia

**Família:** Geist (uma família, pesos variáveis), self-hosted via
`next/font/google` com `display: swap`. CSP (`font-src 'self' data:`) **proíbe
CDN externa** de fontes — Geist via `next/font` é compatível (auto-hospedada).

| Papel | Variável | Peso | Uso |
|-------|---------|------|-----|
| Display | `--font-display` | 800 (extrabold) | h1–h3, `.page-title` |
| Body | `--font-body` | 400–700 | Corpo, labels, botões |

**Escala de tipo (fluida, `clamp`):**

| Token | Range | Uso |
|-------|-------|-----|
| `--text-hero` | `2.85rem → 6.8rem` | Hero da landing |
| `--text-h2` | `2rem → 3.6rem` | Título de seção |
| `--text-h2-sm` | `1.65rem → 2.5rem` | Título de página interna |
| `--text-h3` | `1.15rem → 1.35rem` | Subtítulo |
| `--text-lg` | `1.125rem → 1.375rem` | Corpo grande |
| `--text-base` | `1rem → 1.125rem` | Corpo padrão |

**Regras de peso:**
- Títulos (h1–h3, `.page-title`): **800** (extrabold), `line-height: 1.08`, `letter-spacing: -0.01em`, `text-wrap: balance`
- Corpo: 400–500 normal, `<strong>` 700
- Labels/`.kicker`: 600–700, `letter-spacing: 0.08–0.16em`, uppercase

---

## Ritmo & Espaço

| Token | Valor | Uso |
|-------|-------|-----|
| `--space-section` | `clamp(4.5rem, 3rem + 6vw, 9rem)` | Padding vertical de seção |
| `--container` | `68rem` (1088px) | Largura máxima de conteúdo |
| `--gutter` | `clamp(1.25rem, 4vw, 2.5rem)` | Padding horizontal |

Classes utilitárias: `.container-x` (width c/ gutter), `.section-y` (padding
vertical de seção).

Espaçamento interno de componentes segue sistema 4/8dp (Tailwind scale:
`p-1`=4px … `p-8`=32px).

---

## Superfícies & Elevação

| Token | Valor | Uso |
|-------|-------|-----|
| `--radius` | `18px` | Bordas de card/input/modal |
| `--radius-lg` | `28px` | Bordas grandes (hero, seções) |
| `--radius-sm` | `12px` | Bordas compactas |
| `--shadow-card` | `0 1px 2px / 0 10px 28px -18px` | Elevação padrão de card |
| `--shadow-card-hover` | `0 2px 6px / 0 20px 44px -22px` | Hover de card interativo |

---

## Movimento

| Token | Valor | Uso |
|-------|-------|-----|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Easing padrão (entrada) |
| `--dur` | `0.65s` | Duração base (animações de fundo) |

**Regras:**
- Micro-interações (hover, focus): 150–300ms
- Transições de página/passo: 300–400ms
- Animações de fundo (aurora): 22–28s (decorativas, `aria-hidden`)
- `prefers-reduced-motion: reduce` → **kill-switch global** (zera durations)
- Animar só `transform` + `opacity` (nunca `width`/`height`/`top`/`left`)

---

## Foco

| Token | Valor | Uso |
|-------|-------|-----|
| `--ring` | `0 0 0 4px rgb(217 177 90 / 0.45)` | Anel de foco dourado (inputs, cards, stepper) |

- `:focus-visible` global: `outline: 3px solid var(--char)`, `outline-offset: 3px`
- Elementos específicos sobrescrevem com `--ring` (inputs) ou anel branco (btn
  sobre escuro)
- Skip-link fixo no topo (`z-index: 100`), visível só em foco

---

## Inventário de Primitivos (`src/components/ui/`)

| Componente | Arquivo | Variantes |
|------------|---------|-----------|
| Button | `button.tsx` | `primary` (gold-grad), `ghost` (translúcido), `md`/`xl`, loading |
| Field | `field.tsx` | Input, Select, Textarea, ReadOnly, Error; `tone: light\|dark` |
| Badge | `badge.tsx` | `tone: ok\|danger\|warn\|muted\|gold` |
| Card | `card.tsx` | Estático + CardLink (interativo com hover) |
| StatusBanner | `status-banner.tsx` | `ok\|danger\|warn\|info`, `role="status" aria-live="polite"` |
| PageHeader | `page-header.tsx` | Kicker + title + subtitle; `tone: light\|dark` |
| Stepper | `stepper.tsx` | FunnelStepper (5 passos hardcoded); `aria-current="step"` |
| Stat | `stat.tsx` | Métrica (label + value, `lg\|xl`) |
| Spinner | `spinner.tsx` | Inline (`aria-hidden`) |
| CopyButton | `copy-button.tsx` | Clipboard c/ fallback `execCommand`; `min-h-[44px]` |
| FileInput | `file-input.tsx` | Estilizado, `forwardRef`, `tone` |
| Countdown | `countdown.tsx` | ISO countdown, 30s tick, threshold âmbar urgente |
| AuroraBackground | `aurora-background.tsx` | Decorativo (`aria-hidden`) |
| ThemeToggle | `theme-toggle.tsx` | Sol/lua Lucide, 3 ciclos (light/dark/system), localStorage |

> **Primitivos do console de leadership** (Modal, DataTable, Money, DateBR) —
> construir inline junto da 1ª tela que exigir (plano `17-frontend-leadership.md`
> §4: "em casa quando a tela precisar"). Não adiantar como biblioteca sem call site.

---

## Dark Mode

**Arquitetura:** `:root` define papéis semânticos (`--bg`, `--surface`,
`--text`, etc.) que apontam para tokens claros. `:root[data-theme="dark"]`
remapeia os papéis para tokens escuros. Default sem preferência = claro;
`@media (prefers-color-scheme: dark)` como fallback quando usuário nunca
escolheu.

**Toggle:** Componente `theme-toggle.tsx` (sol/lua Lucide), persiste em
`localStorage` (`"light"|"dark"|"system"`), seta `data-theme` no `<html>`.

**Anti-FOUC:** Script inline síncrono no `<head>` lê `localStorage` antes do
primeiro paint — a CSP permite (`script-src 'unsafe-inline'`).

**Componentes:** O prop `tone: "light"|"dark"` deixa de ser cor fixa e passa a
respeitar o tema ativo. Classes `-dark` (`.input-dark`, `.label-dark`, etc.)
viram variantes do papel semântico.

---

## Restrições de CSP

Do `next.config.ts` — todo asset deve ser **self-hosted** ou `data:` URI:

| Diretiva | Valor | Impacto |
|----------|-------|---------|
| `font-src` | `'self' data:` | Geist via `next/font` ✓, Google Fonts CDN ✗ |
| `img-src` | `'self' data: blob:` | Sem host externo de imagem |
| `style-src` | `'self' 'unsafe-inline'` | Inline styles permitidos |
| `script-src` | `'self' 'unsafe-inline'` (+ `'unsafe-eval'` dev) | Script inline anti-FOUC ✓ |
| `connect-src` | `'self'` | Só origem Next |
| `default-src` | `'self'` | Bloqueia tudo não explicitado |
| `object-src` | `'none'` | Sem plugins |
| `frame-ancestors` | `'none'` | Anti-clickjacking |

---

## A11y — Padrões Já Vigentes

- **Skip-link:** `.skip-link` renderizado no `<body>` de `layout.tsx`, visível
  em foco (teclado)
- **`:focus-visible`:** outline global 3px `--char` + offset 3px; sobrescrito
  por componente (inputs com `--ring` dourado, botões com anel branco)
- **`prefers-reduced-motion`:** kill-switch global que zera durations de
  animação e transição
- **ARIA nos primitivos:** `aria-describedby`, `role="alert"` (FieldError),
  `role="status" aria-live="polite"` (StatusBanner), `aria-current="step"`
  (Stepper), `aria-hidden` (Spinner, Aurora), `aria-live` (CopyButton)
- **Touch targets:** mínimo 44px (`min-h-[44px]` no CopyButton; regra geral
  nos checklists)
- **Semântica HTML:** `<nav>`, `<main id="main">`, headings hierárquicos,
  `<label>` com `htmlFor`
- **Cor não é único indicador:** badges e banners usam ícone + texto + cor;
  status semânticos têm variante `-soft` para os dois fundos
- **Geist com `display: swap`:** sem FOIT (flash of invisible text)
- **Zoom permitido:** viewport sem `maximum-scale` (a11y)

---

## Checklist de Pré-Entrega

### Visual
- [ ] Ícones SVG (Lucide/Heroicons), nunca emoji
- [ ] Uma família de ícones só (stroke width consistente)
- [ ] Tokens `--color-brand-*` nos componentes, nunca hex cru
- [ ] Pressed states não shiftam layout

### Interação
- [ ] Touch targets ≥ 44px
- [ ] Micro-interações 150–300ms com `--ease-out`
- [ ] Loading/disabled states visíveis em botões e inputs

### Claro/Escuro
- [ ] Contraste de texto ≥ 4.5:1 nos dois temas
- [ ] Contraste de texto secundário ≥ 3:1 nos dois temas
- [ ] Bordas/dividers visíveis nos dois temas
- [ ] Scrim de modal 40–60% opacidade

### Layout
- [ ] Safe areas respeitadas (notch, home indicator)
- [ ] Sem scroll horizontal em 375px
- [ ] Testado 375/768/1024/1440, portrait + landscape
- [ ] Conteúdo não fica sob fixed bars

### Acessibilidade
- [ ] Labels em todos os inputs e ícones
- [ ] Focus ring visível em todos os interativos
- [ ] `prefers-reduced-motion` respeitado
- [ ] Cor não é o único indicador de estado
