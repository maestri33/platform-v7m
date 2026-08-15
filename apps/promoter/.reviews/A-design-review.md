# V7M Promotor — UI/UX Design Review (Assessment A)

> **Scope:** "operate" surfaces — candidate funnel (5 steps) + promoter dashboard,
> bottom-nav, account, leads, comissões, treinamento, and the primitives that
> feed them. Not reviewed: `/` auth (`CheckFlow.tsx`) and `/perfil` profile form
> except by reference. The painel (`/painel`) and the funnel stepper + form
> pages get the deepest attention.
>
> **Date:** 2026-07 · **Reviewer:** general agent, isolated pass.

---

## Design-Specificity Verdict

**Mostly authored for this product, but the two pages that carry the most
weight — `/painel` for promoters and `CompactHeader` (kicker) for every funnel
and promoter page — have leaked through the discipline.** The `globals.css`
token system, the `--surface-text` / `--bg` / `--surface` semantic role split,
and the dark-luxury "gold on charcoal" identity are genuine, opinionated, and
well-named (`--gold-grad`, `--gold-ink`, `--gold-soft`, `--silver`, the
`--black/--char/--char-2/--paper/--paper-soft` ladder, the single-family Geist
weight system). The Button/Field/Badge/Stepper/StatusBanner/PageShell primitives
and the AppShell/AppNav frame honor that system. The trouble is concentrated
on the home (painel) and on every page that uses `CompactHeader`: the kicker
token is wrong for the surface, raw emoji replace SVG icons in a place the
design system explicitly forbids them, and the hero card inverts its visual
hierarchy in dark mode. Other than that, this is not category-interchangeable
SaaS chrome — the regulator/CFC angle (pre-matrícula bolsa, contador de meta
semanal em reais, fechamento sexta às 18h, count-down do polo) is authored,
not pasted.

---

