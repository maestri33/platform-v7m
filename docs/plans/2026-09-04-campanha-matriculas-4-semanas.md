# Campanha — Matrículas diretas Supletivo Brasil (sprint de 4 semanas)

**Data:** 2026-09-04 · **Objetivo:** matrículas pagas · **Verba de mídia:** R$ 500–3.000/mês · **Janela:** 4 semanas
**Produto:** Supletivo Brasil (`supletivo.net.br`) · **App:** `app.supletivo.net.br` · **Mantenedora:** Maestri Group (CNPJ 48.811.016/0001-00)

**Classes de afirmação:** `[verificado]` = lido no fonte nesta sessão · `[medido]` = número medido em banco/runtime · `[pesquisado]` = benchmark de mercado com fonte citada em §11 · `[inferido]` = deduzido de evidência verificada ou pesquisada · `[assumido]` = estimativa sem fonte.

---

## 0. Leia isto antes de aprovar verba

Três fatos do repositório reordenam o plano. Nenhum deles é opinião de marketing.

**(a) O funil COMPLETA no código — o que faltou foi ambiente, não conserto.**

> **Correção registrada.** A primeira versão desta seção afirmava que o funil estava estruturalmente bloqueado. Investigação de código nesta sessão provou que **não está**. O plano de 2026-09-02 acertou os números do banco e errou a conclusão estrutural.

O que a medição de 2026-09-02 encontrou no Postgres continua verdade `[medido]`: `users_lead`=3 com CPF e e-mail vazios, `users_lead_checkout`=0, `asaas_payment`=0, `users_enrollment`=0, `users_student`=0. Mas a leitura de que isso decorria de um bloqueio de código está **errada**.

`set_checkout` exige mesmo CPF e e-mail (`services/backend/users/roles/lead/service.py:537-552`) `[verificado]` — só que isso é um **guard correto**, e as rotas que preenchem esses campos existem, estão implementadas e estão ligadas na UI:

| Passo | Rota | Persistência | Frontend |
| --- | --- | --- | --- |
| 3 · CPF | `POST /api/v1/clients/lead/identity` (`api/clients/routers/lead.py:70`) | `users/auth/service.py:574` → `profiles.set_cpf_identity:658` | `lib/api.ts:378` ← `lead-api.ts:229` ← `use-lead-flow.ts:486` |
| 5 · e-mail | `POST /api/v1/clients/lead/email` (`routers/lead.py:79`) | `users/auth/service.py:679` | `lib/api.ts:396` ← `lead-api.ts:281` ← `use-lead-flow.ts:549` |
| 6 · checkout | `POST /api/v1/clients/lead/checkout` (`routers/lead.py:88`) | `lead/service.py:514` | `lib/api.ts:415` ← `lead-api.ts:338` ← `use-lead-flow.ts:623` |

E existe **prova executável contra o stack Django real** `[verificado]`:

- `services/backend/tests/test_lead_funnel_v2.py:574` — `test_funil_v2_fim_a_fim`: telefone → OTP → CPF → e-mail → checkout PIX, via `django.test.Client`, afirmando que `/lead/me` devolve `customer.cpf`, `customer.email` e `checkout.payment_method == "pix"`.
- `services/backend/tests/test_lead_funnel_v2.py:786` — webhook Asaas casa pelo QR e marca o lead pago.
- `services/backend/tests/test_funnel_e2e.py:196` — `test_aluno_funnel_end_to_end`: `mark_paid` → Enrollment → RG → endereço → comprovante → escolaridade → selfie → `student/me`, com assert em cada etapa.

`cc6fad0` e `f55f2df` **não consertaram o CPF, porque não havia o que consertar** — o primeiro mexeu no 503 do link curto PIX, o segundo é UI pura (zero linhas de API no diff) `[verificado]`. Os zeros do banco são fato de **ambiente e de ninguém ter rodado**, não de código quebrado.

Bônus que derruba outro medo: **CPFHub fora não bloqueia.** `confirm_identity` engole a `IntegrationError` e cai em `_synthetic_identity` quando o dígito verificador é válido (`users/auth/service.py:630-655`), gravando o CPF de todo jeito `[verificado]`.

### Os portões que sobram são de ambiente — e um deles pode perder dinheiro

| # | Portão | Onde | Falha se não atendido |
| --- | --- | --- | --- |
| 1 | `seed_defaults` precisa ter rodado | `hub/management/commands/seed_defaults.py`; `_resolve_promoter` estoura `no_default_promoter` em `lead/service.py:189-192` e o erro é **engolido** em `:462-471` | O lead simplesmente não nasce, com `created:false` silencioso. Falha invisível |
| 2 | `notify`/WhatsApp precisa estar UP | `check_or_capture` só cria a conta se `whatsapp is True` (`lead/service.py:456`) | Serviço fora → nada criado |
| 3 | **Promotor precisa ter hub** | `_apply_effects` levanta `no_hub_for_promoter` em `lead/service.py:826`, **dentro da transação atômica** de `mark_paid` | ⚠️ **Pagamento confirmado e Enrollment não nasce — tudo revertido.** É o único ponto onde um pagamento real se perde |
| 4 | Credenciais Asaas de produção | integração Asaas | Sem QR PIX real |

**O portão 3 é o risco mais grave desta campanha.** Você paga pelo clique, a pessoa paga R$ 999, e a matrícula não existe. Precisa ser verificado *antes* do primeiro real de mídia — está no portão da Semana 1 (§5).

