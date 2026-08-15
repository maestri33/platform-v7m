# Rubrica Viva — IEADPG

Esta é a **rubrica oficial** usada pelos 3 reviewers do loop de auto-melhoria. Ela é **viva**: cresce a cada iteração toda vez que um achado dos reviewers revela um padrão novo que precisa virar regra (ver `PROCESS.md`).

> **Cobertura completa da governança:**
> - `RUBRIC.md` (este arquivo) — critérios de review. Fonte da verdade pra nota.
> - `PROCESS.md` — aprendizados de **agente** (como nos comportamos). Regras de processo.
> - `../ieadpg-design/DESIGN.md` — aprendizados de **design** (o que a UI deve fazer). Padrões visuais/interativos.
> - `ITERATIONS.md` — diário de cada rodada, com diff auditável.
> - `LEARNING-STATE.json` — hash de cada plano aplicado (idempotente, replayable).

---

## Origem

Itens **R0.*** foram extraídos das skills já existentes no repo:
- `SKILLS/review-animations/STANDARDS.md` (10 padrões não-negociáveis)
- `SKILLS/apple-design/SKILL.md` (springs, fluid interfaces, materials)
- `SKILLS/find-animation-opportunities/SKILL.md` (gate 4 perguntas)
- `AGENTS/august-bgs.md` (shaders pra backgrounds)

Itens **R1.+** são adicionados a cada iteração pelo agente `consolidador` (ver `PROCESS.md` §3). Itens **R2.+** vieram dos achados da Rodada 1 (HIGHs que viraram regras de forms financeiros + API resiliente).

---

## R0 — Padrões base (NÃO-NEGOCIÁVEIS, importados)

### R0.M — Motion & Animação (10 padrões, do `review-animations/STANDARDS.md`)

- **R0.M1** *Justified motion.* Toda animação responde "por quê?" — spatial consistency, state indication, feedback, explanation, ou preventing a jarring change. "It looks cool" em elemento frequente = block.
- **R0.M2** *Frequency-appropriate.* 100+/dia (keyboard, command palette) = **sem animação**. Tens/dia = reduzida. Occasional = padrão. Rare/first-time = delight permitido.
- **R0.M3** *Responsive easing.* Entrada/saída usa `ease-out` ou custom curve. **`ease-in` em UI = block.**
- **R0.M4** *Sub-300ms UI.* UI sob 300ms; tooltip 125–200ms, dropdown 150–250ms, modal/drawer 200–500ms.
- **R0.M5** *Origin & physicality.* Popovers/dropdowns/tooltips saem do trigger (`transform-origin`), não do center. **Nunca `scale(0)`** — começa em `scale(0.9–0.97)` + opacity 0. Modais são exceção.
- **R0.M6** *Interruptibility.* UI acionada rapidamente (toasts, toggles, drags) deve usar **transitions/springs** (retarget from current), nunca keyframes (restart from zero).
- **R0.M7** *GPU-only properties.* Animar só `transform` e `opacity`. `width/height/margin/padding/top/left` = performance finding.
- **R0.M8** *Accessibility.* `prefers-reduced-motion: reduce` honrado (gentler, não zero — manter opacity/color, drop movement). Hovers gated por `@media (hover: hover) and (pointer: fine)`.
- **R0.M9** *Asymmetric enter/exit.* Ações deliberadas (press, hold, confirm destrutivo) animam **lentas**; resposta do sistema **rápida**. Timing simétrico em press-and-release = finding.
- **R0.M10** *Cohesion.* Motion casa com a personalidade (a IEADPG é **editorial/soberana** — não bouncy, não playful, com toques raros de delight em momentos first-time).

### R0.A — Apple Design (do `apple-design/SKILL.md`)

