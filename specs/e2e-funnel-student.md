# Plano de Testes E2E: Portal do Aluno e Funil de Matrícula

**Ambiente Alvo:** `http://127.0.0.1:3020`  
**Aplicações Envolvidas:** `apps/app-supletivo`, `apps/landing-supletivo`, `services/backend`  
**Escopo:** Aquisição de Lead, Funil de Entrada (WhatsApp/CPF/E-mail/Planos/Checkout), Onboarding de Matrícula (OCR de Documentos, Endereço, Histórico, Selfie, Contrato), Painel do Aluno e Sala de Provas/Certificação.

---

## 1. Visão Geral e Arquitetura do Funil

O funil do Supletivo Brasil adota uma jornada moderna sem fricção:
1. **Entrada Instantânea:** O usuário digita o número de celular (11 dígitos). A aplicação auto-avança sem necessidade de botão "Enviar".
2. **Identificação Dinâmica:** O backend classifica o número entre **Lead Novo** (segue para CPF -> E-mail -> Planos -> Checkout) ou **Usuário Existente** (dispara OTP via WhatsApp para autenticação).
3. **Validação de Identidade com Efeito Pergaminho:** Ao validar o CPF via algoritmo e consulta da Receita, a UI apresenta uma animação de "Vaga Reservada" com os dados do aluno.
4. **Checkout Resiliente:** Oferece PIX instantâneo com polling em tempo real e Cartão de Crédito em até 12x. Suporta retomada de pagamento (`resume`).
5. **Onboarding Documental (Matrícula):** Fluxo sequencial de 4 passos (`rg` -> `address` -> `education` -> `selfie`) com extração de OCR assistida por IA.
6. **Portal do Aluno & Sala de Provas:** Gestão de pendências documentais, declaração de tipo sanguíneo e ambiente de avaliação com cronômetro e emissão de certificado.

---

## 2. Matriz de Cenários de Teste