A auditoria de produção de hoje (`docs/audit/production-audit-report.md`) marca 22/22 PASS, mas cobre **só infraestrutura** e não testa matrícula ponta a ponta. Ela continua não sendo prova de funil — só agora sabemos que a prova existe em outro lugar (a suíte de backend).

**(b) Não existe pixel nenhum instalado.** `apps/landing-supletivo/src/layouts/Base.astro:99` é explícito: "Nenhum pixel instalado por decisão de projeto" `[verificado]`. Não existe nem variável `PUBLIC_GTM_ID` no `config.ts` do supletivo (só no do promotor). O que já existe e é bom:

- `dataLayer` com `page_view`, `cta_click`, `faq_open`, `scroll_depth` (`src/scripts/track.ts`) `[verificado]`
- atribuição first-touch: `ref` + 7 UTMs + `gclid` + `fbclid`, cookie first-party 90 dias + localStorage (`src/scripts/attribution.ts`) `[verificado]`

Ou seja: a fundação de medição está pronta, **falta a tag em cima dela**. Ligar mídia paga antes disso é gastar cego — sem otimização por conversão, sem público semelhante, sem ROAS.

**(c) Conflito de preço entre a marca e o código.** Precisa decisão sua antes de qualquer criativo:

| Fonte | Pix à vista | Cartão | Âncora |
| --- | --- | --- | --- |
| `apps/landing-supletivo/src/data/price.ts:40` (fallback real) `[verificado]` | **R$ 999** | **12x R$ 99** (total R$ 1.188) | R$ 1.615 |
| `docs/brand-guidelines.md` seção 6 `[verificado]` | R$ 379 | 12x R$ 37,90 | — |

O preço real é buscado em build-time de `https://backend.v7m.live/api/v1/clients/pricing`, com fallback para os valores acima. **Anunciar R$ 379 e cobrar R$ 999 no checkout é publicidade enganosa (CDC art. 37) e reprovação garantida de anúncio.**

**Evidência de mercado aponta para R$ 999 estar certo** (pesquisa de concorrentes diretos de EJA/supletivo online no Brasil, 2026) `[pesquisado]`:

| Concorrente | Preço do curso completo |
| --- | --- |
| Instituto Óliver | R$ 997,97 à vista / 12x R$ 105,66 |
| Portal EJA Brasil | R$ 997,50 |
| Instituto Monte Horebe | R$ 947,00 (de R$ 1.400) |
| Supletivo Evolução | R$ 1.200–1.500 |
| EJA Educa Brasil | R$ 847,00 Pix / 12x R$ 84,70 |
| Instituto Ethos | R$ 599,00 / 10x R$ 70,00 |
| Faculdade Goiás (entrada) | R$ 550,00 / 12x R$ 57,88 |

Faixa de mercado: **R$ 550–1.500, concentrada em R$ 800–1.000.** R$ 999 fica no terço superior e é praticamente idêntico aos dois concorrentes mais comparáveis. **R$ 379 está abaixo de todo concorrente direto encontrado** — inclusive abaixo do posicionamento de entrada. Nenhum player sustenta R$ 379 por curso completo; esse número tem cara de módulo parcial, promoção antiga ou erro de digitação.

Isso é inferência de mercado, não prova documental interna — mas é forte o bastante para **não travar a campanha em R$ 379**. Este plano assume **R$ 999 / 12x R$ 99** e recomenda corrigir `docs/brand-guidelines.md`. Confirmação sua ainda é necessária.

**Consequência para o plano:** a verba não é liberada de uma vez. Semana 1 é um **portão de prova**; mídia paga só liga depois que o portão passar. Isso não encurta a campanha — protege os R$ 2.000.

---

## 1. Visão geral da campanha

**Nome sugerido:** A Virada — Turma de Outubro

**Resumo em uma frase:** Provar que o funil do Supletivo Brasil converte estranhos em matrículas pagas, e então comprar tráfego de alta intenção com CAC abaixo do que a comissão de promotor já custa.

**Objetivo primário (SMART):** Registrar **6 matrículas pagas** (`users_enrollment` ≥ 6) em 4 semanas, das quais **1 a 2 de mídia paga** e o restante de promotores, orgânico e recuperação de lead por WhatsApp.

> **Esta meta foi revisada para baixo, e a revisão é o achado mais importante do plano.** A versão inicial pedia 8 matrículas com 5 de mídia paga e CAC ≤ R$ 300. Pesquisa de benchmark do mercado educacional brasileiro `[pesquisado]` mostrou que isso exigiria CPC ≤ R$ 3, conversão de landing ≥ 5% e conclusão de pagamento ≥ 15% **simultaneamente**, num funil que nunca converteu uma vez. Os números reais do setor (§7) apontam para **0 a 2 matrículas** com R$ 1.700 de mídia em duas semanas, e **CAC de primeiro mês entre R$ 800 e R$ 2.000** — quatro a dez vezes o teto de R$ 200 que o canal de promotores já entrega.
>
> **Consequência estratégica:** neste sprint, mídia paga é **experimento de coleta de dado**, não canal de volume. Quem carrega o volume é o promotor, cujo CAC de R$ 100–200 já é conhecido e não tem risco de mídia. Quem quiser volume de matrícula rápido e barato deveria estar rodando a campanha de recrutamento de promotores, não esta.

**Objetivos secundários:**

