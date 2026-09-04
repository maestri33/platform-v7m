# Especificações e Planos de Testes E2E (Playwright Test Plans)

Este diretório contém os planos de testes estruturados de ponta a ponta (E2E) para o ecossistema V7M:

1. [**Portal do Aluno e Funil de Matrícula (Porta 3020)**](./e2e-funnel-student.md)
   - Aquisição de Leads (WhatsApp sem fricção, OTP, CPF com reveal de pergaminho, E-mail com chips de domínio, Seleção de Planos e Checkout PIX/Cartão).
   - Onboarding de Matrícula (OCR de RG/CNH/CIN, Endereço com CEP ViaCEP, Histórico Escolar, Selfie Biométrica e Assinatura de Contrato).
   - Portal do Aluno (Dossiê de documentos, Tipo sanguíneo e Polling de liberação de exame).
   - Sala de Provas (Agendamento, Prova com timer regressivo, Múltipla escolha, Entrega e Emissão de Diploma).

2. [**Portal do Promotor (Porta 3001)**](./e2e-promoter-portal.md)
   - Entrada unificada por CPF/Telefone.
   - Onboarding dos 5 Deveres (RG OCR, Residência, Chave Pix DICT, Escolaridade e Selfie com Termo de Adesão).
   - Dashboard de Performance (Meta semanal X/5 com bônus de R$ 500 e countdown de fechamento).
   - Compartilhamento de Link de Indicação e QR Code dinâmico.
   - CRM de Leads pessoal e Extrato de Comissões.
   - Trilha de Treinamento e LMS Gate com Quizzes.
   - DevStudio (`/dev-preview`) para simulação de cenários 1-Click e injeção de falhas de API.

3. [**Portal do Promotor - Aprofundado (Porta 3001)**](./e2e-app-promotor-deep.md)
   - Fluxo de entrada e validação algorítmica por CPF e disparo de OTP WhatsApp.
   - Onboarding dos 5 Deveres de Validação e Antifraude (RG/CNH OCR, Residência, Chave Pix DICT, Escolaridade e Selfie Biométrica com Termo de Adesão).
   - Dashboard de Performance (Meta semanal X/5 com bônus de R$ 500, countdown regressivo e central de link/QR Code).
   - CRM de Leads pessoal e Extrato financeiro de comissões com trava de liberação de saques.
   - LMS Gate com bloqueio compulsório de painel e correção instantânea por IA.
   - DevStudio (`/dev-preview`) para simulações 1-Click, injeção de falhas de rede/API e auditoria de alvos de toque (≥44px).

4. [**Cockpit Administrativo (Porta 3003)**](./e2e-admin-cockpit.md)
   - Autenticação Dual (WhatsApp OTP e Senha Master de contingência).
   - Dashboard Master com KPIs e Gestão Multipolar de Unidades Educacionais.
   - Modo Gestor (Impersonação de Coordenador/Polo sem logout).
   - Mesa de Auditoria de Matrículas e Validação Documental de OCR.
   - Motor Financeiro (Fechamento Semanal, Lote de PIX DICT e Pagamentos Avulsos).
   - Editor de Preços dos Cursos, Metas de Comissões e Health Matrix de Integrações.
   - Auditoria de Logs de IA/OCR e Central de Disparos de WhatsApp.

5. [**Dashboard & Operações do Notify (Porta 8000)**](./e2e-notify-dashboard.md)
   - Painel Operacional Unificado HTMX (Visão geral com KPIs, status de canais e disparo de teste imediato).
   - Assistente de Setup Multi-tenant (6 Etapas com trava compulsória de navegação 🔒 para apps com configuração pendente).
   - Histórico de Envios Outbound com filtros dinâmicos e inspeção de payloads/metadados.
   - Mensagens Recebidas Inbound e auditoria de repasses a webhooks.
   - Gestão de E-mail & Servidor Stalwart (SMTP, caixas no servidor e Shell HTML da Marca com assistente de IA).
   - Gerenciamento de WhatsApp & Evolution GO (Pareamento QR Code ao vivo, Pairing Code e reconexão de sessão).
   - Live Stream de Webhooks a cada 3s com pausa sob demanda e filtros de eventos.
   - Configurações, Chaves de API, Gateway OmniRouter IA (`10.0.1.135`) e Criação de Novos Tenants.
