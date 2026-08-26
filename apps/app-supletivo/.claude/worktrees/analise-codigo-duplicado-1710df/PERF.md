# PERF.md — Baseline de Performance do Supletivo Brasil

**Data:** 2026-07-03 | **Build:** Next.js 16.2.7 (Turbopack) | **Ambiente:** Produção (static export)

---

## 🎨 Design System (`@supletivo/ui`)

Extraído em 2026-07-03 para `packages/ui/` — monorepo npm workspace.

| Categoria | Arquivo | Tokens |
|-----------|---------|--------|
| Cores | `tokens/colors.css` | 15 variáveis (green, blue, yellow, neutrals, feedback) |
| Tipografia | `tokens/typography.css` | 18 variáveis (sizes, weights, tracking, leading) |
| Espaçamento | `tokens/spacing.css` | 13 variáveis (grade 4px) |
| Radius | `tokens/radius.css` | 7 variáveis |
| Sombras | `tokens/shadows.css` | 5 variáveis (card, button, text, face-cutout) |
| Blur | `tokens/blur.css` | 3 variáveis |
| Durações | `tokens/durations.css` | 7 variáveis (durations + easings) |
| **Total** | | **68 design tokens** |

### Temas

| Tema | Arquivo | Ativação |
|------|---------|----------|
| `supletivo` (padrão) | `themes/supletivo.css` | `:root` (default) |
| `staff` | `themes/staff.css` | `<html data-theme="staff">` |

### Componentes (20 extraídos)

Button, Card, TextField, SelectField, Stepper, FileUpload, CameraCapture,
OtpInput, ErrorBox, LoadingOverlay, IconBadge, BrandDots, BackLink,
BackgroundGradient, AuroraBackground, DiplomaFlag, WisprText, SiteFooter,
ConditionalFooter, PlatformCredentials

### Regressão

| Guard | Comando | Critério |
|-------|---------|----------|
| Build | `npm run build` | Zero errors |
| Lint design tokens | `npm run lint` | Warn: hex colors in JSX |
| E2E screenshots | `npm run test:e2e` | ≈ identical to baseline |
| PERF.md | Este arquivo | Sem regressão nos números |

---

## 📊 Baseline do Bundle (Produção)

| Métrica | Valor |
|---------|-------|
| Total static chunks (JS+CSS) | 544 KB (uncompressed) |
| JS total estimado (gzip) | ~150–180 KB |
| CSS principal | 52 KB (10 KB gzip) |
| Maior chunk JS | 223 KB (71 KB gzip) |
| 2º maior chunk | 139 KB (39 KB gzip) |
| 3º maior chunk | 110 KB (39 KB gzip) |
| Tempo de build (Turbopack) | 5.4s |
| TypeScript | 4.3s |
| Páginas estáticas | 15 |

**Status JS inicial:** ✅ Sob 200 KB gzip, mas próximo do limite (~180 KB). GSAP sozinho representa ~30 KB.

---

## 🔝 Top 10 Culpados de Performance

### 1. 🥇 Aurora Background — GPU constantemente ocupada

**Arquivo:** `src/app/globals.css:327-390` + `src/components/ui/aurora-background.tsx`

- Montado **permanentemente** no layout raiz (`layout.tsx:57`)
- **Duas camadas** com `blur(34px)` — o filtro CSS mais caro
- Pseudo-elemento `::after` com `mix-blend-mode: difference` animado por **60s**
- `will-change: transform` fixo (sem cleanup) — cria camada GPU que nunca é liberada
- `mask-image` com radial-gradient — operação de composição por frame
- Continua rodando mesmo com a página **ociosa** (ninguém interagindo)

**Impacto estimado:** ~5-10% de GPU constantemente em uso, mesmo em idle. Em dispositivos móveis com 4x CPU throttling, isso roupa orçamento de frame das interações reais.

**Solução proposta:** Reduzir blur para 16px, remover `mix-blend-mode: difference` (substituir por opacidade), trocar `will-change: transform` para `will-change: auto` após a primeira paint, usar `@media (prefers-reduced-motion)` para desligar completamente a animação em dispositivos lentos.