1. Instrumentação de conversão viva: GTM + GA4 + Meta CAPI lendo o `dataLayer` que já existe, com evento de `purchase` disparado no webhook Asaas (server-side, não client).
2. Uma matrícula completa ponta a ponta documentada com evidência de banco (o critério de aceite nº 1 do plano de 2026-09-02).
3. Baseline de CPC/CTR/CVR por canal, para o mês seguinte deixar de ser chute.

**Fora de escopo deste sprint:** recrutamento de promotores (é outra campanha, outra landing, outro público), awareness de marca, SEO como driver primário (SEO não entrega em 4 semanas — entra como investimento de fundo).

---

## 2. Público-alvo

### Primário — "O batalhador que parou"

> Adulto brasileiro de 25 a 45 anos, classe C/D, que interrompeu o Ensino Fundamental ou Médio para trabalhar, cuidar de filhos ou sobreviver. Hoje bateu num teto: perdeu uma promoção, não pode fazer a inscrição no concurso, não consegue tirar a CNH, foi cortado na triagem de currículo. Descobre soluções no celular — Google e Instagram/Facebook — e desconfia de tudo que parece bom demais.

- **Dispositivo:** celular, quase exclusivamente. Android intermediário. Dados móveis limitados → peso de página importa.
- **Dor central:** vergonha + teto de carreira. Não é preguiça, é interrupção.
- **Objeção nº 1:** "isso é golpe?" — validado pelas próprias FAQs da página, que abrem exatamente com "O certificado é reconhecido? Vale em todo o Brasil?" `[verificado]`
- **Objeção nº 2:** preço. R$ 999 é dinheiro real para esse público. Por isso 12x R$ 99 é o herói da copy, não o Pix.
- **Estágio de compra:** consideração ativa. Ele já sabe que precisa; está escolhendo em quem confiar. Isso favorece **Search sobre Social**.

### Secundário — "Quem empurra"

Filho, cônjuge ou irmão mais jovem do público primário, 18–30, digitalmente fluente, que pesquisa e decide *pela* pessoa. Consome Reels/TikTok. Alvo de criativo social, não de Search.

### Onde estão

- Google, buscando literalmente "supletivo online", "eja a distância", "terminar ensino médio" — as três páginas de SEO que já existem no projeto atacam exatamente esses termos `[verificado]`
- Facebook e Instagram (Facebook ainda é forte nesse recorte demográfico no Brasil) `[assumido]`
- WhatsApp — e o projeto **já tem relay próprio de WhatsApp** (`services/notify` + Evolution GO) `[verificado]`. Canal owned subutilizado.

---

## 3. Mensagens-chave

**Mensagem central:** "Você parou. Mas não acabou." — Termine o Ensino Fundamental ou Médio pelo celular, no seu ritmo, com certificado válido em todo o Brasil.

**CTA canônico, obrigatório e único:** **"Quero meu diploma"** (`CTA_LABEL` em `config.ts`, regra de copy do projeto) `[verificado]`. Não inventar variação em anúncio.

| # | Mensagem de apoio | Prova |
| --- | --- | --- |
| 1 | O certificado vale em todo o Brasil — faculdade, concurso, CNH, Sistema S | Emitido por instituição parceira credenciada aos órgãos estaduais de educação, com respaldo na Lei nº 9.394/96 (LDB) |
| 2 | Cabe no orçamento: 12x de R$ 99, sem mensalidade nem taxa surpresa | Preço único, transparente desde a primeira dobra; `price.ts` é fonte única |
| 3 | Estuda pelo celular, no seu ritmo — não precisa de computador nem voltar pra sala de aula | FAQ "Preciso de computador para estudar?" já responde isso |
| 4 | Matrícula em poucos minutos, 100% online | Funil de cadastro no app, sem papelada presencial (a **prova final é presencial** — sempre dizer) |

**Os 5 desbloqueios da Virada** (argumentário de conversão, direto do `brand-guidelines.md` seção 7 — usar um por criativo, não todos juntos): faculdade · concurso público · CNH e cursos técnicos · vagas melhores de emprego · orgulho próprio e familiar.

### Proibições de copy — risco de conta banida, não só de marca

O `brand-guidelines.md` seção 6 já lista os anti-padrões. Em mídia paga eles deixam de ser questão de tom e passam a ser **risco de reprovação e banimento** sob as políticas de educação do Google e da Meta (diploma mill):

| Nunca escrever | Por quê |
| --- | --- |
| "sem prova", "sem estudar", "sem esforço" | Ilegal perante a LDB (prova presencial é obrigatória) e gatilho direto de diploma mill |
| "compre seu diploma", "diploma rápido" | Prática criminosa; reprovação certa |
| "fácil demais" | Diminui a conquista e soa golpe para um público que já desconfia |
| "certificado do MEC" | **Overclaim.** O claim correto é instituição parceira credenciada. O `config.ts` do promotor documenta explicitamente essa regra `[verificado]` |
| Preço diferente de `price.ts` | CDC art. 37 |

**Ação obrigatória antes de subir anúncio:** rodar toda a copy contra essa tabela. Uma reprovação por diploma mill pode derrubar o Business Manager inteiro, e recuperar leva semanas.

---

## 4. Estratégia de canais

Âncora de decisão que este projeto oferece de graça: **o programa de promotores paga R$ 100 por matrícula paga, mais R$ 500 ao atingir 5 pagas na semana** (`COMMISSION_DIRECT=100`, `BONUS_FLAT=500`, `BONUS_THRESHOLD=5`, `BONUS_REPEATS=false` por padrão) `[verificado]`. No cenário de 5 pagas: (5×100 + 500)/5 = **R$ 200 por matrícula**.