- **R0.A1** *Respond on pointer-down.* Highlight no press instantâneo (`transform: scale(0.97)`, `transition: transform 100ms ease-out`).
- **R0.A2** *Direct manipulation 1:1.* Drag = colado ao dedo. `setPointerCapture` + offset respeito + velocity history.
- **R0.A3** *Interruptibility é o princípio #1.* Toda animação interruptible e redirectable. Ler valor atual na interrupção, nunca target.
- **R0.A4** *Springs com damping/response (Apple-style).* Default `damping: 1.0, duration: 0.4` (critically damped). Bounce `0.1–0.3` **só** em momentum (flick, drag release). `{ type: "spring", duration: 0.4, bounce: 0 }` é a safe house style.
- **R0.A5** *Velocity handoff.* Ao soltar drag, animação continua na velocidade exata do dedo. `relativeVelocity = gestureVelocity / (targetValue − currentValue)`.
- **R0.A6** *Momentum projection.* Não snap to nearest — projetar posição de repouso a partir da velocity (como scroll deceleration).
- **R0.A7** *Translucent materials & depth.* `backdrop-filter: blur(...)` para superfícies sobre conteúdo (nav, drawers). Não abusar.
- **R0.A8** *Optical typography.* Tracking negativo em display (`-0.02em` em H1 hero, `-0.01em` em H2/H3), leading generoso.
- **R0.A9** *Reduced-motion.* Apple-style: gentler, não zero — manter feedback de cor/opacity, drop movement.

### R0.FAO — Find Animation Opportunities Gate (do `find-animation-opportunities/SKILL.md`)

Toda nova animação precisa passar nas 4 perguntas, em ordem:
- **Frequency** — quantas vezes/dia o usuário vê?
- **Purpose** — qual dos 6 propósitos (feedback, spatial, state, jarring-prevention, explanation, delight)? Nomeie explicitamente.
- **Speed** — fica dentro do budget (<300ms UI)?
- **Function** — motion ajuda ou atrapalha aqui? Decoration em UI densa = rejeita.

### R0.T — Tokens do projeto (do `src/index.css`)

- Easings tokens: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`, `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)`.
- Brand: `--bg #0B0B0B`, `--bg-warm #14100A`, `--text #F4EFE6`, `--text-2 #D8CFBF`, `--gold #D2B264`, `--gold-light #E6D282`, `--gold-dark #B4843C`.
- Tipografia: Cormorant Garamond (display) + Inter (body). Fontes via Google Fonts.
- Componentes visuais: `card-brand` (transitions em transform/border/shadow, hover gate), `eyebrow`, `ornament`, `hairline-gold`, `text-gold-gradient`.
- Reduced-motion em `index.css` já cobre `*` com `transition-duration: 0.15s` (gentler, não zero).

---

## R1 — Padrões específicos para forms financeiros / captação (Dízimo, doações)

> _Adicionados na Rodada 1 conforme achados do review._

### R1.F — Form & validação

