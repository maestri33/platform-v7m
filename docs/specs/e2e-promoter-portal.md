# Plano de Testes E2E: Portal do Promotor (app.maestri.group)

**Ambiente Alvo:** `http://127.0.0.1:3001`  
**Aplicações Envolvidas:** `apps/app-promotor`, `apps/landing-promotor`, `services/backend`  
**Escopo:** Entrada de Promotor (CPF / Telefone / OTP), Onboarding dos 5 Deveres (RG OCR, Residência, PIX DICT, Escolaridade, Selfie/Acordo), Dashboard de Metas Semanais e Bônus, Compartilhamento de Link & QR Code, CRM de Leads, Extrato de Comissões, Trilha de Treinamento (LMS Gate) e DevStudio de Simulação.

---

## 1. Visão Geral e Arquitetura do Portal do Promotor

O Portal do Promotor (`app.maestri.group` / porta `3001`) é a plataforma de capacitação, captação e remuneração da rede de vendas do ecossistema V7M:
1. **Entrada Simplificada por CPF/Telefone:** O fluxo de entrada unificado valida o CPF/número, identifica o vínculo com o Polo/Coordenador e envia OTP via WhatsApp.
2. **Onboarding dos 5 Deveres (Candidato -> Promotor Pleno):**
   * **Dever 1:** Documento com Foto (RG/CNH) com extração OCR e validação antifraude.
   * **Dever 2:** Comprovante de Residência com preenchimento assistido de CEP.
   * **Dever 3:** Chave PIX validada no Diretório de Identificadores de Contas Transacionais (DICT).
   * **Dever 4:** Informações de escolaridade e dados cadastrais.
   * **Dever 5:** Captura de selfie biométrica e assinatura do termo de adesão.
3. **Dashboard de Performance & Gamificação:**
   * Meta da Semana: Termômetro dinâmico `X / 5` matrículas pagas para liberação de bônus de R$ 500,00.
   * Contador regressivo para o fechamento semanal de pagamentos (sexta-feira 21h).
4. **CRM de Leads Pessoal:** Acompanhamento granular do status de cada aluno indicado em tempo real.
5. **LMS & Treinamento Integrado:** Trilha de capacitação obrigatória com trava de segurança (*LMS Gate*) para liberação das ferramentas de venda.
6. **DevStudio (Ambiente de Teste & Inspeção UI/UX):** Ferramenta interna acessível em `/dev-preview` para simulação instantânea de múltiplos estados, erros de rede e tamanhos de viewport.

---

## 2. Matriz de Cenários de Teste

| ID do Cenário | Módulo / Rota | Título / Objetivo | Severidade |
| :--- | :--- | :--- | :--- |
| **TC-PROMOTOR-001** | `/` Check | Entrada por CPF com máscara e validação algorítmica | Crítica |
| **TC-PROMOTOR-002** | `/` Check | Cadastro inline de novo candidato a promotor | Alta |
| **TC-PROMOTOR-003** | `/` Check | Redirecionamento acolhedor para CPF já existente (`CPF_EXISTS`) | Média |
| **TC-PROMOTOR-004** | `/documento` | Onboarding Dever 1: Upload e OCR de RG/CNH | Crítica |
| **TC-PROMOTOR-005** | `/endereco` | Onboarding Dever 2: CEP autocomplete e comprovante de residência | Alta |
| **TC-PROMOTOR-006** | `/pix` | Onboarding Dever 3: Validação de Chave PIX DICT e Drawer de Diagnóstico | Crítica |
| **TC-PROMOTOR-007** | `/escolaridade` | Onboarding Dever 4: Preenchimento de histórico e escolaridade | Média |
| **TC-PROMOTOR-008** | `/selfie` | Onboarding Dever 5: Captura biométrica e termo de adesão | Alta |
| **TC-PROMOTOR-009** | `/painel` | Dashboard: KPIs de ganhos, meta semanal (X/5) e countdown de fechamento | Crítica |
| **TC-PROMOTOR-010** | `/painel` | Compartilhamento do link de indicação, cópia rápida e QR Code | Alta |
| **TC-PROMOTOR-011** | `/leads` | CRM de Leads: Filtros por status (Contato, Pago, Matriculado) e busca | Alta |
| **TC-PROMOTOR-012** | `/leads` | CRM de Leads: Drawer de detalhes e linha do tempo de evolução do lead | Média |
| **TC-PROMOTOR-013** | `/comissoes` | Extrato Financeiro: Saldo disponível, a liberar e histórico de repasses | Crítica |
| **TC-PROMOTOR-014** | `/treinamento` | LMS: Módulos obrigatórios de capacitação e trava de acesso (LMS Gate) | Alta |
| **TC-PROMOTOR-015** | `/treinamento` | LMS: Questionário / Quiz de validação com feedback imediato | Média |
| **TC-PROMOTOR-016** | `/dev-preview` | DevStudio: Simulação de cenários 1-Click (Candidato, Análise, Ajuste, Pleno) | Média |
| **TC-PROMOTOR-017** | `/dev-preview` | DevStudio: Simulação de erros de API (429 Rate Limit, 500 Server Error) | Alta |
| **TC-PROMOTOR-018** | Geral UI/UX | Alvos de toque >= 44px, alternância de tema e responsividade mobile | Média |