> **Teto de CAC = R$ 200.** Mídia paga que custe mais que isso é pior do que simplesmente recrutar mais promotores. Este é o número contra o qual todo canal abaixo é julgado.

Ticket de R$ 999 no Pix → CAC de R$ 200 é 20% da receita. Confortável. CAC de R$ 500 é 50% — inaceitável com KYC pesado e risco de churn pré-prova.

**E é exatamente aqui que a mídia paga perde no primeiro mês.** Compondo os benchmarks reais do setor `[pesquisado]` — CPC de Search R$ 4–8, conversão de landing 2–2,7%, conclusão de pagamento 2–5% — o CAC esperado no mês 1 é de **R$ 800 a R$ 2.000**. Quatro a dez vezes o teto. Isso não invalida ligar mídia: invalida ligar mídia *esperando volume*. O valor do gasto neste sprint é comprar **dado de conversão**, que hoje não existe, para que o mês 2 possa ser decidido com número em vez de palpite.

Cenários com R$ 1.700 de mídia em 2 semanas `[pesquisado]`:

| Cenário | CPC médio | Cliques | Landing→cadastro | Cadastro→pago | Matrículas |
| --- | ---: | ---: | ---: | ---: | ---: |
| Pessimista | R$ 6,00 | ~280 | 1,5% | 1% | **0** |
| Base | R$ 4,50 | ~380 | 2,5% | 3% | **0–1** |
| Otimista | R$ 3,50 | ~485 | 4% | 6% | **1–2** |

| Canal | Papel | Por que serve | Formato | Esforço | Verba do sprint |
| --- | --- | --- | --- | ---: | ---: |
| **Google Search** | Primário pago | Único canal onde a intenção já existe: a pessoa digita "supletivo online". As 3 páginas de SEO provam que o time já mapeou esses termos | Anúncios de texto → landing dedicada | Médio | **R$ 1.200 (60%)** |
| **Meta (FB+IG)** | Secundário pago | Público classe C/D presente e clique barato, mas intenção baixa. Só liga com pixel + CAPI funcionando | Vídeo vertical 9:16 + estático; retargeting de quem abandonou o funil | Médio | **R$ 500 (25%)** |
| **WhatsApp (owned)** | Recuperação | `services/notify` + Evolution GO já rodando. Lead que travou no CPF é o ativo mais valioso e mais barato de recuperar — os 3 leads presos no banco são a prova viva | Mensagem de retomada de matrícula | Baixo | **R$ 0** |
| **SEO (owned)** | Fundo | 3 páginas já publicadas e indexáveis (`eja-a-distancia`, `supletivo-online`, `terminar-ensino-medio`) | Melhorar as 3 + 2 novas | Médio | **R$ 0** |
| **Promotores (owned)** | Volume de prova | Canal já construído, CAC conhecido de R$ 100–200, risco zero de mídia | Ativar quem já está cadastrado | Baixo | **R$ 0** |
| **Orgânico social** | Prova social | 6 depoimentos já existem em `data/testimonials.ts` | Reels dos depoimentos | Baixo | **R$ 0** |
| Reserva | Contingência | Criativo novo, escala do que ganhar | — | — | **R$ 300 (15%)** |

**Total de mídia no sprint: R$ 2.000** — dentro da faixa de R$ 500–3.000/mês, liberado em estágios (seção 8).

**Rejeitado neste sprint:** TikTok (público secundário só, sem ativo de vídeo pronto), Display/programática (queima verba em awareness que não é o objetivo), influenciador (ciclo de negociação maior que o sprint), YouTube (custo de produção).

---

## 5. Calendário de conteúdo

Dia a dia nas semanas 1–2 (onde está o caminho crítico), semanal nas 3–4.

### Semana 1 — PORTÃO. Zero real gasto em mídia.