| ID do Cenário | Módulo / Tela | Título / Objetivo | Severidade |
| :--- | :--- | :--- | :--- |
| **TC-FUNIL-001** | `/(funil)` Check | Auto-avanço com WhatsApp válido (11 dígitos) | Crítica |
| **TC-FUNIL-002** | `/(funil)` Check | Máscara e bloqueio de formato inválido de telefone | Média |
| **TC-FUNIL-003** | `/(funil)` Login OTP | Autenticação de usuário existente via código OTP de 6 dígitos | Crítica |
| **TC-FUNIL-004** | `/(funil)` Login OTP | Reenvio de OTP com timer de cooldown de 60 segundos | Média |
| **TC-FUNIL-005** | `/(funil)` Login OTP | Tratamento de erro quando envio de WhatsApp falha | Alta |
| **TC-FUNIL-006** | `/(funil)` CPF | Digitação e validação de CPF novo com cálculo de dígito verificador | Crítica |
| **TC-FUNIL-007** | `/(funil)` CPF | Feedback visual (Shake + Borda Vermelha) para CPF com dígito inválido | Alta |
| **TC-FUNIL-008** | `/(funil)` CPF Reveal | Exibição do pergaminho de reserva de vaga com nome e protocolo | Média |
| **TC-FUNIL-009** | `/(funil)` E-mail | Preenchimento de e-mail com chips de atalho (@gmail, @hotmail, etc.) | Média |
| **TC-FUNIL-010** | `/(funil)` E-mail | Sugestão e correção de typos em provedores populares | Baixa |
| **TC-FUNIL-011** | `/(funil)` Planos | Seleção de plano de estudos (Médio, Fundamental, Completo) | Alta |
| **TC-FUNIL-012** | `/(funil)` Planos | Modal de confirmação e selo de "Taxa Única / Sem Mensalidades" | Média |
| **TC-FUNIL-013** | `/(funil)` Checkout | Pagamento PIX com geração de QR Code, Copia e Cola e Polling | Crítica |
| **TC-FUNIL-014** | `/(funil)` Checkout | Pagamento com Cartão de Crédito e parcelamento em até 12x | Crítica |
| **TC-FUNIL-015** | `/(funil)` Checkout | Retomada de sessão de checkout em aberto (`checkoutPhase: resume`) | Alta |
| **TC-FUNIL-016** | `/(funil)` Checkout | Tratamento de erro de gateway com botões de retry e WhatsApp suporte | Alta |
| **TC-FUNIL-017** | `/(funil)` A11y & UX | Navegação por teclado, Skip links, contraste e leitores de tela | Alta |
| **TC-FUNIL-018** | `/(funil)` Responsivo | Teste de layout e touch targets em Mobile (390x844) e Desktop (1440x900) | Média |
| **TC-MATRICULA-001** | `/matricula` RG | Upload de frente e verso de documento (RG / CNH / CIN) | Crítica |
| **TC-MATRICULA-002** | `/matricula` RG | Validação e edição dos campos extraídos por IA/OCR | Alta |
| **TC-MATRICULA-003** | `/matricula` Endereço | Autocomplete de endereço via CEP (ViaCEP) e preenchimento de número | Alta |
| **TC-MATRICULA-004** | `/matricula` Endereço | Upload de comprovante de residência | Média |
| **TC-MATRICULA-005** | `/matricula` Estudos | Declaração de escolaridade prévia e upload de histórico escolar | Alta |
| **TC-MATRICULA-006** | `/matricula` Selfie | Captura biométrica com guia visual e validação de iluminação | Alta |
| **TC-MATRICULA-007** | `/matricula` Contrato | Visualização dos termos, assinatura eletrônica e download do PDF | Crítica |
| **TC-MATRICULA-008** | `/matricula` Resume | Retomada automática da etapa pendente baseada em `expected_status` | Alta |
| **TC-ALUNO-001** | `/aluno` Dashboard | Exibição de status da matrícula e checklist de documentos | Alta |
| **TC-ALUNO-002** | `/aluno` Docs | Envio de documentos adicionais pendentes via Bottom Sheet | Média |
| **TC-ALUNO-003** | `/aluno` Docs | Feedback claro de documento reprovado com orientações de correção | Alta |
| **TC-ALUNO-004** | `/aluno` Sangue | Seleção e confirmação de tipo sanguíneo do estudante | Média |
| **TC-ALUNO-005** | `/aluno` Polling | Polling automático de status e redirecionamento para `/provas` quando liberado | Alta |
| **TC-PROVAS-001** | `/provas` Agendamento| Escolha de data e horário para realização da prova oficial | Alta |
| **TC-PROVAS-002** | `/provas` Sala Online | Apresentação de instruções, regras e início do cronômetro da prova | Crítica |
| **TC-PROVAS-003** | `/provas` Questões | Navegação entre itens de múltipla escolha e persistência de respostas | Crítica |
| **TC-PROVAS-004** | `/provas` Submissão | Confirmação de entrega com alerta de questões em branco | Alta |
| **TC-PROVAS-005** | `/provas` Resultado | Exibição de pontuação, aprovação e solicitação de diploma | Crítica |
| **TC-PROVAS-006** | `/provas` Diploma | Rastreamento do despacho do diploma e confirmação de retirada | Média |

---

## 3. Especificação Detalhada dos Casos de Teste

### Módulo: Funil de Entrada e Conversão (`/(funil)`)

#### TC-FUNIL-001: Auto-avanço com WhatsApp Válido (11 dígitos)
* **Objetivo:** Garantir que o usuário seja direcionado automaticamente para a próxima etapa assim que completar 11 dígitos no input de telefone, sem necessidade de clique adicional.
* **Pré-condições:** Aplicação aberta na URL base `http://127.0.0.1:3020/`.
* **Passos de Ação:**
  1. Acessar `http://127.0.0.1:3020/`.
  2. Localizar o campo `#lead-phone` ou `input[placeholder*="(00)"]`.
  3. Digitar sequencialmente `11987654321`.
  4. Observar a aplicação da máscara `(11) 98765-4321`.
  5. Aguardar a requisição automática disparada para `/api/v1/auth/check` ou `/auth/check`.
* **Resultados Esperados:**
  * Indicador de carregamento "Verificando seu número…" é renderizado brevemente.
  * Transição suave para a tela de CPF (caso lead novo) ou tela de OTP (caso usuário já existente).
  * Nenhuma mensagem de erro é exibida.

#### TC-FUNIL-002: Máscara e Bloqueio de Formato Inválido
* **Objetivo:** Validar que entradas parciais ou inválidas não disparam requisição nem travam o fluxo.
* **Passos de Ação:**
  1. Acessar `http://127.0.0.1:3020/`.
  2. Digitar apenas 8 dígitos `11987654`.
  3. Pressionar Enter ou clicar fora do input.
