# Brand Guidelines — Supletivo Brasil (supletivo.net.br)

> Versão: 1.0.0  
> Status: Oficial / Ativo  
> Domínio Canônico: [supletivo.net.br](https://supletivo.net.br)  
> Aplicação do Aluno: [app.supletivo.net.br](https://app.supletivo.net.br)  
> Entidade Mantenedora: Maestri Group (CNPJ 48.811.016/0001-00) · Tecnologia V7M  

---

## Quick Reference

| Element | Value |
|---------|-------|
| Primary Color | #00734d |
| Secondary Color | #002776 |
| Accent Color | #ffc400 |
| Primary Font | Inter |
| Voice | Acolhedor, Dignificante, Direto, Confiável |

---

## 1. Brand Concept & Core Identity

O **Supletivo Brasil** (`supletivo.net.br`) nasceu para derrubar as barreiras que afastaram milhões de brasileiros da conclusão da educação básica. Combinando tecnologia moderna, estudo 100% online pelo celular e certificação válida em todo o território nacional, a marca se posiciona como a ponte definitiva entre o passado interrompido e um futuro com mais dignidade, renda e oportunidades.

### Slogan Central & Manifesto

> **"Você parou. Mas não acabou."**

A narrativa de marca é construída sobre o conceito **"A Virada"**:
- O aluno não é tratado com pena nem com paternalismo. Ele é visto como alguém batalhador que precisou pausar os estudos para trabalhar, cuidar dos filhos ou sobreviver.
- Concluir o Ensino Fundamental ou Médio não é apenas obter um documento: é destravar a faculdade, a inscrição em concursos públicos, a CNH, melhores vagas de emprego e o orgulho perante a própria família.

### Core Attributes

| Attribute | Description |
|---|---|
| **Missão** | Democratizar a conclusão do Ensino Fundamental e Médio (EJA) no Brasil através de uma experiência digital humana, rápida e acessível. |
| **Visão** | Ser a plataforma de educação básica acelerada mais respeitada, transparente e recomendada do país. |
| **Posicionamento** | EJA 100% online com prova presencial nos termos da LDB e dos órgãos estaduais de educação, permitindo estudar no próprio ritmo e pelo celular. |
| **Promessa Central** | Termine o Ensino Fundamental ou Médio pelo celular, no seu ritmo — com certificado oficial válido em todo o Brasil. |

---

## 2. Color Palette & Visual Identity

A identidade visual é inspirada nas cores da **Bandeira do Brasil**, reinterpretadas com tratamento institucional, nobre e contemporâneo, evitando clichês carnavalescos ou excesso de saturação.

### Primary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Primary Green | #00734d | rgb(0,115,77) | Cor institucional primária, botões de ação e estados de aprovação |
| Primary Dark Green | #005238 | rgb(0,82,56) | Hover de botões primários, profundidade em gradientes e sombras |
| Primary Light Green | #38d178 | rgb(56,209,120) | Acentos luminosos, indicadores de progresso e badges de sucesso |
| Primary Blue | #002776 | rgb(0,39,118) | Cabeçalhos de alta autoridade, gradiente do hero e botões institucionais |
| Primary Dark Blue | #001a52 | rgb(0,26,82) | Fundo escuro profundo do hero e base de contraste máxima |

### Secondary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Secondary Gold | #ffc400 | rgb(255,196,0) | Swoosh de destaque, check do logo, marquee e acentos de atenção |
| Secondary Gold Light | #ffd75e | rgb(255,215,94) | Hover de elementos dourados, detalhes de estrelas e brilho suave |
| Accent Bright Blue | #1e6fe0 | rgb(30,111,224) | Links interativos, anéis de foco e término do gradiente de marca |
| Accent Green | #10b981 | rgb(16,185,129) | Estados de sucesso da interface e checks secundários |

### Accent Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Accent Gold | #ffc400 | rgb(255,196,0) | Swoosh do hero, marcações principais e estrelas |
| Accent Dark | #d4a200 | rgb(212,162,0) | Bordas e ênfases douradas com contraste reforçado |
| Accent Light | #ffd75e | rgb(255,215,94) | Glows sutis e fundos de badges dourados |

### Neutral Palette

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Background | #ffffff | rgb(255,255,255) | Superfícies primárias de leitura e cartões brancos |
| Surface Light | #f5f7f3 | rgb(245,247,243) | Fundo suave de seções alternadas (paper-soft) |
| Dark Surface | #0b1b3b | rgb(11,27,59) | Superfícies elevadas no tema escuro |
| Deep Ink | #0b1220 | rgb(11,18,32) | Texto primário em fundo claro e fundo principal do rodapé |
| Text Secondary | #49536a | rgb(73,83,106) | Subtítulos, microcópia e legendas sobre superfícies claras |
| Muted Dark | #b9c3db | rgb(185,195,219) | Texto secundário e ícones sobre fundo escuro (hero/footer) |
| Border | #e3e7ee | rgb(227,231,238) | Divisórias sutis, bordas de inputs e cartões |

### Semantic Colors

| State | Hex | Usage |
|-------|-----|-------|
| Success | #00734d | Documento aprovado, matrícula concluída, pagamento confirmado |
| Warning | #ffc400 | Pendências de documento, revisão solicitada, prazo limite de prova |
| Error | #c62828 | Falha no envio de documento, dados divergentes, recusa no gateway |
| Info | #1e6fe0 | Instruções de captura de foto, regras de prova, avisos gerais |

### Accessibility & Contrast (WCAG 2.1)

- **Texto em Fundo Claro (`#0b1220` sobre `#ffffff` ou `#f5f7f3`)**: Relação de contraste `16.2:1` (Critério AAA).
- **Texto Secundário (`#49536a` sobre `#ffffff`)**: Relação de contraste `6.4:1` (Critério AA).
- **Texto em Fundo Escuro (`#ffffff` sobre `#002776` ou `#0b1220`)**: Relação de contraste `12.5:1` a `18.1:1` (Critério AAA).
- **Acento Amarelo (`#ffc400`)**: Empregado para ícones, traços decorativos e texto sobre fundos escuros (`#002776` / `#0b1220`), garantindo legibilidade imediata.

---

## 3. Typography Specifications

A tipografia do Supletivo Brasil combina solidez geométrica para títulos de impacto com legibilidade exemplar em telas de baixa resolução para o corpo do texto.

### Font Stack

```css
--font-heading: 'Outfit', 'Archivo Black', system-ui, sans-serif;
--font-body: 'Inter', system-ui, -apple-system, sans-serif;
--font-mono: 'Consolas', 'JetBrains Mono', monospace;
```

### Type Scale (Mobile-First & Fluid Clamp)

| Element | Size Scale | Weight | Line Height | Usage |
|---------|------------|--------|-------------|-------|
| Hero Title | `clamp(2.85rem, 1.1rem + 8vw, 6.8rem)` | 800 / 900 | 1.05 | Gancho inicial do Hero ("Você parou. Mas não acabou.") |
| H1 | `clamp(2.2rem, 1.5rem + 3.5vw, 4.0rem)` | 700 / 800 | 1.15 | Títulos principais de páginas e modais |
| H2 | `clamp(2.0rem, 1.3rem + 3vw, 3.6rem)` | 700 | 1.20 | Títulos de seções de alta conversão (Preço, Virada) |
| H2 Small | `clamp(1.55rem, 1.2rem + 1.6vw, 2.4rem)` | 600 | 1.25 | Seções instrucionais (Como Funciona, FAQ) |
| H3 | `clamp(1.15rem, 1.05rem + 0.5vw, 1.35rem)` | 600 | 1.30 | Subtítulos de blocos e títulos de cards |
| Body Large | `clamp(1.125rem, 1.02rem + 0.55vw, 1.375rem)` | 400 / 500 | 1.50 | Leads de introdução de seções |
| Body | `clamp(1.0rem, 0.95rem + 0.35vw, 1.125rem)` | 400 | 1.60 | Textos corridos, explicações e respostas do FAQ |
| Microcopy | `clamp(0.8125rem, 0.75rem + 0.25vw, 0.875rem)` | 400 / 500 | 1.45 | Avisos de segurança, selos de garantia e legendas |

---

## 4. Logo & Brand Mark Rules

O logotipo do Supletivo Brasil une a geometria do losango da Bandeira Nacional a um traço afirmativo de "check" de aprovação, representando superação educacional.

```
      ▲
     / \
    / ★ \          Supletivo Brasil
   <  ✓  >        -----------------
    \   /         SEU DIPLOMA RECONHECIDO
     \ /
      ▼
```

### Anatomia e Construção

1. **O Losango (Diamond)**:
   - Traço geométrico estilizado com bordas arredondadas e ângulo de 45°.
   - Cor: Ouro vivo (`#ffc400`).
2. **O Check de Conclusão**:
   - Desenha-se partindo do centro-esquerdo para o topo-direito.
   - Cor: Branco puro (`#ffffff`) sobre fundos escuros; Verde institucional (`#00734d`) sobre fundos claros.
3. **Wordmark**:
   - Tipografia: Display (`Outfit` ou `Archivo Black`).
   - "Supletivo" em peso normal / médio; "**Brasil**" em peso ultra-bold (800) com cor contrastante.

### Variantes Oficiais

| Variante | Fundo Indicado | Composição |
|---|---|---|
| **Light (Hero/Dark)** | Azul Profundo (`#002776`) ou Tinta (`#0b1220`) | Losango ouro (`#ffc400`), check branco (`#ffffff`), texto branco com "Brasil" em ouro |
| **Dark (Documentos/White)** | Branco (`#ffffff`) ou Paper Soft (`#f5f7f3`) | Losango ouro (`#ffc400`), check verde (`#00734d`), texto tinta (`#0b1220`) com "Brasil" em verde |
| **Monocromático** | Impressões em preto e branco / carimbos | Traço 100% preto com preenchimento transparente |
| **Ícone / Favicon** | App Icon (PWA), Favicon (32x32 e SVG), Avatar | Quadrado com cantos arredondados (rx: 14) em azul (`#002776`), losango ouro e check branco |

### Área de Respiro & Tamanhos Mínimos

- **Área de Não-Interferência**: Espaçamento mínimo igual à metade da altura do símbolo do losango em todos os quatro lados.
- **Tamanho Mínimo Digital**:
  - Logo completo (Símbolo + Wordmark): `120px` de largura.
  - Ícone isolado: `24px` × `24px` (display) / `32px` × `32px` (favicon).
- **Tamanho Mínimo Impresso**:
  - Logo completo: `35mm` de largura.
  - Ícone isolado: `10mm` de altura.

### Proibições Estritas (Don'ts)

- ❌ **Nunca** rotacionar, distorcer ou inclinar o losango ou o checkmark.
- ❌ **Nunca** alterar as cores oficiais da marca para combinações não aprovadas.
- ❌ **Nunca** adicionar sombras duras, efeitos de relevo biselado ou gradientes caóticos no logotipo.
- ❌ **Nunca** separar o símbolo do texto de forma assimétrica em cabeçalhos institucionais.
- ❌ **Nunca** aplicar o logo sobre fotografias com ruído visual sem a camada protetora de vidro translúcido (`LiquidGlass`).

---

## 5. Visual Signatures & Design Accents

O ecossistema visual do Supletivo Brasil adota elementos de interface refinados para conferir credibilidade e sofisticação à plataforma:

1. **Risco de Acento Tricolor (Brand Rule)**:
   - Linha sutil de `2px` a `5px` aplicada no rodapé dos cabeçalhos e no topo dos rodapés.
   - Gradiente de marca: `linear-gradient(90deg, #00734d 0%, #38d178 38%, #1e6fe0 100%)` ou com a faixa nacional `#00734d` 34%, `#ffc400` 34% 67%, `#002776` 67% 100%.
2. **Aurora Atmospheric Glow**:
   - Manchas radiais amplas e difusas (`blur(60px)` a `blur(120px)`) em tons de azul e ouro com opacidade controlada (`8%` a `15%`).
3. **Superfícies de Vidro (LiquidGlass & Zero-G)**:
   - `background: rgba(11, 18, 32, 0.7)` no tema escuro e `rgba(255, 255, 255, 0.75)` no claro.
   - `backdrop-filter: blur(16px)` com bordas delicadas `1px solid rgba(255, 255, 255, 0.12)`.
   - Sombras leves de gravidade zero: `0 24px 48px -12px rgba(0, 0, 0, 0.4)`.

---

## 6. Voice & Tone Framework

A voz do Supletivo Brasil reflete empatia real com a jornada do brasileiro comum. O aluno frequentemente carrega a vergonha de não ter completado os estudos no tempo regulamentar. Nossa comunicação acolhe, empodera e conduz com simplicidade.

### Brand Personality

| Trait | Description |
|---|---|
| **Acolhedor** | Compreende sem julgamentos que o aluno pausou os estudos por necessidade da vida real |
| **Dignificante** | Valoriza a coragem de voltar a estudar; celebra cada documento enviado e módulo cumprido |
| **Direto** | Usa palavras simples do cotidiano, eliminando jargões pedagógicos, siglas confusas e juridiquês |
| **Confiável** | Transmite segurança institucional incontestável sobre a legalidade, credenciamento e prova presencial |

### Matriz de Tom por Contexto

| Contexto | Tom de Voz | Exemplo Prático |
|---|---|---|
| **Página de Vendas / Hero** | Inspirador, afirmativo e enérgico | *"Você parou. Mas não acabou. Termine o Ensino Médio pelo celular, no seu ritmo."* |
| **Checkout & Preços** | Claro, transparente e seguro | *"De R$ 1.615 por R$ 999 à vista no Pix ou 12x de R$ 99 no cartão (total R$ 1.188). Sem mensalidades nem taxas surpresa."* |
| **Envio de Documentos (OCR/IA)** | Amigável, didático e paciente | *"Posicione seu RG fora do plástico e com boa iluminação. Nossa equipe confere tudo em minutos."* |
| **Área de Estudos do Aluno** | Encorajador e orientado a progresso | *"Módulo de Matemática concluído! Você está a um passo da sua prova de certificação."* |
| **Notificação WhatsApp** | Ágil, objetivo e respeitoso | *"Olá, Maria! Seu acesso à plataforma de estudos está liberado. Clique no link e comece agora."* |
| **Mensagens de Erro / Pendência** | Solucionador e tranquilizador | *"Não conseguimos ler o verso do seu documento. Pode nos enviar uma foto mais nítida?"* |

### Prohibited & Anti-Patterns

| Avoid | Reason |
|---|---|
| Fácil demais | Diminui o valor da conquista do aluno e soa como golpe |
| Sem estudar / Sem esforço | A certificação exige compromisso real e aprovação na prova oficial |
| Comprar diploma | Prática criminosa repudiada; somos uma instituição séria de preparação para EJA |
| Sem prova | Ilegal perante a LDB (Lei nº 9.394/96); a avaliação final presencial é obrigatória |
| Termos acadêmicos herméticos | "Cognição proativa", "matriz curricular transdisciplinar" alienam o público-alvo |
| Letras miúdas enganosas | Transparência de preço e regras desde a primeira dobra |

---

## 7. Messaging Framework & Copywriting Standards

### Pilares de Mensagem

```
Missão: Dar acesso à conclusão da educação básica com dignidade e tecnologia
   ↓
Posicionamento: EJA 100% online pelo celular + Prova oficial presencial
   ↓
Gancho Emocional: "Você parou. Mas não acabou."
   ↓
Prova Social & Confiança: Certificado emitido por instituição parceira credenciada aos órgãos estaduais de educação
   ↓
CTA Canônico Único: "Quero meu diploma"
```

### Argumentário de Conversão (Os 5 Desbloqueios da Virada)

1. **Matrícula na Faculdade**: Abertura de portas para graduação presencial ou EAD.
2. **Concursos Públicos**: Elegibilidade para cargos públicos municipais, estaduais e federais de nível médio.
3. **CNH e Cursos Técnicos**: Pré-requisito para habilitação profissional e formações do Sistema S (Senai/Senac).
4. **Vagas Melhores de Emprego**: Promoções internas e fim da barreira de currículos descartados na triagem.
5. **Orgulho Próprio e Familiar**: Resgate da autoestima e exemplo para filhos e parentes.

### Regras de Ouro da Copy

1. **CTA Sempre Idêntico**: Usar a label canônica `"Quero meu diploma"` em todos os botões de ação do funil de entrada.
2. **Menção Legal Obrigatória**: Informar com clareza nos rodapés e termos que a certificação é emitida por escola parceira credenciada aos órgãos estaduais de educação, com respaldo na Lei Federal nº 9.394/96 (LDB).
3. **Privacidade e LGPD**: Dados coletados estritamente para matrícula, verificação cadastral e suporte educacional, sem compartilhamento com terceiros para fins de marketing abusivo.

---

## 8. AI Image Generation System

Diretrizes para produção de fotografias e ativos visuais gerados via inteligência artificial (Midjourney, Gemini, Flux, Stable Diffusion) para campanhas, landing pages e criativos sociais.

### Base Prompt Template

```
Editorial candid documentary photography of a real Brazilian adult student, age between 25 and 45, authentic working-class Brazilian ethnicity, warmly lit by natural golden-hour window light, looking focused and proud while studying on a modern smartphone, cozy authentic Brazilian urban home or public library background, shot on 35mm lens f/2.0, subtle film grain, natural skin textures with minor imperfections, color palette accented with subtle deep blue and emerald green tones --no studio lighting, no overpolished stock models, no business suits, no caucasian corporate stereotypes, no plastic AI skin
```

### Style Keywords

| Category | Keywords |
|----------|----------|
| **Lighting** | warm natural light, soft golden hour, realistic ambient room lighting, clean window glow |
| **Mood** | determined, proud, hopeful, welcoming, authentic, dignified, focused |
| **Composition** | medium close-up, rule of thirds, clean depth of field, authentic Brazilian home environment |
| **Treatment** | 35mm documentary realism, natural contrast, rich emerald green and navy blue accents |
| **Aesthetic** | contemporary Brazilian lifestyle, relatable everyday reality, dignified education |

### Visual Mood Descriptors

- Expressões de determinação serena e alívio de quem está conquistando uma vitória esperada há anos.
- Ambientes reais do cotidiano brasileiro: mesa da sala com café, transporte público limpo, bancos de praça, quarto iluminado.
- Dispositivos acessíveis e comuns: smartphones intermediários com capas práticas, fones de ouvido com fio ou bluetooth simples.
- Roupas casuais autênticas: camisetas lisas, uniformes de trabalho confortáveis, camisas polo, jaqueta jeans.

### Visual Don'ts

| Avoid | Reason |
|---|---|
| Modelos de banco de imagens americano | Desconecta do público brasileiro real |
| Salas de reunião executivas / Ternos engravatados | Afasta o trabalhador comum da identificação imediata |
| Expressões exageradas de riso ou choro dramático | Perde o tom documental sóbrio e respeitoso |
| Peles excessivamente plastificadas por filtros de IA | Gera desconfiança sobre a autenticidade da instituição |
| Salas de aula tradicionais com quadro-negro | Reforça o modelo antigo do qual o aluno fugiu ou foi excluído |

### Example Prompts

**Hero Banner**:
```
Editorial photography of a Brazilian woman in her early 30s holding an official diploma folder with a subtle proud smile, soft natural lighting coming from the side, modern minimalist Brazilian home background, colors subtly harmonizing with deep blue #002776 and forest green #00734d, 50mm lens f/2.8, raw photograph, realistic skin detail.
```

**Social Media Post**:
```
Candid medium shot of a Brazilian man in his late 20s studying on a mobile phone on a wooden table, notebook open beside him with handwritten study notes, evening home warm lamp light, expression of focus and optimism, authentic São Paulo apartment interior, genuine documentary aesthetic.
```

---

## 9. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Documento canônico consolidado para supletivo.net.br cobrindo identidade, cores, tipografia, logotipo, voice & tone, mensagens e prompts de IA. |