- **R1.F1** *Idempotência obrigatória.* Qualquer submit que cria recurso financeiro precisa de `idempotency_key` único (uuid v4) gerado no client ao iniciar submit, guardado em `useRef`, reusado em retries. Garante que duplo-clique ou retry de rede não gere 2 cobranças. _(Achado R3#1)_
- **R1.F2** *Status union exaustivo.* Type alias de status deve exaurir o `ChargeStatus` (não criar subset). Use `type StatusKey = ChargeStatus` diretamente. Fallback `?? STATUS.pending` é red flag — indica tipo incompleto. _(Achado R2#3)_
- **R1.F3** *Validação no client + no server (defense in depth).* `validateChargeRequest` roda no client pra UX rápida, mas o server **sempre** re-valida. Confiar só no client = bug em produção. Marcar validação client-side com `// UX only` no comentário. _(Achado R3#4)_
- **R1.F4** *Erros tipados com helpers semânticos.* `DizimoError` deve ter pelo menos: `isRecoverable()` (re-tentar funciona?), `isUserActionable()` (usuário pode corrigir?), `isRetryable()` (rate limit?). UI switcha comportamento baseado nisso, não em `code === 'x'`. _(Achado R3#10)_

### R1.A — Acessibilidade em fluxos de pagamento

- **R1.A1** *Anunciar mudança de step.* Transições `form → submitting → payment → status` **devem** anunciar pra screen reader. Envolver o `<AnimatePresence>` em wrapper com `aria-live="polite"` e `aria-atomic="true"`. Não basta `aria-live` no componente interno. _(Achado R1#1)_
- **R1.A2** *Botão de fallback explícito.* Quando o componente tem fallback manual (ex: "Já paguei"), o label deve ser imperativo + descreve o que vai acontecer. Evitar "Atualizar" (vago). Preferir "Já paguei, verificar agora". _(Achado R1#4)_
- **R1.A3** *Testes de componente obrigatórios.* Smoke test com @testing-library/react pra: render → fill → submit → step transition. Sem isso, regressões de a11y passam batidas. _(Achado R1#3)_

### R1.S — Segurança em superfície de pagamento

- **R1.S1** *Nunca `dangerouslySetInnerHTML` com HTML/SVG externo.* Mesmo com mock, encapsular em componente `<PixQrSvg svg={...}>` que valida prefixo `<svg`, parseia com `DOMParser`, e injeta nodes limpos. Bloqueia `<script>`, event handlers, e tags desconhecidas. _(Achado R1#2 + R2#4)_

### R1.M — Motion específico de payment

- **R1.M1** *Press feedback consistente.* `whileTap: scale 0.97` é o default Apple-style. Não usar 0.94, 0.985, 0.95 ad-hoc. Constante compartilhada `MOTION.pressScale = 0.97`. _(Achado R1#6)_

---

## R2 — Padrões de API contrato / segurança (transações Pix/cartão)

> _Adicionados na Rodada 1 conforme achados do review._

### R2.C — Contrato

- **R2.C1** *Campos opcionais devem ser opcionais no tipo.* `WebhookEvent.charge_id?: string` (não `string` com `''` vazio). O tipo deve refletir o domínio, não o payload. Subscribers checam `if (event.charge_id === myChargeId)`. _(Achado R3#3)_
- **R2.C2** *QR / payload genérico.* `qr_code_payload: string` em vez de `qr_code_svg: string`. A UI decide se renderiza como SVG inline, `<img>`, ou canvas. Provedor (Pagar.me/Stripe) pode devolver qualquer um. _(Achado R3#12)_
- **R2.C3** *Mocks marcados com `// ⚠️ MOCK ONLY`.* Toda função que simula provedor real (BR Code, QR SVG, latência, falhas) deve ter aviso explícito no topo. Em produção, esses arquivos nem devem ser importados (separar em `api/__mocks__/` se possível). _(Achado R3#5)_

### R2.R — Resiliência & concorrência

- **R2.R1** *Webhook + polling reconciliam.* Quando webhook E polling podem mudar o mesmo recurso, garantir **idempotência no client**: reducer que decide o estado final baseado em timestamps ou state machine. Nunca `setState` direto de ambos sem coordenação. _(Achado R3#2)_
- **R2.R2** *Webhooks têm `idempotency_key`.* Provedor pode re-enviar. Cliente checa antes de processar. _(Achado R3#11)_
- **R2.R3** *SSR-safe timers.* Usar `globalThis.setTimeout` em vez de `window.setTimeout` em código de API/runtime. Funciona em SPA, SSR (Next.js), e testes. _(Achado R3#7)_

### R2.O — Observabilidade

- **R2.O1** *Logging por operação.* Em dev, `console.debug('[dizimoApi] createCharge', { id, amount, method, durationMs })`. Em prod, plugar Sentry/Datadog. Cada chamada da API deve ter log de entrada, saída, e erro. _(Achado R3#9)_

---

## Como esta rubrica cresce

1. Reviewers aplicam **toda** a rubrica (R0 + anteriores).
2. Achado novo que **não está** em R0 → candidato a entrar como `R{N}.<seção>`.
3. `consolidador` (ver `PROCESS.md` §3) decide se vira regra (severidade **HIGH** ou padrão recorrente).
4. Achados são categorizados por **target**:
   - `target: agent` → regra de processo vai pra `PROCESS.md` (ex: idempotência obrigatória em submit financeiro — `R1.F1`).
   - `target: design` → padrão visual vai pra `../ieadpg-design/DESIGN.md` (ex: `design.round-2-truthful-trust`).
   - `target: rubric` → regra técnica permanece aqui (ex: tipo de status exaustivo — `R1.F2`).
5. Diff registrado em `ITERATIONS.md`. `LEARNING-STATE.json` mantém hash de cada plano aplicado (idempotente).

---
