# App Promotor V7M - Test Plan

Plano de testes End-to-End abrangente para o app do colaborador (`apps/promotor`), cobrindo fluxo OTP, painel de captação (QR Code e templates WhatsApp), dossiê paralelo, blocks banner, extrato de comissões e diagnóstico Pix.

## 1. Autenticação & Entrada OTP
**Seed:** `tests/e2e/seed.spec.ts`

### 1.1 Login com OTP válido e redirecionamento para o painel
**File:** `tests/e2e/auth-flow.spec.ts`
**Steps:**
1. Navegar para a página inicial `/`
   - *Expect:* A página inicial deve exibir o campo para identificação por telefone/CPF.
2. Informar o telefone `11987654321` e clicar em `Continuar`
   - *Expect:* O formulário deve solicitar o código de 6 dígitos.
3. Preencher o código `000000` e clicar em `Entrar`
   - *Expect:* O usuário deve ser autenticado com sucesso e direcionado para o painel do promotor.

## 2. Painel do Promotor & Central de Captação
**Seed:** `tests/e2e/seed.spec.ts`

### 2.1 Visualização do link de indicação, QR Code e templates WhatsApp
**File:** `tests/e2e/painel-flow.spec.ts`
**Steps:**
1. Navegar para o `/painel` com sessão ativa
   - *Expect:* O painel deve carregar com saudação, meta semanal e link de indicação.
2. Clicar no botão `Ver QR Code`
   - *Expect:* O modal deve abrir exibindo o QR Code em alta resolução e o botão para copiar o link.
3. Fechar o modal de QR Code
   - *Expect:* O modal deve fechar e retornar à tela do painel.
4. Clicar em `trocar modelo` para alterar o template da mensagem de WhatsApp
   - *Expect:* A lista de modelos (Amigos & Família, Bolsa & Oportunidade, Direto ao Ponto) deve aparecer permitindo a seleção.

### 2.2 Exibição de BlocksBanner sem travar o aplicativo
**File:** `tests/e2e/painel-blocks.spec.ts`
**Steps:**
1. Navegar para o `/painel` com usuário que possui `ValidationBlock` ativo
   - *Expect:* O banner de aviso deve ser exibido com botão para resolver a pendência (`action_route`), mantendo o restante do app acessível.

## 3. Comissões & Diagnóstico Pix
**Seed:** `tests/e2e/seed.spec.ts`

### 3.1 Exibição das 3 métricas de ganhos e abertura do diagnóstico Pix
**File:** `tests/e2e/comissoes-flow.spec.ts`
**Steps:**
1. Navegar para a rota `/comissoes`
   - *Expect:* As 3 colunas de ganhos (Acumulado, Sai na Sexta, Bloqueado) devem estar visíveis com valores formatados em R$.
2. Clicar em `Dúvidas sobre o Pix? Abrir diagnóstico do repasse`
   - *Expect:* A gaveta deve abrir detalhando o status da chave Pix, análise do dossiê e fechamento semanal.
