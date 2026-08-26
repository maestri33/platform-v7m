# Plano de Testes E2E: Landing Page V7M Promotor

**Seed:** `tests/e2e/seed.spec.ts`

---

### 1. Calculadora de Ganhos Interativa (`tests/e2e/calculator.spec.ts`)
**Seed:** `tests/e2e/seed.spec.ts`

#### 1.1 Estado Inicial e Fallback
**Objetivo:** Verificar se a calculadora carrega com o valor padrão de 5 matrículas e cálculos corretos.
**Passos:**
1. Navegar para a página inicial `/`.
2. Rolar até a seção `#ganhos`.
3. Validar se o slider `[data-calc-range]` tem valor inicial `5`.
4. Validar se o total exibido em `[data-calc-total]` é `R$ 1.000`.
5. Validar se a comissão direta `[data-calc-direct]` é `R$ 500` e o bônus `[data-calc-bonus]` é `R$ 500`.
6. Validar se o badge `[data-calc-bonus-badge]` está visível com o texto "Desbloqueado".

#### 1.2 Presets Rápidos de Matrículas (1, 5, 10, 20)
**Objetivo:** Clicar nos botões de preset e validar atualização instantânea de valores.
**Passos:**
1. Clicar no botão de preset `1`.
2. Validar que o total passa para `R$ 100` e a linha de bônus não está ativa (R$ 0).
3. Clicar no botão de preset `10`.
4. Validar que o total passa para `R$ 1.500` (ou R$ 2.000 conforme regra de repetição de bônus).
5. Clicar no botão de preset `20`.
6. Validar que o total atualiza conforme a fórmula e dispara o evento `calc_use` no dataLayer.

#### 1.3 Interação com Slider
**Objetivo:** Mover o slider diretamente e validar atributos ARIA e reatividade.
**Passos:**
1. Alterar o valor do slider para `3`.
2. Validar que o texto `[data-calc-paid]` exibe `3`.
3. Validar que o total é `R$ 300`.
4. Validar que `aria-valuetext` reflete o valor selecionado.

---

### 2. FAQ com Filtros por Categoria (`tests/e2e/faq.spec.ts`)
**Seed:** `tests/e2e/seed.spec.ts`

#### 2.1 Contadores e Filtro por Categoria
**Objetivo:** Filtrar perguntas por abas (Trabalho, Pagamento, Produto, Cadastro) e validar visibilidade dos itens.
**Passos:**
1. Navegar para `/` e rolar até `#faq`.
2. Validar que a aba "Todas (14)" está ativa por padrão.
3. Clicar na aba "Sobre o trabalho (5)".
4. Validar que apenas os itens com `data-cat="trabalho"` permanecem visíveis.
5. Clicar na aba "Sobre o pagamento (3)".
6. Validar que apenas os itens de pagamento ficam visíveis.
7. Clicar na aba "Todas" e validar que todas as 14 perguntas reaparecem.

#### 2.2 Expansão de Accordion e Evento `faq_open`
**Objetivo:** Abrir uma pergunta frequente e validar expansão e disparo de telemetria.
**Passos:**
1. Clicar no `<summary>` da pergunta "Preciso pagar alguma coisa para ser promotor?".
2. Validar que o elemento `<details>` ganha o atributo `open`.
3. Validar que a resposta fica visível na tela.
4. Validar que o evento `faq_open` foi registrado no `window.dataLayer` com a pergunta correspondente.

---

### 3. Navegação, Skip Link e Sticky CTA Mobile (`tests/e2e/navigation.spec.ts`)
**Seed:** `tests/e2e/seed.spec.ts`

#### 3.1 Skip Link de Acessibilidade
**Objetivo:** Focar e acionar o link de pular para o conteúdo.
**Passos:**
1. Navegar para `/`.
2. Pressionar `Tab` para focar no `.skip-link`.
3. Validar que o link aponta para `#conteudo`.
4. Clicar ou acionar Enter e validar que o foco move para o conteúdo principal.

#### 3.2 Visibilidade do Sticky CTA
**Objetivo:** Validar que o botão flutuante mobile aparece após rolar o Hero e respeita os botões nativos.
**Passos:**
1. Definir viewport mobile (390x844).
2. Navegar para `/`.
3. No topo, validar que `.sticky-cta` não possui a classe `visible`.
4. Rolar a página após o `#hero`.
5. Validar que `.sticky-cta` ganha a classe `visible` e exibe `R$ 100 / indicação` e `Quero ser promotor`.

---

### 4. Atribuição de Polo e Tags de Rastreamento (`tests/e2e/attribution.spec.ts`)
**Seed:** `tests/e2e/seed.spec.ts`

#### 4.1 Parâmetro ?hub=<polo> e Redirecionamento de CTAs
**Objetivo:** Garantir que o parâmetro de polo e UTMs sejam preservados em todos os botões de conversão.
**Passos:**
1. Acessar `/?hub=campinas&utm_source=facebook&utm_campaign=recrutamento`.
2. Coletar o atributo `href` de todos os links `a[data-cta]`.
3. Validar que todos contêm `ref=campinas`, `utm_source=facebook` e `utm_campaign=recrutamento`.
4. Validar persistência no cookie `pr_hub` e no `localStorage`.

#### 4.2 Disparo de Eventos no DataLayer
**Objetivo:** Validar disparo de `page_view`, `section_view`, `scroll_depth` (25/50/75/100) e `cta_click`.
**Passos:**
1. Navegar para `/`.
2. Rolar suavemente até o final da página.
3. Clicar no botão do Hero.
4. Inspecionar `window.dataLayer` e validar presença dos eventos estruturados.

---

### 5. Páginas Legais e Conformidade LGPD (`tests/e2e/legal-pages.spec.ts`)
**Seed:** `tests/e2e/seed.spec.ts`

#### 5.1 Termos do Programa (/termos/)
**Objetivo:** Verificar integridade, dados da empresa e ausência de rascunhos.
**Passos:**
1. Navegar para `/termos/`.
2. Validar título H1 "Termos do Programa de Promotores".
3. Validar que não existe texto de "Rascunho".
4. Validar menção à comissão de R$ 100 e ausência de vínculo empregatício.

#### 5.2 Política de Privacidade (/privacidade/)
**Objetivo:** Verificar conformidade LGPD e canal do DPO.
**Passos:**
1. Navegar para `/privacidade/`.
2. Validar menção explícita à LGPD (Lei nº 13.709/2018).
3. Validar presença do canal de contato do DPO.
4. Validar que a página possui metatag de indexação (`noindex: false`).