| Dia | Entrega | Canal | Responsável / Nota | Status |
| --- | --- | --- | --- | --- |
| D1 | **Decidir o preço.** Reconciliar `price.ts` × `brand-guidelines.md` | — | Você. Bloqueia todo criativo | ☐ |
| D1 | Bater o endpoint `backend.v7m.live/api/v1/clients/pricing` e confirmar o que ele devolve em produção | Técnico | Se divergir do fallback, a landing pode estar exibindo outro preço | ☐ |
| D2 | Rodar a suíte confiável: `cd services/backend && uv run pytest tests/test_lead_funnel_v2.py tests/test_funnel_e2e.py` | Técnico | Prova que o código do funil está íntegro. Verde aqui é pré-requisito, não conclusão | ☐ |
| D2 | **Verificar os 4 portões de ambiente** (§0a): `seed_defaults` rodado · `notify` UP · **todo promotor tem hub** · credenciais Asaas de produção | Técnico | O portão do hub é o que pode engolir um pagamento real. Verificar em produção, não em dev | ☐ |
| D2–D3 | **Prova de funil em produção**, no caminho mínimo: `seed_defaults` → `auth/check` (número com WhatsApp real) → `auth/login` (OTP) → `lead/identity` (CPF) → `lead/email` → `lead/checkout` (pix) → pagar o PIX **ou** replayar o webhook `PAYMENT_RECEIVED` com `externalReference = provider_payment_id` | Técnico | Evidência: `GET /api/v1/clients/enrollment/me` responde `status: "rg"`. ⚠️ Reemitir o JWT **depois** do pagamento — o token carrega as roles do momento da emissão | ☐ |
| D3 | Confirmar que `NEXT_PUBLIC_LEAD_MOCK` **não** está setado em nenhum ambiente publicado | Técnico | `lead-api.ts:52` troca **todas** as chamadas por mocks locais se essa var vazar — o funil "funciona" sem tocar no backend | ☐ |
| D3 | Instalar **GTM** no `<head>` de `Base.astro` (o comentário na linha 99 já diz onde) + `PUBLIC_GTM_ID` no `.env` | Técnico | O `dataLayer` já emite os eventos; só falta a tag | ☐ |
| D4 | GA4: conversões a partir de `cta_click` e `page_view`; Meta Pixel + **Conversions API** | Técnico | CAPI é obrigatório: iOS/ATT e ad-blockers cortam o pixel client nesse público | ☐ |
| D4 | Evento `purchase` **server-side** no webhook Asaas, com `ref`/`utm` do lead | Técnico | Único jeito honesto de medir receita. Webhook já existe e é autenticado (401 sem token) | ☐ |
| D5 | Conta Google Ads + Meta Business criadas, meios de pagamento, domínio `supletivo.net.br` verificado na Meta | Ops | Verificação de domínio leva dias — começar cedo | ☐ |
| D5 | **Recuperação dos 3 leads presos** por WhatsApp via `notify` | WhatsApp | Primeiro teste real de conversão assistida, custo zero | ☐ |
| D6–D7 | Redação da copy dos anúncios: 15 headlines + 4 descrições (Search), 3 ângulos (Social), conferidos contra a tabela de proibições da seção 3 | Conteúdo | Um ângulo por desbloqueio da Virada | ☐ |

**Portão de saída da Semana 1 — todos obrigatórios para liberar verba:**

1. Suíte de backend verde (`test_lead_funnel_v2.py` + `test_funnel_e2e.py`)
2. `users_enrollment` ≥ 1 em produção, com pagamento confirmado e `enrollment/me` respondendo `status: "rg"`
3. Os 4 portões de ambiente verificados — em especial **nenhum promotor sem hub**
4. `NEXT_PUBLIC_LEAD_MOCK` ausente de todo ambiente publicado
5. GTM + GA4 + Meta CAPI disparando, verificados no DebugView
6. `purchase` server-side chegando com atribuição
7. Preço reconciliado numa fonte só

**Se o portão não passar, não ligue mídia.** Estenda a Semana 1. A verba não expira; a confiança no número, sim.

### Semana 2 — Ativos + fumaça controlada (R$ 300)

| Dia | Entrega | Canal | Responsável / Nota | Status |
| --- | --- | --- | --- | --- |
| D8 | Landing de campanha (variante de `/supletivo-online`) com UTM limpo e um só CTA | Owned | Reusar `ContentPage.astro`; não construir página nova do zero | ☐ |
| D8 | 6 depoimentos → 6 estáticos 4:5 + 3 Reels verticais | Social orgânico | `data/testimonials.ts` já tem os 6 | ☐ |
| D9 | 4 criativos estáticos + 2 vídeos, seguindo o prompt-base de imagem do `brand-guidelines.md` seção 8 | Meta | Documental brasileiro real. Sem modelo de banco americano, sem terno | ☐ |
| D10 | **Google Search liga: R$ 100** (R$ 25/dia, 4 dias). Exata + frase, só termos de marca e alta intenção | Google | Objetivo é validar rastreio, não volume | ☐ |
| D11 | Ativação dos promotores já cadastrados (mensagem + material) | Promotores | Volume de prova a CAC R$ 100 | ☐ |
| D12 | **Meta liga: R$ 200** — 1 conjunto, público amplo BR 25–45, otimizado para conversão | Meta | Advantage+ só depois de ter sinal | ☐ |
| D13 | Ler dados: CPC, CTR, taxa de início de matrícula, onde o funil vaza | Análise | Se a taxa de início < 2%, o problema é a landing, não a mídia | ☐ |
| D14 | **Revisão de meio de sprint** + decisão de escala | — | Passa/não passa para R$ 1.700 | ☐ |

**Meta da Semana 2:** 2 matrículas pagas de qualquer origem — e a origem realista aqui é **promotor ou recuperação de WhatsApp, não mídia**. Com R$ 300 gastos, esperar matrícula de mídia nesta semana é esperar sorte. O que a Semana 2 tem de entregar é **CPC real, taxa de início real e conversão rastreada ponta a ponta**.

### Semanas 3–4 — Escala do que provou (R$ 1.700)

| Semana | Entrega | Canal | Nota | Status |
| --- | --- | --- | --- | --- |
| 3 | Search para R$ 700/semana; adicionar termos amplos com correspondência controlada e lista de negativos | Google | Negativos essenciais: "grátis", "gratuito", "bolsa", "download", "prova vazada" | ☐ |
| 3 | Retargeting de quem chegou ao funil e não pagou (o `dataLayer` já permite segmentar por `scroll_depth` e `cta_click`) | Meta | Sempre o público mais barato | ☐ |
| 3 | Sequência de recuperação por WhatsApp para todo lead travado no CPF | WhatsApp | Automatizar via `notify` | ☐ |
| 3 | 2 novas páginas de SEO: "supletivo ensino fundamental" e "supletivo reconhecido pelo MEC" | SEO | Investimento de fundo; não entrega neste sprint | ☐ |
| 4 | Concentrar verba no vencedor; matar tudo com CAC > R$ 300 | Ambos | Disciplina de corte, não de esperança | ☐ |
| 4 | Refresh de criativo nos que fatigaram (frequência > 2,5) | Meta | — | ☐ |
| 4 | Relatório de fechamento: CAC por canal, receita, o que escala no mês 2 | Análise | Vira o baseline que hoje não existe | ☐ |