---

## 3. Especificação Detalhada dos Casos de Teste

### Módulo: Autenticação e Entrada (`/`)

#### TC-PROMOTOR-001: Entrada por CPF com Validação de Dígitos
* **Objetivo:** Verificar a validação do CPF digitado no formulário de login/cadastro.
* **Pré-condições:** Aplicação aberta em `http://127.0.0.1:3001/`.
* **Passos de Ação:**
  1. Acessar `http://127.0.0.1:3001/`.
  2. Localizar o campo `textbox "Seu CPF"`.
  3. Digitar `11144477735`.
  4. Observar a aplicação da máscara `111.444.777-35`.
  5. Clicar no botão "Continuar".
* **Resultados Esperados:**
  * Validação client-side bem-sucedida.
  * Se o CPF já for cadastrado, o sistema direciona para validação de WhatsApp/OTP ou exibe mensagem contextual.

#### TC-PROMOTOR-003: Tratamento de CPF com Cadastro Existente
* **Objetivo:** Garantir mensagem acolhedora orientando o usuário a acessar com seu número cadastrado.
* **Passos de Ação:**
  1. Simular resposta de erro de API `{ code: "CPF_EXISTS" }`.
* **Resultados Esperados:**
  * Alerta em destaque: "Esse CPF já tem cadastro por aqui — entre com o telefone dele."
  * O botão de ação oferece atalho para retornar ao fluxo por telefone.

---

### Módulo: Onboarding dos 5 Deveres

#### TC-PROMOTOR-004: Dever 1 - Upload e OCR de Documento
* **Objetivo:** Testar envio do documento de identificação com verificação automática de legibilidade.
* **Passos de Ação:**
  1. Acessar `http://127.0.0.1:3001/documento`.
  2. Fazer upload de foto frontal e traseira de RG ou CNH.
  3. Clicar em "Enviar para análise".
* **Resultados Esperados:**
  * Indicador de processamento em lote.
  * Atualização do status do Dever 1 para `pending` (Em Análise) ou `approved` (Aprovado).

#### TC-PROMOTOR-006: Dever 3 - Validação de Chave PIX DICT
* **Objetivo:** Validar a vinculação de chave PIX de mesma titularidade do promotor.
* **Passos de Ação:**
  1. Acessar `http://127.0.0.1:3001/pix`.
  2. Selecionar o tipo de chave (CPF, Celular, E-mail ou Chave Aleatória).
  3. Inserir a chave `11144477735`.
  4. Clicar em "Validar Chave PIX".
  5. Caso haja divergência cadastral, abrir o `PixDiagnosticDrawer`.
* **Resultados Esperados:**
  * Consulta do DICT confirma que a conta bancária pertence ao titular do CPF.
  * Selo verde "Chave Pix Validada e Ativa".

#### TC-PROMOTOR-008: Dever 5 - Selfie e Termo de Adesão
* **Objetivo:** Concluir o onboarding com captura biométrica e aceite dos termos de parceria.
* **Passos de Ação:**
  1. Acessar `http://127.0.0.1:3001/selfie`.
  2. Capturar a foto do rosto em ambiente iluminado.
  3. Ler o resumo do Termo de Adesão ao Programa de Promotores V7M.
  4. Marcar o checkbox de concordância.
  5. Clicar em "Finalizar Onboarding".
* **Resultados Esperados:**
  * Transição de papel de `candidate` para `promoter`.
  * Redirecionamento automático para o `/painel`.

---

### Módulo: Dashboard de Performance (`/painel`)

#### TC-PROMOTOR-009: Dashboard KPIs e Meta da Semana (X/5)
* **Objetivo:** Validar os cards de métricas, progresso da meta semanal e estimativa de pagamento.
* **Passos de Ação:**
  1. Acessar `http://127.0.0.1:3001/painel`.
  2. Verificar o termômetro de meta: "Matrículas Pagas na Semana: 2 / 5".
  3. Verificar o valor do bônus em jogo (R$ 500,00).
  4. Checar o cronômetro do `Countdown` regressivo para o próximo fechamento (ex: "Fecha em 2 dias e 14 horas").