* **Resultados Esperados:**
  * O formulário permanece na tela inicial sem transicionar.
  * O texto auxiliar orienta: "É só digitar — a gente segue sozinho assim que o número estiver completo."

#### TC-FUNIL-003: Autenticação de Usuário Existente via Código OTP
* **Objetivo:** Verificar login com envio e validação de código de 6 dígitos via WhatsApp.
* **Pré-condições:** Número de telefone cadastrado previamente no banco.
* **Passos de Ação:**
  1. Mockar ou enviar payload `/auth/check` com `{ exists: true, external_id: "usr-uuid-1", roles: ["student"] }`.
  2. Inserir o telefone do aluno existente.
  3. A UI deve exibir o componente de 6 caixas de OTP e o texto "Mandamos o código pro seu WhatsApp".
  4. Preencher o código OTP `123456`.
  5. O submit automático ocorre no 6º dígito.
* **Resultados Esperados:**
  * O token JWT de acesso e refresh são gravados no `localStorage` sob a chave `supletivo.login`.
  * Redirecionamento bem-sucedido para `/aluno` ou `/matricula`.

#### TC-FUNIL-004: Reenvio de OTP com Countdown
* **Objetivo:** Validar o botão de reenviar código e o timer regressivo de 60 segundos contra spam.
* **Passos de Ação:**
  1. Entrar na tela de OTP.
  2. Verificar que o botão "Reenviar código" exibe contagem regressiva `(60s)`.
  3. Aguardar a expiração do timer.
  4. Clicar em "Reenviar código".
* **Resultados Esperados:**
  * Nova requisição de OTP é disparada.
  * Toast de sucesso: "Código reenviado com sucesso!".
  * O timer é reiniciado em 60s.

#### TC-FUNIL-006: Entrada de CPF Válido com Cálculo de Módulo 11
* **Objetivo:** Validar que o CPF digitado passa pela validação algorítmica client-side e consulta backend.
* **Passos de Ação:**
  1. Na tela de CPF (`/cpf`), digitar um CPF válido (ex: `123.456.789-09` ou gerado válido).
  2. Observar a distribuição dos dígitos nas caixas formatadas `CpfBoxes`.
* **Resultados Esperados:**
  * A UI exibe a animação de scan (`CpfDocument`).
  * Disparo de requisição para `/lead/identity`.
  * Transição para o reveal do documento.

#### TC-FUNIL-007: Bloqueio de CPF Inválido com Feedback Visual
* **Objetivo:** Garantir que CPFs com dígitos verificadores matematicamente inválidos sejam rejeitados de imediato.
* **Passos de Ação:**
  1. Na tela de CPF, digitar `111.111.111-11` ou `123.456.789-00`.
* **Resultados Esperados:**
  * O card executa animação de vibração (*shake effect*).
  * Borda vermelha de alerta (`border-brand-danger`).
  * Mensagem clara: "Esse CPF não fechou — confira os números e tente de novo."

#### TC-FUNIL-008: Reveal do Pergaminho de Reserva de Vaga
* **Objetivo:** Validar a apresentação do certificado/pergaminho digital com os dados oficiais do aluno.
* **Passos de Ação:**
  1. Concluir a digitação do CPF válido.
  2. Aguardar a resposta da API de identidade (`{ name: "Maria Eduarda dos Santos", birth_date: "1998-05-14" }`).
* **Resultados Esperados:**
  * Efeito de abertura do pergaminho (*Parchment Reveal*).
  * Exibição do nome completo do aluno, data de nascimento e protocolo `7M-XXXX`.
  * Tag de status: "Vaga reservada".
  * Após ~3 segundos (ou toque/clique de atalho), avança automaticamente para a tela de E-mail.

#### TC-FUNIL-009 & TC-FUNIL-010: Preenchimento de E-mail e Chips Rápidos
* **Objetivo:** Testar a seleção rápida de domínios e correção de typos comuns.
* **Passos de Ação:**
  1. Na tela de e-mail, digitar o prefixo `maria.santos`.
  2. Clicar no chip `@gmail.com`.
  3. Validar a concatenação no campo para `maria.santos@gmail.com`.
  4. Testar digitação manual com erro `maria@gmai.com` -> verificar se surge sugestão "Você quis dizer @gmail.com?".
  5. Clicar em "Continuar".
