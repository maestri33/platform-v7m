# Diretrizes e Boas Práticas de UI/UX e Design System — Ecossistema V7M

> **Guia canônico e operacional para criação, refatoração e governança de interfaces e experiência do usuário no monorepo `platform-v7m`.**

---

## 🎯 1. Por que Organizamos e Padronizamos? (Contexto & Motivação)

No desenvolvimento de produtos de alto impacto (como a jornada do aluno em `app.supletivo.net.br` e o portal do promotor em `app.maestri.group`), o acúmulo de código legado e correções reativas pontuais geram 5 grandes problemas crônicos:

1. **Inconsistência Estética e Quebra de Confiança:**
   * Alternâncias bruscas entre elementos modernos (glassmorphism, microinterações fluidas) e visuais arcaicos/rústicos destroem a percepção de autoridade e sofisticação da marca.
2. **Fragmentação de Código e Shims Fantasmas:**
   * A existência de pastas locais intermediárias (ex: `apps/*/src/components/ui/`) com dezenas de arquivos de re-export gera confusão de imports, arquivos órfãos e manutenibilidade nula.
3. **Atrito e Abandono no Funil (Telas Mortas):**
   * Exigir que o usuário clique em botões manuais como "Atualizar situação" ou travar o usuário em spinners infinitos ("Lendo documento...") causa frustração e evasão imediata no mobile.
4. **Gargalos de Acessibilidade e Foco:**
   * Modais construídos ad-hoc sem focus trap, tratamento de tecla Escape ou anúncios ARIA quebram a navegação por teclado e leitores de tela.
5. **Fragilidade Operacional no Deploy:**
   * Telas acopladas a CSS modules complexos e builds mal sincronizadas causam `ChunkLoadError` (404 em `_next/static`) no Next.js standalone.

---

## 🛡️ 2. As Diretrizes Invioláveis (Regras de Ouro)

1. **Regra de Ouro do Design System (@v7m/ui):**
   * **É ESTRITAMENTE PROIBIDO** criar componentes visuais, layouts ou estilos hardcoded nas telas dos apps (`app-supletivo`, `app-promotor`, `admin`, `hub`).
   * Todo elemento de interface **DEVE nascer no pacote `@v7m/ui`** como componente desacoplado, polimórfico e reutilizável. As telas apenas importam e mapeiam dados de domínio via props.
2. **Princípio Zero-Atrito na UX:**
   * **PROIBIDO** telas de bloqueio, modais de análise estáticos ou botões de refresh manual de status.
   * O funil opera em **2 fases desacopladas**: validação rápida no frontend (fast-path client-side) liberando o avanço imediato + processamento assíncrono profundo por IA em segundo plano (Django-Q) com auto-polling silencioso (`pollUntil`).
3. **Padrão Universal de Modais:**
   * **PROIBIDO** criar modais locais ou instalar bibliotecas pesadas de terceiros. Todos os modais de erro, aviso, persistência e confirmação usam obrigatoriamente `<FeedbackModal>` do `@v7m/ui`.
4. **Deploy Atômico Obrigatório:**
   * Todo deploy de frontend Next.js standalone deve sincronizar `.next/static`, `public` e `standalone` conjuntamente via script canônico (`scripts/deploy-app-supletivo.sh`, `scripts/deploy-promotor.sh`).
5. **Validação Física e Anti-Delírio:**
   * Nenhuma tarefa é marcada como concluída sem código em execução, testes automatizados 100% verdes e validação real no navegador / ambiente do host.

---

## 🚀 3. Como Proceder: O Fluxo Canônico de Desenvolvimento

```text
[ Necessidade de Interface ]
             │
             ▼
1. Isolar componente puro no @v7m/ui (packages/ui/src/components/)
   - Focado em apresentação, acessibilidade e flexibilidade (props).
   - Sem regras de negócio ou acoplamento a APIs específicas.
             │
             ▼
2. Exportar nos índices do @v7m/ui
   - packages/ui/src/components/index.ts e packages/ui/src/index.ts.
             │
             ▼
3. Consumir na aplicação alvo (apps/*)
   - Importar diretamente de @v7m/ui.
   - Passar handlers de eventos e dados de domínio.
             │
             ▼
4. Higienizar código legado
   - Deletar componentes locais órfãos e classes CSS mortas.
             │
             ▼
5. Executar Bateria de Testes Locais
   - pnpm check-types
   - pnpm lint
   - pytest (backend)
             │
             ▼
6. Rastreabilidade & CI/CD
   - Criar Issue no Linear/GitHub.
   - Branch temática, commit atômico e Pull Request com CI (4/4 PASS).
             │
             ▼
7. Deploy Atômico & Auditoria Física
   - Executar deploy no container alvo (ex: CT 150).
   - Rodar suíte de testes E2E e inspecionar via noVNC/CDP/Playwright.
```

---

## 💎 4. Melhores Práticas de Engenharia e UI/UX

### A. Tipografia e Cores Semânticas
* Use sempre os tokens semânticos do Tailwind configurados em `@v7m/ui`:
  * Textos: `text-brand-ink`, `text-brand-muted`, `text-brand-blue`, `text-brand-green-dark`, `text-brand-gold`.
  * Superfícies: `bg-brand-surface`, `bg-brand-blue-bg`, `bg-brand-green-bg`, `bg-brand-danger-bg`.
  * Bordas: `border-brand-border`, `border-brand-blue/30`.
* **Nunca** utilize cores hexadecimais soltas no JSX (ex: `#3f2f12`, `bg-[#25D366]`).

### B. Microinterações e Indicadores de Estado
* Use sempre as primitivas canônicas do Design System:
  * Carregamento inline: `<InlineSpinner />` (evite criar divs manuais com `animate-spin`).
  * Indicador de digitação: `<TypingBubble />`.
  * Reenvio de OTP: `<ResendCodePill countdown={secs} onResend={fn} />`.
  * Seletores de opções/filtros: `<ChoiceChip>` e `<ChoiceChipGroup>`.

### C. Acessibilidade (a11y) Mobile-First
* Garanta touch targets mínimos de **44x44px** em todos os botões e links.
* Todos os modais devem prender o foco (Focus Trap), fechar com tecla `Escape` e restaurar o foco para o elemento disparador ao fechar.
* Elementos decorativos (linhas de luz, partículas) devem possuir `aria-hidden="true"` e respeitar `prefers-reduced-motion`.

---

## 🗂️ 5. Checklist de Revisão Pré-Merge (Quality Gate)

- [ ] A tela possui algum import relativo de componentes de UI locais? Se sim, migre para `@v7m/ui`.
- [ ] Há algum estilo CSS hexadecimal solto ou CSS module duplicando classes Tailwind?
- [ ] O componente trata estados de erro e loading sem travar o fluxo do usuário?
- [ ] Há telas de espera passiva com botões manuais de recarregar? (Devem ser auto-polling assíncrono).
- [ ] `pnpm check-types` roda com zero erros em todos os pacotes.
- [ ] `pnpm lint` roda sem avisos de linter.
- [ ] Auditoria física e testes E2E executados com sucesso.