---

### 2. 🥈 GSAP (~30 KB gzip) para 2 efeitos que CSS resolve

**Arquivos:** `src/components/ui/wispr-text.tsx`, `src/app/matricula/contract-reveal.tsx`

- **wispr-text.tsx**: Animação de palavras com stagger (0.7s, blur + translateY) — **totalmente substituível por CSS `@keyframes` + `animation-delay` inline**
- **contract-reveal.tsx**: Scroll-driven scale/opacity com `gsap.quickTo` — **substituível por CSS Scroll-Driven Animations** (`animation-timeline: scroll()`) ou RAF vanilla (~15 linhas)
- GSAP pacote: 3.6 MB em `node_modules`, ~30 KB gzip no bundle

**Impacto estimado:** 30 KB de JS que poderiam ser 0 KB. Em 4G throttled, isso representa ~200ms de download + parse.

**Solução proposta:** 
1. `WisprText`: CSS `@keyframes` com `animation-delay` calculado por palavra (inline style)
2. `ContractReveal`: Substituir `gsap.quickTo` por RAF vanilla (~15 linhas) ou CSS scroll-driven animations
3. Remover `gsap` das dependências → **-30 KB gzip**

---

### 3. 🥉 Sem compressão de imagem antes do upload

**Arquivos:** `src/components/ui/camera-capture.tsx:100-107`, `src/components/ui/file-upload.tsx`

- **CameraCapture**: `canvas.toBlob()` com qualidade **0.9**, resolução **nativa** da câmera (ex.: 4000×3000px → arquivo de ~3-8 MB)
- **FileUpload**: Upload **direto** do arquivo, sem nenhum processamento
- RG de 12 MB vira upload de 12 MB em 4G

**Impacto estimado:** Upload 30x mais lento no 4G throttled. Foto de 12 MB → ~25 segundos de upload em 4G (5 Mbps). Com compressão para ~400 KB → ~0.8 segundos.

**Solução proposta:**
1. `CameraCapture`: Redimensionar canvas para **max 1600px** no lado maior antes do `toBlob()`, qualidade **0.75**
2. `FileUpload`: Adicionar `FileUploadWithCompress` que redimensiona imagens > 1600px antes de passar ao `onChange`
3. Alvo: RG de 12 MB → ~400 KB, selfie de 5 MB → ~200 KB

---

### 4. Will-change sem cleanup — camadas GPU permanentes

**Arquivos:** 4 locais

| Local | Propriedade | Problema |
|-------|------------|----------|
| `globals.css:361` — `.aurora-layer` | `will-change: transform` | **Permanente**, nunca removido |
| `background-gradient.module.css:24` | `will-change: background-position` | **Permanente** |
| `wispr-text.tsx:52` | `willChange: "transform, opacity, filter"` | Em **cada palavra** individual |
| `contract-reveal.tsx:106` | `will-change-transform` (Tailwind) | No diploma durante scroll |

**Impacto estimado:** Cada `will-change` cria uma camada GPU separada. 4+ camadas permanentes consomem VRAM e forçam o compositor a gerenciar mais texturas.

**Solução proposta:**
1. Aurora: Adicionar/remover `will-change` via JS — ligar antes da animação, desligar com `requestAnimationFrame` após
2. BackgroundGradient: Mesmo padrão — ligar no `:hover`/`:focus-within`, desligar depois
3. WisprText: Remover `willChange` — a animação é curta (0.7s), o custo de criar a camada é maior que o benefício
4. ContractReveal: Remover `will-change-transform` — o `gsap.quickTo` já otimiza no eixo correto

---

### 5. backdrop-filter em overlays e áreas com scroll

**Arquivos:** 4 locais

| Local | Classe | Contexto |
|-------|--------|----------|
| `contract-reveal.tsx:101` | `backdrop-blur-md` | Overlay fixo (tela inteira) |
| `contract-reveal.tsx:105` | `backdrop-blur-md` | Header sticky **dentro de área com scroll** |
| `steps.tsx:1082` | `backdrop-blur-sm` | Popup modal |
| `file-upload.tsx:37` | `backdrop-blur-md` | Label de upload (estático) |
| `camera-capture.tsx:116` | `backdrop-blur-sm` | Badge "Foto pronta" |