**20% dos slots ficam livres** para conteúdo reativo — comentário recorrente em anúncio, objeção nova, dúvida que aparecer no WhatsApp.

---

## 6. Ativos necessários

| Ativo | Tipo | O que contém | Prioridade | Prazo |
| --- | --- | --- | --- | --- |
| Instrumentação GTM/GA4/CAPI | Técnico | Tags lendo o `dataLayer` existente + `purchase` no webhook Asaas | **Bloqueante** | D3–D4 |
| Prova de funil documentada | Técnico | Uma matrícula ponta a ponta com evidência de banco | **Bloqueante** | D2–D3 |
| Copy de Search | Texto | 15 headlines (30 car.) + 4 descrições (90 car.), CTA "Quero meu diploma" | Must | D6–D7 |
| 4 estáticos + 2 vídeos | Criativo | Um desbloqueio da Virada por peça, estética documental da seção 8 | Must | D9 |
| Landing de campanha | Página | Variante de `/supletivo-online`, um CTA, UTM limpo | Must | D8 |
| 6 estáticos de depoimento | Criativo | Os 6 de `testimonials.ts` | Must | D8 |
| Mensagem de recuperação WhatsApp | Texto | Retomada de matrícula para lead travado | Must | D5 |
| 3 Reels verticais | Vídeo | Depoimentos em 9:16 | Nice | Sem. 2 |
| 2 páginas novas de SEO | Página | Fundamental + reconhecimento | Nice | Sem. 3 |
| Kit do promotor | Texto+imagem | Material pronto pra indicar | Nice | Sem. 2 |

Tudo o que é criativo sai do `brand-guidelines.md`: paleta `#00734d` / `#002776` / `#ffc400`, `Outfit` para display e `Inter` para corpo, e o prompt-base de imagem documental da seção 8. Não improvisar identidade.

---

## 7. Métricas de sucesso

**KPI primário:** matrículas pagas — contagem em `users_enrollment`. Meta: **6 em 4 semanas**, sendo 1–2 de mídia paga.

> Escolhi contagem de matrícula, não lead nem clique, precisamente porque este projeto já provou que lead não vira matrícula: 3 leads no banco, 0 matrículas `[medido]`. Otimizar por lead aqui seria otimizar pelo número que já está mentindo.

Coluna "meta" abaixo revisada contra benchmark de mercado. A coluna "assumi antes" fica registrada de propósito — é o tamanho do erro que a pesquisa corrigiu.

| # | KPI secundário | Assumi antes | Meta corrigida `[pesquisado]` | Como medir |
| --- | --- | --- | --- | --- |
| 1 | CAC de mídia paga | ≤ R$ 300 | **R$ 800–2.000 no mês 1**; ≤ R$ 200 só é meta de mês 2+ | Gasto ÷ matrículas, por `utm_source` |
| 2 | Taxa de início de matrícula (landing → `cta_click`) | ≥ 3% | **2–2,7% base**, 3% é cenário otimista | GA4 sobre o `dataLayer` |
| 3 | Taxa de conclusão do funil (início → pago) | ≥ 8% | **2–5%** — e trate como incógnita a medir, não como piso | `users_lead` → `asaas_payment` confirmado |
| 4 | CPC no Search | ≤ R$ 3,00 | **R$ 4–8** (setor educação BR roda R$ 3–12; termo comercial vai pra faixa alta) | Google Ads |
| 5 | CPC na Meta | R$ 0,50–1,50 | **R$ 0,65–2,00** (Reels ~R$ 0,65, Feed ~R$ 0,85, sobe rápido fora daí) | Meta Ads |
| 6 | Receita atribuída | ≥ R$ 8.000 | **≥ R$ 6.000** (6 × R$ 999) | `purchase` server-side |
| 7 | Recuperação de lead travado | ≥ 1 das 3 | ≥ 1 das 3 — mantido, é o mais barato que existe | WhatsApp → `Enrollment` |

**Cadência:** número de matrículas todo dia (é uma só query); leitura de canal terça e sexta; fechamento no D28.

**Sobre a conversão de 8% que eu havia posto como piso:** não existe benchmark público brasileiro para este funil exato (OTP + CPF + e-mail *antes* do pagamento, ticket de R$ 999). A evidência mais próxima é abandono de checkout no e-commerce brasileiro de 75–82% — ou seja, conclusão de 18–25% — e isso **sem** gate de OTP e CPF antes de pagar. Onboarding de fintech com KYC completo chega a 60–80%, mas ali a decisão de compra já foi tomada; aqui a pessoa está decidindo gastar R$ 999. Somado ao fato de que este funil nunca rodou com usuário real (o código está íntegro e coberto por teste, mas ninguém nunca passou por ele em produção — §0a), 8% era o número mais frágil do plano. Foi o primeiro a cair.

**Sobre baseline próprio:** continua não existindo. Zero matrículas, zero pixel `[medido]`. A diferença é que agora as metas são benchmark de mercado pesquisado `[pesquisado]` em vez de estimativa minha `[assumido]` — e o valor deste sprint continua sendo **substituir os dois por dado próprio**.