* **Resultados Esperados:**
  * E-mail validado é salvo na sessão.
  * Transição para a tela de seleção de planos (`/planos`).

#### TC-FUNIL-011 & TC-FUNIL-012: Seleção de Planos e Modal de Confirmação
* **Objetivo:** Verificar cards de cursos e modal de confirmação de taxa única.
* **Passos de Ação:**
  1. Na tela de planos, visualizar os cards: "Ensino Médio", "Ensino Fundamental" e "EJA Completo".
  2. Selecionar o plano "Ensino Médio".
  3. Clicar na opção "PIX à vista" ou "Cartão até 12x".
* **Resultados Esperados:**
  * Modal `PlanExpanded` é aberto com backdrop blur.
  * Exibe selo em destaque: **"TAXA ÚNICA — Você não paga mais nada depois"**.
  * Clicar no CTA de confirmação encaminha para o checkout.

#### TC-FUNIL-013: Pagamento via PIX (QR Code e Polling)
* **Objetivo:** Validar a geração e liquidação de pagamento PIX.
* **Passos de Ação:**
  1. Selecionar PIX no checkout.
  2. A UI exibe a linha do tempo de preparação da matrícula.
  3. O QR Code dinâmico e o código "Copia e Cola" são renderizados.
  4. Clicar no botão "Copiar código PIX" -> verificar feedback "Código copiado!".
  5. Simular confirmação de pagamento no backend (`payment_status: "approved"`).
* **Resultados Esperados:**
  * A UI detecta a aprovação via polling em tempo real.
  * Exibe animação de sucesso e redireciona para `/matricula`.

#### TC-FUNIL-014: Pagamento via Cartão de Crédito
* **Objetivo:** Testar formulário de cartão com validação de bandeira, validade e CVV.
* **Passos de Ação:**
  1. Selecionar Cartão de Crédito.
  2. Preencher número de cartão (16 dígitos), nome do titular, vencimento (MM/AA) e CVV (3 ou 4 dígitos).
  3. Selecionar parcelamento (ex: 12x de R$ 39,90).
  4. Clicar em "Pagar agora".
* **Resultados Esperados:**
  * Requisição processada com sucesso.
  * Transição imediata para o fluxo de matrícula.

---

### Módulo: Fluxo de Matrícula e Onboarding Documental (`/matricula`)

#### TC-MATRICULA-001: Upload de Documentos de Identificação (RG / CNH / CIN)
* **Objetivo:** Testar o envio dos arquivos de documento com validação de formato e tamanho.
* **Pré-condições:** Sessão de aluno autenticada no step 0 (`rg`).
* **Passos de Ação:**
  1. Acessar `http://127.0.0.1:3020/matricula`.
  2. Selecionar o tipo de documento: "RG (Registro Geral)".
  3. Fazer upload do arquivo da frente (`rg-frente.jpg`).
  4. Fazer upload do arquivo do verso (`rg-verso.jpg`).
  5. Clicar em "Avançar".
* **Resultados Esperados:**
  * Pré-visualização das miniaturas com indicador de upload concluído.
  * Disparo do processamento OCR.

#### TC-MATRICULA-002: Validação e Edição de Dados Extraídos por IA
* **Objetivo:** Garantir que o aluno possa revisar e corrigir dados lidos pelo OCR antes da submissão final.
* **Passos de Ação:**
  1. Após o OCR, visualizar os campos preenchidos: Número do RG, Órgão Emissor/UF, Data de Nascimento, Nome da Mãe.
  2. Alterar um dos campos caso necessário.
  3. Clicar em "Confirmar dados do documento".
* **Resultados Esperados:**
  * Dados confirmados são salvos no backend.
  * O stepper avança para o Step 1: "Endereço".

#### TC-MATRICULA-003 & TC-MATRICULA-004: Endereço, CEP e Comprovante de Residência
* **Objetivo:** Testar preenchimento automático de endereço via CEP e upload de comprovante.
* **Passos de Ação:**
  1. No step de endereço, digitar o CEP `01310-100`.
  2. Verificar autopreenchimento: Logradouro "Avenida Paulista", Bairro "Bela Vista", Cidade "São Paulo", UF "SP".
  3. Preencher o campo Número `1000` e Complemento `Apto 42`.
  4. Realizar upload do arquivo `comprovante-residencia.pdf`.
  5. Clicar em "Salvar endereço".