**Impacto estimado:** `backdrop-filter` força o navegador a recapturar o background a cada frame. Sobre área com scroll (contract-reveal), isso é particularmente caro — cada pixel de scroll dispara re-composição.

**Solução proposta:**
1. Contract overlay: Trocar `backdrop-blur-md` por fundo semitransparente pré-renderizado (`bg-brand-ink/85`)
2. Contract sticky header: Remover blur, usar `bg-brand-ink/70` sólido
3. FileUpload label: Trocar `backdrop-blur-md` por `bg-white/80` — visualmente idêntico, sem custo de composição
4. Manter APENAS o popup modal (`steps.tsx:1082`) com blur — é temporário e cobre área pequena
5. CameraCapture badge: Trocar por `bg-brand-green-dark/85` sem blur

---

### 6. Diploma Flag — 7 animações simultâneas

**Arquivo:** `src/app/globals.css:83-283`

Animações rodando em paralelo no loop de 12s:
- `df-clip` (clip-path) — **não-compositável** ⚠️
- `df-travel` (translateX) — ✅ compositável
- `df-shadow` (scaleX + blur) — **blur via filter** ⚠️
- `df-ribbon` (opacity) — ✅ compositável
- `df-check` (stroke-dashoffset) — **SVG, não-compositável** ⚠️
- `df-stamp` (scale + rotate + opacity) — **scale não-compositável** ⚠️
- `df-float` (translateY, 7s) — ✅ compositável

**Impacto estimado:** 4 das 7 animações disparam paint/reflow. Somado, cada frame do loop de 12s força trabalho na main thread.

**Solução proposta:**
1. `df-clip`: Trocar `clip-path` por `mask-image` com gradiente (compositável) ou remover — é um efeito sutil de "desenrolar"
2. `df-stamp`: Animar apenas `opacity` + `rotate` (remover `scale`), ou usar `transform: scale()` com `will-change: transform` temporário
3. `df-check`: Trocar `stroke-dashoffset` por `opacity` com transição — visualmente similar
4. Garantir que a flag **pare de animar** quando não está visível (fora da viewport)

---

### 7. Sem code-splitting — todas as rotas no bundle inicial

**Build:** Next.js 16 + Turbopack

- Rotas como `/matricula` e `/aluno` importam componentes pesados (CameraCapture, FileUpload, ContractReveal) **eagerly**
- `api.ts` (27 KB) é importado por quase todas as páginas
- Componentes de uso ocasional (câmera, contrato) carregados no first-load
- Turbopack não faz code-splitting automático por rota como Webpack fazia

**Impacto estimado:** Código de matrícula (câmera + contrato + upload + steps) carregado mesmo na landing page.

**Solução proposta:**
1. `CameraCapture`: `dynamic(() => import(...), { ssr: false })`
2. `FileUpload`: `dynamic(() => import(...), { ssr: false })`
3. `ContractReveal`: `dynamic(() => import(...), { ssr: false })`
4. `DiplomaFlag`: `dynamic(() => import(...))`
5. `WisprText`: `dynamic(() => import(...))`
6. Rotas já são separadas pelo App Router; garantir que componentes específicos de rota não vazem para o bundle comum

---

### 8. CSS Bundle — 52 KB com Tailwind v4

**Arquivo:** `.next/static/chunks/3h6x8db9m4l38.css` (52 KB uncompressed, ~10 KB gzip)

- Tailwind v4 gera todas as utilities usadas no projeto
- Globals.css com ~460 linhas de animações e estilos
- CSS é **render-blocking** por padrão

**Impacto estimado:** 52 KB de CSS bloqueando o primeiro paint. Baixo (10 KB gzip), mas as animações complexas dentro dele disparam trabalho de layout/paint.