---

## 8. Alocação de verba

**R$ 2.000 de mídia, liberados em estágio.** Nada é liberado antes do portão da Semana 1.

| Estágio | Semana | Valor | Condição de liberação |
| --- | --- | ---: | --- |
| 0 | 1 | **R$ 0** | — (instrumentação e prova de funil) |
| 1 | 2 | **R$ 300** | Portão da Semana 1 completo (4 itens) |
| 2 | 3 | **R$ 700** | Sinal chegando: conversão rastreada ponta a ponta, CPC dentro de R$ 4–8, taxa de início ≥ 1,5% |
| 3 | 4 | **R$ 1.000** | Ao menos 1 matrícula atribuída a mídia **ou** taxa de início ≥ 2,5% com funil provado |
| Reserva | — | **R$ 300** | Escala do canal vencedor |

> As condições dos estágios 2 e 3 foram reescritas. A versão inicial exigia CPA ≤ R$ 500 e depois CAC ≤ R$ 300 para liberar verba — limites que o benchmark de mercado mostra serem inalcançáveis no primeiro mês, e que na prática travariam a campanha inteira no estágio 1. O portão certo aqui não é "o CAC já está bom", é **"o dado já está confiável"**.

Distribuição-alvo ao fim: Google Search 60% · Meta 25% · reserva 15%.

**Custo de produção:** R$ 0 em dinheiro. Criativo sai do `brand-guidelines.md` com IA, depoimentos já existem, páginas reusam componentes Astro já construídos. O custo real é hora de engenharia na instrumentação — e essa hora seria gasta de todo jeito, porque hoje o negócio não sabe de onde vem cliente nenhum.

**Se você só quiser gastar R$ 500 no mês:** rode apenas o estágio 1 ampliado (R$ 500, só Google Search em termos exatos), mantenha os estágios 2–3 desligados e use promotores para volume. O portão da Semana 1 continua obrigatório — ele é mais barato que a verba que protege.

---

## 9. Riscos e mitigações

| # | Risco | Probabilidade | Impacto | Mitigação |
| --- | --- | --- | --- | --- |
| 1 | **Promotor sem hub engole um pagamento real.** `_apply_effects` levanta `no_hub_for_promoter` dentro da transação atômica de `mark_paid`: o cliente paga R$ 999 e a `Enrollment` não nasce | Média — depende do estado dos dados em produção | **Gravíssimo.** Dinheiro recebido, matrícula inexistente, cliente lesado, e você descobre pelo suporte | Verificar no D2 que todo promotor tem hub; portão obrigatório antes de mídia. Corrigir o tratamento desse erro é trabalho de engenharia à parte (`lead/service.py:826`) |
| 1b | Portão de ambiente não atendido faz o lead **não nascer em silêncio** — `no_default_promoter` é engolido em `lead/service.py:462-471` e devolve `created:false` | Média | Verba compra clique de gente que não consegue nem entrar no funil | `seed_defaults` no D2; monitorar taxa de `created:false` durante a campanha |
| 1c | `NEXT_PUBLIC_LEAD_MOCK=1` vazar para ambiente publicado | Baixa | Funil "funciona" sem tocar o backend; matrículas fantasma | Checagem explícita no D3 |
| 2 | **Reprovação por diploma mill** derruba a conta de anúncio | Média — setor é vigiado | Semanas de atraso, possível perda do BM | Tabela de proibições da seção 3 aplicada a toda copy; claim de credenciamento exato; nunca "certificado do MEC" |
| 3 | **Preço divergente** entre anúncio e checkout | Alta se não decidir no D1 | Enganosa (CDC art. 37) + queima de confiança | Decisão de preço no D1, fonte única em `price.ts` |
| 4 | **CAC de mídia 4 a 10x o teto de R$ 200 no mês 1** | **Alta — é o cenário esperado, não o excepcional** `[pesquisado]` | Mídia paga é pior que promotor durante todo o sprint | Aceitar de olhos abertos: o gasto do sprint compra dado, não volume. Verba limitada a R$ 2.000 e liberada em estágio justamente por isso. Se no D28 o CAC não estiver caindo, realocar 100% para promotores |
| 4b | Poucas conversões geram ruído estatístico e decisão errada | Alta — com 0–2 matrículas, nenhuma média é confiável | Escalar ou matar canal pelo motivo errado | Decidir por métricas de topo (CPC, taxa de início, custo por início), não por CAC, enquanto o volume de matrícula for de um dígito |
| 5 | KYC pesado (RG, selfie, contrato) derruba conversão depois do pagamento | Média | Receita entra e aluno não ativa | Medir a queda por passo; o wizard todo vive no papel `enrollment` e só é alcançável pós-pagamento `[verificado]` |
| 6 | Landing sem pixel no D10 | Baixa se o D3 for cumprido | Mídia cega | Portão. Sem tag, não liga |

---

## 10. Próximos passos

**Hoje:**

1. **Confirmar o preço.** A pesquisa de mercado (§0c) aponta com força para `price.ts` (R$ 999 / 12x R$ 99) estar certo e `brand-guidelines.md` (R$ 379) estar errado — R$ 379 está abaixo de todo concorrente direto. Falta seu "sim" e a correção do `brand-guidelines.md`. Nada de criativo avança sem isso.
2. Confirmar quem executa a instrumentação e a prova de funil na Semana 1.

**Esta semana:**