* **Resultados Esperados:**
  * Formulário avança para o Step 2: "Estudos".

#### TC-MATRICULA-005: Escolaridade Prévia e Histórico Escolar
* **Objetivo:** Coletar dados da trajetória escolar e documento comprobatório.
* **Passos de Ação:**
  1. Selecionar a última série concluída (ex: "8ª série / 9º ano do Ensino Fundamental").
  2. Informar o nome da última escola e ano de conclusão.
  3. Anexar o Histórico Escolar ou marcar "Não possuo histórico agora (assinar termo de compromisso)".
  4. Clicar em "Avançar".
* **Resultados Esperados:**
  * Avanço para o Step 3: "Selfie".

#### TC-MATRICULA-006: Captura Biométrica e Selfie
* **Objetivo:** Validar a captura facial do aluno com detecção de enquadramento.
* **Passos de Ação:**
  1. Conceder permissão de câmera no browser ou fazer upload de selfie.
  2. Posicionar o rosto dentro da moldura oval guia.
  3. Capturar a foto.
  4. Verificar se a pré-visualização permite "Tirar outra" ou "Usar esta foto".
  5. Clicar em "Confirmar Selfie".
* **Resultados Esperados:**
  * Upload da foto biométrica associada ao cadastro.
  * Transição para o Contrato de Matrícula.

#### TC-MATRICULA-007: Contrato de Matrícula e Assinatura Eletrônica
* **Objetivo:** Garantir a leitura, concordância com os termos e assinatura digital do contrato educacional.
* **Passos de Ação:**
  1. Rolar o documento do contrato de prestação de serviços educacionais até o fim.
  2. Marcar o checkbox "Li e concordo com todos os termos do contrato".
  3. Clicar no botão "Assinar Contrato de Matrícula".
* **Resultados Esperados:**
  * Geração do protocolo de assinatura digital com timestamp e IP.
  * Disponibilização do botão "Baixar Contrato em PDF".
  * Tela de boas-vindas: "Matrícula Concluída com Sucesso!".

---

### Módulo: Portal do Aluno e Sala de Provas (`/aluno` e `/provas`)

#### TC-ALUNO-001 & TC-ALUNO-004: Dashboard Acadêmico e Tipo Sanguíneo
* **Objetivo:** Verificar a visualização de pendências e envio do tipo sanguíneo exigido pela legislação educacional.
* **Passos de Ação:**
  1. Acessar `http://127.0.0.1:3020/aluno`.
  2. Visualizar os cards de status dos documentos enviados (Aprovado, Em Análise, Pendente).
  3. No card de tipo sanguíneo, selecionar a opção `O+` e salvar.
* **Resultados Esperados:**
  * Status atualizado com sucesso.
  * Se todos os documentos estiverem aprovados, o sistema entra em polling aguardando `exam_released`.

#### TC-PROVAS-002 & TC-PROVAS-003: Realização de Prova Online com Timer
* **Objetivo:** Validar a execução da prova com navegação entre questões e cronômetro regressivo.
* **Pré-condições:** Aluno com status `exam_released`.
* **Passos de Ação:**
  1. Acessar `http://127.0.0.1:3020/provas`.
  2. Ler as orientações de prova e clicar em "Iniciar Prova Agora".
  3. Observar o cronômetro regressivo de tempo restante no topo da tela.
  4. Responder às questões de múltipla escolha (A, B, C, D, E).
  5. Navegar entre as páginas de questões (Anterior / Próxima) e verificar se as alternativas marcadas persistem.
* **Resultados Esperados:**
  * O estado das respostas marcadas é preservado localmente e sincronizado.
  * O cronômetro não reinicia ao recarregar a página.

#### TC-PROVAS-004 & TC-PROVAS-005: Envio da Prova e Emissão de Diploma
* **Objetivo:** Submeter a prova para correção e visualizar o resultado final.
* **Passos de Ação:**
  1. Clicar em "Finalizar e Entregar Prova".
  2. Confirmar no modal de segurança "Deseja realmente entregar?".
  3. Aguardar a correção instantânea.
* **Resultados Esperados:**
  * Apresentação da nota final (ex: "Nota: 8.5 / 10 - APROVADO!").
  * Exibição do botão "Solicitar Emissão do Diploma Oficial MEC".
  * Transição do status para `awaiting_diploma_issuance`.
