# @v7m/ui — V7M Design System & Primitives

Pacote central de componentes compartilhados, primitivos e design tokens do ecossistema V7M (Next.js 16, React 19, Astro 6 e Tailwind CSS v4).

## 📦 Instalação e Consumo no Monorepo

```json
{
  "dependencies": {
    "@v7m/ui": "workspace:*"
  }
}
```

Importação direta:
```tsx
import {
  Button,
  Card,
  TiltCard,
  TiltCardItem,
  AnimatedTestimonials,
  UnifiedNavbar,
  UnifiedFooter,
  StickyCta,
  ReadingProgressBar,
  BrazilFlag,
} from "@v7m/ui";
```

## 🎨 Componentes em Destaque

### 1. `TiltCard` & `TiltCardItem` (Spectrum UI)
Container com efeito 3D interativo guiado pelo ponteiro, física de molas (`motion/react`) e iluminação especular (*glare*).

```tsx
import { TiltCard, TiltCardItem } from "@v7m/ui";

<TiltCard
  maxTilt={8}
  scale={1.02}
  glareColor="rgba(255, 196, 0, 0.22)"
  className="rounded-2xl border border-white/10 bg-slate-900 p-6"
>
  <TiltCardItem depth={20}>
    <h3>Título com Elevação Z</h3>
  </TiltCardItem>
  <p>Conteúdo imersivo com física natural.</p>
</TiltCard>
```

- **Props principais:** `maxTilt`, `tiltReverse`, `scale`, `perspective`, `glare`, `glareColor`, `containerClassName`, `className`.
- **Acessibilidade:** Suporte nativo a `prefers-reduced-motion` com desativação automática de inclinação.

---

### 2. `AnimatedTestimonials`
Carrossel de histórias de transformação com stack 3D, perspectiva espacial, controles de paginação e storytelling com badges de verificação.

```tsx
import { AnimatedTestimonials, type Testimonial } from "@v7m/ui";

const testimonials: Testimonial[] = [
  {
    quote: "Consegui meu diploma estudando à noite pelo celular.",
    name: "Reginaldo dos Santos",
    designation: "42 anos · São Paulo - SP",
    badge: "Encarregado Geral",
    outcome: "+60% de renda",
    src: "/images/testimonials/reginaldo.png",
  },
];

<AnimatedTestimonials testimonials={testimonials} autoplay={true} />
```

---

### 3. `Card` & `Button` (Primitivos Polimórficos)
Primitivos com suporte à propriedade `as`, permitindo renderizar tags semânticas como `<article>`, `<details>`, `<a>` ou `<div>`:

```tsx
<Card as="article" variant="elevated" pad="md">
  Conteúdo em card elevado com tokens de sombra e borda.
</Card>

<Button as="a" href="https://app.supletivo.net.br" variant="cta" size="xl">
  Quero meu diploma
</Button>
```

Variantes de Card:
- `default`: Fundo de superfície padrão com borda suave.
- `elevated`: Sombra profunda e borda reforçada para destaque.
- `subtle`: Fundo translúcido para blocos de apoio.
- `dark`: Modo escuro imersivo com contraste alto.

---

### 4. Layout e Conversão
- **`UnifiedNavbar`**: Barra de navegação responsiva com modos landing e portal.
- **`UnifiedFooter`**: Rodapé unificado institucional com links regulatórios e de governança.
- **`StickyCta`**: Botão de conversão flutuante mobile com glassmorphism e sincronização de padding.
- **`ReadingProgressBar`**: Barra de progresso de leitura em CSS acelerado por GPU (`animation-timeline: scroll()`) com zero impacto de JS na thread principal.
- **`BrazilFlag` / `DiplomaFlag`**: Bandeira-diploma em SVG puro com efeito de pergaminho em loop.

## 🧪 Validação e Tipagem

```bash
pnpm --filter @v7m/ui check-types
```