3. Rodar `pytest tests/test_lead_funnel_v2.py tests/test_funnel_e2e.py`, verificar os 4 portões de ambiente (§0a) e fazer uma matrícula real em produção pelo caminho mínimo. **Prioridade absoluta: confirmar que nenhum promotor está sem hub** — é o único ponto onde um pagamento se perde.
4. Instalar GTM + GA4 + Meta CAPI e o `purchase` no webhook Asaas.
5. Abrir Google Ads e Meta Business; iniciar a verificação de domínio (leva dias).
6. Recuperar os 3 leads travados por WhatsApp.

**Decisões que são suas:**

- Preço final (bloqueia tudo) — recomendação: R$ 999, e corrigir o `brand-guidelines.md`
- Verba real: R$ 500, R$ 2.000 ou os R$ 3.000 cheios
- **Aceitar que mídia paga neste sprint compra dado, não matrícula.** Se o que você quer é volume de matrícula neste mês, a campanha certa é a de recrutamento de promotores (CAC provado de R$ 100–200), não esta. Diga se quer inverter a prioridade
- Ligar mídia mesmo se o portão falhar — **não recomendado**, e se for essa a escolha, quero registrá-la aqui explicitamente

---

## 11. Origem das evidências

| Afirmação | Fonte | Classe |
| --- | --- | --- |
| Preço R$ 999 / 12x R$ 99 / âncora R$ 1.615 | `apps/landing-supletivo/src/data/price.ts:40-45` | verificado |
| Preço R$ 379 / 12x R$ 37,90 | `docs/brand-guidelines.md` seção 6 | verificado |
| Nenhum pixel instalado | `apps/landing-supletivo/src/layouts/Base.astro:99` | verificado |
| `dataLayer` com 4 eventos | `apps/landing-supletivo/src/scripts/track.ts` | verificado |
| Atribuição `ref` first-touch 90 dias + UTMs + click ids | `apps/landing-supletivo/src/scripts/attribution.ts` | verificado |
| CTA canônico "Quero meu diploma" | `apps/landing-supletivo/src/config.ts` (`CTA_LABEL`) | verificado |
| Comissão R$ 100 + bônus R$ 500 a cada 5 | `apps/landing-promotor/src/config.ts:50-56` | verificado |
| `users_enrollment` = 0 no banco em 2026-09-02 | `docs/plans/2026-09-02-gitnexus-plan-purga-delirios-funil-matricula.md` seção 2 | medido (2026-09-02) |
| `set_checkout` exige CPF + e-mail — **guard correto, não bloqueio** | `services/backend/users/roles/lead/service.py:537-552` | verificado |
| Rotas que gravam CPF e e-mail existem e estão ligadas na UI | `api/clients/routers/lead.py:70,79`; `users/auth/service.py:574,658,679`; `use-lead-flow.ts:486,549` | verificado |
| Funil completa ponta a ponta contra Django real | `services/backend/tests/test_lead_funnel_v2.py:574,786`; `tests/test_funnel_e2e.py:196` | verificado |
| `cc6fad0` mexeu no 503 do PIX; `f55f2df` é UI pura | `git show --stat` dos dois commits | verificado |
| CPFHub fora não bloqueia (fallback `_synthetic_identity`) | `users/auth/service.py:630-655` | verificado |
| `no_hub_for_promoter` dentro da transação de `mark_paid` reverte a Enrollment | `services/backend/users/roles/lead/service.py:826` | verificado |
| `no_default_promoter` engolido → `created:false` silencioso | `lead/service.py:189-192`, `:462-471` | verificado |
| E2E do frontend mocka `**/api/**` e não prova nada | `apps/supletivo/tests/e2e/lead-cpf.spec.ts:120`, `lead-email.spec.ts:104`, `lead-api.ts:52` | verificado |
| Infra 22/22 PASS, sem teste de funil | `docs/audit/production-audit-report.md` | verificado |
| 3 páginas de SEO publicadas | `apps/landing-supletivo/src/pages/{eja-a-distancia,supletivo-online,terminar-ensino-medio}.astro` | verificado |
| 6 depoimentos disponíveis | `apps/landing-supletivo/src/data/testimonials.ts` | verificado |
| Relay WhatsApp próprio operacional | `services/notify` + Evolution GO; audit Tier 5 | verificado |
| CPC Search educação BR R$ 3–12 (comercial na faixa alta) | mcabralpublicidade, André Rocha Consultor, Conversion (benchmarks Google Ads BR) | pesquisado |
| CPC Meta educação: Reels R$ 0,65 / Feed R$ 0,85; CPM Feed R$ 12–35 | get-ryze.ai (benchmarks Meta Ads 2026), Trafius, IntentMarketing | pesquisado |
| Conversão do setor educacional BR = 2,67% (1,07%–4,71% por canal) | Leadster — Panorama de Geração de Leads no Brasil 2025 | pesquisado |
| Abandono de checkout no e-commerce BR 75–82% | Fábrica de Resultados, EducaSEO (2026) | pesquisado |
| Faixa de preço de concorrentes EJA/supletivo BR: R$ 550–1.500, concentrada em R$ 800–1.000 | Instituto Óliver, Portal EJA Brasil, Monte Horebe, EJA Educa Brasil, Supletivo Evolução, Faculdade Goiás, Instituto Ethos | pesquisado |
| CAC de mídia paga esperado no mês 1: R$ 800–2.000 | composição dos benchmarks acima contra o ticket de R$ 999 | inferido de pesquisado |