**Solução proposta:**
1. Separar animações da flag em CSS Module carregado sob demanda (já coberto pelo item 7)
2. Garantir que Tailwind está com `@import "tailwindcss"` (v4) que faz tree-shaking automático
3. Mover keyframes não-críticos para arquivos separados com `prefers-reduced-motion` wrapping

---

### 9. Polling com setInterval — atualizações desnecessárias

**Arquivo:** `src/lib/poll.ts`

- `pollUntil` usa loop `while + sleep` para polling de análise de IA
- Intervalo padrão: 2.5s, máximo 60s
- Durante o polling, cada iteração faz um fetch GET completo
- State updates disparam re-render da árvore de steps inteira (StepRg, StepSelfie)

**Impacto estimado:** A cada 2.5s durante análise: 1 fetch + 1 state update + re-render da árvore. Em 4x CPU throttling, re-renders de 2.5s podem interferir em animações e scroll.

**Solução proposta:**
1. Extrair estado de polling para um contexto isolado (não re-renderizar steps inteiros)
2. Usar `React.startTransition` para updates de polling (baixa prioridade)
3. Considerar WebSocket ou SSE em vez de polling (long-term)

---

### 10. Animações que não pausam fora da viewport

**Arquivos:** `globals.css` (aurora, diploma flag), `button.module.css` (shine)

- Nenhuma animação verifica `IntersectionObserver` para pausar quando fora da viewport
- Aurora roda 60s continuamente mesmo com a página em background
- Diploma flag anima 12s loop mesmo após o usuário ter scrollado para longe
- Button shine (6.5s) roda mesmo com o botão fora da tela

**Impacto estimado:** Trabalho de GPU/main thread desperdiçado em elementos não-visíveis.

**Solução proposta:**
1. Aurora: Pausar animação quando `document.hidden` (Page Visibility API)
2. Diploma flag: Usar `IntersectionObserver` para pausar/retomar animações
3. Button shine: Mesmo padrão — só animar quando visível
4. CSS-only: Onde possível, usar `animation-play-state: paused` via `IntersectionObserver`

---

## 📋 Resumo das Métricas Baseline

| Métrica | Baseline (estimado) | Alvo |
|---------|---------------------|------|
| JS inicial (gzip) | ~170 KB | < 200 KB ✅ (já ok, mas próximo) |
| CSS (gzip) | ~10 KB | — |
| LCP (4G/4x CPU) | ❓ (precisa Lighthouse) | < 2.5s |
| INP (4G/4x CPU) | ❓ (precisa Lighthouse) | < 200ms |
| Long tasks (>200ms) | ❓ (precisa trace) | 0 nas transições |
| Lighthouse mobile | ❓ (precisa rodar) | ≥ 90 |
| backdrop-filter layers | 5 | ≤ 1 visível por vez |
| Will-change permanentes | 4 | 0 (temporário sob demanda) |
| GSAP bundle cost | ~30 KB | 0 KB (remover) |
| Imagem upload (pior caso) | 12 MB raw | ~400 KB comprimido |

---

## 🔜 Próximos Passos (FASE CORREÇÃO)

1. ⬜ Rodar Lighthouse mobile com throttling 4x CPU + 4G para preencher LCP/INP/TBT
2. ⬜ Rodar React Profiler nas interações: trocar etapa, digitar, upload de foto
3. ⬜ Remover GSAP (substituir por CSS/RAF vanilla)
4. ⬜ Adicionar compressão de imagem no cliente (canvas resize)
5. ⬜ Corrigir will-change (temporário, não permanente)
6. ⬜ Substituir backdrop-blur por fundos semitransparentes (exceto 1 modal)
7. ⬜ Code-split: dynamic import para CameraCapture, FileUpload, ContractReveal
8. ⬜ Pausar animações fora da viewport (IntersectionObserver + Page Visibility)
9. ⬜ Otimizar animações do diploma flag (trocar clip-path, scale, stroke-dashoffset)
10. ⬜ Isolar polling state para evitar re-renders em cascata

---

**Nota:** Lighthouse e React Profiler requerem o app rodando (preview de produção). Os valores de LCP, INP e TBT serão preenchidos na próxima iteração.