* **Resultados Esperados:**
  * Todos os números formatados corretamente em moeda BRL (`R$ 0,00`).
  * Ausência de valores quebrados ou layout quebrado em telas pequenas.

#### TC-PROMOTOR-010: Compartilhamento do Link de Indicação e QR Code
* **Objetivo:** Testar os canais de divulgação do link exclusivo do promotor.
* **Passos de Ação:**
  1. No card "Seu Link de Indicação", clicar no botão "Copiar Link".
  2. Verificar feedback instantâneo de texto copiado para o clipboard.
  3. Clicar no botão "Compartilhar no WhatsApp" -> validar que abre `wa.me` com mensagem personalizada contendo o parâmetro `?ref=UUID`.
  4. Clicar em "Gerar QR Code" -> validar modal com QR Code pronto para download ou exibição presencial.
* **Resultados Esperados:**
  * Links contêm a referência correta do promotor logado.

---

### Módulo: CRM de Leads e Comissões (`/leads` e `/comissoes`)

#### TC-PROMOTOR-011 & TC-PROMOTOR-012: CRM de Leads e Linha do Tempo
* **Objetivo:** Filtrar a lista de leads e inspecionar a jornada do estudante.
* **Passos de Ação:**
  1. Acessar `http://127.0.0.1:3001/leads`.
  2. Filtrar pela aba "Aguardando Pagamento".
  3. Clicar sobre um lead para abrir a gaveta de detalhes (*Drawer*).
  4. Inspecionar a linha do tempo: "Iniciou o funil" -> "Preencheu CPF" -> "Gerou PIX".
  5. Clicar no botão "Lembrar no WhatsApp" para envio de mensagem de suporte.
* **Resultados Esperados:**
  * A gaveta abre com animação suave e exibe histórico completo sem travar a navegação.

#### TC-PROMOTOR-013: Extrato de Comissões e Repasses
* **Objetivo:** Conferir extrato detalhado de comissões por aluno matriculado.
* **Passos de Ação:**
  1. Acessar `http://127.0.0.1:3001/comissoes`.
  2. Visualizar os três blocos: "Saldo Disponível", "A Liberar (Matrículas em Análise)" e "Total Já Pago".
  3. Consultar a tabela de histórico com data, nome do aluno e valor líquido da comissão.
* **Resultados Esperados:**
  * Valores coincidem com as matrículas confirmadas.

---

### Módulo: Trilha de Treinamento e LMS Gate (`/treinamento`)

#### TC-PROMOTOR-014 & TC-PROMOTOR-015: LMS Gate e Quizzes Interativos
* **Objetivo:** Testar o bloqueio de ferramentas caso o treinamento não esteja concluído e execução dos testes.
* **Passos de Ação:**
  1. Acessar `http://127.0.0.1:3001/treinamento`.
  2. Visualizar a lista de videoaulas e materiais de apoio.
  3. Assistir ao módulo obrigatório "Regras de Certificação e Ética".
  4. Responder ao quiz final de 5 perguntas.
  5. Obter pontuação superior à nota de corte (>= 80%).
* **Resultados Esperados:**
  * Desbloqueio do certificado de conclusão e liberação total do link de promotor.

---

### Módulo: Modo Desenvolvedor / DevStudio (`/dev-preview`)

#### TC-PROMOTOR-016 & TC-PROMOTOR-017: Simulação 1-Click e Teste de Erros
* **Objetivo:** Validar o estúdio de desenvolvimento para testes visuais e simulação de condições extremas.
* **Passos de Ação:**
  1. Acessar `http://127.0.0.1:3001/dev-preview`.
  2. Clicar nos botões de 1-Click:
     * "🌱 Candidato Novo (0/5)"
     * "⏳ Em Análise OCR (2/5 + Fila)"
     * "⚠️ Ajuste Necessário (Reprovações)"
     * "⚡ Promotor Pleno (5/5 Aprovado)"
     * "🏆 Campeão da Meta (5/5 Leads + Bônus)"
  3. Clicar nos botões de simulação de erro de API: "Rate Limit (429)", "Erro 500".
  4. Testar a ferramenta "🎯 Alvos ≥44px" para verificação de acessibilidade touch.
* **Resultados Esperados:**
  * A UI atualiza dinamicamente refletindo cada estado sem necessidade de reload.