## Heuristics Score Table

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | **3** | `pending` overlay + button spinner wired in 6/7 forms. `PixForm` adds a `checkingLabel` mid-flight — nice. The painel `bg-white/10` chip and `Countdown` give a sense of "now"; the stepper says where you are in the funnel. Score drops because `/conta` doesn't show the form state on the Cadastro rows (validation_status is collapsed to a small pt-BR label with no spin/loading on the silent `/api/auth/refresh` call). |
| 2 | Match System / Real World | **4** | "Matrícula paga → cai no Pix sexta" is how the user actually thinks. PixForm's auto-detect type (CPF/CNPJ/Email/Phone/EVP/Ambiguous) with a "Detectamos: …" hint is a great real-world mapping. The scholarship bar speaks the user's money, not admin's. |
| 3 | User Control and Freedom | **3** | `Button` honors `disabled`+`loading` (no double-click during submit). AgreementSheet correctly traps focus (it's legally required). But `EscolaridadeForm` line 304-306 short-circuits the "previous" question for `grade === 1` with no explanation; PixForm at line 107-117 silently re-routes a 11-digit value to phone if it fails CPF DV — user has no way to see what was tried. |
| 4 | Consistency and Standards | **2** | **The CompactHeader kicker uses `text-brand-gold-light` (≈1.4:1 on `--paper-soft`) on every funnel/promoter page** (page-shell.tsx:44). The other kicker implementation, `PageHeader`, correctly uses `text-brand-gold-ink` on light surfaces (page-header.tsx:24). Two `kicker` implementations, two color choices, eight pages on the wrong one. Raw `✓`/`🎉`/`🏆`/`⚡`/`🔥`/`🌱` in painel/page.tsx:57,85,161, in pix/page.tsx:39, in conta/page.tsx:18,91,113, in escolaridade/page.tsx:35, in leads/page.tsx:83, in treinamento/page.tsx:89,103,153,167, in `[materialId]/SubmissionForm.tsx:160,179` — design system line 273 explicitly bans emoji. Stepper already proves the SVG-check pattern works (stepper.tsx:14-26). |
| 5 | Error Prevention | **3** | `EnderecoForm` validates CPF DV locally before spending R$0,01 on DICT (PixForm:107). `DocForm` calls `/classify` before the canonical upload so a wrong-side photo never gets accepted (DocForm:48-103). Phone mask + CEP mask prevent format mistakes. But: painel's `paid/goal` ratio at line 145 can render `"6 / 5"` (paid > goal) and there's no clamp before display. |
| 6 | Recognition Rather Than Recall | **4** | Auto-detected Pix type with on-the-fly label. FunnelStepper renders a numbered visual progress. Field's hint is always visible (not placeholder-only). Pix form tells the user what the backend is doing ("Conferindo como CPF e celular…"). |
| 7 | Flexibility and Efficiency | **3** | The `mode="assistant" | "manual"` toggle in EscolaridadeForm (line 597) is good promoter-aware design (chat vs choice cards). The sessionStorage draft restoration means a slow phone won't lose the user. Power users have a 4-tab bottom-nav. But: there's no keyboard shortcut for promoters, no "skip to my last step" jump-link, and PixForm at line 117 silently swaps CPF↔phone on a 11-digit value — a promoter who's used to typing CPF first will be surprised. |
| 8 | Aesthetic and Minimalist Design | **2** | The painel has **6 distinct visual treatments** stacked in 4 short blocks: scholarship (auth-card + gold border), greeting row, dark hero (char), 2-col money (mixed border treatments), link (mono). The eye doesn't know where to land. The same page uses 4 different background colors (paper, char, char-2, paper via auth-card). Per N1 + N8, this is the worst-scoring surface in the app. The funnel forms (endereco, pix, documento) are well-disciplined: stepper + heading + one form card. The chat thread in EscolaridadeForm is also busy (assistant avatar + mode toggle + scroll log + input row + 2 hint paragraphs). |
| 9 | Error Recovery | **3** | Every form has `apiErrorMessage(...)` routed by `code` (not by parsing `detail`) and shows the error inline via `FieldError` with `role="alert"`. Network errors are catch-all'd with "A conexão oscilou" + reassurance. `wrongStatusHref` short-circuits to the right page if the user's status changed mid-flight (a real failure mode in a 5-step funnel). Score drops because rejected selfies (SelfieForm:147-160) tell you the AI's reason but don't show the *new* selfie preview once re-uploaded. |
| 10 | Help and Documentation | **3** | Help link in the auth header (`SUPPORT_WHATSAPP_URL`, AuthShell.tsx:22-29). Each funnel step's subtitle explains the *why* ("O endereço sai do documento — sem digitar CEP, rua ou número."). PixForm explains the R$0,01 DICT charge implicitly. But: the painel has no link to "what does 'Meta da semana' mean?"; the scholarship bar never tells the user *where* the bolsa is in fine print (termo, validade); the chat assistant's empty state is a single opening question — a promoter who's never chatted with an AI assistant will not know to write freeform. |

**Total: 30/40.** Not a participation trophy; the design system itself is the
strongest deliverable here, and the funnel pages that use it correctly are
real. The painel is the weakest link, by a wide margin.

---

## Strengths

1. **Token system is real and mostly honored.** The `:root[data-theme="dark"]`
   remap of `--bg / --surface / --surface-text / --surface-border / --ok / --warn / --danger / --info / --shadow-card / --ring` (globals.css:93-119) plus
   the `--color-brand-*` aliases (globals.css:171-194) is the cleanest part of
   the codebase. The `prefers-reduced-motion` kill-switch (globals.css:814-823)
   is a single rule that covers every animation, including the aurora
   backgrounds on `AppShell` and `AuthShell`. `prefers-color-scheme: dark`
   fallback (globals.css:122-140) makes the first paint correct for users who
   never opened the toggle.

2. **The single-family Geist hierarchy actually works.** `globals.css:247-255`
   pins 800 + `letter-spacing: -0.01em` + `text-wrap: balance` for h1-h3 and
   uses the same `var(--font-geist-sans)` for display and body — so
   `font-display` and `font-sans` (the @theme-inline aliases at
   globals.css:196-198) are identical. The discipline shows: titles in
   `painel/page.tsx:120` (`font-display text-xl`), `page-shell.tsx:48`
   (`.page-title` class), `escolaridade/page.tsx:382` (`font-display text-2xl`)
   are visually consistent because they're literally the same font and weight.
   That's a craft choice most apps get wrong.

3. **Wizard pattern with self-validating offline draft + auto-advance.** The
   `EscolaridadeForm` is a standout: sessionStorage round-trips the draft
   (line 661-667), restores to the right `step` (line 239-255), validates
   client-side (line 133-167) before POSTing, and the server's authoritative
   `data.ready` flips the UI to a `EducationReview` summary (line 711,
   544-591) — the user reviews, then commits. The form gives the candidate
   *real* agency. The `PixForm` AMBIGUOUS-key auto-detect (line 102-116) is
   the same pattern at smaller scale.

---

## Priority Issues (P0–P3, ordered by impact)

### **[P0] Funnel kicker is invisible on every page that uses `CompactHeader`**

- **What** — `src/components/layout/page-shell.tsx:44` hard-codes the kicker
  color to `text-brand-gold-light`, which resolves to `--gold-soft`
  (`#f0d493`). On `--paper-soft` (`#f5f4f1`) the contrast is ~1.4:1 — well
  below WCAG AA 4.5:1 for body text. The kicker "V7M · Cadastro" / "V7M ·
  Promotor" is effectively invisible on every light surface: `/documento`,
  `/endereco`, `/escolaridade`, `/pix`, `/selfie`, `/treinamento`,
  `/comissoes`, `/leads`, `/conta`. The `PageHeader` primitive at
  `src/components/ui/page-header.tsx:24` does the right thing (light tone →
  `text-brand-gold-ink`). Two kicker implementations, two color choices.
- **Why it matters** — These kickers are the only consistent brand-signal
  on the candidate's first 5 steps. Right now they read as missing text,
  not as design. The candidate is in a 5-step funnel and the very first
  visual mark of "this is a V7M screen" is broken. Also, the funnel is
  the *lead* surface; the painel gets the most user eyeballs and even
  there the kicker is hidden.
- **Fix** — Replace line 44 with
  `tone === "dark" ? "text-brand-gold-light" : "text-brand-gold-ink"`
  (or add a `tone` prop to `CompactHeader` and let each page pass `tone="light"`).
  Long term: collapse `CompactHeader` and `PageHeader` into one primitive
  with the same tone prop and use the same `.kicker` class (globals.css:291-297)
  so the choice is centralized in CSS, not in two `text-` utilities.
- **Mapped command:** `critique` (consistency audit) + `colorize` (token
  re-binding).

### **[P0] Painel hero collapses into the dark AppShell background in dark mode**

- **What** — `src/app/(app)/painel/page.tsx:129` renders the goal hero as
  `bg-brand-char` (fixed `#141416`). The `AppShell` (line 38) is also
  `bg-brand-bg` which is `--char` in dark mode — so the hero card and the
  page background are the *same* color in dark mode. The `border-brand-gold/40`
  is what makes the hero visually present. The "Recebido / Previsto" cards
  at line 168, 176 use `bg-[var(--surface)]` which is `--char-2` (lighter
  than `--char`) — so in dark mode the secondary cards *float above* the
  hero instead of the hero dominating them. Visual hierarchy is inverted.
- **Why it matters** — The hero is "a alma do home" (the panel-page
  comment itself, line 128). In dark mode it's the weakest element on the
  page, when it should be the strongest. Power users who keep the app
  in dark mode (the `ThemeToggle` is in the header) will read this
  backwards.
- **Fix** — Change line 129 from `bg-brand-char` to
  `bg-[var(--surface)] border-[var(--border)]` and add a small
  `box-shadow: var(--shadow-card)` for the dark surface (already handled
  by the global token). For the brand-emphasis, use a gold-on-surface
  treatment: `border-brand-gold/40` is already there, so just letting
  the card pick up `--surface` fixes both modes. The
  `text-[var(--surface)]` text color on line 129 will then read correctly
  in both modes (it already uses the semantic role).
- **Mapped command:** `adapt` (responsive mode), `audit` (dark mode pass).

### **[P0] Painel uses raw emoji as the primary motivation signal — design system bans them**

- **What** — `src/app/(app)/painel/page.tsx:85` picks one of
  `🏆 / ⚡ / 🔥 / 🌱` based on goal progress, and renders it as the
  leading element of `paid / goal` (line 143-148). Line 57 renders
  `Cadastro aprovado! 🎉` in the `PanelTitle`. Line 161 doubles down
  with `🏆 Bônus de R$…`. `docs/design-system.md:273` says
  *"Ícones SVG (Lucide/Heroicons), nunca emoji"*. The stepper already
  proves the in-house SVG pattern (stepper.tsx:14-26).
- **Why it matters** — Emoji render differently across iOS / Android /
  Web (color emoji vs. text glyph), are unstyled, and have no `aria-label`.
  They also visually clobber the gold-on-charcoal identity — a 🏆 next
  to a gold gradient progress bar makes the gold feel cheap. The painel
  is the promoter-pleno's daily home; the first thing the eye lands on
  is the most "twee" thing in the codebase.
- **Fix** — Replace the `heroEmoji` switch with a `Sparkles`/`Flame`/`Trophy`
  Lucide icon (already imported in `EscolaridadeForm.tsx:3`) with a
  `tone="gold"` SVG, sized to the display value. Render via
  `<Trophy aria-hidden className="size-6 text-brand-gold" />` with the
  gold token that already exists. The same change applies to
  `cadastro aprovado! 🎉` (line 57) — a Lucide `PartyPopper` or
  `Sparkles` instead.
- **Mapped command:** `critique` (visual audit), `typeset` (replace emoji
  with icons + token color).

### **[P0] Painel has no clear visual hierarchy — 6 sections compete**

- **What** — The promoter painel renders, top to bottom: scholarship
  progress (line 89-117), greeting + status badge (line 119-126), dark
  goal hero with heroEmoji + paid/goal + countdown (line 128-164),
  received/projected 2-col (line 167-187), referral link with copy
  button (line 190-202). Five different background treatments
  (`bg-brand-char`, `bg-[var(--surface)]`, `bg-[image:var(--gold-grad)]`
  for the link initials via `conta/page.tsx:76`, two `bg-[var(--surface)]`
  with different border colors, `auth-card` for the scholarship). The
  funnel forms by contrast have a single form card.
- **Why it matters** — Nielsen N1 (status) and N8 (minimalism) both
  fail here. On a 390×844 viewport with the FitViewport scale-to-fit,
  the user can't tell at a glance: *is this about my money this week,
  or about my scholarship?* Two "progress" indicators (scholarship
  progress bar, weekly goal progress dots) compete for the same eye.
  Power users glaze over; first-week users don't know what to do.
- **Fix** — Restructure to **one primary + one secondary + one tertiary**:
  1. **Hero (primary):** the weekly goal, in a single card, with the
     money numbers *inside* the hero (not as a separate row). Replace
     the 2-col "Recebido/Previsto" block with a footer line inside the
     hero card.
  2. **Greeting (secondary):** "Olá, Bia" with the status badge,
     right-aligned. Use `font-display text-base` not `text-xl` — the
     goal is the hero, not the name.
  3. **Link (tertiary):** full-width row, copy button inline. The
     "share" affordance is the daily habit.
  4. **Scholarship (only when relevant):** collapse into a `details`
     (like the treinamento "matérias concluídas" pattern at
     `treinamento/page.tsx:150-173`) — it's important, not urgent.
  Drop `text-2xl` on the paid/goal (line 144) to `text-3xl` and lose
  the small "/ goal" suffix; render the goal as a tiny `kicker` above
  the number so the eye lands on `paid` first.
- **Mapped command:** `distill` (reduce to 3 sections), `bolder` (clear
  hero), `quieter` (the scholarship + greeting).

### **[P1] `EscolaridadeForm` stage-card hardcodes `#171714` — invisible in dark mode**

- **What** — `src/app/(app)/escolaridade/EscolaridadeForm.tsx:344` renders
  the stage-selector card as `bg-[#171714]`. The SVG illustration
  inside (line 172-204) is drawn against `#171714` and uses
  `#ffdf00 / #012169 / #009c3b / #8a6526` — i.e. it's a fixed "Brazilian
  flag" composition. In dark mode the AppShell background is `--char`
  (`#141416`) and the `<main>` is the same — so the card is a 1-step
  lighter than the bg, with a 1px border. In light mode the card is
  darker than the page bg, which is the intent. In dark mode the
  illustration is *almost invisible*.
- **Why it matters** — This is the very first screen of the education
  step (`/escolaridade` step 1). A dark-mode user sees a near-blank
  card and three mysterious "Ensino Fundamental/Médio/Superior" labels
  with no visual cue. The illustration is doing a lot of the work of
  "tell the candidate what each level is" in light mode.
- **Fix** — Two options:
  1. **Cheap:** change `bg-[#171714]` to `bg-[var(--char-2)]` — the
     card will then be visibly lighter than the AppShell bg in dark
     mode. The SVG colors will look a bit different (slightly more
     luminous backdrop) but the illustration still reads.
  2. **Right:** keep the SVG, swap to a 2-stop dark gradient
     (`linear-gradient(180deg, var(--char-2) 0%, var(--char) 100%)`)
     and add `aria-label="Ilustração: três etapas de escolaridade"`
     to the button so the visual doesn't carry the only meaning.
- **Mapped command:** `colorize` (token), `adapt` (dark mode).

### **[P1] Painel "Recebido/Previsto" card has the wrong border color on one of the pair**

- **What** — `painel/page.tsx:176` renders the "Previsto" card with
  `border-brand-gold/30`, while the "Recebido" card on line 168 uses
  `border-[var(--surface-border)]`. The asymmetry tells the user
  "Previsto is special" via a gold rim, but the meaning isn't labeled
  anywhere on the card. The labels are tiny `uppercase tracking-wider`
  (10px) so the color difference is the only signal.
- **Why it matters** — Color-only signal violates the design-system
  rule at `docs/design-system.md:263` (*"Cor não é o único indicador"*).
  A colorblind user can't tell the cards apart. The "Previsto" number
  is also summed differently (includes bonus if `goal_reached`,
  line 181-184) — that's real money math and it deserves an actual
  marker, not a 30%-alpha border.
- **Fix** — Replace the gold rim with a small `Badge tone="gold"`
  (already used in the codebase, badge.tsx) reading "incl. bônus" or
  "estimativa" inside the Previsto card. Use the same border color on
  both cards. Bonus: the corner of the prev card now carries
  copy + color, not just color.
- **Mapped command:** `clarify` (label the meaning), `colorize` (drop
  the color-only signal).

### **[P1] `theme-toggle.tsx` has 3 states but only 2 icons**

- **What** — `src/components/ui/theme-toggle.tsx:43-55` cycles
  light → dark → system, but only ever renders a `Moon` or `Sun`. The
  `system` state hides both icons (globals.css:1070-1081, the
  `.theme-icon-sun` is hidden in dark, `.theme-icon-moon` is hidden in
  light). When the user is in `system` mode, the button shows… nothing
  visible. The `aria-label="Alternar tema"` doesn't tell the user which
  state they're in either.
- **Why it matters** — This is the only place the user can discover
  that the app supports `system`. The 3rd state is invisible. Per
  N1 (status) and N3 (control), the user can't tell what mode they're
  in or what the button will do next.
- **Fix** — Show all three icons stacked, with the active one
  highlighted: `<Sun className={t==='light'?'opacity-100':'opacity-40'} />
  <Moon className={t==='dark'?'opacity-100':'opacity-40'} />
  <Monitor className={t==='system'?'opacity-100':'opacity-40'} />`
  inside a 3-segment toggle, or a small text label `Sistema` next to
  the icon. `Monitor` icon is in Lucide. The "auto" affordance is
  a power-user feature; show it.
- **Mapped command:** `clarify` (make the state visible), `optimize`
  (icon + label).

### **[P2] `PixForm` silently swaps 11-digit input from CPF → phone on DV fail**

- **What** — `src/app/(app)/pix/PixForm.tsx:107-117` checks the CPF
  check-digit on a 11-digit value. If it fails, the form assumes
  "this is a phone" and posts as `PHONE` without telling the user.
  The user typed `12345678901` and got back "validada como celular"
  with no UI signal that the system reinterpreted their input.
- **Why it matters** — The DICT validates ownership. If the user
  *meant* to type a CPF and mistyped one digit, the wrong key is
  validated. The 0.5-second money hit is small (R$0,01), but the
  wrong-payment problem downstream is huge. There's no undo, no
  "we think you typed X but treated as Y" toast.
- **Fix** — Show a small inline confirmation: when the form detects
  AMBIGUOUS and the DV fails, render a `<StatusBanner tone="info">`
  above the submit button: "Detectamos 11 dígitos mas o CPF não
  passou. Vamos tentar como Celular. Se preferir CPF, confira os
  dígitos." Don't auto-submit phone on a failed CPF — at minimum
  re-prompt with the assumption surfaced.
- **Mapped command:** `clarify` (make the inference visible),
  `harden` (prevent silent misclassification).

---

## Cognitive Load

**The painel (`/painel`) is the highest-load surface in the app.** Counting
distinct "decision points" the eye processes in the first 800ms of the
landing:

1. "Sua bolsa de estudos" — progress bar, gold border, two paragraphs of
   small text.
2. "Olá, Bia" + "Ativo" badge — greeting + status, but the status is
   left-aligned and the badge is right-aligned, so the eye has to do
   a horizontal scan.
3. "Meta da semana" dark hero — emoji icon + `paid / goal` number +
   countdown chip + segmented progress dots + bonus-or-remaining line.
   Five visual elements in ~120px of height.
4. "Recebido / Previsto" two-column — one with a gold rim, one without.
5. Referral link with copy button.

That's **5 distinct affordances** in 5 stacked sections, with 4 background
colors and 5 type sizes. The "promoter pleno" (power user) on a daily
basis is also the "promoter pleno" who scans, not reads — they need the
goal + countdown to dominate, the rest to fade. The funnel form pages
(`/endereco`, `/pix`, `/documento`) are well-disciplined in contrast:
1 stepper + 1 header + 1 form card.

**The chat assistant in `EscolaridadeForm`** is the second-busiest
surface: assistant avatar (line 791-802), mode toggle (2 buttons,
line 804-829), message log (line 847-866), input row (line 871-897),
privacy footnote (line 899-901). That's a lot of vertical real estate
before the first message. A first-timer will need to read three
labels to know what to do.

---

## Persona Red Flags

### **Candidato (first-timer) going through the funnel**

- **Invisible kicker** (P0 above). The first signal that "this is a
  V7M screen" is the small gold uppercase tag under the header. It's
  ~1.4:1 contrast on the page background. First-timers will read the
  page as "no kicker / no brand mark" until the form card shows up.
- **`/escolaridade` step 1 is near-invisible in dark mode** (P1).
  The first action of this step is choosing Fundamental / Médio /
  Superior. In dark mode the illustration is barely visible, and the
  label is white-on-char (line 347) which is fine — but the visual
  context for "what is Ensino Médio?" is gone.
- **`AgreementSheet` has no visible path to decline** (agreement-sheet.tsx:50-86).
  The comment line 25 explains "sem caminho de cancelar" — this is
  intentional, the agreement is mandatory before the selfie signature.
  But a first-timer who reads "Li e concordo" and decides they don't
  agree will hunt for an X, a Back button, an Esc-to-close. There's
  no `aria-describedby` explaining *why* there's no escape hatch.
  This is correct legally, but the visual cue should match.
- **No "o que acontece depois" on the funnel steps.** Each
  `CompactHeader` subtitle explains the immediate task ("Envie a
  conta ou comprovante…"). None of them say "depois disso você
  vai pra etapa X" or "tempo médio: 2 min". The first-timer doesn't
  know the funnel is 5 steps until they look at the stepper
  (and the stepper says only the *names*, not the *count*).
- **`PixForm` AMBIGUOUS handling** (P2 above). The candidate types
  their CPF, the system silently reinterprets as a phone number,
  validates, and the DICT says "not yours." The user types 11 digits
  *expecting* a CPF and gets "CPF não confere." Confidence lost in
  the one step that touches real money.

### **Promotor pleno (power user) on the daily painel**

- **Visual hierarchy is inverted in dark mode** (P0 above). The
  dark hero is the weakest surface on the page in dark mode, when
  it should be the strongest.
- **No quick action on the painel.** A power user wants: copy the
  link, message the last lead, see today's lead, log the day. The
  current painel shows the goal and a copy-link — that's it. The
  Leads tab and Comissões tab are behind a bottom-nav tap, with
  no deep-link from the painel. There's no "today's leads" pill
  on the hero.
- **`paid / goal` can show 6 / 5** (P3). When the promoter closes
  the goal and gets the 6th lead, the hero shows `6 / 5` which
  reads like an error. The "🏆 Bônus de R$500 garantido" line
  below clarifies, but the eye lands on the number first.
- **No way to see when the meta *was reached* in prior weeks.**
  The painel shows *this week's* progress only. The lifetime
  `summary.lifetime.total_received` is there in the "Recebido"
  card, but there's no week-over-week trend. A power user who
  wants to track their own improvement gets nothing.
- **The `ThemeToggle` is the only top-right control** (AppShell.tsx:54).
  The user's name appears next to it (line 55-57) but there's no
  menu — to log out you go to the Conta tab. That's an extra tap
  for a daily action. A long-press or a "more" icon next to the
  name would help.
- **The scholarship progress (when present) is buried in the
  middle of the painel** (line 89-117). For a `pre_matriculado`
  user, this is the most important section — it's the *reason*
  they're a promotor. It should be the first thing they see.
  Right now it competes with the goal hero.

---

## Minor Observations

1. **Avatar initials in the leads list use brand-gold/15 background**
   (leads/page.tsx:66). The 15% gold tint on `--surface` is barely
   visible. Use `bg-brand-gold/20` or a `bg-[var(--gold-soft)]/20`
   for a stronger chip.

2. **`Account page Row` component uses `hover:border-danger hover:text-danger`**
   on the LogoutButton wrapper (conta/page.tsx:125). The `hover:text-danger`
   overrides the inherited `text-[var(--surface-text-muted)]`, which is
   fine — but the border also turns red. For a "Sair" action, red is
   correct, but the hover state changes *both* border and text. Consider
   keeping the border hover, fading the text on a *delay*, or adding
   `aria-label="Encerrar sessão"` to make the action clear for screen
   readers (currently it's a styled `<a>`/`<button>` with no label).

3. **`Stepper` is `display: flex; flex-wrap: wrap`** (globals.css:664-669)
   so on a 320px viewport the 5 steps wrap to 2 rows. That's OK, but
   the connector lines are missing — the visual "you're on step 3" is
   a numbered circle and a label, no line. Compare to a typical 5-step
   stepper (Stripe onboarding, etc.) where step 1 → 2 → 3 has a
   connector. Add a `::after` rule on `.step:not(:last-child)` to draw
   a thin gold line between done steps, light line otherwise.

4. **`painel/page.tsx:134` countdown chip** is `bg-white/10 text-[var(--surface)]`
   on `bg-brand-char`. The text uses the semantic role, but the bg
   uses a literal `bg-white/10`. In dark mode the hero is the same as
   the AppShell bg, so the chip floats on a dark surface — works. But
   the `bg-white/10` is a magic number. Replace with a semantic token:
   `bg-[var(--gold-grad)]/15` or, simpler, `bg-[var(--gold-soft)]/15`
   and add a `text-brand-gold-light` for the text to keep contrast.

5. **Two `kicker` implementations (CompactHeader vs PageHeader) plus
   three ad-hoc kicker classNames** (`page-shell.tsx:44`,
   `page-header.tsx:24`, `loading.tsx:6`, `painel/page.tsx:131`).
   That's 4 versions of the same idea with at least 2 wrong
   implementations. Centralize.

6. **`text-brand-muted-on-dark` is used in the dark hero** (painel/page.tsx:146)
   where it works (light gray on dark). The token *name* suggests
   "muted text on dark surface" — which is correct here. But the
   *value* is `#b4b4bb` in both light and dark themes (the
   `--muted-on-dark` token doesn't flip). If the design system ever
   inverts the dark mode (e.g. high-contrast dark), this token won't
   follow. Consider remapping `--muted-on-dark` in the dark theme to
   the dark-context muted (`#b4b4bb` already), and introduce
   `--muted-on-light` for the inverse. The token name is currently
   misleading.

7. **The 6-OTP input doesn't have an `inputMode="numeric"`** by
   default — check `otp-input.tsx` (not read but referenced by
   AuthShell) for the OTP UX. If the user is typing a 6-digit
   SMS code on a phone, `autocomplete="one-time-code"` should be
   set so iOS / Android autofill suggest the code from SMS.

---

## Questions to Consider

1. **The "Sua bolsa de estudos" scholarship card sits between the
   greeting and the goal hero. Is the *bolsa* a candidate-era
   surface, a promoter-era surface, or both?** Right now it only
   appears when `me.pre_matriculado` is true. If a promoter earned
   it *during* onboarding and is now in the daily routine, this is
   a static congratulatory card, not actionable. Should it become
   a `details` like the treinamento "matérias concluídas" so it
   fades from the daily view? Or is the "look how far I've come"
   function intentional? (The treinamento team clearly chose the
   `details` pattern — apply the same.)

2. **The painel's `Countdown` is in a tiny glass chip with a
   segmented dot bar.** Why two progress indicators for the same
   meta? The bar shows paid/goal visually; the countdown shows time
   to close. They *are* different things, but stacked together they
   compete for the eye. Would a single row — `paid / goal` on the
   left, countdown on the right, dots underneath — read more
   linearly?

3. **`PixForm` is the only form that has a `setCheckingLabel` mid-
   flight status line in addition to the button spinner.** That's
   good UX (R$0,01 DICT call can take 1-3s, the user needs to know
   the system is working). Should the same pattern be standardized
   for the address CEP lookup (current behavior at
   `EnderecoForm.tsx:138-140` is "Preparando formulário…" / "Buscando
   CEP…" — but it's the loading overlay, not an inline line under the
   button). Consider extracting a `<SubmitButton loading={...} label="...">
   with a `pendingHint` prop and use it on every async form.

---

## Run Notes

**Read fully (in order):**
`docs/design-system.md` (299 lines), `src/app/globals.css` (1097 lines, all),
`src/components/ui/button.tsx`, `field.tsx`, `theme-toggle.tsx`, `badge.tsx`,
`status-banner.tsx`, `stepper.tsx`, `loading-overlay.tsx`, `spinner.tsx`,
`card.tsx`, `page-header.tsx`, `stat.tsx`, `copy-button.tsx`, `file-input.tsx`,
`countdown.tsx`, `fit-viewport.tsx`, `upload-actions.tsx`,
`src/components/layout/AppShell.tsx`, `AppNav.tsx`, `AppFooter.tsx`,
`Container.tsx`, `TrainingGate.tsx`, `page-shell.tsx`,
`src/components/auth/AuthShell.tsx`, `OutsideApp.tsx`,
`src/app/layout.tsx`, `loading.tsx`,
`src/app/(app)/layout.tsx`,
`src/app/(app)/painel/page.tsx`,
`src/app/(app)/endereco/page.tsx`, `endereco/AddressProofSection.tsx`,
`endereco/EnderecoForm.tsx`,
`src/app/(app)/documento/page.tsx`, `documento/DocForm.tsx`,
`src/app/(app)/selfie/page.tsx`, `selfie/SelfieForm.tsx`,
`selfie/AgreementSheet.tsx`,
`src/app/(app)/pix/page.tsx`, `pix/PixForm.tsx`,
`src/app/(app)/escolaridade/page.tsx`, `escolaridade/EscolaridadeForm.tsx`
(all 1100+ lines),
`src/app/(app)/leads/page.tsx`, `comissoes/page.tsx`, `conta/page.tsx`,
`perfil/page.tsx`, `perfil/PerfilForm.tsx`,
`src/app/(app)/treinamento/page.tsx`,
`src/app/(app)/treinamento/[materialId]/SubmissionForm.tsx`,
`src/app/dev-preview/page.tsx`, `src/app/page.tsx`.

**Skipped:**
- `src/components/auth/CheckFlow.tsx` — auth surface, out of scope
  (per the user request: "operate surfaces — candidate funnel +
  promoter dashboard"). Glanced at the file headers to confirm
  hardcoded hex usage but did not full-read.
- `src/app/global-error.tsx`, `error.tsx`, `not-found.tsx` — error
  surfaces, low impact.
- `src/lib/...` helpers — referenced but not full-read (the design
  review is component-level).
- `src/app/(app)/treinamento/TrainingRefresh.tsx`,
  `src/app/(app)/endereco/kinship-chat.tsx`,
  `src/app/(app)/treinamento/[materialId]/page.tsx` — wrappers
  around reviewed forms.

**Tool failures:** None. `grep` results were exhaustive (limit not hit).
`glob` returned the full file tree under `src/`.

**Sample data assumption:** All findings are static analysis; no
running build, no live DOM, no accessibility audit. The contrast
ratios quoted for `--gold-soft` on `--paper-soft` are computed by
hand from the hex values in `globals.css` and are approximate
(±0.1); both values are well below AA so the conclusion is robust.
