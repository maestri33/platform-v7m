# Plano de Testes — Landing Promotor V7M

**Aplicação:** Landing Page de Recrutamento de Promotores (Astro SSG + Vanilla JS)  
**Seed de Inicialização:** `tests/e2e/seed.spec.ts`

---

## 1. Suite: Vínculo de Polo e Atribuição (hub → ref)
**Seed:** `tests/e2e/seed.spec.ts`

### 1.1 Captura de polo via URL e propagação para CTAs
* **Passos:**
  1. Acessar a landing com `/?hub=poloA&utm_source=google&gclid=123`.
  2. Verificar que todos os links com `data-cta` apontam para o app com `ref=poloA` e parâmetros UTM anexados.
* **Expect:**
  - Pelo menos 4 CTAs presentes na página.
  - Nenhum CTA com parâmetro interno `hub` exposto ao app.
  - Parâmetros `utm_source` e `gclid` preservados.

### 1.2 Regra First-Touch de atribuição
* **Passos:**
  1. Acessar a landing com `/?hub=poloA`.
  2. Reabrir a página na raiz `/` (sem parâmetros).
* **Expect:**
  - O CTA mantém o vínculo `ref=poloA` recuperado do `localStorage` / cookie.

### 1.3 Sobrescrita explícita de polo
* **Passos:**
  1. Acessar `/?hub=poloA`.
  2. Acessar em seguida `/?hub=poloB`.
* **Expect:**
  - O CTA atualiza para `ref=poloB` e não contém mais `poloA`.

---

## 2. Suite: Calculadora de Ganhos e Presets
**Seed:** `tests/e2e/seed.spec.ts`

### 2.1 Atualização dinâmica via Slider e Presets
* **Passos:**
  1. Navegar até a seção `#ganhos`.
  2. Clicar no botão de preset "5 matrículas".
  3. Verificar os valores calculados de comissão direta, bônus e valor total.
* **Expect:**
  - Slider posicionado em 5.
  - Comissão direta exibe R$ 500.
  - Bônus exibe R$ 500.
  - Total exibe R$ 1.000.
  - Evento `calc_use` registrado no `dataLayer`.

---

## 3. Suite: FAQ e Filtro por Categorias
**Seed:** `tests/e2e/seed.spec.ts`

### 3.1 Filtro por categoria nos chips
* **Passos:**
  1. Rolar até a seção `#faq`.
  2. Clicar no chip de categoria "Pagamento".
* **Expect:**
  - Apenas as dúvidas com `data-cat="pagamento"` permanecem visíveis.
  - `data-active-cat="pagamento"` atribuído à lista do FAQ.
  - Chip ativo marcado com `aria-selected="true"`.

---

## 4. Suite: Acessibilidade e Conformidade Legal
**Seed:** `tests/e2e/seed.spec.ts`

### 4.1 Conformidade A11y (Axe WCAG 2.1 AA) e Páginas Legais
* **Passos:**
  1. Executar análise Axe em `/`, `/termos/` e `/privacidade/`.
* **Expect:**
  - Zero violações de acessibilidade (`wcag2a`, `wcag2aa`).
