# RFC 006: Unificação do Design System (@v7m/ui), Erradicação de Shims Legados e Governança UI/UX

**Data:** 01 de Setembro de 2026  
**Status:** IMPLEMENTADO & EM PRODUÇÃO (CT 150)  
**Autor:** Hermes Agent & Squad Orca  
**Líder / Aprovador:** Victor Maestri (maestri33)  
**Rastreabilidade:** Linear `VIC-8`, `VIC-9`, `VIC-10`, `VIC-11`, `VIC-12`, `VIC-13`, `VIC-15`, `VIC-16`, `VIC-17`, `VIC-18`, `VIC-19`, `VIC-20` | GitHub PRs `#72`, `#74`, `#76`, `#78`, `#80`, `#82`, `#84`, `#86`, `#88`, `#91`, `#95`, `#97`, `#99`, `#101`, `#103`, `#105`, `#107`, `#109`, `#111`, `#113` | Issues `#112`, `#114`.

---

## 1. Contexto & Motivação

Historicamente, o ecossistema `platform-v7m` acumulou componentes visuais duplicados, shims de compatibilidade em `apps/app-supletivo/src/components/ui/` e estilos ad-hoc inline em telas do funil e wizard de matrícula. Essa fragmentação gerava:
1. **Inconsistência Estética:** Alternâncias bruscas entre elementos modernos em glassmorphism e elementos rústicos legados (como pergaminhos e tons marrons).
2. **Duplicação de Código:** Mais de 24 arquivos de proxy que apenas reexportavam componentes do `@v7m/ui`.
3. **Falta de Acessibilidade & Focus Management:** Modais construídos pontualmente sem focus trap, tratamento de teclado (Escape) ou anúncio de leitores de tela.
4. **Acoplamento no Deploy:** Builds Next.js standalone suscetíveis a falhas de `ChunkLoadError` quando o deploy não sincronizava atomicamente `.next/static`, `public` e `standalone`.

---

## 2. Pilares Arquiteturais Implementados

### 2.1 Diretriz de Ouro UI/UX (Design System Centralizado)
* **Invariante:** É expressamente proibido criar elementos visuais ou estilos hardcoded dentro das telas das aplicações.
* **Solução:** Todo componente nasce desacoplado e genérico no pacote `@v7m/ui`, sendo consumido pelas aplicações (`app-supletivo`, `admin`, `hub`) exclusivamente via props de domínio.

### 2.2 Princípio Zero-Atrito no Funil do Aluno
* **Invariante:** Nenhuma tela morta com botões manuais como "Atualizar situação" ou spinners infinitos bloqueantes.
* **Solução:**
  * **Fast-Path Client-Side:** Validação imediata de legibilidade e formato no navegador.
  * **Processamento Assíncrono:** Fila Django-Q (`qcluster-slow`) com IA via OmniRoute (`10.0.1.35/v1`) com fail-open.
  * **Auto-Polling Silencioso:** Polling leve via `pollUntil` a cada 1.5s, com transição automática de etapa no frontend assim que o backend confirma o status.

### 2.3 Padronização Universal de Modais (`<FeedbackModal>`)
* Eliminação de modais específicos (`lead-modal.tsx`, `step-modal.tsx`).
* Todos os fluxos de aviso, persistência, erro e confirmação utilizam o `<FeedbackModal>` do `@v7m/ui`, dotado de focus trap nativo, acessibilidade ARIA e restauração de foco sem bibliotecas pesadas de terceiros.

---

## 3. Inventário de Componentes Canônicos no `@v7m/ui`

| Componente | Arquivo em `packages/ui/src/components/` | Responsabilidade |
| :--- | :--- | :--- |
| `AppNav` | `app-nav.tsx` | Barra de navegação com logo institucional, chip de status e ações rápidas. |
| `FunnelEntryCard` | `funnel-entry-card.tsx` | Card central do funil de entrada em glassmorphism e iluminação sutil. |
| `StudentCredentialCard` | `student-credential-card.tsx` | Credencial oficial do aluno com foto/monograma, CPF mascarado e selo verificado. |
| `TrustBadges` | `trust-badges.tsx` | Selos de confiança institucional (MEC, CEE, 100% Online). |
| `BrandSlogan` | `brand-slogan.tsx` | Assinatura de marca institucional padronizada. |
| `FeedbackModal` | `feedback-modal.tsx` | Modal universal de erro, aviso, persistência e confirmação. |
| `PricingPlanCard` | `pricing-plan-card.tsx` | Card de seleção de planos com destaque para o plano recomendado. |
| `PlanConfirmModal` | `plan-confirm-modal.tsx` | Modal de confirmação do plano escolhido antes do checkout. |
| `CheckoutCard` | `checkout-card.tsx` | Card unificado de pagamento (PIX copia-e-cola e Cartão de Crédito). |
| `EducationStageCard` | `education-stage-card.tsx` | Card de seleção de etapa escolar (Ensino Médio / Fundamental). |
| `EducationGradeCard` | `education-grade-card.tsx` | Card de seleção de série/ano escolar. |
| `ActionChoiceCard` | `action-choice-card.tsx` | Card tátil de escolha com temas semânticos (blue, green, amber, red). |
| `StudentContractReveal`| `student-contract-reveal.tsx` | Revelação solene do contrato com diploma e aceite de termos. |
| `ChoiceChip` / `Group` | `choice-chip.tsx` | Chips táteis de seleção única/múltipla para formulários e chats. |
| `DocumentClassificationFeedback` | `document-classification-feedback.tsx` | Feedback visual estruturado de OCR e classificação de documentos. |
| `IdentityDocumentCapture` | `identity-document-capture.tsx` | Esteira de captura inteligente de RG/CNH com câmera, arquivo e auto-detecção. |
| `ExpandableSiteFooter` | `expandable-site-footer.tsx` | Rodapé institucional expansível com links legais e suporte. |
| `InlineSpinner` | `funnel-primitives.tsx` | Indicador de carregamento universal com suporte a tamanhos e cores. |
| `BackPill` | `funnel-primitives.tsx` | Botão pílula de retorno com microinteração de hover. |
| `StepBar` | `funnel-primitives.tsx` | Barra de progresso segmentada por etapas. |
| `SweepLine` | `funnel-primitives.tsx` | Linha decorativa com varredura de luz animada. |
| `ResendCodePill` | `funnel-primitives.tsx` | Botão com contagem regressiva para reenvio de OTP. |
| `TypingBubble` | `funnel-primitives.tsx` | Indicador animado de digitação do assistente/chatbot. |

---

## 4. O que Foi Erradicado do `apps/app-supletivo`

1. **Eliminação de 24 Proxies Legados (`src/components/ui/`):**
   * Removido diretório inteiro `apps/app-supletivo/src/components/ui`.
   * Componentes de domínio (`AppHeader`, `VeteranDetail`) promovidos para `src/components/`.
   * Todas as páginas agora importam diretamente do `@v7m/ui`.
2. **Remoção de Arquivos Mortos:**
   * `step-modal.tsx` ➔ Deletado (substituído por `FeedbackModal`).
   * `wizard-footer.tsx` ➔ Deletado (substituído por `ExpandableSiteFooter`).
3. **Substituição de Tags Nativas com CSS Modules Hardcoded:**
   * Substituição de `<button className={styles.shiny}>` por `<Button variant="primary">` do `@v7m/ui` em `screen-email.tsx` e `screen-checkout.tsx`.
   * Substituição de balões manuais de chat por `<TypingBubble />` e `<ResendCodePill />` em `screen-login.tsx`.

---

## 5. Rastreabilidade & Validações Físicas

* **Build & Tipagem:** `pnpm check-types` (0 erros em todo o monorepo).
* **Linting:** `pnpm lint` (0 erros).
* **Testes de Backend:** `pytest` (443/443 testes PASS).
* **Deploy Atômico:** `scripts/deploy-app-supletivo.sh` no CT 150 (`10.0.1.50:3000`).
* **Auditoria de Produção:** `scripts/audit_production_suite.py` ➔ **`22/22 PASS (100%)`**.
* **Browser Visual:** CDP `:9222` / noVNC `:6080` auditado no display `:99`.
