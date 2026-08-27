export type paths = {
    "/api/v1/staff/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Health
         * @description Liveness público do grupo (sem auth).
         */
        get: operations["staff_api_base_health"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/whoami": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Whoami
         * @description Eco do principal autenticado + `name` do Profile — o front saúda pelo nome (exige Bearer).
         */
        get: operations["staff_api_base_whoami"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/auth/check": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Verificação de staff
         * @description Acha o staff (superuser) por cpf/phone/external_id e dispara OTP.
         */
        post: operations["staff_api_staff_routers_auth_staff_check"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Login do staff (WhatsApp OTP)
         * @description Login passwordless (OTP) do staff.
         */
        post: operations["staff_api_staff_routers_auth_staff_login"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/auth/login-password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Login do staff por senha master (Contingência)
         * @description Login de contingência do staff via senha master.
         */
        post: operations["staff_api_staff_routers_auth_staff_login_password"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/auth/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Refresh
         * @description Troca o `refresh_token` por um par NOVO (rotação); o front renova silencioso quando o
         *     access expira, sem voltar pro OTP.
         */
        post: operations["staff_api_base_refresh"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/hubs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listagem de polos
         * @description Lista todos os polos cadastrados.
         */
        get: operations["staff_api_staff_routers_hubs_list_hubs"];
        put?: never;
        /**
         * Criação de polo
         * @description Cria um polo: marca do catálogo + coordenador promotor + endereço.
         */
        post: operations["staff_api_staff_routers_hubs_create_hub"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/promoters": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listagem de promotores aptos a coordenar
         * @description Lista promotores ativos para escolha de coordenador.
         */
        get: operations["staff_api_staff_routers_hubs_list_promoters"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/hubs/{external_id}/coordinator": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Definir coordenador do polo
         * @description Designa ou troca o coordenador de um polo.
         */
        put: operations["staff_api_staff_routers_hubs_set_coordinator"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/hubs/{external_id}/default": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Marcar polo padrão
         * @description Marca polo como padrão para captação.
         */
        put: operations["staff_api_staff_routers_hubs_set_default_hub"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/hubs/{external_id}/address": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Definir endereço do polo
         * @description Preenche endereço do polo por CEP.
         */
        patch: operations["staff_api_staff_routers_hubs_set_hub_address"];
        trace?: never;
    };
    "/api/v1/staff/training/materials": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listar matérias (com gabarito)
         * @description Lista todas as matérias com gabarito para visão de autoria.
         */
        get: operations["staff_api_staff_routers_materials_list_materials"];
        put?: never;
        /**
         * Criar matéria de treino
         * @description Cria uma matéria do treino (conteúdo + questão + gabarito).
         */
        post: operations["staff_api_staff_routers_materials_create_material"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/training/materials/{external_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Atualizar matéria de treino
         * @description Edita uma matéria de treino.
         */
        put: operations["staff_api_staff_routers_materials_update_material"];
        post?: never;
        /**
         * Descartar matéria efêmera
         * @description Descarta matéria efêmera.
         */
        delete: operations["staff_api_staff_routers_materials_delete_material"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/training/materials/{external_id}/publish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Publicar matéria transitória
         * @description Publica matéria transitória para promotores existentes.
         */
        post: operations["staff_api_staff_routers_materials_publish_material"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/training/materials/{external_id}/video": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Upload de vídeo de matéria
         * @description Upload de vídeo da matéria de treino.
         */
        post: operations["staff_api_staff_routers_materials_upload_material_video"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/finance/balance": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Saldo da conta Asaas
         * @description Saldo da conta Asaas (read-only).
         */
        get: operations["staff_api_staff_routers_finance_finance_balance"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/finance/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Resumo financeiro
         * @description Resumo de comissões e fila de saída.
         */
        get: operations["staff_api_staff_routers_finance_finance_summary"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/finance/commissions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listagem de comissões
         * @description Comissões do sistema por status.
         */
        get: operations["staff_api_staff_routers_finance_finance_commissions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/finance/payouts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Solicitações de pagamento
         * @description Fila de solicitações de pagamento / payouts.
         */
        get: operations["staff_api_staff_routers_finance_finance_payouts"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/finance/payments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Pagamento avulso (PIX/Boleto)
         * @description Enfileira pagamento avulso protegido por idempotência.
         */
        post: operations["staff_api_staff_routers_finance_create_manual_payment"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/finance/closing/run": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Executar fechamento semanal
         * @description Executa o fechamento semanal de comissões.
         */
        post: operations["staff_api_staff_routers_finance_run_closing"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/finance/closing/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Saúde do fechamento semanal
         * @description Cruza saldo do Asaas com obrigações pendentes.
         */
        get: operations["staff_api_staff_routers_finance_closing_health"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/finance/closing/simulation": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Simulação do fechamento semanal
         * @description Simula o fechamento semanal em memória com cálculo de bônus, beneficiários e pendências.
         */
        get: operations["staff_api_staff_routers_finance_closing_simulation"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/finance/payouts/{external_id}/retry": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Forçar retentativa de payout
         * @description Força o reprocessamento imediato de uma solicitação de pagamento com erro ou sem saldo.
         */
        post: operations["staff_api_staff_routers_finance_retry_payout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/finance/payouts/{external_id}/override-pix": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Sobrescrever chave PIX e re-enfileirar
         * @description Atualiza a chave PIX do payout (e opcionalmente do profile) e re-enfileira para pagamento.
         */
        post: operations["staff_api_staff_routers_finance_override_payout_pix"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/finance/ledger": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Extrato contábil irrestrito (Ledger)
         * @description Consulta os lançamentos contábeis de partidas dobradas (100% de visibilidade sem filtros ocultos).
         */
        get: operations["staff_api_staff_routers_finance_get_ledger"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/finance/transactions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Visão 360° de transações financeiras
         * @description Listagem mestre de todas as transações financeiras do sistema.
         */
        get: operations["staff_api_staff_routers_finance_get_transactions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/finance/cashflow": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Cockpit de previsibilidade e fluxo de caixa
         * @description Consolida indicadores de caixa, saídas agendadas, provisões de comissão e riscos em tempo real.
         */
        get: operations["staff_api_staff_routers_finance_get_cashflow"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/finance/adjustments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Ajuste manual contábil soberano
         * @description Lança ajuste manual contábil com justificativa obrigatória e registro imutável de auditoria.
         */
        post: operations["staff_api_staff_routers_finance_create_manual_adjustment"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/finance/expenses/unexpected": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Pagar / Registrar custo imprevisto
         * @description Registra e emite ordem de desembolso para custos imprevistos ou emergenciais.
         */
        post: operations["staff_api_staff_routers_finance_create_unexpected_expense_endpoint"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/finance/disputes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listar disputas e chargebacks
         * @description Consulta todas as disputas e contestações bancárias pendentes ou resolvidas.
         */
        get: operations["staff_api_staff_routers_finance_list_disputes"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/finance/disputes/{external_dispute_id}/resolve": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Veredito soberano de disputa / chargeback
         * @description Aplica a decisão final soberana do Admin sobre uma contestação (absorver, debitar promotor ou contestar).
         */
        post: operations["staff_api_staff_routers_finance_resolve_dispute_endpoint"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/finance/audit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Trilha de auditoria das intervenções financeiras do Admin
         * @description Consulta o histórico completo e imutável de todas as decisões tomadas pelo Admin.
         */
        get: operations["staff_api_staff_routers_finance_get_financial_audit"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/leads": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listar todos os leads
         * @description Lista todos os leads com filtro opcional por polo e status.
         */
        get: operations["staff_api_staff_routers_users_list_all_leads"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/leads/{external_id}/mark-paid": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Marcar lead como pago manualmente
         * @description Força confirmação de pagamento de lead.
         */
        post: operations["staff_api_staff_routers_users_mark_lead_paid"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/funnel-user": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Exclusão completa de usuário de teste
         * @description Apaga por completo usuário do funil (lead/candidato).
         */
        delete: operations["staff_api_staff_routers_users_purge_funnel_user"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/enrollments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listar todas as matrículas
         * @description Matrículas de todos os polos.
         */
        get: operations["staff_api_staff_routers_users_list_all_enrollments"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/students": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listar todos os alunos
         * @description Alunos de todos os polos.
         */
        get: operations["staff_api_staff_routers_users_list_all_students"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/students/{external_id}/platform-credentials": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Atualizar credenciais da plataforma
         * @description Corrige login/senha da plataforma de um aluno já concluído.
         */
        put: operations["staff_api_staff_routers_users_set_student_platform_credentials"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/users": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listagem geral de usuários
         * @description Usuários e roles ativas da plataforma.
         */
        get: operations["staff_api_staff_routers_users_list_users"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/users/{external_id}/phone": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Resgate de telefone de usuário
         * @description Troca de telefone de login em caso de perda de chip.
         */
        put: operations["staff_api_staff_routers_users_set_user_phone"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/coordinators": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listagem completa de coordenadores e polos geridos
         * @description Retorna todas as lideranças que possuem papel de coordinator, com seus polos e métricas.
         */
        get: operations["staff_api_staff_routers_coordinators_list_coordinators"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/bootstrap/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Verifica se a plataforma já foi inicializada
         * @description Retorna se o bootstrap inicial da plataforma já foi concluído.
         */
        get: operations["staff_api_staff_routers_config_get_bootstrap_status"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/bootstrap/init": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Executa a primeira inicialização (Bootstrap) da plataforma
         * @description Executa a primeira inicialização da plataforma e emite token para a conta-mãe (Boss).
         *
         *     HARD-LOCK: Se já houver superusuário ativo no sistema, recusa terminantemente com 403 ALREADY_BOOTSTRAPPED.
         */
        post: operations["staff_api_staff_routers_config_init_platform_bootstrap"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/config/setup": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Obter configurações e setup da plataforma
         * @description Retorna o estado de configuração atual da plataforma: Boss, Preços, Comissões e Integrações.
         */
        get: operations["staff_api_staff_routers_config_get_platform_setup"];
        /**
         * Atualizar configurações e setup da plataforma
         * @description Atualiza configurações no banco de dados e sincroniza dados do Boss e Hubs.
         */
        put: operations["staff_api_staff_routers_config_update_platform_setup"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/config/seed-run": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Executar seed de bootstrap da plataforma
         * @description Executa o comando de seed idempotente (cria/atualiza conta do Boss, Hub padrão e Promotor).
         */
        post: operations["staff_api_staff_routers_config_run_seed_defaults"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/integrations/{name}/test-live": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Teste de conexão ao vivo da integração
         * @description Testa a conectividade em tempo real com o provedor externo e mede latência.
         */
        post: operations["staff_api_staff_routers_config_test_integration_live"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/notify/templates": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listagem de todos os templates de notificação
         * @description Lista todos os templates cadastrados no banco do backend.
         */
        get: operations["staff_api_staff_routers_notify_list_templates"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/notify/templates/stats": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Estatísticas agregadas de templates
         * @description Retorna contadores de templates ativos, com TTS, com IA e por canal.
         */
        get: operations["staff_api_staff_routers_notify_template_stats"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/notify/events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listagem de todos os eventos suportados
         * @description Lista todos os eventos cadastrados no banco do backend.
         */
        get: operations["staff_api_staff_routers_notify_list_events"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/notify/templates/ai-assist": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Assistência de IA para edição de mensagem
         * @description Reescreve e otimiza o texto do template preservando estritamente variáveis de contexto.
         */
        post: operations["staff_api_staff_routers_notify_ai_assist"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/notify/templates/{event}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Obter detalhes de template
         * @description Retorna os dados completos do template do banco local.
         */
        get: operations["staff_api_staff_routers_notify_get_template"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Atualizar template de notificação
         * @description Edita os campos de texto, TTS, mídia e canais do template diretamente no banco local.
         */
        patch: operations["staff_api_staff_routers_notify_patch_template"];
        trace?: never;
    };
    "/api/v1/staff/notify/templates/{event}/restore-seed": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Restaurar template do seed
         * @description Sobrescreve o template no banco do backend com a versão padrão do seed.
         */
        post: operations["staff_api_staff_routers_notify_restore_seed"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/notify/templates/{event}/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Visualizar prévia renderizada
         * @description Renderiza a prévia do texto substituindo as variáveis dinâmicas de contexto localmente.
         */
        post: operations["staff_api_staff_routers_notify_preview_template"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/notify/templates/{event}/test": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Enviar notificação de teste
         * @description Dispara um envio real de teste para o Staff logado nos canais configurados.
         */
        post: operations["staff_api_staff_routers_notify_test_template"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/notify/history": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Histórico de notificações enviadas
         * @description Consulta o histórico de disparos com status por canal (WhatsApp, E-mail, TTS).
         */
        get: operations["staff_api_staff_routers_notify_notify_history"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/notify/tts/config": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Configuração de TTS e Cadeia de Provedores
         * @description Retorna a URL base do OmniRoute, a cadeia de fallback e a regra de gênero cruzado.
         */
        get: operations["staff_api_staff_routers_notify_tts_config"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/notify/tts/probe": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Testar síntese de voz (TTS) em tempo real
         * @description Sintetiza um áudio de teste no OmniRoute e devolve a URL pública do áudio para preview.
         */
        post: operations["staff_api_staff_routers_notify_tts_probe"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/documents/reviews": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Fila global unificada de documentos em revisão
         * @description Retorna todas as análises pendentes de matrícula, candidato e aluno de todos os polos.
         */
        get: operations["staff_api_staff_routers_documents_list_global_document_reviews"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/documents/{user_external_id}/dossier": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Dossiê visual e biométrico completo
         * @description Retorna todas as mídias, scores biométricos, OCR e dados cadastrais para conferência lado a lado.
         */
        get: operations["staff_api_staff_routers_documents_get_user_dossier"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/documents/{user_external_id}/decide": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Decisão administrativa do operador
         * @description Aprova ou rejeita manualmente documento ou selfie com justificativa.
         */
        post: operations["staff_api_staff_routers_documents_decide_document_staff"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/network/tree": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Árvore de captação e performance hierárquica (Downline)
         * @description Retorna o organograma de Coordenadores -> Polos -> Promotores -> Alunos com taxas de conversão.
         */
        get: operations["staff_api_staff_routers_network_get_network_tree"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/training/submissions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listagem de submissões de treino com áudios e notas
         * @description Retorna submissões com URLs de áudio gravado, transcrição e justificativa da IA.
         */
        get: operations["staff_api_staff_routers_training_list_training_submissions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/training/submissions/{external_id}/override": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Aprovar/reprovar submissão manualmente
         * @description Staff substitui a nota/decisão da IA.
         */
        post: operations["staff_api_staff_routers_training_override_submission_grade"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/training/promoters/{promoter_external_id}/unlock": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Desbloquear promotor travado no treino
         * @description Aprova todas as matérias obrigatórias pendentes do promotor e remove o overlay training.
         */
        post: operations["staff_api_staff_routers_training_unlock_promoter_training"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/integrations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listagem de integrações
         * @description Saúde e configuração das integrações.
         */
        get: operations["staff_api_staff_routers_system_list_integrations"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/integrations/{name}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Detalhe de integração
         * @description Detalhe de integração específica.
         */
        get: operations["staff_api_staff_routers_system_integration_detail"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/integrations/asaas/setup": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Configurar webhook Asaas
         * @description Cadastra ou atualiza webhook do Asaas.
         */
        post: operations["staff_api_staff_routers_system_integration_setup"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/integrations/asaas/test": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Testar integração Asaas
         * @description Executa testes de conectividade do Asaas.
         */
        post: operations["staff_api_staff_routers_system_integration_test"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/system": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Status do servidor e infraestrutura
         * @description Saúde do servidor: banco, migrations, Django-Q e filas.
         */
        get: operations["staff_api_staff_routers_system_system_status"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/logs/ai-calls": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Logs de chamadas de IA
         * @description Histórico de chamadas de modelos de IA.
         */
        get: operations["staff_api_staff_routers_system_logs_ai_calls"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/logs/checks": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Logs de verificações de validação
         * @description Histórico do ledger de validações.
         */
        get: operations["staff_api_staff_routers_system_logs_checks"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/health/full": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Diagnóstico profundo de integrações
         * @description Diagnóstico profundo para o staff (exige superuser).
         */
        get: operations["staff_api_health_router_staff_health"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/health/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Health
         * @description Liveness público do grupo (sem auth).
         */
        get: operations["health_api_base_health"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/health/whoami": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Whoami
         * @description Eco do principal autenticado + `name` do Profile — o front saúda pelo nome (exige Bearer).
         */
        get: operations["health_api_base_whoami"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/health/healthz": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Health check público
         * @description Health check público — sem auth. DB ping + migrations pendentes + build info.
         */
        get: operations["health_api_health_router_healthz"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/clients/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Health
         * @description Liveness público do grupo (sem auth).
         */
        get: operations["clients_api_base_health"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/clients/whoami": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Whoami
         * @description Eco do principal autenticado + `name` do Profile — o front saúda pelo nome (exige Bearer).
         */
        get: operations["clients_api_base_whoami"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/clients/pricing": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Preço de vitrine público
         * @description Preço de VITRINE público (sem login): PIX + cartão em 12x.
         */
        get: operations["clients_api_clients_routers_pricing_pricing"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/clients/referral/{ref}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Selo de indicação por promotor
         * @description Resolve o primeiro nome do promotor para o selo de indicação.
         */
        get: operations["clients_api_clients_routers_pricing_referral"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/clients/auth/register": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Cadastro inicial do lead
         * @description Cadastro do cliente: cria lead + checkout e devolve o pagamento.
         */
        post: operations["clients_api_clients_routers_auth_register"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/clients/auth/check": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Verificação e disparo de OTP ou captura
         * @description Check de telefone/CPF: dispara OTP ou captura lead no funil v2.
         */
        post: operations["clients_api_clients_routers_auth_check"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/clients/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Login
         * @description Login passwordless (OTP) — resolve o papel mais avançado do funil e emite JWT com TODAS
         *     as roles ativas.
         */
        post: operations["clients_api_base_login"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/clients/auth/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Refresh
         * @description Troca o `refresh_token` por um par NOVO (rotação); o front renova silencioso quando o
         *     access expira, sem voltar pro OTP.
         */
        post: operations["clients_api_base_refresh"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/clients/lead/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Dados completos do lead logado
         * @description TODOS os dados do lead do cliente logado, incl. checkout/recibo.
         */
        get: operations["clients_api_clients_routers_lead_lead_me"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/clients/lead/checkout-url": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * URL de checkout do lead
         * @description Só a URL de pagamento/recibo do lead.
         */
        get: operations["clients_api_clients_routers_lead_lead_checkout_url"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/clients/lead/identity": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Confirmação de CPF (Passo 3)
         * @description Passo 3 — confirma o CPF e devolve a identidade (pergaminho).
         */
        post: operations["clients_api_clients_routers_lead_lead_identity"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/clients/lead/email": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Gravação de e-mail (Passo 5)
         * @description Passo 5 — grava o e-mail do lead.
         */
        post: operations["clients_api_clients_routers_lead_lead_email"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/clients/lead/checkout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Escolha/Troca de pagamento (Passo 6)
         * @description Passo 6 — define (ou troca) a forma de pagamento e cria o checkout.
         */
        post: operations["clients_api_clients_routers_lead_lead_set_checkout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/clients/enrollment/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Estado completo da matrícula
         * @description Estado COMPLETO da matrícula para o resume do wizard.
         */
        get: operations["clients_api_clients_routers_enrollment_enrollment_me"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/clients/enrollment/documents/rg/photo/{slot}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Upload de foto/arquivo do RG
         * @description Upload de foto do RG por slot ('front', 'back', 'full').
         */
        post: operations["clients_api_clients_routers_enrollment_enrollment_rg_photo"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/clients/enrollment/documents/classify": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Classificação rápida pré-upload
         * @description Classificação rápida da foto antes do envio.
         */
        post: operations["clients_api_clients_routers_enrollment_enrollment_document_classify"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/clients/enrollment/documents/rg": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Consulta da seção de RG
         * @description Seção documento completa: fotos, validação e campos extraídos.
         */
        get: operations["clients_api_clients_routers_enrollment_enrollment_rg_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Correção manual de campos do RG
         * @description Completa/corrige manualmente campos do documento.
         */
        patch: operations["clients_api_clients_routers_enrollment_enrollment_rg_patch"];
        trace?: never;
    };
    "/api/v1/clients/enrollment/address": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Consulta do endereço
         * @description GET do endereço + missing_fields.
         */
        get: operations["clients_api_clients_routers_enrollment_enrollment_get_address"];
        put?: never;
        /**
         * Definição de CEP
         * @description Define CEP e auto-completa via ViaCEP.
         */
        post: operations["clients_api_clients_routers_enrollment_enrollment_address"];
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Complemento de endereço
         * @description Preenche e corrige os demais campos de endereço.
         */
        patch: operations["clients_api_clients_routers_enrollment_enrollment_address_patch"];
        trace?: never;
    };
    "/api/v1/clients/enrollment/address/proof": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Upload do comprovante de residência
         * @description Upload do comprovante de residência.
         */
        post: operations["clients_api_clients_routers_enrollment_enrollment_address_proof"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/clients/enrollment/address/proof/kinship": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Declaração de parentesco do comprovante
         * @description Declaração de parentesco quando o titular do comprovante é terceiro.
         */
        post: operations["clients_api_clients_routers_enrollment_enrollment_address_proof_kinship"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/clients/enrollment/education": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Consulta de escolaridade
         * @description GET dos dados educacionais da matrícula.
         */
        get: operations["clients_api_clients_routers_enrollment_enrollment_get_education"];
        put?: never;
        /**
         * Gravação de dados educacionais
         * @description Grava os dados de escolaridade e avança o wizard.
         */
        post: operations["clients_api_clients_routers_enrollment_enrollment_education"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/clients/enrollment/selfie": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Consulta da selfie
         * @description Consulta estado e análise da selfie.
         */
        get: operations["clients_api_clients_routers_enrollment_enrollment_get_selfie"];
        put?: never;
        /**
         * Upload de selfie (assinatura)
         * @description Envia a selfie como assinatura da matrícula.
         */
        post: operations["clients_api_clients_routers_enrollment_enrollment_selfie"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/clients/contract/current": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Contrato vigente de matrícula
         * @description Contrato atual de matrícula (texto + versão + hash).
         */
        get: operations["clients_api_clients_routers_enrollment_get_current_contract"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/clients/student/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Dados e progresso do aluno
         * @description Consulta do aluno ativo.
         */
        get: operations["clients_api_clients_routers_student_student_me"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/clients/veteran/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Visão consolidada do veterano
         * @description Visão consolidada do veterano: dados pessoais, matrícula e diploma.
         */
        get: operations["clients_api_clients_routers_student_veteran_me"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/clients/student/blood-type": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Definição de tipo sanguíneo
         * @description Registra o tipo sanguíneo do aluno.
         */
        post: operations["clients_api_clients_routers_student_student_blood_type"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/clients/student/documents/{doc_type}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Upload de documento do aluno
         * @description Upload de documento complementar do aluno.
         */
        post: operations["clients_api_clients_routers_student_student_document"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/clients/student/exam/schedule": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Agendamento de prova
         * @description Agendamento de prova presencial.
         */
        post: operations["clients_api_clients_routers_student_student_exam_schedule"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/clients/student/pendencies": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listagem de pendências
         * @description Lista pendências financeiras e documentais abertas.
         */
        get: operations["clients_api_clients_routers_student_student_pendencies"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/clients/me/blocks": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listagem de bloqueios ativos
         * @description Bloqueios ativos: validações que rejeitaram e o aluno precisa resolver.
         */
        get: operations["clients_api_clients_routers_blocks_my_blocks"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/clients/me/blocks/{block_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Consulta de bloco individual
         * @description Busca 1 bloco por ID para deep-link.
         */
        get: operations["clients_api_clients_routers_blocks_my_block"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/clients/me/blocks/{block_id}/resolve": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Resolução de bloco
         * @description Resolve manualmente um bloco bloqueante.
         */
        post: operations["clients_api_clients_routers_blocks_resolve_block"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/collaborators/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Health
         * @description Liveness público do grupo (sem auth).
         */
        get: operations["collaborators_api_base_health"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/collaborators/whoami": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Whoami
         * @description Eco do principal autenticado + `name` do Profile — o front saúda pelo nome (exige Bearer).
         */
        get: operations["collaborators_api_base_whoami"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/collaborators/auth/register": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Cadastro do candidato
         * @description Cadastro do candidato: cria o user + Candidate ligado a um polo.
         */
        post: operations["collaborators_api_collaborators_routers_auth_register"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/collaborators/auth/check": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Verificação de conta / disparo de OTP
         * @description Check de telefone/CPF: dispara OTP ou emite token em modo de serviço.
         */
        post: operations["collaborators_api_collaborators_routers_auth_check"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/collaborators/auth/join": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Ativação de promotor em conta existente
         * @description Ativa o acesso de promotor para uma conta existente após validar o OTP.
         */
        post: operations["collaborators_api_collaborators_routers_auth_join"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/collaborators/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Login
         * @description Login passwordless (OTP) — resolve o papel mais avançado do funil e emite JWT com TODAS
         *     as roles ativas.
         */
        post: operations["collaborators_api_base_login"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/collaborators/auth/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Refresh
         * @description Troca o `refresh_token` por um par NOVO (rotação); o front renova silencioso quando o
         *     access expira, sem voltar pro OTP.
         */
        post: operations["collaborators_api_base_refresh"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/collaborators/candidate/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Estado completo do candidato
         * @description Estado COMPLETO do candidato para o resume do wizard.
         */
        get: operations["collaborators_api_collaborators_routers_candidate_candidate_me"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/collaborators/candidate/profile": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Dados complementares do perfil
         * @description Dados do perfil que o documento não traz.
         */
        post: operations["collaborators_api_collaborators_routers_candidate_candidate_profile"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/collaborators/candidate/address": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Consulta do endereço
         * @description GET do endereço + missing_fields.
         */
        get: operations["collaborators_api_collaborators_routers_candidate_candidate_get_address"];
        put?: never;
        /**
         * Definição de CEP
         * @description Define CEP e auto-completa via ViaCEP.
         */
        post: operations["collaborators_api_collaborators_routers_candidate_candidate_address"];
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Complemento de endereço
         * @description Preenche e corrige os demais campos de endereço.
         */
        patch: operations["collaborators_api_collaborators_routers_candidate_candidate_address_patch"];
        trace?: never;
    };
    "/api/v1/collaborators/candidate/documents": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Envio de dados do documento
         * @description Gravação dos campos do documento (RG ou CNH).
         */
        post: operations["collaborators_api_collaborators_routers_candidate_candidate_documents"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/collaborators/candidate/document": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Consulta da seção de documentos
         * @description Seção rica do documento: tipo + fotos + validação IA.
         */
        get: operations["collaborators_api_collaborators_routers_candidate_candidate_get_document"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Correção manual de documento
         * @description Completa ou corrige campos que a extração OCR não trouxe.
         */
        patch: operations["collaborators_api_collaborators_routers_candidate_candidate_patch_document"];
        trace?: never;
    };
    "/api/v1/collaborators/candidate/documents/photo/{slot}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Upload de foto de documento
         * @description Foto do documento (RG ou CNH, frente/verso/inteiro).
         */
        post: operations["collaborators_api_collaborators_routers_candidate_candidate_document_photo"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/collaborators/candidate/documents/classify": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Classificação rápida pré-upload
         * @description Classificação rápida da foto antes do envio.
         */
        post: operations["collaborators_api_collaborators_routers_candidate_candidate_document_classify"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/collaborators/candidate/documents/address-proof": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Upload do comprovante de residência
         * @description Upload do comprovante de residência.
         */
        post: operations["collaborators_api_collaborators_routers_candidate_candidate_address_proof"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/collaborators/candidate/documents/address-proof/kinship": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Parentesco do comprovante de residência
         * @description Parentesco quando o comprovante está em nome de terceiro.
         */
        post: operations["collaborators_api_collaborators_routers_candidate_candidate_address_proof_kinship"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/collaborators/candidate/pix": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Cadastro de chave Pix
         * @description Valida e cadastra chave Pix do titular.
         */
        post: operations["collaborators_api_collaborators_routers_candidate_candidate_pix"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/collaborators/candidate/education": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Escolaridade do candidato
         * @description Gravação da escolaridade antes da selfie.
         */
        post: operations["collaborators_api_collaborators_routers_candidate_candidate_education"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/collaborators/candidate/selfie": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Consulta da selfie
         * @description Consulta estado e análise da selfie.
         */
        get: operations["collaborators_api_collaborators_routers_candidate_get_candidate_selfie"];
        put?: never;
        /**
         * Upload da selfie (assinatura)
         * @description Envia a selfie de assinatura e dispara validação biométrica assíncrona.
         */
        post: operations["collaborators_api_collaborators_routers_candidate_candidate_selfie"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/collaborators/contract/current": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Contrato vigente de adesão
         * @description Contrato atual de adesão de promotor.
         */
        get: operations["collaborators_api_collaborators_routers_candidate_get_current_contract"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/collaborators/training/materials": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Matérias atribuídas de treino
         * @description Matérias atribuídas ao promotor no treino.
         */
        get: operations["collaborators_api_collaborators_routers_training_training_materials"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/collaborators/training/progress": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Progresso do treino
         * @description Resumo de progresso e notas por matéria.
         */
        get: operations["collaborators_api_collaborators_routers_training_training_progress"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/collaborators/training/submissions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Submissão de resposta em texto
         * @description Submissão de resposta em texto corrigida por IA.
         */
        post: operations["collaborators_api_collaborators_routers_training_training_submit"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/collaborators/training/submissions/audio": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Submissão de resposta em áudio
         * @description Submissão de resposta em áudio transcrita e corrigida por IA.
         */
        post: operations["collaborators_api_collaborators_routers_training_training_submit_audio"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/collaborators/promoter/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Painel do promotor
         * @description Dados do painel, link ref e travas do promotor.
         */
        get: operations["collaborators_api_collaborators_routers_promoter_promoter_me"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/collaborators/promoter/me/leads": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Leads do promotor
         * @description Lista de leads captados pelo promotor.
         */
        get: operations["collaborators_api_collaborators_routers_promoter_promoter_leads"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/collaborators/promoter/me/leads/invite": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Encaminhar convite para lead
         * @description Valida telefone/CPF disponíveis e encaminha o link do promotor.
         */
        post: operations["collaborators_api_collaborators_routers_promoter_promoter_lead_invite"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/collaborators/promoter/me/commissions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Comissões do promotor
         * @description Lista de comissões ganhas pelo promotor.
         */
        get: operations["collaborators_api_collaborators_routers_promoter_promoter_commissions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/collaborators/promoter/me/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Resumo de metas e ganhos
         * @description Resumo da semana e métricas vitalícias.
         */
        get: operations["collaborators_api_collaborators_routers_promoter_promoter_summary"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/collaborators/promoter/study/pricing": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Preço de auto-matrícula de promotor
         * @description Preço da auto-matrícula do promotor.
         */
        get: operations["collaborators_api_collaborators_routers_promoter_promoter_study_pricing"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/collaborators/promoter/study/start": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Iniciar auto-matrícula de promotor
         * @description Promotor estuda: cria matrícula especial com checkout.
         */
        post: operations["collaborators_api_collaborators_routers_promoter_promoter_study_start"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Health
         * @description Liveness público do grupo (sem auth).
         */
        get: operations["leadership_api_base_health"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/whoami": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Whoami
         * @description Eco do principal autenticado + `name` do Profile — o front saúda pelo nome (exige Bearer).
         */
        get: operations["leadership_api_base_whoami"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/auth/check": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Verificação de coordenador
         * @description Verifica usuário e valida se coordena um polo.
         */
        post: operations["leadership_api_leadership_routers_auth_check"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Login do coordenador
         * @description Login passwordless (OTP) do coordenador.
         */
        post: operations["leadership_api_leadership_routers_auth_login"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/auth/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Refresh
         * @description Troca o `refresh_token` por um par NOVO (rotação); o front renova silencioso quando o
         *     access expira, sem voltar pro OTP.
         */
        post: operations["leadership_api_base_refresh"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/leads": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listagem de leads do polo
         * @description Lista os leads do polo do coordenador.
         */
        get: operations["leadership_api_leadership_routers_leads_list_hub_leads"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/leads/{external_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Detalhe de lead do polo
         * @description Detalhe completo de um lead do polo.
         */
        get: operations["leadership_api_leadership_routers_leads_get_hub_lead"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/enrollments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listagem de matrículas do polo
         * @description Matrículas do polo: status real + situação de taxas.
         */
        get: operations["leadership_api_leadership_routers_enrollments_list_hub_enrollments"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/enrollments/{external_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Detalhe de matrícula do polo
         * @description Detalhe completo de uma matrícula do polo.
         */
        get: operations["leadership_api_leadership_routers_enrollments_get_hub_enrollment"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/enrollments/{external_id}/fee/pay": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 1ª parcela da taxa (à vista)
         * @description 1ª parcela da taxa (À VISTA): valida QR e dispara PIX.
         */
        post: operations["leadership_api_leadership_routers_enrollments_pay_enrollment_fee"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/enrollments/{external_id}/fee/schedule": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 2ª parcela da taxa (agendada)
         * @description 2ª parcela da taxa (AGENDADA): programa pagamento no vencimento.
         */
        post: operations["leadership_api_leadership_routers_enrollments_schedule_enrollment_fee"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/enrollments/{external_id}/conclude": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Conclusão da matrícula
         * @description Conclui a matrícula e cadastra credenciais da instituição.
         */
        post: operations["leadership_api_leadership_routers_enrollments_conclude_enrollment"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/enrollments/{external_id}/address": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Gravar endereço pelo coordenador
         * @description Coordenador grava o endereço no lugar do aluno.
         */
        post: operations["leadership_api_leadership_routers_enrollments_coord_proxy_address"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/enrollments/{external_id}/documents/rg/photo/{slot}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Upload de RG pelo coordenador
         * @description Coordenador envia foto do RG no lugar do aluno.
         */
        post: operations["leadership_api_leadership_routers_enrollments_coord_proxy_rg_photo"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/enrollments/{external_id}/selfie": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Upload de selfie pelo coordenador
         * @description Coordenador envia selfie de assinatura no lugar do aluno.
         */
        post: operations["leadership_api_leadership_routers_enrollments_coord_proxy_selfie"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/enrollments/{external_id}/profile": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Correção manual de identidade pelo coordenador
         * @description Coordenador corrige dados do perfil/documento do aluno.
         */
        patch: operations["leadership_api_leadership_routers_enrollments_coord_correct_identity"];
        trace?: never;
    };
    "/api/v1/leadership/reviews": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Central unificada de revisões do polo
         * @description TUDO que espera análise/decisão do coordenador no polo.
         */
        get: operations["leadership_api_leadership_routers_reviews_list_reviews"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/enrollments/{external_id}/rg/decide": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Decisão de RG em revisão
         * @description Coordenador decide o RG de uma matrícula em revisão.
         */
        post: operations["leadership_api_leadership_routers_reviews_decide_enrollment_rg"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/enrollments/{external_id}/address-proof/decide": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Decisão de comprovante de residência
         * @description Coordenador decide a justificativa de parentesco do comprovante.
         */
        post: operations["leadership_api_leadership_routers_reviews_decide_enrollment_address_proof"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/enrollments/{external_id}/selfie/decide": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Decisão de selfie de matrícula
         * @description Coordenador decide a selfie de matrícula em revisão.
         */
        post: operations["leadership_api_leadership_routers_reviews_decide_enrollment_selfie"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/candidates/{external_id}/selfie/decide": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Decisão de selfie de candidato
         * @description Coordenador decide a selfie de candidato em revisão.
         */
        post: operations["leadership_api_leadership_routers_reviews_decide_candidate_selfie"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/candidates/{external_id}/selfie": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Detalhe da selfie do candidato
         * @description Detalhe da selfie em revisão para decisão humana.
         */
        get: operations["leadership_api_leadership_routers_reviews_get_candidate_selfie_for_coordinator"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/candidates/{external_id}/document/decide": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Decisão de documento de candidato
         * @description Coordenador decide o documento em revisão do candidato.
         */
        post: operations["leadership_api_leadership_routers_reviews_decide_candidate_document"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/candidates/{external_id}/document/reset": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Destravar tipo de documento
         * @description Zera o doc_type para destravar candidato que fixou tipo errado.
         */
        post: operations["leadership_api_leadership_routers_reviews_reset_candidate_doc_type"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/students": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listagem paginada de alunos do polo
         * @description Alunos do polo com paginação e filtro por status.
         */
        get: operations["leadership_api_leadership_routers_students_list_hub_students"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/students/{external_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Detalhe completo do aluno
         * @description Detalhe rico do aluno para o coordenador.
         */
        get: operations["leadership_api_leadership_routers_students_get_student_for_coordinator"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/students/{external_id}/exam/grade": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Correção de prova do aluno
         * @description Lança nota da prova do aluno.
         */
        post: operations["leadership_api_leadership_routers_students_grade_exam"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/students/{external_id}/documents/{document_external_id}/decide": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Decisão de documento do aluno
         * @description Decide validação de documento em revisão do aluno.
         */
        post: operations["leadership_api_leadership_routers_students_decide_document"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/students/{external_id}/pendencies": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Abrir pendência para aluno
         * @description Lança pendência para o aluno.
         */
        post: operations["leadership_api_leadership_routers_students_open_pendency"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/pendencies/{external_id}/resolve": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Resolver pendência do aluno
         * @description Marca pendência como resolvida.
         */
        post: operations["leadership_api_leadership_routers_students_resolve_pendency"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/students/{external_id}/documentation/clear": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Liberar emissão de diploma
         * @description Confirma documentação e libera emissão do diploma.
         */
        post: operations["leadership_api_leadership_routers_students_clear_documentation"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/students/{external_id}/diploma/issue": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Emissão de diploma
         * @description Emite o diploma e histórico do aluno.
         */
        post: operations["leadership_api_leadership_routers_students_issue_diploma"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/students/{external_id}/diploma/pickup": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Registro de retirada do diploma
         * @description Registra entrega do diploma com foto e promove aluno a veterano.
         */
        post: operations["leadership_api_leadership_routers_students_register_diploma_pickup"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/students/{external_id}/manual-selfie": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Foto presencial para selfie com pendência
         * @description Foto tirada pelo coordenador para destravar aluno presencialmente.
         */
        post: operations["leadership_api_leadership_routers_students_register_manual_selfie"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/candidates": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Candidatos aguardando aprovação
         * @description Fila de candidatos que concluíram coleta e aguardam aprovação.
         */
        get: operations["leadership_api_leadership_routers_candidates_list_candidates_awaiting"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/candidates/{external_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Detalhe de candidato para decisão
         * @description Detalhe do candidato para aprovação ou rejeição.
         */
        get: operations["leadership_api_leadership_routers_candidates_get_candidate_for_coordinator"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/candidates/{external_id}/approve": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Aprovar candidato (vira promotor)
         * @description Aprova candidato e promove a promotor.
         */
        post: operations["leadership_api_leadership_routers_candidates_approve_candidate"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/candidates/{external_id}/reject": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Rejeitar candidato
         * @description Rejeita candidato com motivo.
         */
        post: operations["leadership_api_leadership_routers_candidates_reject_candidate"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/promoters": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listagem de promotores do polo
         * @description Lista promotores do polo e status de trava de treino.
         */
        get: operations["leadership_api_leadership_routers_promoters_list_hub_promoters"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/promoters/{external_id}/suspend": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Suspender promotor
         * @description Suspende promotor do polo.
         */
        post: operations["leadership_api_leadership_routers_promoters_suspend_promoter"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/promoters/{external_id}/reactivate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Reativar promotor
         * @description Reativa promotor suspenso.
         */
        post: operations["leadership_api_leadership_routers_promoters_reactivate_promoter"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leadership/promoters/{external_id}/materials/{material_external_id}/approve": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Aprovar matéria de promotor travado no treino
         * @description Coordenador aprova matéria em aberto para destravar promotor.
         */
        post: operations["leadership_api_leadership_routers_promoters_approve_open_material"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/tools/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Health
         * @description Liveness público do grupo (sem auth).
         */
        get: operations["tools_api_base_health"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/tools/whoami": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Whoami
         * @description Eco do principal autenticado + `name` do Profile — o front saúda pelo nome (exige Bearer).
         */
        get: operations["tools_api_base_whoami"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/tools/leads": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Radar de leads para integrações
         * @description Radar de leads: todos os leads (mais novos primeiro), com nome/telefone/link de pagamento.
         *
         *     Filtros: `status` (pending/paid/failed), `created_after` (ISO-8601), `limit` (1..500, default 100).
         */
        get: operations["tools_api_tools_router_tools_leads"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/tools/notifications/send": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Disparo ad-hoc de notificações
         * @description Gatilho de disparo: envia WhatsApp e/ou e-mail a um USUÁRIO (`user_external_id`, herda
         *     phone/email do Profile) OU a um destino LIVRE (`phone`/`email`). `channels` opcional (default:
         *     todos com destino). Devolve o `external_id` da notificação enfileirada (audit no notify).
         */
        post: operations["tools_api_tools_router_tools_notifications_send"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
};
export type webhooks = Record<string, never>;
export type components = {
    schemas: {
        /**
         * HealthOut
         * @description Resposta padrão do liveness de cada grupo da API.
         */
        HealthOut: {
            /** Group */
            group: string;
            /** Version */
            version: string;
            /** Status */
            status: string;
        };
        /** WhoamiOut */
        WhoamiOut: {
            /**
             * External Id
             * @description external_id do USER autenticado (≠ enrollment, ≠ lead — proposta #8)
             */
            external_id: string;
            /** Roles */
            roles: string[];
            /** Name */
            name?: string | null;
        };
        /** StaffCheckOut */
        StaffCheckOut: {
            /** Found */
            found: boolean;
            /** External Id */
            external_id?: string | null;
            /** Otp Sent */
            otp_sent: boolean;
            /** Otp Wait */
            otp_wait?: number | null;
        };
        /** StaffCheckIn */
        StaffCheckIn: {
            /** Cpf */
            cpf?: string | null;
            /** Phone */
            phone?: string | null;
            /** External Id */
            external_id?: string | null;
        };
        /**
         * TokenOut
         * @description Par de tokens devolvido por `login`/`refresh` — compartilhado pelos grupos (dedup #4).
         */
        TokenOut: {
            /** Access Token */
            access_token: string;
            /** Refresh Token */
            refresh_token: string;
            /** Token Type */
            token_type: string;
        };
        /** StaffLoginIn */
        StaffLoginIn: {
            /** External Id */
            external_id: string;
            /** Otp */
            otp: string;
        };
        /** StaffLoginPasswordIn */
        StaffLoginPasswordIn: {
            /** Identifier */
            identifier: string;
            /** Password */
            password: string;
        };
        /**
         * RefreshIn
         * @description Body do `POST /auth/refresh` — compartilhado pelos grupos (dedup #4).
         */
        RefreshIn: {
            /** Refresh Token */
            refresh_token: string;
        };
        /** HubAddressOut */
        HubAddressOut: {
            /** Cep */
            cep?: string | null;
            /** Zipcode */
            zipcode?: string | null;
            /** Street */
            street?: string | null;
            /** Number */
            number?: string | null;
            /** Complement */
            complement?: string | null;
            /** Neighborhood */
            neighborhood?: string | null;
            /** City */
            city?: string | null;
            /** State */
            state?: string | null;
        };
        /** HubOut */
        HubOut: {
            /** External Id */
            external_id: string;
            /** Brand */
            brand: string;
        };
        /** HubCreateIn */
        HubCreateIn: {
            /** Brand */
            brand: string;
            /** Coordinator External Id */
            coordinator_external_id: string;
            /** Address Id */
            address_id?: number | null;
            /** Cep */
            cep?: string | null;
            /** Street */
            street?: string | null;
            /** Number */
            number?: string | null;
            /** Complement */
            complement?: string | null;
            /** Neighborhood */
            neighborhood?: string | null;
            /** City */
            city?: string | null;
            /** State */
            state?: string | null;
            /**
             * Is Default
             * @default false
             */
            is_default: boolean;
        };
        /** PromoterOut */
        PromoterOut: {
            /** External Id */
            external_id: string;
            /** Name */
            name: string | null;
            /** Phone */
            phone?: string | null;
            /** Cpf */
            cpf?: string | null;
        };
        /** SetCoordinatorIn */
        SetCoordinatorIn: {
            /** Coordinator External Id */
            coordinator_external_id: string;
        };
        /** HubAddressIn */
        HubAddressIn: {
            /** Cep */
            cep: string;
            /** Number */
            number?: string | null;
            /** Complement */
            complement?: string | null;
            /** Street */
            street?: string | null;
            /** Neighborhood */
            neighborhood?: string | null;
            /** City */
            city?: string | null;
            /** State */
            state?: string | null;
        };
        /** HubAddressPatchIn */
        HubAddressPatchIn: {
            /** Cep */
            cep?: string | null;
            /** Number */
            number?: string | null;
            /** Complement */
            complement?: string | null;
            /** Street */
            street?: string | null;
            /** Neighborhood */
            neighborhood?: string | null;
            /** City */
            city?: string | null;
            /** State */
            state?: string | null;
        };
        /** StaffMaterialOut */
        StaffMaterialOut: {
            /** External Id */
            external_id: string;
            /** Title */
            title: string;
            /** Text Content */
            text_content: string;
            /** Content Blocks */
            content_blocks?: {
                [key: string]: unknown;
            }[];
            /** Question */
            question: string;
            /** Video */
            video?: string | null;
            /** Photo */
            photo?: string | null;
            /** Kind */
            kind: string;
            /** Blocking */
            blocking: boolean;
            /** Ephemeral */
            ephemeral: boolean;
            /** Order */
            order: number;
            /** Active */
            active: boolean;
            /** Expected Answer */
            expected_answer?: string | null;
        };
        /**
         * MaterialIn
         * @description Criação de uma matéria do treino: conteúdo (texto/blocos) + questão + gabarito.
         *
         *     `kind` fixa (todo promotor novo recebe) ou transitória (staff publica p/ os existentes);
         *     `blocking` = obrigatória (trava o painel); `ephemeral` = descartável; `content_blocks` =
         *     conteúdo rico (texto/imagem/vídeo/arquivo) que o front renderiza em ordem.
         */
        MaterialIn: {
            /** Title */
            title: string;
            /** Question */
            question: string;
            /** Expected Answer */
            expected_answer: string;
            /**
             * Text Content
             * @default
             */
            text_content: string;
            /** Content Blocks */
            content_blocks?: {
                [key: string]: unknown;
            }[];
            /**
             * Order
             * @default 0
             */
            order: number;
            /**
             * Kind
             * @default fixed
             */
            kind: string;
            /**
             * Blocking
             * @default true
             */
            blocking: boolean;
            /**
             * Ephemeral
             * @default false
             */
            ephemeral: boolean;
            /** Video */
            video?: string | null;
            /** Photo */
            photo?: string | null;
        };
        /**
         * MaterialUpdateIn
         * @description Edição de uma matéria — só os campos enviados; `active=False` desativa.
         */
        MaterialUpdateIn: {
            /** Title */
            title?: string | null;
            /** Text Content */
            text_content?: string | null;
            /** Content Blocks */
            content_blocks?: {
                [key: string]: unknown;
            }[] | null;
            /** Question */
            question?: string | null;
            /** Expected Answer */
            expected_answer?: string | null;
            /** Order */
            order?: number | null;
            /** Active */
            active?: boolean | null;
            /** Kind */
            kind?: string | null;
            /** Blocking */
            blocking?: boolean | null;
            /** Ephemeral */
            ephemeral?: boolean | null;
            /** Video */
            video?: string | null;
            /** Photo */
            photo?: string | null;
        };
        /** DeleteMaterialOut */
        DeleteMaterialOut: {
            /** Deleted */
            deleted: string;
        };
        /** PublishMaterialOut */
        PublishMaterialOut: {
            /** External Id */
            external_id: string;
            /** Assigned */
            assigned: number;
        };
        /** FinanceBalanceOut */
        FinanceBalanceOut: {
            /** Balance */
            balance?: number | null;
            /** Error */
            error?: string | null;
            /** Note */
            note?: string | null;
        };
        /** FinanceSummaryOut */
        FinanceSummaryOut: {
            /** Commissions */
            commissions?: {
                [key: string]: components["schemas"]["FinanceSummaryStatusItemOut"];
            };
            /** Payment Requests */
            payment_requests?: {
                [key: string]: components["schemas"]["FinanceSummaryStatusItemOut"];
            };
        };
        /** FinanceSummaryStatusItemOut */
        FinanceSummaryStatusItemOut: {
            /**
             * Count
             * @default 0
             */
            count: number;
            /**
             * Total
             * @default 0
             */
            total: string;
        };
        /** FinanceCommissionFilterSchema */
        FinanceCommissionFilterSchema: {
            /** Status */
            status?: string | null;
        };
        /** StaffCommissionOut */
        StaffCommissionOut: {
            /** External Id */
            external_id: string;
            /** Payee External Id */
            payee_external_id?: string | null;
            /** Payee Role */
            payee_role: string;
            /** Source Type */
            source_type: string;
            /** Amount */
            amount: string;
            /** Status */
            status: string;
            /** External Reference */
            external_reference?: string | null;
            /** Created At */
            created_at: string;
        };
        /** FinancePayoutFilterSchema */
        FinancePayoutFilterSchema: {
            /** Status */
            status?: string | null;
            /** Kind */
            kind?: string | null;
        };
        /** StaffPaymentRequestOut */
        StaffPaymentRequestOut: {
            /** External Id */
            external_id: string;
            /** Kind */
            kind: string;
            /** Method */
            method: string;
            /** Amount */
            amount: string;
            /** Status */
            status: string;
            /** Supplier Name */
            supplier_name?: string | null;
            /** Payee Name */
            payee_name?: string | null;
            /** Payee Phone */
            payee_phone?: string | null;
            /** Payee External Id */
            payee_external_id?: string | null;
            /** Pix Key */
            pix_key?: string | null;
            /** Last Error */
            last_error?: string | null;
            /**
             * Attempts
             * @default 0
             */
            attempts: number;
            /** Next Attempt At */
            next_attempt_at?: string | null;
            /** Week Of */
            week_of?: string | null;
            /** Scheduled For */
            scheduled_for?: string | null;
            /** Asaas Status */
            asaas_status?: string | null;
            /** External Reference */
            external_reference?: string | null;
            /** Boleto Line */
            boleto_line?: string | null;
            /** Receipt */
            receipt?: string | null;
            /** Created At */
            created_at: string;
        };
        /** ManualPaymentOut */
        ManualPaymentOut: {
            /** External Id */
            external_id: string;
            /** Kind */
            kind: string;
            /** Method */
            method: string;
            /** Amount */
            amount: string;
            /** Status */
            status: string;
            /** External Reference */
            external_reference?: string | null;
            /** Receipt */
            receipt?: string | null;
        };
        /** WeeklyClosingResultOut */
        WeeklyClosingResultOut: {
            /** Week Of */
            week_of: string;
            /** Friday */
            friday: string;
            /** Commissions In Window */
            commissions_in_window: number;
            /** Bonuses Created */
            bonuses_created: number;
            /** Payment Requests Created */
            payment_requests_created: number;
            /** Awaiting Pix */
            awaiting_pix: number;
        };
        /** ClosingHealthOut */
        ClosingHealthOut: {
            /** Week Of */
            week_of: string;
            /** Pending Commissions */
            pending_commissions: string;
            /** Queued Payouts */
            queued_payouts: string;
            /** Obrigacao Estimada */
            obrigacao_estimada: string;
            /** Saldo */
            saldo?: string | null;
            /** Suficiente */
            suficiente?: boolean | null;
            /** Deficit */
            deficit?: string | null;
            /** Balance Error */
            balance_error?: unknown | null;
        };
        /** ClosingSimulationBeneficiaryOut */
        ClosingSimulationBeneficiaryOut: {
            /** User External Id */
            user_external_id: string;
            /** Name */
            name: string;
            /** Phone */
            phone?: string | null;
            /** Cpf */
            cpf?: string | null;
            /** Role */
            role: string;
            /** Amount */
            amount: string;
            /** Leads Count */
            leads_count: number;
            /** Bonus Earned */
            bonus_earned: boolean;
            /** Pix Key */
            pix_key?: string | null;
            /** Has Pix */
            has_pix: boolean;
        };
        /** ClosingSimulationOut */
        ClosingSimulationOut: {
            /** Week Of */
            week_of: string;
            /** Friday */
            friday: string;
            /** Total Obligation */
            total_obligation: string;
            /** Commissions Count */
            commissions_count: number;
            /** Bonuses Count */
            bonuses_count: number;
            /** Beneficiaries Count */
            beneficiaries_count: number;
            /** Awaiting Pix Count */
            awaiting_pix_count: number;
            /** Bonus Threshold */
            bonus_threshold: number;
            /** Bonus Amount */
            bonus_amount: string;
            /** Beneficiaries */
            beneficiaries?: components["schemas"]["ClosingSimulationBeneficiaryOut"][];
        };
        /** PayoutRetryOut */
        PayoutRetryOut: {
            /** External Id */
            external_id: string;
            /** Status */
            status: string;
            /** Attempts */
            attempts: number;
            /** Last Error */
            last_error?: string | null;
            /** Next Attempt At */
            next_attempt_at?: string | null;
        };
        /** PayoutOverridePixOut */
        PayoutOverridePixOut: {
            /** External Id */
            external_id: string;
            /** Status */
            status: string;
            /** Pix Key */
            pix_key?: string | null;
            /** Attempts */
            attempts: number;
            /** Last Error */
            last_error?: string | null;
            /** Next Attempt At */
            next_attempt_at?: string | null;
        };
        /** FinanceLedgerFilterSchema */
        FinanceLedgerFilterSchema: {
            /** Account Code */
            account_code?: string | null;
            /** Entry Type */
            entry_type?: string | null;
        };
        /** LedgerEntryOut */
        LedgerEntryOut: {
            /** External Id */
            external_id: string;
            /** Transaction External Id */
            transaction_external_id: string;
            /** Account Code */
            account_code: string;
            /** Account Name */
            account_name: string;
            /** Entry Type */
            entry_type: string;
            /** Amount */
            amount: string;
            /** Balance After */
            balance_after?: string | null;
            /** Created At */
            created_at: string;
        };
        /** FinanceTransactionFilterSchema */
        FinanceTransactionFilterSchema: {
            /** Kind */
            kind?: string | null;
        };
        /** FinancialTransactionOut */
        FinancialTransactionOut: {
            /** External Id */
            external_id: string;
            /** Kind */
            kind: string;
            /** Amount */
            amount: string;
            /** Status */
            status: string;
            /** Description */
            description?: string | null;
            /** Source Type */
            source_type: string;
            /** Source External Id */
            source_external_id?: string | null;
            /** Idempotency Key */
            idempotency_key: string;
            /** Created At */
            created_at: string;
            /** Settled At */
            settled_at?: string | null;
        };
        /** CashflowOverviewOut */
        CashflowOverviewOut: {
            /** Pending Payouts Queue */
            pending_payouts_queue: string;
            /** Unclosed Commissions Liability */
            unclosed_commissions_liability: string;
            /** Month Unexpected Expenses */
            month_unexpected_expenses: string;
            /** Open Disputes At Risk */
            open_disputes_at_risk: string;
            /** Month Accumulated Revenue */
            month_accumulated_revenue: string;
            /** Total Obligations Due */
            total_obligations_due: string;
            /** Timestamp */
            timestamp: string;
        };
        /** ManualAdjustmentIn */
        ManualAdjustmentIn: {
            /** Account Code */
            account_code: string;
            /** Entry Type */
            entry_type: string;
            /** Amount */
            amount: string;
            /** Justification */
            justification: string;
            /** Counterpart Account Code */
            counterpart_account_code?: string | null;
            /** Description */
            description?: string | null;
        };
        /** UnexpectedExpenseOut */
        UnexpectedExpenseOut: {
            /** External Id */
            external_id: string;
            /** Transaction External Id */
            transaction_external_id?: string | null;
            /** Payment Request External Id */
            payment_request_external_id?: string | null;
            /** Category */
            category: string;
            /** Amount */
            amount: string;
            /** Description */
            description: string;
            /** Justification */
            justification: string;
            /** Supplier Name */
            supplier_name?: string | null;
            /** Receipt */
            receipt?: string | null;
            /** Created At */
            created_at: string;
        };
        /** DisputeRecordOut */
        DisputeRecordOut: {
            /** External Id */
            external_id: string;
            /** External Dispute Id */
            external_dispute_id: string;
            /** Amount */
            amount: string;
            /** Status */
            status: string;
            /** Reason */
            reason: string;
            /** Resolution */
            resolution?: string | null;
            /** Justification */
            justification?: string | null;
            /** Resolved At */
            resolved_at?: string | null;
            /** Created At */
            created_at: string;
        };
        /** DisputeResolveIn */
        DisputeResolveIn: {
            /** Resolution */
            resolution: string;
            /** Justification */
            justification: string;
            /** Correlated Commission Id */
            correlated_commission_id?: string | null;
        };
        /** FinanceAuditFilterSchema */
        FinanceAuditFilterSchema: {
            /** Action */
            action?: string | null;
            /** Target Model */
            target_model?: string | null;
        };
        /** FinancialAuditLogOut */
        FinancialAuditLogOut: {
            /** External Id */
            external_id: string;
            /** Actor External Id */
            actor_external_id?: string | null;
            /** Action */
            action: string;
            /** Target Model */
            target_model: string;
            /** Target External Id */
            target_external_id?: string | null;
            /** Justification */
            justification: string;
            /** Snapshot Before */
            snapshot_before?: {
                [key: string]: unknown;
            } | null;
            /** Snapshot After */
            snapshot_after?: {
                [key: string]: unknown;
            } | null;
            /** Created At */
            created_at: string;
        };
        /** StaffLeadFilterSchema */
        StaffLeadFilterSchema: {
            /** Hub */
            hub?: string | null;
            /** Status */
            status?: string | null;
        };
        /** StaffLeadOut */
        StaffLeadOut: {
            /** External Id */
            external_id: string;
            /** Name */
            name?: string | null;
            /** Phone */
            phone?: string | null;
            /** Cpf */
            cpf?: string | null;
            /** Email */
            email?: string | null;
            /** Status */
            status: string;
            /** Hub */
            hub?: string | null;
            /** Promoter */
            promoter?: string | null;
            /** Created At */
            created_at?: string | null;
            /** Step */
            step?: number | null;
            /** Payment Method */
            payment_method?: string | null;
        };
        /** StaffLeadMarkPaidOut */
        StaffLeadMarkPaidOut: {
            /** Detail */
            detail: string;
        };
        /** StaffPurgeFunnelUserOut */
        StaffPurgeFunnelUserOut: {
            /** User External Id */
            user_external_id: string;
            /** Deleted */
            deleted?: {
                [key: string]: number;
            };
        };
        /** StaffEnrollmentFilterSchema */
        StaffEnrollmentFilterSchema: {
            /** Hub */
            hub?: string | null;
            /** Status */
            status?: string | null;
        };
        /** StaffEnrollmentOut */
        StaffEnrollmentOut: {
            /** External Id */
            external_id: string;
            /** Status */
            status: string;
            /** Self Study */
            self_study: boolean;
            /** Hub External Id */
            hub_external_id: string;
            /** Name */
            name?: string | null;
        };
        /** StaffStudentFilterSchema */
        StaffStudentFilterSchema: {
            /** Hub */
            hub?: string | null;
            /** Status */
            status?: string | null;
        };
        /** StaffStudentOut */
        StaffStudentOut: {
            /** External Id */
            external_id: string;
            /** Status */
            status: string;
            /** Self Study */
            self_study: boolean;
            /** Hub External Id */
            hub_external_id: string;
            /** Name */
            name?: string | null;
        };
        /** StaffStudentPlatformCredentialsOut */
        StaffStudentPlatformCredentialsOut: {
            /** External Id */
            external_id: string;
            /** Status */
            status: string;
        };
        /** PlatformCredentialsIn */
        PlatformCredentialsIn: {
            /** Platform Login */
            platform_login: string;
            /** Platform Password */
            platform_password: string;
            /** Platform Url */
            platform_url?: string | null;
            /** Platform Notes */
            platform_notes?: string | null;
        };
        /** StaffUserFilterSchema */
        StaffUserFilterSchema: {
            /** Role */
            role?: string | null;
        };
        /** StaffUserOut */
        StaffUserOut: {
            /** External Id */
            external_id: string;
            /** Name */
            name?: string | null;
            /** Cpf */
            cpf?: string | null;
            /** Phone */
            phone?: string | null;
            /** Is Superuser */
            is_superuser: boolean;
            /** Roles */
            roles?: string[];
        };
        /** StaffUserPhoneOut */
        StaffUserPhoneOut: {
            /** External Id */
            external_id: string;
            /** Phone */
            phone: string;
        };
        /** PhoneIn */
        PhoneIn: {
            /** Phone */
            phone: string;
        };
        /** CoordinatorHubOut */
        CoordinatorHubOut: {
            /** External Id */
            external_id: string;
            /** Brand */
            brand: string;
            /** Is Default */
            is_default: boolean;
            /** Zipcode */
            zipcode?: string | null;
            /** City */
            city?: string | null;
            /** State */
            state?: string | null;
            /** Street */
            street?: string | null;
            /**
             * Promoters Count
             * @default 0
             */
            promoters_count: number;
            /**
             * Students Count
             * @default 0
             */
            students_count: number;
        };
        /** CoordinatorOut */
        CoordinatorOut: {
            /** External Id */
            external_id: string;
            /** Name */
            name?: string | null;
            /** Cpf */
            cpf?: string | null;
            /** Phone */
            phone?: string | null;
            /** Hubs */
            hubs?: components["schemas"]["CoordinatorHubOut"][];
            /**
             * Hubs Count
             * @default 0
             */
            hubs_count: number;
            /**
             * Promoters Count
             * @default 0
             */
            promoters_count: number;
            /**
             * Students Count
             * @default 0
             */
            students_count: number;
            /**
             * Total Commission
             * @default 0.00
             */
            total_commission: string;
            /**
             * Pending Commission
             * @default 0.00
             */
            pending_commission: string;
        };
        /** BootstrapStatusOut */
        BootstrapStatusOut: {
            /** Bootstrapped */
            bootstrapped: boolean;
            /** Setup Required */
            setup_required: boolean;
        };
        /** BootstrapInitOut */
        BootstrapInitOut: {
            /** Success */
            success: boolean;
            /** Access Token */
            access_token: string;
            /** Refresh Token */
            refresh_token: string;
            /**
             * Token Type
             * @default bearer
             */
            token_type: string;
            /** User External Id */
            user_external_id: string;
        };
        /** BootstrapInitIn */
        BootstrapInitIn: {
            boss: components["schemas"]["BossIn"];
            pricing?: components["schemas"]["PricingIn"] | null;
            commissions?: components["schemas"]["CommissionsIn"] | null;
            /** Integrations */
            integrations?: {
                [key: string]: string;
            } | null;
        };
        /** BossIn */
        BossIn: {
            /** Name */
            name?: string | null;
            /** Cpf */
            cpf?: string | null;
            /** Phone */
            phone?: string | null;
            /** Email */
            email?: string | null;
            /** Pix Key */
            pix_key?: string | null;
            /** Default Brand */
            default_brand?: string | null;
            /** Password */
            password?: string | null;
        };
        /** CommissionsIn */
        CommissionsIn: {
            /** Commission Direct */
            commission_direct?: string | null;
            /** Commission Bonus Flat */
            commission_bonus_flat?: string | null;
            /** Commission Bonus Threshold */
            commission_bonus_threshold?: number | null;
            /** Commission Coordinator */
            commission_coordinator?: string | null;
            /** Commission Closing Weekday */
            commission_closing_weekday?: number | null;
            /** Commission Closing Hour */
            commission_closing_hour?: number | null;
        };
        /** PricingIn */
        PricingIn: {
            /** Price Pix */
            price_pix?: string | null;
            /** Price Card Cents */
            price_card_cents?: number | null;
            /** Promo Price Pix */
            promo_price_pix?: string | null;
            /** Promo Price Card Cents */
            promo_price_card_cents?: number | null;
            /** Promoter Study Unlock Threshold */
            promoter_study_unlock_threshold?: number | null;
            /** Promoter Study Complete Threshold */
            promoter_study_complete_threshold?: number | null;
            /** Promoter Price Pix */
            promoter_price_pix?: string | null;
            /** Promoter Price Card Cents */
            promoter_price_card_cents?: number | null;
            /** Card Installments */
            card_installments?: number | null;
            /** Description */
            description?: string | null;
        };
        /** PlatformSetupBossOut */
        PlatformSetupBossOut: {
            /** Name */
            name?: string | null;
            /** Cpf */
            cpf?: string | null;
            /** Phone */
            phone?: string | null;
            /** Email */
            email?: string | null;
            /** Pix Key */
            pix_key?: string | null;
            /** Default Brand */
            default_brand?: string | null;
        };
        /** PlatformSetupCommissionsOut */
        PlatformSetupCommissionsOut: {
            /** Commission Direct */
            commission_direct?: string | null;
            /** Commission Bonus Flat */
            commission_bonus_flat?: string | null;
            /** Commission Bonus Threshold */
            commission_bonus_threshold?: number | null;
            /** Commission Coordinator */
            commission_coordinator?: string | null;
            /** Commission Closing Weekday */
            commission_closing_weekday?: number | null;
            /** Commission Closing Hour */
            commission_closing_hour?: number | null;
        };
        /** PlatformSetupOut */
        PlatformSetupOut: {
            boss?: components["schemas"]["PlatformSetupBossOut"] | null;
            pricing?: components["schemas"]["PlatformSetupPricingOut"] | null;
            commissions?: components["schemas"]["PlatformSetupCommissionsOut"] | null;
            /** Integrations */
            integrations?: {
                [key: string]: unknown;
            };
        };
        /** PlatformSetupPricingOut */
        PlatformSetupPricingOut: {
            /** Price Pix */
            price_pix?: string | null;
            /** Price Card Cents */
            price_card_cents?: number | null;
            /** Promo Price Pix */
            promo_price_pix?: string | null;
            /** Promo Price Card Cents */
            promo_price_card_cents?: number | null;
            /** Promoter Study Unlock Threshold */
            promoter_study_unlock_threshold?: number | null;
            /** Promoter Study Complete Threshold */
            promoter_study_complete_threshold?: number | null;
            /** Promoter Price Pix */
            promoter_price_pix?: string | null;
            /** Promoter Price Card Cents */
            promoter_price_card_cents?: number | null;
            /** Card Installments */
            card_installments?: number | null;
            /** Description */
            description?: string | null;
        };
        /** PlatformSetupIn */
        PlatformSetupIn: {
            boss?: components["schemas"]["BossIn"] | null;
            pricing?: components["schemas"]["PricingIn"] | null;
            commissions?: components["schemas"]["CommissionsIn"] | null;
            /** Integrations */
            integrations?: {
                [key: string]: string;
            } | null;
        };
        /** SeedRunOut */
        SeedRunOut: {
            /** Success */
            success: boolean;
            /** Output */
            output: string;
            /** Config */
            config?: {
                [key: string]: unknown;
            };
        };
        /** IntegrationTestLiveOut */
        IntegrationTestLiveOut: {
            /** Name */
            name: string;
            /** Success */
            success: boolean;
            /** Latency Ms */
            latency_ms: number;
            /** Details */
            details?: {
                [key: string]: unknown;
            };
            /** Error */
            error?: string | null;
        };
        /** NotifyTemplateOut */
        NotifyTemplateOut: {
            /** Event */
            event: string;
            /** External Id */
            external_id: string;
            /** Title */
            title?: string | null;
            /** Subject */
            subject?: string | null;
            /** Body Md */
            body_md?: string | null;
            /**
             * Is Tts
             * @default false
             */
            is_tts: boolean;
            /**
             * Channels
             * @default whatsapp,email
             */
            channels: string;
            /** Media Url */
            media_url?: string | null;
            /** Media Type */
            media_type?: string | null;
            /**
             * Mail Template
             * @default default
             */
            mail_template: string;
            /** Notes */
            notes?: string | null;
            /**
             * Updated At
             * @default 2026-08-19T00:00:00Z
             */
            updated_at: string;
            trigger?: components["schemas"]["NotifyTriggerOut"] | null;
        };
        /** NotifyTriggerOut */
        NotifyTriggerOut: {
            /**
             * Fires On
             * @default
             */
            fires_on: string;
            /** Source */
            source?: string | null;
            /**
             * Delay Minutes
             * @default 0
             */
            delay_minutes: number;
            /**
             * Active
             * @default true
             */
            active: boolean;
        };
        /** NotifyTemplateStatsOut */
        NotifyTemplateStatsOut: {
            /** Total */
            total: number;
            /** Active */
            active: number;
            /** Inactive */
            inactive: number;
            /** With Tts */
            with_tts: number;
            /** With Media */
            with_media: number;
            /** By Channel */
            by_channel?: {
                [key: string]: number;
            };
        };
        /** NotifyEventOut */
        NotifyEventOut: {
            /** Event */
            event: string;
            /** Has Template */
            has_template: boolean;
            /** Has In Memory */
            has_in_memory: boolean;
            /** Active */
            active: boolean;
        };
        /** AiAssistOut */
        AiAssistOut: {
            /** Text */
            text: string;
            /** Action */
            action: string;
        };
        /** AiAssistIn */
        AiAssistIn: {
            /** Text */
            text: string;
            /**
             * Action
             * @default improve
             */
            action: string;
            /** Custom Prompt */
            custom_prompt?: string | null;
        };
        /** TemplatePatchIn */
        TemplatePatchIn: {
            /** Title */
            title?: string | null;
            /** Subject */
            subject?: string | null;
            /** Body Md */
            body_md?: string | null;
            /** Is Tts */
            is_tts?: boolean | null;
            /** Channels */
            channels?: string | null;
            /** Media Url */
            media_url?: string | null;
            /** Media Type */
            media_type?: string | null;
            /** Mail Template */
            mail_template?: string | null;
            /** Notes */
            notes?: string | null;
        };
        /** NotifyPreviewOut */
        NotifyPreviewOut: {
            /** Event */
            event: string;
            /** Body Md */
            body_md: string;
            /** Rendered */
            rendered: string;
            /** Is Tts */
            is_tts: boolean;
            /** Channels */
            channels?: string[];
        };
        /** PreviewIn */
        PreviewIn: {
            /** Ctx */
            ctx?: {
                [key: string]: unknown;
            } | null;
        };
        /** NotifyTestOut */
        NotifyTestOut: {
            /** External Id */
            external_id: string;
        };
        /** TestIn */
        TestIn: {
            /** Channels */
            channels?: string[] | null;
            /** Ctx */
            ctx?: {
                [key: string]: unknown;
            } | null;
        };
        /** NotifyHistoryItemOut */
        NotifyHistoryItemOut: {
            /** External Id */
            external_id?: string | null;
            /** Caller */
            caller?: string | null;
            /** Recipient Phone */
            recipient_phone?: string | null;
            /** Recipient Email */
            recipient_email?: string | null;
            /** Title */
            title?: string | null;
            /** Subject */
            subject?: string | null;
            /**
             * Text
             * @default
             */
            text: string;
            /**
             * Want Whatsapp
             * @default false
             */
            want_whatsapp: boolean;
            /**
             * Want Email
             * @default false
             */
            want_email: boolean;
            /**
             * Want Tts
             * @default false
             */
            want_tts: boolean;
            /** Whatsapp Status */
            whatsapp_status?: string | null;
            /** Email Status */
            email_status?: string | null;
            /** Tts Status */
            tts_status?: string | null;
            /** Whatsapp Error */
            whatsapp_error?: string | null;
            /** Email Error */
            email_error?: string | null;
            /** Tts Error */
            tts_error?: string | null;
            /**
             * Attempts
             * @default 0
             */
            attempts: number;
            /** Idempotency Key */
            idempotency_key?: string | null;
            /** Created At */
            created_at?: unknown | null;
        };
        /** TtsConfigOut */
        TtsConfigOut: {
            /** Omniroute Url */
            omniroute_url: string;
            /** Chain */
            chain?: components["schemas"]["TtsOptionOut"][];
            /**
             * Cross Gender Rule
             * @default Destinatário Homem (M) recebe voz feminina; Mulher (F) recebe voz masculina.
             */
            cross_gender_rule: string;
        };
        /** TtsOptionOut */
        TtsOptionOut: {
            /** Model */
            model: string;
            /** Voice Female */
            voice_female: string;
            /** Voice Male */
            voice_male: string;
        };
        /** TtsProbeOut */
        TtsProbeOut: {
            /** Ok */
            ok: boolean;
            /** Audio Url */
            audio_url?: string | null;
            /** Gender Target */
            gender_target: string;
            /** Voice Used */
            voice_used: string;
            /** Omniroute Url */
            omniroute_url: string;
            /** Chain Results */
            chain_results?: {
                [key: string]: unknown;
            }[];
        };
        /** TtsProbeIn */
        TtsProbeIn: {
            /**
             * Text
             * @default Olá, esta é uma mensagem de teste da síntese de voz V7M.
             */
            text: string;
            /** Gender */
            gender?: string | null;
            /** Voice Override */
            voice_override?: string | null;
        };
        /** DocumentReviewFilterSchema */
        DocumentReviewFilterSchema: {
            /** Hub */
            hub?: string | null;
            /** Doc Type */
            doc_type?: string | null;
        };
        /** DocumentReviewOut */
        DocumentReviewOut: {
            /** External Id */
            external_id: string;
            /** User External Id */
            user_external_id?: string | null;
            /** Name */
            name: string;
            /** Phone */
            phone?: string | null;
            /** Cpf */
            cpf?: string | null;
            /** Hub Name */
            hub_name?: string | null;
            /** Type */
            type: string;
            /** Kind */
            kind: string;
            /** Reason */
            reason: string;
            /** Created At */
            created_at: string;
        };
        /** DossierAddressOut */
        DossierAddressOut: {
            /** Street */
            street?: string | null;
            /** Number */
            number?: string | null;
            /** Complement */
            complement?: string | null;
            /** Neighborhood */
            neighborhood?: string | null;
            /** City */
            city?: string | null;
            /** State */
            state?: string | null;
            /** Zipcode */
            zipcode?: string | null;
        };
        /** DossierBiometricsOut */
        DossierBiometricsOut: {
            /** Selfie Status */
            selfie_status?: string | null;
            /** Selfie Reason */
            selfie_reason?: string | null;
            /** Verifications */
            verifications?: {
                [key: string]: unknown;
            }[];
        };
        /** DossierDocumentDataOut */
        DossierDocumentDataOut: {
            /** Doc Type */
            doc_type?: string | null;
            /** Number */
            number?: string | null;
            /** State */
            state?: string | null;
            /** Validation Status */
            validation_status?: string | null;
            /** Validation Reason */
            validation_reason?: string | null;
            /** Extracted Data */
            extracted_data?: {
                [key: string]: unknown;
            };
        };
        /** DossierMediaOut */
        DossierMediaOut: {
            /** Front Photo */
            front_photo?: string | null;
            /** Back Photo */
            back_photo?: string | null;
            /** Full Photo */
            full_photo?: string | null;
            /** Selfie Photo */
            selfie_photo?: string | null;
            /** Face Crop */
            face_crop?: string | null;
            /** Address Photo */
            address_photo?: string | null;
        };
        /** DossierProfileOut */
        DossierProfileOut: {
            /** Name */
            name?: string | null;
            /** Cpf */
            cpf?: string | null;
            /** Phone */
            phone?: string | null;
            /** Email */
            email?: string | null;
            /** Birth Date */
            birth_date?: string | null;
            /** Mother Name */
            mother_name?: string | null;
            /** Father Name */
            father_name?: string | null;
            /** Pix Key */
            pix_key?: string | null;
            /**
             * Selfie Needs Meeting
             * @default false
             */
            selfie_needs_meeting: boolean;
        };
        /** UserDossierOut */
        UserDossierOut: {
            /** User External Id */
            user_external_id: string;
            profile: components["schemas"]["DossierProfileOut"];
            media: components["schemas"]["DossierMediaOut"];
            document_data: components["schemas"]["DossierDocumentDataOut"];
            biometrics: components["schemas"]["DossierBiometricsOut"];
            address: components["schemas"]["DossierAddressOut"];
        };
        /** DocumentDecideOut */
        DocumentDecideOut: {
            /** Detail */
            detail: string;
            /** Status */
            status: string;
        };
        /** DocumentDecideIn */
        DocumentDecideIn: {
            /** Kind */
            kind: string;
            /** Approve */
            approve: boolean;
            /** Reason */
            reason?: string | null;
            /** Doc Id */
            doc_id?: string | null;
        };
        /** NetworkTreeFilterSchema */
        NetworkTreeFilterSchema: {
            /** Hub */
            hub?: string | null;
        };
        /** NetworkTreeCoordinatorOut */
        NetworkTreeCoordinatorOut: {
            /** User External Id */
            user_external_id?: string | null;
            /** Name */
            name: string;
            /** Phone */
            phone?: string | null;
        };
        /** NetworkTreeHubOut */
        NetworkTreeHubOut: {
            /** Hub External Id */
            hub_external_id: string;
            /** Brand */
            brand: string;
            /** Is Default */
            is_default: boolean;
            coordinator: components["schemas"]["NetworkTreeCoordinatorOut"];
            metrics: components["schemas"]["NetworkTreeMetricsOut"];
            /** Promoters */
            promoters?: components["schemas"]["NetworkTreePromoterOut"][];
        };
        /** NetworkTreeMetricsOut */
        NetworkTreeMetricsOut: {
            /** Total Promoters */
            total_promoters: number;
            /** Total Leads */
            total_leads: number;
            /** Total Paid */
            total_paid: number;
            /** Conversion Rate */
            conversion_rate: number;
        };
        /** NetworkTreePromoterOut */
        NetworkTreePromoterOut: {
            /** External Id */
            external_id: string;
            /** User External Id */
            user_external_id?: string | null;
            /** Name */
            name: string;
            /** Phone */
            phone?: string | null;
            /** Status */
            status: string;
            /** Leads Count */
            leads_count: number;
            /** Paid Count */
            paid_count: number;
            /** Students Count */
            students_count: number;
            /** Conversion Rate */
            conversion_rate: number;
        };
        /** TrainingSubmissionFilterSchema */
        TrainingSubmissionFilterSchema: {
            /** Status */
            status?: string | null;
            /** Material Id */
            material_id?: string | null;
        };
        /** TrainingSubmissionOut */
        TrainingSubmissionOut: {
            /** External Id */
            external_id: string;
            /** User External Id */
            user_external_id: string;
            /** User Name */
            user_name: string;
            /** User Phone */
            user_phone?: string | null;
            /** Material Title */
            material_title: string;
            /** Material Question */
            material_question: string;
            /** Material Expected */
            material_expected: string;
            /** Answer */
            answer: string;
            /** Audio Url */
            audio_url?: string | null;
            /** Grade */
            grade?: string | null;
            /** Justification */
            justification?: string | null;
            /** Status */
            status: string;
            /** Created At */
            created_at: string;
        };
        /** TrainingOverrideOut */
        TrainingOverrideOut: {
            /** Detail */
            detail: string;
            /** Status */
            status: string;
        };
        /** TrainingUnlockOut */
        TrainingUnlockOut: {
            /** Detail */
            detail: string;
        };
        /** IntegrationStatusOut */
        IntegrationStatusOut: {
            /** Name */
            name: string;
            /** Configured */
            configured: boolean;
            /** Config */
            config?: {
                [key: string]: boolean;
            };
            /** Flow */
            flow: string;
            /** Checks */
            checks?: {
                [key: string]: unknown;
            }[];
        };
        /** IntegrationDetailOut */
        IntegrationDetailOut: {
            /** Name */
            name: string;
            /** Configured */
            configured: boolean;
            /** Config */
            config?: {
                [key: string]: boolean;
            };
            /** Flow */
            flow: string;
            /** Checks */
            checks?: {
                [key: string]: unknown;
            }[];
            /** Live */
            live?: {
                [key: string]: unknown;
            } | null;
        };
        /** SystemStatusOut */
        SystemStatusOut: {
            /** Db Ok */
            db_ok: boolean;
            /** Migrations Pending */
            migrations_pending?: string[];
            /** Qcluster Alive */
            qcluster_alive: boolean;
            /** Qcluster Count */
            qcluster_count: number;
            /** Queued Tasks */
            queued_tasks?: number | null;
            /** Success Tasks */
            success_tasks: number;
            /** Failure Tasks */
            failure_tasks: number;
            /** Debug */
            debug: boolean;
            /** External Url */
            external_url: string;
        };
        /** AiCallLogFilterSchema */
        AiCallLogFilterSchema: {
            /** Status */
            status?: string | null;
        };
        /** AiCallLogOut */
        AiCallLogOut: {
            /** Provider */
            provider: string;
            /** Model */
            model: string;
            /** Operation */
            operation: string;
            /** Caller */
            caller: string;
            /** Status */
            status: string;
            /** Cost */
            cost?: string | null;
            /** Latency Ms */
            latency_ms?: number | null;
            /** Error */
            error?: string | null;
            /** Created At */
            created_at: string;
        };
        /** ValidationCheckLogFilterSchema */
        ValidationCheckLogFilterSchema: {
            /** Scope */
            scope?: string | null;
        };
        /** ValidationCheckLogOut */
        ValidationCheckLogOut: {
            /** Scope */
            scope: string;
            /** Name */
            name: string;
            /** Passed */
            passed: boolean;
            /** Mode */
            mode: string;
            /** Detail */
            detail?: string | null;
            /** Checked At */
            checked_at: string;
        };
        /** StaffHealthFullOut */
        StaffHealthFullOut: {
            /** Db */
            db: {
                [key: string]: unknown;
            };
            /** Asaas */
            asaas: {
                [key: string]: unknown;
            };
            /** Infinitepay */
            infinitepay: {
                [key: string]: unknown;
            };
            /** Omniroute */
            omniroute: {
                [key: string]: unknown;
            };
            /** Notify */
            notify: {
                [key: string]: unknown;
            };
            /** Migrations Pending */
            migrations_pending: number;
            /** Deploy */
            deploy: {
                [key: string]: unknown;
            };
        };
        /** HealthzOut */
        HealthzOut: {
            /** Status */
            status: string;
            /**
             * Version
             * @default 0.1.0-alpha.1
             */
            version: string;
            /** Db */
            db: boolean;
            /** Migrations Pending */
            migrations_pending: number;
            /** Sha */
            sha?: string | null;
            /** Built At */
            built_at?: string | null;
        };
        /** CardPriceOut */
        CardPriceOut: {
            /** Installments */
            installments: number;
            /** Installment */
            installment: string;
            /** Total */
            total: string;
        };
        /** PricingOut */
        PricingOut: {
            /** Pix */
            pix: string;
            card: components["schemas"]["CardPriceOut"];
        };
        /** ReferralOut */
        ReferralOut: {
            /**
             * Name
             * @description PRIMEIRO nome do promotor ativo, ou null se o ref não vale
             */
            name?: string | null;
        };
        /** CheckoutOut */
        CheckoutOut: {
            /** Payment Method */
            payment_method: string;
            /** Provider */
            provider: string;
            /** Amount */
            amount: string;
            /** Is Paid */
            is_paid: boolean;
            /** Checkout Url */
            checkout_url?: string | null;
            /** Short Url */
            short_url?: string | null;
            /** Qrcode Payload */
            qrcode_payload?: string | null;
            /** Qrcode Image */
            qrcode_image?: string | null;
            /** Due Date */
            due_date?: string | null;
        };
        /** LeadOut */
        LeadOut: {
            /**
             * External Id
             * @description external_id do LEAD (≠ do user — proposta #8)
             */
            external_id: string;
            /**
             * User External Id
             * @description external_id do USER — é o que o POST /auth/login espera.
             */
            user_external_id: string;
            /** Status */
            status: string;
            checkout?: components["schemas"]["CheckoutOut"] | null;
        };
        /** LeadCreateIn */
        LeadCreateIn: {
            /** Cpf */
            cpf: string;
            /** Phone */
            phone: string;
            /** Email */
            email: string;
            /** Payment Method */
            payment_method?: string | null;
            /** Ref */
            ref?: string | null;
        };
        /**
         * CheckOut
         * @description Resposta do `POST /auth/check` — compartilhada pelos grupos do funil (dedup).
         */
        CheckOut: {
            /** Found */
            found: boolean;
            /**
             * Registered
             * @default true
             */
            registered: boolean;
            /**
             * External Id
             * @description external_id do USER (é o que o /auth/login espera)
             */
            external_id?: string | null;
            /** Name */
            name?: string | null;
            /** Masked Phone */
            masked_phone?: string | null;
            /**
             * Otp Sent
             * @default false
             */
            otp_sent: boolean;
            /** Otp Wait */
            otp_wait?: number | null;
            /** Whatsapp */
            whatsapp?: boolean | null;
            /** Roles */
            roles?: string[] | null;
            /** Token */
            token?: string | null;
            /**
             * Created
             * @default false
             */
            created: boolean;
            /**
             * Is Valid
             * @default true
             */
            is_valid: boolean;
            /** Birth Date */
            birth_date?: string | null;
            /** Sex */
            sex?: string | null;
        };
        /**
         * CheckIn
         * @description Body do `POST /auth/check` — compartilhado pelos grupos do funil (dedup).
         */
        CheckIn: {
            /** Cpf */
            cpf?: string | null;
            /** Phone */
            phone?: string | null;
            /** External Id */
            external_id?: string | null;
            /** Ref */
            ref?: string | null;
            /**
             * Send Otp
             * @default true
             */
            send_otp: boolean;
        };
        /**
         * LoginIn
         * @description Body do `POST /auth/login` — compartilhado pelos grupos do funil (dedup).
         */
        LoginIn: {
            /**
             * External Id
             * @description external_id do USER (veio do /auth/check)
             */
            external_id: string;
            /** Otp */
            otp: string;
        };
        /** LeadCustomerOut */
        LeadCustomerOut: {
            /** Name */
            name?: string | null;
            /** Phone */
            phone?: string | null;
            /** Email */
            email?: string | null;
            /** Cpf */
            cpf?: string | null;
        };
        /** LeadMeOut */
        LeadMeOut: {
            /**
             * External Id
             * @description external_id do LEAD (≠ do user — proposta #8)
             */
            external_id: string;
            /**
             * Status
             * @description pending | paid | failed
             */
            status: string;
            /** Failed Reason */
            failed_reason?: string | null;
            /** Created At */
            created_at: string;
            customer: components["schemas"]["LeadCustomerOut"];
            promoter: components["schemas"]["LeadPromoterOut"];
            checkout?: components["schemas"]["LeadSelfCheckoutOut"] | null;
        };
        /** LeadPromoterOut */
        LeadPromoterOut: {
            /** External Id */
            external_id: string;
            /** Name */
            name?: string | null;
        };
        /** LeadSelfCheckoutOut */
        LeadSelfCheckoutOut: {
            /** Payment Method */
            payment_method: string;
            /** Provider */
            provider: string;
            /** Amount */
            amount: string;
            /** Is Paid */
            is_paid: boolean;
            /** Checkout Url */
            checkout_url?: string | null;
            /** Url */
            url?: string | null;
            /** Receipt Url */
            receipt_url?: string | null;
            /** Qrcode Payload */
            qrcode_payload?: string | null;
            /** Qrcode Image */
            qrcode_image?: string | null;
            /** Due Date */
            due_date?: string | null;
        };
        /** UrlOut */
        UrlOut: {
            /** Url */
            url: string;
        };
        /** IdentityOut */
        IdentityOut: {
            /** Cpf */
            cpf: string;
            /** Name */
            name?: string | null;
            /**
             * Birth Date
             * @description ISO YYYY-MM-DD — o front calcula a idade
             */
            birth_date?: string | null;
            /**
             * Sex
             * @description "M" | "F" — decide "matriculado/a" no pergaminho
             */
            sex?: string | null;
            /**
             * Photo
             * @description Foto de perfil do WhatsApp capturada de forma assíncrona.
             */
            photo?: string | null;
        };
        /** IdentityIn */
        IdentityIn: {
            /** Cpf */
            cpf: string;
        };
        /** EmailOut */
        EmailOut: {
            /** Email */
            email: string;
            /**
             * Already Yours
             * @description True quando este e-mail JÁ era o desta conta.
             * @default false
             */
            already_yours: boolean;
        };
        /** EmailIn */
        EmailIn: {
            /** Email */
            email: string;
        };
        /** CheckoutSetIn */
        CheckoutSetIn: {
            /**
             * Payment Method
             * @description "pix" | "card"
             */
            payment_method: string;
        };
        /** AddressProofSectionOut */
        AddressProofSectionOut: {
            /**
             * Exists
             * @default false
             */
            exists: boolean;
            /** Photo */
            photo?: string | null;
            /** Status */
            status?: string | null;
            /** Reason */
            reason?: string | null;
            /**
             * Needs Kinship
             * @default false
             */
            needs_kinship: boolean;
            /** Kinship Relation */
            kinship_relation?: string | null;
        };
        /** EducationOut */
        EducationOut: {
            /** Level */
            level?: string | null;
            /** Grade */
            grade?: number | null;
            /** Completed */
            completed?: boolean | null;
            /** Last School */
            last_school?: string | null;
            /** City */
            city?: string | null;
            /** State */
            state?: string | null;
            /** Last Year When */
            last_year_when?: string | null;
        };
        /** EnrollmentMeOut */
        EnrollmentMeOut: {
            /**
             * External Id
             * @description external_id da MATRÍCULA (≠ do user, ≠ do promoter)
             */
            external_id: string;
            /**
             * Status
             * @description Seção do wizard a preencher AGORA
             * @enum {string}
             */
            status: "rg" | "address" | "education" | "selfie" | "awaiting_release" | "completed";
            /** Hub External Id */
            hub_external_id: string;
            /** Selfie Verified */
            selfie_verified: boolean;
            /**
             * Analysis Status
             * @description Análise da selfie: pending | approved | rejected | review
             */
            analysis_status?: ("pending" | "approved" | "rejected" | "review") | null;
            /**
             * Selfie Status
             * @description [DEPRECATED — use analysis_status] alias de compat
             */
            selfie_status: string;
            /**
             * Poll After Ms
             * @description Quando o front deve voltar a perguntar (ms).
             */
            poll_after_ms?: number | null;
            /**
             * Expires At
             * @description Até quando o `pending` vale (TTL).
             */
            expires_at?: string | null;
            profile?: components["schemas"]["EnrollmentProfileOut"] | null;
            /**
             * Address Complete
             * @default false
             */
            address_complete: boolean;
            address?: components["schemas"]["PublicAddressOut"] | null;
            address_proof?: components["schemas"]["AddressProofSectionOut"] | null;
            rg?: components["schemas"]["RgOut"] | null;
            education?: components["schemas"]["EducationOut"] | null;
            selfie?: components["schemas"]["SelfieOut"] | null;
            /** Blocks */
            blocks?: {
                [key: string]: unknown;
            }[] | null;
        };
        /** EnrollmentProfileOut */
        EnrollmentProfileOut: {
            /** Mother Name */
            mother_name?: string | null;
            /** Father Name */
            father_name?: string | null;
            /** Marital Status */
            marital_status?: string | null;
            /** Birthplace */
            birthplace?: string | null;
            /** Nationality */
            nationality?: string | null;
        };
        /** PublicAddressOut */
        PublicAddressOut: {
            /** Cep */
            cep?: string | null;
            /** Zipcode */
            zipcode?: string | null;
            /** Street */
            street?: string | null;
            /** Number */
            number?: string | null;
            /** Complement */
            complement?: string | null;
            /** Neighborhood */
            neighborhood?: string | null;
            /** City */
            city?: string | null;
            /** State */
            state?: string | null;
            /** Country */
            country?: string | null;
            /**
             * Missing Fields
             * @default []
             */
            missing_fields: string[];
        };
        /** RgOut */
        RgOut: {
            /** Number */
            number?: string | null;
            /** Issuing Agency */
            issuing_agency?: string | null;
            /** Issue Date */
            issue_date?: string | null;
            /** Front Photo */
            front_photo?: string | null;
            /** Back Photo */
            back_photo?: string | null;
            /** Full Photo */
            full_photo?: string | null;
            /** Analysis Status */
            analysis_status?: ("pending" | "approved" | "rejected" | "review") | null;
            /** Analysis Reason */
            analysis_reason?: string | null;
            /** Validation Status */
            validation_status?: ("pending" | "approved" | "rejected" | "review") | null;
            /** Validation Reason */
            validation_reason?: string | null;
            /** Missing Fields */
            missing_fields?: string[];
        };
        /** SelfieOut */
        SelfieOut: {
            /** Exists */
            exists: boolean;
            /** Photo */
            photo?: string | null;
            /** Taken At */
            taken_at?: string | null;
            /** Analysis Status */
            analysis_status?: ("pending" | "approved" | "rejected" | "review") | null;
            /** Analysis Reason */
            analysis_reason?: string | null;
            /** Expires At */
            expires_at?: string | null;
            /** Status */
            status?: ("pending" | "approved" | "rejected" | "review") | null;
            /**
             * Verified
             * @default false
             */
            verified: boolean;
            /** Description */
            description?: string | null;
            /**
             * Attempts
             * @default 0
             */
            attempts: number;
        };
        /** RgUploadAck */
        RgUploadAck: {
            /**
             * Slot
             * @enum {string}
             */
            slot: "front" | "back" | "full";
            /** Stored */
            stored: string;
            /**
             * Analysis Status
             * @enum {string}
             */
            analysis_status: "pending" | "approved" | "rejected" | "review";
            /** Poll After Ms */
            poll_after_ms: number;
            /** Expires At */
            expires_at?: string | null;
            /**
             * Analysis
             * @default
             */
            analysis: string;
        };
        /**
         * DocClassifyOut
         * @description Classificação preliminar de documento pela IA.
         */
        DocClassifyOut: {
            /** Is Document */
            is_document?: boolean | null;
            /** Doc Type */
            doc_type?: string | null;
            /** Completeness */
            completeness?: string | null;
            /** Is Legible */
            is_legible?: boolean | null;
            /** Reason */
            reason?: string | null;
            /** Confidence */
            confidence?: number | null;
        };
        /** RgSectionOut */
        RgSectionOut: {
            /** Number */
            number?: string | null;
            /** Issuing Agency */
            issuing_agency?: string | null;
            /** Issue Date */
            issue_date?: string | null;
            /** Mother Name */
            mother_name?: string | null;
            /** Father Name */
            father_name?: string | null;
            /** Birthplace */
            birthplace?: string | null;
            /** Marital Status */
            marital_status?: string | null;
            /** Nationality */
            nationality?: string | null;
            /** Name */
            name?: string | null;
            /** Birth Date */
            birth_date?: string | null;
            /** Front Photo */
            front_photo?: string | null;
            /** Back Photo */
            back_photo?: string | null;
            /** Full Photo */
            full_photo?: string | null;
            /**
             * Analysis Status
             * @description pending | approved | rejected | review
             */
            analysis_status?: ("pending" | "approved" | "rejected" | "review") | null;
            /** Analysis Reason */
            analysis_reason?: string | null;
            /**
             * Blocked
             * @default false
             */
            blocked: boolean;
            /** Validation Status */
            validation_status?: ("pending" | "approved" | "rejected" | "review") | null;
            /** Validation Reason */
            validation_reason?: string | null;
            /** Missing Fields */
            missing_fields?: string[];
            /** Next Slot */
            next_slot?: string | null;
            /** Photos */
            photos?: {
                [key: string]: unknown;
            };
        };
        /** RgPatchIn */
        RgPatchIn: {
            /** Number */
            number?: string | null;
            /** Issuing Agency */
            issuing_agency?: string | null;
            /** Issue Date */
            issue_date?: string | null;
            /** Mother Name */
            mother_name?: string | null;
            /** Father Name */
            father_name?: string | null;
            /** Birthplace */
            birthplace?: string | null;
            /** Marital Status */
            marital_status?: string | null;
            /** Nationality */
            nationality?: string | null;
        };
        /** AddressCepIn */
        AddressCepIn: {
            /** Cep */
            cep: string;
        };
        /** AddressDataIn */
        AddressDataIn: {
            /** Street */
            street?: string | null;
            /** Number */
            number?: string | null;
            /** Complement */
            complement?: string | null;
            /** Neighborhood */
            neighborhood?: string | null;
            /** City */
            city?: string | null;
            /** State */
            state?: string | null;
        };
        /** KinshipIn */
        KinshipIn: {
            /** Relation */
            relation: string;
        };
        /** EducationIn */
        EducationIn: {
            /** Level */
            level: string;
            /** Completed */
            completed: boolean;
            /** Grade */
            grade?: number | null;
            /** Last Completed Grade */
            last_completed_grade?: number | null;
            /** Qualification */
            qualification?: string | null;
            /** Last Completed Qualification */
            last_completed_qualification?: string | null;
            /** Education Status */
            education_status?: string | null;
            /** Year */
            year?: number | null;
            /** City */
            city?: string | null;
            /** School */
            school?: string | null;
        };
        /**
         * ContractOut
         * @description Contrato de prestação de serviços / consentimento.
         */
        ContractOut: {
            /** Version */
            version: string;
            /** Hash */
            hash: string;
            /** Text */
            text: string;
        };
        /** StudentDiplomaOut */
        StudentDiplomaOut: {
            /** Issued At */
            issued_at?: string | null;
            /** Picked Up */
            picked_up: boolean;
        };
        /** StudentDocumentOut */
        StudentDocumentOut: {
            /** Doc Type */
            doc_type: string;
            /** Validation Status */
            validation_status: string;
            /** Has Photo */
            has_photo: boolean;
            /**
             * Analysis Status
             * @description pending | approved | rejected | review
             */
            analysis_status?: ("pending" | "approved" | "rejected" | "review") | null;
            /** Analysis Reason */
            analysis_reason?: string | null;
            /**
             * Expires At
             * @description Até quando o `pending` vale; depois vira `review` (TTL).
             */
            expires_at?: string | null;
        };
        /** StudentMeOut */
        StudentMeOut: {
            /**
             * External Id
             * @description external_id do STUDENT (≠ do user, ≠ da matrícula)
             */
            external_id: string;
            /**
             * Status
             * @description awaiting_documents | documents_under_review | exam_released | exam_scheduled | exam_failed | awaiting_documentation_dispatch | pending | awaiting_diploma_issuance | awaiting_pickup | veteran
             */
            status: string;
            /** Hub External Id */
            hub_external_id: string;
            /** Blood Type */
            blood_type?: string | null;
            platform: components["schemas"]["StudentPlatformFields"];
            /** Documents */
            documents: components["schemas"]["StudentDocumentOut"][];
            /** Pendencies */
            pendencies: components["schemas"]["StudentPendencyOut"][];
            diploma?: components["schemas"]["StudentDiplomaOut"] | null;
        };
        /** StudentPendencyOut */
        StudentPendencyOut: {
            /** External Id */
            external_id: string;
            /** Kind */
            kind: string;
            /** Description */
            description: string;
            /** Amount Cents */
            amount_cents?: number | null;
            /** Resolved */
            resolved: boolean;
        };
        /** StudentPlatformFields */
        StudentPlatformFields: {
            /** Url */
            url?: string | null;
            /** Login */
            login?: string | null;
            /** Password */
            password?: string | null;
            /** Notes */
            notes?: string | null;
        };
        /** VeteranDiplomaOut */
        VeteranDiplomaOut: {
            /** Issued At */
            issued_at?: string | null;
            /** Picked Up At */
            picked_up_at?: string | null;
            /** Picked Up */
            picked_up?: boolean | null;
            /** Diploma File */
            diploma_file?: string | null;
            /** Transcript File */
            transcript_file?: string | null;
            /** Pickup Photo */
            pickup_photo?: string | null;
        };
        /** VeteranDocumentItemOut */
        VeteranDocumentItemOut: {
            /** External Id */
            external_id?: string | null;
            /** Doc Type */
            doc_type: string;
            /** Validation Status */
            validation_status: string;
            /** Photo */
            photo?: string | null;
            /** Validated At */
            validated_at?: string | null;
        };
        /** VeteranMeOut */
        VeteranMeOut: {
            /** External Id */
            external_id?: string | null;
            /** Status */
            status?: string | null;
            /** Hub External Id */
            hub_external_id?: string | null;
            /** Blood Type */
            blood_type?: string | null;
            platform?: components["schemas"]["StudentPlatformFields"] | null;
            user?: components["schemas"]["VeteranUserOut"] | null;
            /** Documents */
            documents?: components["schemas"]["VeteranDocumentItemOut"][];
            /** Pendencies */
            pendencies?: {
                [key: string]: unknown;
            }[];
            diploma?: components["schemas"]["VeteranDiplomaOut"] | null;
            /** Enrollment */
            enrollment?: {
                [key: string]: unknown;
            } | null;
        };
        /** VeteranUserOut */
        VeteranUserOut: {
            /** External Id */
            external_id: string;
            /** Name */
            name?: string | null;
            /** Cpf */
            cpf?: string | null;
            /** Phone */
            phone?: string | null;
            /** Email */
            email?: string | null;
        };
        /** BloodTypeIn */
        BloodTypeIn: {
            /** Blood Type */
            blood_type: string;
        };
        /** StudentDocumentUploadAck */
        StudentDocumentUploadAck: {
            /** Doc Type */
            doc_type: string;
            /** Stored */
            stored: boolean;
            /**
             * Analysis Status
             * @enum {string}
             */
            analysis_status: "pending" | "approved" | "rejected" | "review";
            /** Poll After Ms */
            poll_after_ms: number;
            /** Expires At */
            expires_at?: string | null;
        };
        /** ExamScheduleIn */
        ExamScheduleIn: {
            /** Subject */
            subject: string;
            /** Scheduled At */
            scheduled_at: string;
        };
        /** PendencyOut */
        PendencyOut: {
            /**
             * External Id
             * @description external_id da PENDÊNCIA (proposta #8)
             */
            external_id: string;
            /** Kind */
            kind: string;
            /** Description */
            description?: string | null;
            /** Amount Cents */
            amount_cents?: number | null;
        };
        /** BlockOut */
        BlockOut: {
            /** External Id */
            external_id: string;
            /** Source Type */
            source_type: string;
            /** Title */
            title: string;
            /** Description */
            description: string;
            /** Action Label */
            action_label: string;
            /** Action Route */
            action_route: string;
            /** Created At */
            created_at: string;
        };
        /** CandidateOut */
        CandidateOut: {
            /**
             * External Id
             * @description external_id do CANDIDATO (≠ do user)
             */
            external_id: string;
            /**
             * User External Id
             * @description external_id do USER — é o que o /auth/login espera
             */
            user_external_id: string;
            /** Status */
            status: string;
        };
        /** CandidateCreateIn */
        CandidateCreateIn: {
            /** Cpf */
            cpf: string;
            /** Phone */
            phone: string;
            /** Email */
            email: string;
            /** Hub */
            hub?: string | null;
        };
        /** CandidateJoinIn */
        CandidateJoinIn: {
            /**
             * External Id
             * @description external_id do USER vindo do /auth/check
             */
            external_id: string;
            /** Otp */
            otp: string;
            /** Hub */
            hub?: string | null;
        };
        /** AddressProofOut */
        AddressProofOut: {
            /** Photo */
            photo?: string | null;
        };
        /** CandidateDocumentSubOut */
        CandidateDocumentSubOut: {
            /** Number */
            number?: string | null;
            /** Issuing Agency */
            issuing_agency?: string | null;
            /** Issue Date */
            issue_date?: string | null;
            /** Front Photo */
            front_photo?: string | null;
            /** Back Photo */
            back_photo?: string | null;
            /** Full Photo */
            full_photo?: string | null;
            /** Validation Status */
            validation_status?: string | null;
            /** Validation Reason */
            validation_reason?: string | null;
            /** Category */
            category?: string | null;
            /** Date Of Birth */
            date_of_birth?: string | null;
            /** Expires On */
            expires_on?: string | null;
            /** National Register */
            national_register?: string | null;
            /** Kind */
            kind?: string | null;
            /** Registry Office */
            registry_office?: string | null;
            /** Book */
            book?: string | null;
            /** Page */
            page?: string | null;
            /** Entry */
            entry?: string | null;
            /** Photo */
            photo?: string | null;
            /** Series */
            series?: string | null;
            /** Ra */
            ra?: string | null;
        };
        /** CandidateDocumentsOut */
        CandidateDocumentsOut: {
            /** External Id */
            external_id: string;
            rg?: components["schemas"]["CandidateDocumentSubOut"] | null;
            cnh?: components["schemas"]["CandidateDocumentSubOut"] | null;
            certificate?: components["schemas"]["CandidateDocumentSubOut"] | null;
            military?: components["schemas"]["CandidateDocumentSubOut"] | null;
        };
        /** CandidateMeOut */
        CandidateMeOut: {
            /** External Id */
            external_id: string;
            /** Status */
            status: string;
            /** Hub External Id */
            hub_external_id: string;
            /** Pix Validated */
            pix_validated: boolean;
            /** Selfie Verified */
            selfie_verified: boolean;
            /** Selfie Status */
            selfie_status?: string | null;
            profile?: components["schemas"]["CandidateProfileOut"] | null;
            address?: components["schemas"]["PublicAddressOut"] | null;
            documents?: components["schemas"]["CandidateDocumentsOut"] | null;
            selfie?: components["schemas"]["EnrollmentSelfieOut"] | null;
        };
        /** CandidateProfileOut */
        CandidateProfileOut: {
            /** Mother Name */
            mother_name?: string | null;
            /** Father Name */
            father_name?: string | null;
            /** Birthplace */
            birthplace?: string | null;
            /** Marital Status */
            marital_status?: string | null;
            /** Nationality */
            nationality?: string | null;
            /** Name */
            name?: string | null;
            /** Birth Date */
            birth_date?: string | null;
        };
        /** CandidateSelfieOut */
        CandidateSelfieOut: {
            /** Exists */
            exists: boolean;
            /** Photo */
            photo?: string | null;
            /** Taken At */
            taken_at?: string | null;
            /** Status */
            status?: string | null;
            /** Analysis Status */
            analysis_status?: string | null;
            /** Analysis Reason */
            analysis_reason?: string | null;
            /** Expires At */
            expires_at?: string | null;
            /**
             * Verified
             * @default false
             */
            verified: boolean;
            /** Description */
            description?: string | null;
        };
        /** ProfileIn */
        ProfileIn: {
            /** Mother Name */
            mother_name?: string | null;
            /** Father Name */
            father_name?: string | null;
            /** Marital Status */
            marital_status?: string | null;
            /** Birthplace */
            birthplace?: string | null;
            /** Nationality */
            nationality?: string | null;
        };
        /** DocumentsIn */
        DocumentsIn: {
            /** Doc Type */
            doc_type: string;
            /** Number */
            number: string;
            /** Issuing Agency */
            issuing_agency?: string | null;
            /** Issue Date */
            issue_date?: string | null;
            /** Category */
            category?: string | null;
            /** National Register */
            national_register?: string | null;
            /** Date Of Birth */
            date_of_birth?: string | null;
            /** Expires On */
            expires_on?: string | null;
        };
        /** CandidateDocumentSectionOut */
        CandidateDocumentSectionOut: {
            /** Doc Type */
            doc_type?: string | null;
            /** Number */
            number?: string | null;
            /** Issuing Agency */
            issuing_agency?: string | null;
            /** Issue Date */
            issue_date?: string | null;
            /** Category */
            category?: string | null;
            /** Date Of Birth */
            date_of_birth?: string | null;
            /** Expires On */
            expires_on?: string | null;
            /** National Register */
            national_register?: string | null;
            /** Front Photo */
            front_photo?: string | null;
            /** Back Photo */
            back_photo?: string | null;
            /** Full Photo */
            full_photo?: string | null;
            /** Validation Status */
            validation_status?: string | null;
            /** Validation Reason */
            validation_reason?: string | null;
            /** Analysis Status */
            analysis_status?: string | null;
            /** Analysis Reason */
            analysis_reason?: string | null;
            /** Extracted */
            extracted?: {
                [key: string]: unknown;
            };
            /** Missing Fields */
            missing_fields?: string[];
            /** Next Slot */
            next_slot?: string | null;
            /** Photos */
            photos?: {
                [key: string]: unknown;
            };
        };
        /** AnalysisAckOut */
        AnalysisAckOut: {
            /** Stored */
            stored: boolean | string;
            /** Analysis Status */
            analysis_status?: string | null;
            /** Poll After Ms */
            poll_after_ms: number;
            /** Expires At */
            expires_at?: string | null;
        };
        /** PixIn */
        PixIn: {
            /** Key */
            key: string;
            /** Key Type */
            key_type: string;
        };
        /** TrainingMaterialOut */
        TrainingMaterialOut: {
            /** Material External Id */
            material_external_id: string;
            /** Title */
            title: string;
            /** Blocking */
            blocking: boolean;
            /** Kind */
            kind: string;
            /** Assignment Status */
            assignment_status: string;
            /** Submission Status */
            submission_status: string;
            /** Grade */
            grade?: string | null;
            /** Justification */
            justification?: string | null;
            /**
             * Text Content
             * @default
             */
            text_content: string;
            /** Content Blocks */
            content_blocks?: {
                [key: string]: unknown;
            }[];
            /**
             * Question
             * @default
             */
            question: string;
            /** Video */
            video?: string | null;
            /** Photo */
            photo?: string | null;
        };
        /** TrainingMaterialProgressOut */
        TrainingMaterialProgressOut: {
            /** Material External Id */
            material_external_id: string;
            /** Title */
            title: string;
            /** Blocking */
            blocking: boolean;
            /** Kind */
            kind: string;
            /** Assignment Status */
            assignment_status: string;
            /** Submission Status */
            submission_status: string;
            /** Grade */
            grade?: string | null;
            /** Justification */
            justification?: string | null;
        };
        /** SubmissionOut */
        SubmissionOut: {
            /** External Id */
            external_id: string;
            /** Material External Id */
            material_external_id: string;
            /** Grade */
            grade?: string | null;
            /** Justification */
            justification?: string | null;
            /** Audio */
            audio?: string | null;
            /** Status */
            status: string;
        };
        /** SubmissionIn */
        SubmissionIn: {
            /** Material External Id */
            material_external_id: string;
            /** Answer */
            answer: string;
        };
        /** PromoterMeOut */
        PromoterMeOut: {
            /** External Id */
            external_id: string;
            /** Status */
            status: string;
            /** Hub External Id */
            hub_external_id: string;
            /** Ref Url */
            ref_url: string;
            /**
             * Pre Matriculado
             * @default false
             */
            pre_matriculado: boolean;
            /** Locked */
            locked: boolean;
            /** Pending Materials */
            pending_materials?: {
                [key: string]: unknown;
            }[];
            /** Blocks */
            blocks?: {
                [key: string]: unknown;
            }[] | null;
        };
        /** PromoterLeadOut */
        PromoterLeadOut: {
            /** External Id */
            external_id: string;
            /** Status */
            status: string;
            /** Name */
            name?: string | null;
            /** Phone */
            phone?: string | null;
            /** Created At */
            created_at: string;
        };
        /** PromoterLeadInviteOut */
        PromoterLeadInviteOut: {
            /** Sent */
            sent: boolean;
            /** Phone Last4 */
            phone_last4: string;
        };
        /** PromoterLeadInviteIn */
        PromoterLeadInviteIn: {
            /** Phone */
            phone: string;
            /** Cpf */
            cpf?: string | null;
        };
        /** PromoterCommissionOut */
        PromoterCommissionOut: {
            /** External Id */
            external_id: string;
            /** Amount */
            amount: string;
            /** Source */
            source: string;
            /** Status */
            status: string;
            /** Created At */
            created_at: string;
        };
        /** PromoterLifetimeOut */
        PromoterLifetimeOut: {
            /** Total Students */
            total_students: number;
            /** Goals Hit */
            goals_hit: number;
            /** Total Received */
            total_received: string;
        };
        /** PromoterSummaryOut */
        PromoterSummaryOut: {
            /** Week Start */
            week_start: string;
            /** Week End */
            week_end: string;
            /** Week Paid Leads */
            week_paid_leads: number;
            /** Week Goal */
            week_goal: number;
            /** Goal Reached */
            goal_reached: boolean;
            /** Week Commission Total */
            week_commission_total: string;
            /** Bonus Amount */
            bonus_amount: string;
            /** Next Closing At */
            next_closing_at: string;
            lifetime: components["schemas"]["PromoterLifetimeOut"];
        };
        /** StudyPricingCardOut */
        StudyPricingCardOut: {
            /** Installments */
            installments: number;
            /** Installment */
            installment: string;
            /** Total */
            total: string;
        };
        /** StudyPricingOut */
        StudyPricingOut: {
            /** Pix */
            pix: string;
            card: components["schemas"]["StudyPricingCardOut"];
        };
        /** StudyCheckoutOut */
        StudyCheckoutOut: {
            /** Payment Method */
            payment_method?: string | null;
            /** Provider */
            provider?: string | null;
            /** Amount */
            amount?: string | null;
            /** Is Paid */
            is_paid?: boolean | null;
            /** Checkout Url */
            checkout_url?: string | null;
            /** Short Url */
            short_url?: string | null;
            /** Qrcode Payload */
            qrcode_payload?: string | null;
            /** Qrcode Image */
            qrcode_image?: string | null;
            /** Due Date */
            due_date?: string | null;
        };
        /** StudyStartOut */
        StudyStartOut: {
            /** External Id */
            external_id: string;
            /** User External Id */
            user_external_id: string;
            /** Status */
            status: string;
            checkout?: components["schemas"]["StudyCheckoutOut"] | null;
        };
        /** StudyStartIn */
        StudyStartIn: {
            /** Payment Method */
            payment_method?: string | null;
        };
        /** CoordinatorCheckOut */
        CoordinatorCheckOut: {
            /** Found */
            found: boolean;
            /**
             * External Id
             * @description external_id do USER (é o que o /auth/login espera)
             */
            external_id?: string | null;
            /**
             * Otp Sent
             * @default false
             */
            otp_sent: boolean;
            /** Otp Wait */
            otp_wait?: number | null;
            /** Whatsapp */
            whatsapp?: boolean | null;
            /** Roles */
            roles?: string[] | null;
            /** Token */
            token?: string | null;
            /**
             * Is Coordinator
             * @default false
             */
            is_coordinator: boolean;
            /** @description o polo que a pessoa coordena (se coordena) */
            hub?: components["schemas"]["HubOut"] | null;
            /**
             * Detail
             * @description presente quando a pessoa existe mas NÃO coordena polo
             */
            detail?: string | null;
        };
        /** HubLeadRowOut */
        HubLeadRowOut: {
            /** External Id */
            external_id: string;
            /** Status */
            status: string;
            /** Name */
            name?: string | null;
            /** Phone */
            phone?: string | null;
            /** Promoter External Id */
            promoter_external_id: string;
            /** Payment Link */
            payment_link?: string | null;
            /** Receipt Url */
            receipt_url?: string | null;
        };
        /** HubLeadDetailOut */
        HubLeadDetailOut: {
            /** External Id */
            external_id: string;
            /** Status */
            status: string;
            /** Failed Reason */
            failed_reason?: string | null;
            /** Created At */
            created_at: string;
            customer: components["schemas"]["LeadCustomerOut"];
            promoter: components["schemas"]["LeadPromoterOut"];
            checkout?: components["schemas"]["LeadCheckoutOut"] | null;
        };
        /** LeadCheckoutOut */
        LeadCheckoutOut: {
            /** Payment Method */
            payment_method?: string | null;
            /** Provider */
            provider?: string | null;
            /** Amount */
            amount?: string | null;
            /** Is Paid */
            is_paid?: boolean | null;
            /** Url */
            url?: string | null;
            /** Receipt Url */
            receipt_url?: string | null;
            /** Qrcode Payload */
            qrcode_payload?: string | null;
            /** Qrcode Image */
            qrcode_image?: string | null;
            /** Due Date */
            due_date?: string | null;
        };
        /** EnrollmentFeeDictOut */
        EnrollmentFeeDictOut: {
            /** Status */
            status: string;
            /** Amount */
            amount: string;
            /** Scheduled For */
            scheduled_for?: string | null;
            /** Paid */
            paid: boolean;
            /** Last Error */
            last_error?: string | null;
        };
        /** EnrollmentFeesOut */
        EnrollmentFeesOut: {
            first?: components["schemas"]["EnrollmentFeeDictOut"] | null;
            second?: components["schemas"]["EnrollmentFeeDictOut"] | null;
            /**
             * First Paid
             * @default false
             */
            first_paid: boolean;
            /**
             * Second Scheduled
             * @default false
             */
            second_scheduled: boolean;
        };
        /** HubEnrollmentRowOut */
        HubEnrollmentRowOut: {
            /** External Id */
            external_id: string;
            /** Name */
            name?: string | null;
            /** Phone */
            phone?: string | null;
            /** Status */
            status: string;
            fees: components["schemas"]["EnrollmentFeesOut"];
            /** Created At */
            created_at: string;
        };
        /** EnrollmentEducationOut */
        EnrollmentEducationOut: {
            /** Level */
            level?: string | null;
            /** Grade */
            grade?: number | null;
            /** Completed */
            completed?: boolean | null;
            /** Last School */
            last_school?: string | null;
            /** City */
            city?: string | null;
            /** State */
            state?: string | null;
            /** Last Year When */
            last_year_when?: string | null;
        };
        /** EnrollmentRgOut */
        EnrollmentRgOut: {
            /** Number */
            number?: string | null;
            /** Issuing Agency */
            issuing_agency?: string | null;
            /** Issue Date */
            issue_date?: string | null;
            /** Front Photo */
            front_photo?: string | null;
            /** Back Photo */
            back_photo?: string | null;
            /** Full Photo */
            full_photo?: string | null;
            /** Analysis Status */
            analysis_status?: string | null;
            /** Analysis Reason */
            analysis_reason?: string | null;
            /** Validation Status */
            validation_status?: string | null;
            /** Validation Reason */
            validation_reason?: string | null;
            /** Missing Fields */
            missing_fields?: string[];
        };
        /** EnrollmentSelfieOut */
        EnrollmentSelfieOut: {
            /** Exists */
            exists: boolean;
            /** Photo */
            photo?: string | null;
            /** Taken At */
            taken_at?: string | null;
            /** Status */
            status?: string | null;
            /** Analysis Status */
            analysis_status?: string | null;
            /** Analysis Reason */
            analysis_reason?: string | null;
            /** Expires At */
            expires_at?: string | null;
            /**
             * Verified
             * @default false
             */
            verified: boolean;
            /** Description */
            description?: string | null;
        };
        /** HubEnrollmentDetailOut */
        HubEnrollmentDetailOut: {
            /** External Id */
            external_id: string;
            /** Status */
            status: string;
            /** Hub External Id */
            hub_external_id: string;
            /** Selfie Verified */
            selfie_verified: boolean;
            /** Selfie Status */
            selfie_status?: string | null;
            /** Analysis Status */
            analysis_status?: string | null;
            profile?: components["schemas"]["EnrollmentProfileOut"] | null;
            /**
             * Address Complete
             * @default false
             */
            address_complete: boolean;
            address?: components["schemas"]["PublicAddressOut"] | null;
            selfie?: components["schemas"]["EnrollmentSelfieOut"] | null;
            rg?: components["schemas"]["EnrollmentRgOut"] | null;
            education?: components["schemas"]["EnrollmentEducationOut"] | null;
            fees: components["schemas"]["EnrollmentFeesOut"];
        };
        /** FeeIn */
        FeeIn: {
            /** Qr Code */
            qr_code: string;
            /** Amount */
            amount?: string | null;
        };
        /** EnrollmentActionOut */
        EnrollmentActionOut: {
            /** External Id */
            external_id: string;
            /** Status */
            status: string;
        };
        /** ConcludeIn */
        ConcludeIn: {
            /** Platform Login */
            platform_login: string;
            /** Platform Password */
            platform_password: string;
            /** Platform Url */
            platform_url?: string | null;
            /** Platform Notes */
            platform_notes?: string | null;
        };
        /** ProxyCepIn */
        ProxyCepIn: {
            /** Cep */
            cep: string;
        };
        /** RgPhotoUploadOut */
        RgPhotoUploadOut: {
            /** Stored */
            stored: string;
            /** Analysis Status */
            analysis_status?: string | null;
            /** Poll After Ms */
            poll_after_ms: number;
            /** Expires At */
            expires_at?: string | null;
        };
        /** CorrectIdentityIn */
        CorrectIdentityIn: {
            /** Mother Name */
            mother_name?: string | null;
            /** Father Name */
            father_name?: string | null;
            /** Marital Status */
            marital_status?: string | null;
            /** Nationality */
            nationality?: string | null;
            /** Birthplace */
            birthplace?: string | null;
        };
        /** ReviewItemOut */
        ReviewItemOut: {
            /**
             * External Id
             * @description id do recurso a decidir
             */
            external_id: string;
            /**
             * Type
             * @description enrollment | candidate | student | promoter
             */
            type: string;
            /**
             * Kind
             * @description rg | selfie | document | awaiting_approval | locked_training
             */
            kind: string;
            /** Name */
            name?: string | null;
            /** Doc Type */
            doc_type?: string | null;
            /** Since */
            since?: string | null;
            /** Rejected */
            rejected?: boolean | null;
            /** Document External Id */
            document_external_id?: string | null;
            /** Student External Id */
            student_external_id?: string | null;
            /** Promoter External Id */
            promoter_external_id?: string | null;
            /** Pending Materials */
            pending_materials?: {
                [key: string]: unknown;
            }[] | null;
        };
        /** ReviewsOut */
        ReviewsOut: {
            /** Enrollment Rg */
            enrollment_rg?: components["schemas"]["ReviewItemOut"][];
            /** Enrollment Selfie */
            enrollment_selfie?: components["schemas"]["ReviewItemOut"][];
            /** Candidate Document */
            candidate_document?: components["schemas"]["ReviewItemOut"][];
            /** Candidate Selfie */
            candidate_selfie?: components["schemas"]["ReviewItemOut"][];
            /** Student Documents */
            student_documents?: components["schemas"]["ReviewItemOut"][];
            /** Candidates Awaiting Approval */
            candidates_awaiting_approval?: components["schemas"]["ReviewItemOut"][];
            /** Locked Promoters */
            locked_promoters?: components["schemas"]["ReviewItemOut"][];
        };
        /** EnrollmentRgDecideOut */
        EnrollmentRgDecideOut: {
            /** External Id */
            external_id: string;
            /** Status */
            status: string;
            /** Rg Validation Status */
            rg_validation_status: string;
        };
        /** SelfieDecideIn */
        SelfieDecideIn: {
            /** Approve */
            approve: boolean;
            /** Reason */
            reason?: string | null;
        };
        /** AddressProofDecideOut */
        AddressProofDecideOut: {
            /** External Id */
            external_id: string;
            /** Status */
            status: string;
        };
        /** EnrollmentSelfieDecideOut */
        EnrollmentSelfieDecideOut: {
            /** External Id */
            external_id: string;
            /** Status */
            status: string;
            /** Selfie Status */
            selfie_status: string;
            /** Selfie Verified */
            selfie_verified: boolean;
        };
        /** CandidateSelfieDecideOut */
        CandidateSelfieDecideOut: {
            /** External Id */
            external_id: string;
            /** Selfie Status */
            selfie_status: string;
            /** Status */
            status: string;
        };
        /** CandidateSelfieDetailOut */
        CandidateSelfieDetailOut: {
            /** External Id */
            external_id: string;
            user: components["schemas"]["CandidateUserOut"];
            selfie: components["schemas"]["EnrollmentSelfieOut"];
            /** In Review */
            in_review: boolean;
        };
        /** CandidateUserOut */
        CandidateUserOut: {
            /** External Id */
            external_id: string;
            /** Name */
            name?: string | null;
            /** Cpf */
            cpf?: string | null;
            /** Phone */
            phone?: string | null;
            /** Email */
            email?: string | null;
        };
        /** HubStudentRowOut */
        HubStudentRowOut: {
            /** External Id */
            external_id: string;
            /** Name */
            name?: string | null;
            /** Phone */
            phone?: string | null;
            /** Status */
            status: string;
            /** Created At */
            created_at: string;
        };
        /** PaginatedStudentsOut */
        PaginatedStudentsOut: {
            /** Items */
            items: components["schemas"]["HubStudentRowOut"][];
            /** Total */
            total: number;
            /** Limit */
            limit: number;
            /** Offset */
            offset: number;
        };
        /** HubStudentDetailOut */
        HubStudentDetailOut: {
            /** External Id */
            external_id: string;
            /** Status */
            status: string;
            /** Hub External Id */
            hub_external_id: string;
            /** Blood Type */
            blood_type?: string | null;
            /** Self Study */
            self_study: boolean;
            platform: components["schemas"]["StudentPlatformFields"];
            /** Documents */
            documents?: components["schemas"]["StudentDocItemOut"][];
            /** Pendencies */
            pendencies?: components["schemas"]["StudentPendencyOut"][];
            diploma?: components["schemas"]["StudentDiplomaOut"] | null;
            user: components["schemas"]["StudentUserOut"];
        };
        /** StudentDocItemOut */
        StudentDocItemOut: {
            /** External Id */
            external_id: string;
            /** Doc Type */
            doc_type: string;
            /** Photo */
            photo?: string | null;
            /** Validation Status */
            validation_status: string;
            /** Has Photo */
            has_photo: boolean;
            /** Analysis Status */
            analysis_status?: string | null;
            /** Analysis Reason */
            analysis_reason?: string | null;
            /** Expires At */
            expires_at?: string | null;
        };
        /** StudentUserOut */
        StudentUserOut: {
            /** External Id */
            external_id: string;
            /** Name */
            name?: string | null;
            /** Cpf */
            cpf?: string | null;
            /** Phone */
            phone?: string | null;
            /** Email */
            email?: string | null;
        };
        /** ExamOut */
        ExamOut: {
            /** External Id */
            external_id: string;
            /** Result */
            result: string;
        };
        /** ExamGradeIn */
        ExamGradeIn: {
            /** Passed */
            passed: boolean;
            /** Notes */
            notes?: string | null;
        };
        /** DocDecisionOut */
        DocDecisionOut: {
            /** External Id */
            external_id: string;
            /** Validation Status */
            validation_status: string;
        };
        /** DocDecideIn */
        DocDecideIn: {
            /** Approve */
            approve: boolean;
            /** Reason */
            reason?: string | null;
        };
        /** PendencyIn */
        PendencyIn: {
            /** Kind */
            kind: string;
            /** Description */
            description: string;
            /** Amount Cents */
            amount_cents?: number | null;
        };
        /** DiplomaIssueOut */
        DiplomaIssueOut: {
            /** External Id */
            external_id: string;
            /** Issued At */
            issued_at?: string | null;
        };
        /** CandidateAwaitingOut */
        CandidateAwaitingOut: {
            /** External Id */
            external_id: string;
            /** Name */
            name?: string | null;
            /** Since */
            since?: string | null;
            /** Rejected */
            rejected: boolean;
        };
        /** CandidateDetailOut */
        CandidateDetailOut: {
            /** External Id */
            external_id: string;
            /** Status */
            status: string;
            user: components["schemas"]["CandidateUserOut"];
            /** Doc Type */
            doc_type?: string | null;
            document?: components["schemas"]["CandidateDocumentDetailOut"] | null;
            /** Mother Name */
            mother_name?: string | null;
            /** Father Name */
            father_name?: string | null;
            /** Marital Status */
            marital_status?: string | null;
            /** Birthplace */
            birthplace?: string | null;
            /** Nationality */
            nationality?: string | null;
            /** Pix Key */
            pix_key?: string | null;
            /** Pix Key Type */
            pix_key_type?: string | null;
            /** Pix Validated */
            pix_validated: boolean;
            /** Selfie Status */
            selfie_status: string;
            /** Selfie Image */
            selfie_image?: string | null;
            /** Selfie Description */
            selfie_description?: string | null;
        };
        /** CandidateDocumentDetailOut */
        CandidateDocumentDetailOut: {
            /** Doc Type */
            doc_type: string;
            /** Front Photo */
            front_photo?: string | null;
            /** Back Photo */
            back_photo?: string | null;
            /** Full Photo */
            full_photo?: string | null;
            /** Analysis Status */
            analysis_status?: string | null;
            /** Analysis Reason */
            analysis_reason?: string | null;
        };
        /** CandidateActionOut */
        CandidateActionOut: {
            /** External Id */
            external_id: string;
            /** Status */
            status: string;
        };
        /** RejectIn */
        RejectIn: {
            /** Reason */
            reason: string;
        };
        /** HubPromoterRowOut */
        HubPromoterRowOut: {
            /** External Id */
            external_id: string;
            /** Name */
            name?: string | null;
            /** Status */
            status: string;
            /** Locked */
            locked: boolean;
        };
        /** MaterialApproveOut */
        MaterialApproveOut: {
            /** Promoter External Id */
            promoter_external_id: string;
            /** Material External Id */
            material_external_id: string;
            /** Locked */
            locked: boolean;
        };
        /**
         * ToolLeadOut
         * @description Linha do radar de leads (mesmo shape da listagem staff/hub).
         */
        ToolLeadOut: {
            /** External Id */
            external_id: string;
            /** Status */
            status: string;
            /** Name */
            name?: string | null;
            /** Phone */
            phone?: string | null;
            /** Promoter External Id */
            promoter_external_id: string;
            /** Payment Link */
            payment_link?: string | null;
            /** Receipt Url */
            receipt_url?: string | null;
            /** Created At */
            created_at: string;
        };
        /** ToolsNotifySentOut */
        ToolsNotifySentOut: {
            /** External Id */
            external_id: string;
        };
        /**
         * ToolsNotifyIn
         * @description Aceita usuário cadastrado ou destino livre para envio pelo notify-server.
         */
        ToolsNotifyIn: {
            /** User External Id */
            user_external_id?: string | null;
            /** Phone */
            phone?: string | null;
            /** Email */
            email?: string | null;
            /** Subject */
            subject?: string | null;
            /** Message */
            message: string;
            /** Channels */
            channels?: string[] | null;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
};
export type $defs = Record<string, never>;
export interface operations {
    staff_api_base_health: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HealthOut"];
                };
            };
        };
    };
    staff_api_base_whoami: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WhoamiOut"];
                };
            };
        };
    };
    staff_api_staff_routers_auth_staff_check: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StaffCheckIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StaffCheckOut"];
                };
            };
        };
    };
    staff_api_staff_routers_auth_staff_login: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StaffLoginIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TokenOut"];
                };
            };
        };
    };
    staff_api_staff_routers_auth_staff_login_password: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StaffLoginPasswordIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TokenOut"];
                };
            };
        };
    };
    staff_api_base_refresh: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RefreshIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TokenOut"];
                };
            };
        };
    };
    staff_api_staff_routers_hubs_list_hubs: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HubOut"][];
                };
            };
        };
    };
    staff_api_staff_routers_hubs_create_hub: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["HubCreateIn"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HubOut"];
                };
            };
        };
    };
    staff_api_staff_routers_hubs_list_promoters: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PromoterOut"][];
                };
            };
        };
    };
    staff_api_staff_routers_hubs_set_coordinator: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SetCoordinatorIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HubOut"];
                };
            };
        };
    };
    staff_api_staff_routers_hubs_set_default_hub: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HubOut"];
                };
            };
        };
    };
    staff_api_staff_routers_hubs_set_hub_address: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["HubAddressIn"] | components["schemas"]["HubAddressPatchIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HubOut"];
                };
            };
        };
    };
    staff_api_staff_routers_materials_list_materials: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StaffMaterialOut"][];
                };
            };
        };
    };
    staff_api_staff_routers_materials_create_material: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MaterialIn"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StaffMaterialOut"];
                };
            };
        };
    };
    staff_api_staff_routers_materials_update_material: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MaterialUpdateIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StaffMaterialOut"];
                };
            };
        };
    };
    staff_api_staff_routers_materials_delete_material: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeleteMaterialOut"];
                };
            };
        };
    };
    staff_api_staff_routers_materials_publish_material: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublishMaterialOut"];
                };
            };
        };
    };
    staff_api_staff_routers_materials_upload_material_video: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /**
                     * File
                     * Format: binary
                     */
                    file: string;
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StaffMaterialOut"];
                };
            };
        };
    };
    staff_api_staff_routers_finance_finance_balance: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FinanceBalanceOut"];
                };
            };
        };
    };
    staff_api_staff_routers_finance_finance_summary: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FinanceSummaryOut"];
                };
            };
        };
    };
    staff_api_staff_routers_finance_finance_commissions: {
        parameters: {
            query?: {
                status?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StaffCommissionOut"][];
                };
            };
        };
    };
    staff_api_staff_routers_finance_finance_payouts: {
        parameters: {
            query?: {
                status?: string | null;
                kind?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StaffPaymentRequestOut"][];
                };
            };
        };
    };
    staff_api_staff_routers_finance_create_manual_payment: {
        parameters: {
            query?: never;
            header?: {
                "Idempotency-Key"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /** Kind */
                    kind: string;
                    /** Amount */
                    amount?: string | null;
                    /** Description */
                    description?: string | null;
                    /** Supplier Name */
                    supplier_name?: string | null;
                    /** Pix Key */
                    pix_key?: string | null;
                    /** Boleto Line */
                    boleto_line?: string | null;
                    /** Receipt */
                    receipt?: string | null;
                };
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ManualPaymentOut"];
                };
            };
        };
    };
    staff_api_staff_routers_finance_run_closing: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WeeklyClosingResultOut"];
                };
            };
        };
    };
    staff_api_staff_routers_finance_closing_health: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClosingHealthOut"];
                };
            };
        };
    };
    staff_api_staff_routers_finance_closing_simulation: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClosingSimulationOut"];
                };
            };
        };
    };
    staff_api_staff_routers_finance_retry_payout: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PayoutRetryOut"];
                };
            };
        };
    };
    staff_api_staff_routers_finance_override_payout_pix: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/x-www-form-urlencoded": {
                    /** Pix Key */
                    pix_key: string;
                    /**
                     * Update Profile
                     * @default true
                     */
                    update_profile?: boolean;
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PayoutOverridePixOut"];
                };
            };
        };
    };
    staff_api_staff_routers_finance_get_ledger: {
        parameters: {
            query?: {
                account_code?: string | null;
                entry_type?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LedgerEntryOut"][];
                };
            };
        };
    };
    staff_api_staff_routers_finance_get_transactions: {
        parameters: {
            query?: {
                kind?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FinancialTransactionOut"][];
                };
            };
        };
    };
    staff_api_staff_routers_finance_get_cashflow: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CashflowOverviewOut"];
                };
            };
        };
    };
    staff_api_staff_routers_finance_create_manual_adjustment: {
        parameters: {
            query?: never;
            header?: {
                "Idempotency-Key"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ManualAdjustmentIn"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FinancialTransactionOut"];
                };
            };
        };
    };
    staff_api_staff_routers_finance_create_unexpected_expense_endpoint: {
        parameters: {
            query?: never;
            header?: {
                "Idempotency-Key"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /** Category */
                    category: string;
                    /** Amount */
                    amount: string;
                    /** Description */
                    description: string;
                    /** Justification */
                    justification: string;
                    /** Supplier Name */
                    supplier_name?: string | null;
                    /**
                     * Method
                     * @default pix_key
                     */
                    method?: string;
                    /** Pix Key */
                    pix_key?: string | null;
                    /** Boleto Line */
                    boleto_line?: string | null;
                    /** Receipt */
                    receipt?: string | null;
                };
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UnexpectedExpenseOut"];
                };
            };
        };
    };
    staff_api_staff_routers_finance_list_disputes: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DisputeRecordOut"][];
                };
            };
        };
    };
    staff_api_staff_routers_finance_resolve_dispute_endpoint: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_dispute_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DisputeResolveIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DisputeRecordOut"];
                };
            };
        };
    };
    staff_api_staff_routers_finance_get_financial_audit: {
        parameters: {
            query?: {
                action?: string | null;
                target_model?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FinancialAuditLogOut"][];
                };
            };
        };
    };
    staff_api_staff_routers_users_list_all_leads: {
        parameters: {
            query?: {
                hub?: string | null;
                status?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StaffLeadOut"][];
                };
            };
        };
    };
    staff_api_staff_routers_users_mark_lead_paid: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StaffLeadMarkPaidOut"];
                };
            };
        };
    };
    staff_api_staff_routers_users_purge_funnel_user: {
        parameters: {
            query?: {
                user_external_id?: string | null;
                lead_external_id?: string | null;
                candidate_external_id?: string | null;
                cpf?: string | null;
                phone?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StaffPurgeFunnelUserOut"];
                };
            };
        };
    };
    staff_api_staff_routers_users_list_all_enrollments: {
        parameters: {
            query?: {
                hub?: string | null;
                status?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StaffEnrollmentOut"][];
                };
            };
        };
    };
    staff_api_staff_routers_users_list_all_students: {
        parameters: {
            query?: {
                hub?: string | null;
                status?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StaffStudentOut"][];
                };
            };
        };
    };
    staff_api_staff_routers_users_set_student_platform_credentials: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PlatformCredentialsIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StaffStudentPlatformCredentialsOut"];
                };
            };
        };
    };
    staff_api_staff_routers_users_list_users: {
        parameters: {
            query?: {
                role?: string | null;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StaffUserOut"][];
                };
            };
        };
    };
    staff_api_staff_routers_users_set_user_phone: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PhoneIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StaffUserPhoneOut"];
                };
            };
        };
    };
    staff_api_staff_routers_coordinators_list_coordinators: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CoordinatorOut"][];
                };
            };
        };
    };
    staff_api_staff_routers_config_get_bootstrap_status: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BootstrapStatusOut"];
                };
            };
        };
    };
    staff_api_staff_routers_config_init_platform_bootstrap: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BootstrapInitIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BootstrapInitOut"];
                };
            };
        };
    };
    staff_api_staff_routers_config_get_platform_setup: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PlatformSetupOut"];
                };
            };
        };
    };
    staff_api_staff_routers_config_update_platform_setup: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PlatformSetupIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PlatformSetupOut"];
                };
            };
        };
    };
    staff_api_staff_routers_config_run_seed_defaults: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SeedRunOut"];
                };
            };
        };
    };
    staff_api_staff_routers_config_test_integration_live: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                name: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IntegrationTestLiveOut"];
                };
            };
        };
    };
    staff_api_staff_routers_notify_list_templates: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NotifyTemplateOut"][];
                };
            };
        };
    };
    staff_api_staff_routers_notify_template_stats: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NotifyTemplateStatsOut"];
                };
            };
        };
    };
    staff_api_staff_routers_notify_list_events: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NotifyEventOut"][];
                };
            };
        };
    };
    staff_api_staff_routers_notify_ai_assist: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AiAssistIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AiAssistOut"];
                };
            };
        };
    };
    staff_api_staff_routers_notify_get_template: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                event: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NotifyTemplateOut"];
                };
            };
        };
    };
    staff_api_staff_routers_notify_patch_template: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                event: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TemplatePatchIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NotifyTemplateOut"];
                };
            };
        };
    };
    staff_api_staff_routers_notify_restore_seed: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                event: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NotifyTemplateOut"];
                };
            };
        };
    };
    staff_api_staff_routers_notify_preview_template: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                event: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PreviewIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NotifyPreviewOut"];
                };
            };
        };
    };
    staff_api_staff_routers_notify_test_template: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                event: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TestIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NotifyTestOut"];
                };
            };
        };
    };
    staff_api_staff_routers_notify_notify_history: {
        parameters: {
            query?: {
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NotifyHistoryItemOut"][];
                };
            };
        };
    };
    staff_api_staff_routers_notify_tts_config: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TtsConfigOut"];
                };
            };
        };
    };
    staff_api_staff_routers_notify_tts_probe: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TtsProbeIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TtsProbeOut"];
                };
            };
        };
    };
    staff_api_staff_routers_documents_list_global_document_reviews: {
        parameters: {
            query?: {
                hub?: string | null;
                doc_type?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DocumentReviewOut"][];
                };
            };
        };
    };
    staff_api_staff_routers_documents_get_user_dossier: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                user_external_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserDossierOut"];
                };
            };
        };
    };
    staff_api_staff_routers_documents_decide_document_staff: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                user_external_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DocumentDecideIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DocumentDecideOut"];
                };
            };
        };
    };
    staff_api_staff_routers_network_get_network_tree: {
        parameters: {
            query?: {
                hub?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NetworkTreeHubOut"][];
                };
            };
        };
    };
    staff_api_staff_routers_training_list_training_submissions: {
        parameters: {
            query?: {
                status?: string | null;
                material_id?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TrainingSubmissionOut"][];
                };
            };
        };
    };
    staff_api_staff_routers_training_override_submission_grade: {
        parameters: {
            query: {
                grade: string;
                approve: boolean;
                justification?: string | null;
            };
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TrainingOverrideOut"];
                };
            };
        };
    };
    staff_api_staff_routers_training_unlock_promoter_training: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                promoter_external_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TrainingUnlockOut"];
                };
            };
        };
    };
    staff_api_staff_routers_system_list_integrations: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IntegrationStatusOut"][];
                };
            };
        };
    };
    staff_api_staff_routers_system_integration_detail: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                name: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IntegrationDetailOut"];
                };
            };
        };
    };
    staff_api_staff_routers_system_integration_setup: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
        };
    };
    staff_api_staff_routers_system_integration_test: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
        };
    };
    staff_api_staff_routers_system_system_status: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SystemStatusOut"];
                };
            };
        };
    };
    staff_api_staff_routers_system_logs_ai_calls: {
        parameters: {
            query?: {
                status?: string | null;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AiCallLogOut"][];
                };
            };
        };
    };
    staff_api_staff_routers_system_logs_checks: {
        parameters: {
            query?: {
                scope?: string | null;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ValidationCheckLogOut"][];
                };
            };
        };
    };
    staff_api_health_router_staff_health: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StaffHealthFullOut"];
                };
            };
        };
    };
    health_api_base_health: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HealthOut"];
                };
            };
        };
    };
    health_api_base_whoami: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WhoamiOut"];
                };
            };
        };
    };
    health_api_health_router_healthz: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HealthzOut"];
                };
            };
        };
    };
    clients_api_base_health: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HealthOut"];
                };
            };
        };
    };
    clients_api_base_whoami: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WhoamiOut"];
                };
            };
        };
    };
    clients_api_clients_routers_pricing_pricing: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PricingOut"];
                };
            };
        };
    };
    clients_api_clients_routers_pricing_referral: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                ref: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReferralOut"];
                };
            };
        };
    };
    clients_api_clients_routers_auth_register: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LeadCreateIn"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LeadOut"];
                };
            };
        };
    };
    clients_api_clients_routers_auth_check: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CheckIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CheckOut"];
                };
            };
        };
    };
    clients_api_base_login: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LoginIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TokenOut"];
                };
            };
        };
    };
    clients_api_base_refresh: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RefreshIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TokenOut"];
                };
            };
        };
    };
    clients_api_clients_routers_lead_lead_me: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LeadMeOut"];
                };
            };
        };
    };
    clients_api_clients_routers_lead_lead_checkout_url: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UrlOut"];
                };
            };
        };
    };
    clients_api_clients_routers_lead_lead_identity: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["IdentityIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IdentityOut"];
                };
            };
        };
    };
    clients_api_clients_routers_lead_lead_email: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmailIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EmailOut"];
                };
            };
        };
    };
    clients_api_clients_routers_lead_lead_set_checkout: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CheckoutSetIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CheckoutOut"];
                };
            };
        };
    };
    clients_api_clients_routers_enrollment_enrollment_me: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EnrollmentMeOut"];
                };
            };
        };
    };
    clients_api_clients_routers_enrollment_enrollment_rg_photo: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                slot: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /**
                     * File
                     * Format: binary
                     */
                    file: string;
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RgUploadAck"];
                };
            };
        };
    };
    clients_api_clients_routers_enrollment_enrollment_document_classify: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /**
                     * File
                     * Format: binary
                     */
                    file: string;
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DocClassifyOut"];
                };
            };
        };
    };
    clients_api_clients_routers_enrollment_enrollment_rg_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RgSectionOut"];
                };
            };
        };
    };
    clients_api_clients_routers_enrollment_enrollment_rg_patch: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RgPatchIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EnrollmentMeOut"];
                };
            };
        };
    };
    clients_api_clients_routers_enrollment_enrollment_get_address: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicAddressOut"];
                };
            };
        };
    };
    clients_api_clients_routers_enrollment_enrollment_address: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AddressCepIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EnrollmentMeOut"];
                };
            };
        };
    };
    clients_api_clients_routers_enrollment_enrollment_address_patch: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AddressDataIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EnrollmentMeOut"];
                };
            };
        };
    };
    clients_api_clients_routers_enrollment_enrollment_address_proof: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /**
                     * File
                     * Format: binary
                     */
                    file: string;
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EnrollmentMeOut"];
                };
            };
        };
    };
    clients_api_clients_routers_enrollment_enrollment_address_proof_kinship: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["KinshipIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EnrollmentMeOut"];
                };
            };
        };
    };
    clients_api_clients_routers_enrollment_enrollment_get_education: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EducationOut"];
                };
            };
        };
    };
    clients_api_clients_routers_enrollment_enrollment_education: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EducationIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EnrollmentMeOut"];
                };
            };
        };
    };
    clients_api_clients_routers_enrollment_enrollment_get_selfie: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SelfieOut"];
                };
            };
        };
    };
    clients_api_clients_routers_enrollment_enrollment_selfie: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /**
                     * File
                     * Format: binary
                     */
                    file: string;
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EnrollmentMeOut"];
                };
            };
        };
    };
    clients_api_clients_routers_enrollment_get_current_contract: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ContractOut"];
                };
            };
        };
    };
    clients_api_clients_routers_student_student_me: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudentMeOut"];
                };
            };
        };
    };
    clients_api_clients_routers_student_veteran_me: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VeteranMeOut"];
                };
            };
        };
    };
    clients_api_clients_routers_student_student_blood_type: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BloodTypeIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudentMeOut"];
                };
            };
        };
    };
    clients_api_clients_routers_student_student_document: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                doc_type: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /**
                     * File
                     * Format: binary
                     */
                    file: string;
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudentDocumentUploadAck"];
                };
            };
        };
    };
    clients_api_clients_routers_student_student_exam_schedule: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ExamScheduleIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudentMeOut"];
                };
            };
        };
    };
    clients_api_clients_routers_student_student_pendencies: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PendencyOut"][];
                };
            };
        };
    };
    clients_api_clients_routers_blocks_my_blocks: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BlockOut"][];
                };
            };
        };
    };
    clients_api_clients_routers_blocks_my_block: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                block_id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BlockOut"];
                };
            };
        };
    };
    clients_api_clients_routers_blocks_resolve_block: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                block_id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BlockOut"];
                };
            };
        };
    };
    collaborators_api_base_health: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HealthOut"];
                };
            };
        };
    };
    collaborators_api_base_whoami: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WhoamiOut"];
                };
            };
        };
    };
    collaborators_api_collaborators_routers_auth_register: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CandidateCreateIn"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CandidateOut"];
                };
            };
        };
    };
    collaborators_api_collaborators_routers_auth_check: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CheckIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CheckOut"];
                };
            };
        };
    };
    collaborators_api_collaborators_routers_auth_join: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CandidateJoinIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TokenOut"];
                };
            };
        };
    };
    collaborators_api_base_login: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LoginIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TokenOut"];
                };
            };
        };
    };
    collaborators_api_base_refresh: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RefreshIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TokenOut"];
                };
            };
        };
    };
    collaborators_api_collaborators_routers_candidate_candidate_me: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CandidateMeOut"];
                };
            };
        };
    };
    collaborators_api_collaborators_routers_candidate_candidate_profile: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProfileIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CandidateMeOut"];
                };
            };
        };
    };
    collaborators_api_collaborators_routers_candidate_candidate_get_address: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicAddressOut"];
                };
            };
        };
    };
    collaborators_api_collaborators_routers_candidate_candidate_address: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AddressCepIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CandidateMeOut"];
                };
            };
        };
    };
    collaborators_api_collaborators_routers_candidate_candidate_address_patch: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AddressDataIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CandidateMeOut"];
                };
            };
        };
    };
    collaborators_api_collaborators_routers_candidate_candidate_documents: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DocumentsIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CandidateMeOut"];
                };
            };
        };
    };
    collaborators_api_collaborators_routers_candidate_candidate_get_document: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CandidateDocumentSectionOut"];
                };
            };
        };
    };
    collaborators_api_collaborators_routers_candidate_candidate_patch_document: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DocumentsIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CandidateMeOut"];
                };
            };
        };
    };
    collaborators_api_collaborators_routers_candidate_candidate_document_photo: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                slot: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /**
                     * File
                     * Format: binary
                     */
                    file: string;
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AnalysisAckOut"];
                };
            };
        };
    };
    collaborators_api_collaborators_routers_candidate_candidate_document_classify: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /**
                     * File
                     * Format: binary
                     */
                    file: string;
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DocClassifyOut"];
                };
            };
        };
    };
    collaborators_api_collaborators_routers_candidate_candidate_address_proof: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /**
                     * File
                     * Format: binary
                     */
                    file: string;
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CandidateMeOut"];
                };
            };
        };
    };
    collaborators_api_collaborators_routers_candidate_candidate_address_proof_kinship: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["KinshipIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CandidateMeOut"];
                };
            };
        };
    };
    collaborators_api_collaborators_routers_candidate_candidate_pix: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PixIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CandidateMeOut"];
                };
            };
        };
    };
    collaborators_api_collaborators_routers_candidate_candidate_education: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EducationIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CandidateMeOut"];
                };
            };
        };
    };
    collaborators_api_collaborators_routers_candidate_get_candidate_selfie: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CandidateSelfieOut"];
                };
            };
        };
    };
    collaborators_api_collaborators_routers_candidate_candidate_selfie: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /**
                     * File
                     * Format: binary
                     */
                    file: string;
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AnalysisAckOut"];
                };
            };
        };
    };
    collaborators_api_collaborators_routers_candidate_get_current_contract: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ContractOut"];
                };
            };
        };
    };
    collaborators_api_collaborators_routers_training_training_materials: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TrainingMaterialOut"][];
                };
            };
        };
    };
    collaborators_api_collaborators_routers_training_training_progress: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TrainingMaterialProgressOut"][];
                };
            };
        };
    };
    collaborators_api_collaborators_routers_training_training_submit: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SubmissionIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SubmissionOut"];
                };
            };
        };
    };
    collaborators_api_collaborators_routers_training_training_submit_audio: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /** Material External Id */
                    material_external_id: string;
                    /**
                     * File
                     * Format: binary
                     */
                    file: string;
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SubmissionOut"];
                };
            };
        };
    };
    collaborators_api_collaborators_routers_promoter_promoter_me: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PromoterMeOut"];
                };
            };
        };
    };
    collaborators_api_collaborators_routers_promoter_promoter_leads: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PromoterLeadOut"][];
                };
            };
        };
    };
    collaborators_api_collaborators_routers_promoter_promoter_lead_invite: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PromoterLeadInviteIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PromoterLeadInviteOut"];
                };
            };
        };
    };
    collaborators_api_collaborators_routers_promoter_promoter_commissions: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PromoterCommissionOut"][];
                };
            };
        };
    };
    collaborators_api_collaborators_routers_promoter_promoter_summary: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PromoterSummaryOut"];
                };
            };
        };
    };
    collaborators_api_collaborators_routers_promoter_promoter_study_pricing: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudyPricingOut"];
                };
            };
        };
    };
    collaborators_api_collaborators_routers_promoter_promoter_study_start: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StudyStartIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudyStartOut"];
                };
            };
        };
    };
    leadership_api_base_health: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HealthOut"];
                };
            };
        };
    };
    leadership_api_base_whoami: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WhoamiOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_auth_check: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CheckIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CoordinatorCheckOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_auth_login: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LoginIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TokenOut"];
                };
            };
        };
    };
    leadership_api_base_refresh: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RefreshIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TokenOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_leads_list_hub_leads: {
        parameters: {
            query?: {
                status?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HubLeadRowOut"][];
                };
            };
        };
    };
    leadership_api_leadership_routers_leads_get_hub_lead: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HubLeadDetailOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_enrollments_list_hub_enrollments: {
        parameters: {
            query?: {
                status?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HubEnrollmentRowOut"][];
                };
            };
        };
    };
    leadership_api_leadership_routers_enrollments_get_hub_enrollment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HubEnrollmentDetailOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_enrollments_pay_enrollment_fee: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["FeeIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EnrollmentFeesOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_enrollments_schedule_enrollment_fee: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["FeeIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EnrollmentFeesOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_enrollments_conclude_enrollment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ConcludeIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EnrollmentActionOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_enrollments_coord_proxy_address: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProxyCepIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HubEnrollmentDetailOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_enrollments_coord_proxy_rg_photo: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
                slot: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /**
                     * File
                     * Format: binary
                     */
                    file: string;
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RgPhotoUploadOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_enrollments_coord_proxy_selfie: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /**
                     * File
                     * Format: binary
                     */
                    file: string;
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HubEnrollmentDetailOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_enrollments_coord_correct_identity: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CorrectIdentityIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HubEnrollmentDetailOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_reviews_list_reviews: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReviewsOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_reviews_decide_enrollment_rg: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SelfieDecideIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EnrollmentRgDecideOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_reviews_decide_enrollment_address_proof: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SelfieDecideIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AddressProofDecideOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_reviews_decide_enrollment_selfie: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SelfieDecideIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EnrollmentSelfieDecideOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_reviews_decide_candidate_selfie: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SelfieDecideIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CandidateSelfieDecideOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_reviews_get_candidate_selfie_for_coordinator: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CandidateSelfieDetailOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_reviews_decide_candidate_document: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SelfieDecideIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CandidateMeOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_reviews_reset_candidate_doc_type: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CandidateMeOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_students_list_hub_students: {
        parameters: {
            query?: {
                status?: string | null;
                limit?: number;
                offset?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedStudentsOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_students_get_student_for_coordinator: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HubStudentDetailOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_students_grade_exam: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ExamGradeIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExamOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_students_decide_document: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
                document_external_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DocDecideIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DocDecisionOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_students_open_pendency: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PendencyIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudentPendencyOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_students_resolve_pendency: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudentPendencyOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_students_clear_documentation: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EnrollmentActionOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_students_issue_diploma: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /**
                     * Diploma
                     * Format: binary
                     */
                    diploma: string;
                    /** Transcript */
                    transcript?: string | null;
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DiplomaIssueOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_students_register_diploma_pickup: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /**
                     * File
                     * Format: binary
                     */
                    file: string;
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EnrollmentActionOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_students_register_manual_selfie: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /**
                     * File
                     * Format: binary
                     */
                    file: string;
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EnrollmentActionOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_candidates_list_candidates_awaiting: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CandidateAwaitingOut"][];
                };
            };
        };
    };
    leadership_api_leadership_routers_candidates_get_candidate_for_coordinator: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CandidateDetailOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_candidates_approve_candidate: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CandidateActionOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_candidates_reject_candidate: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RejectIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CandidateActionOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_promoters_list_hub_promoters: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HubPromoterRowOut"][];
                };
            };
        };
    };
    leadership_api_leadership_routers_promoters_suspend_promoter: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HubPromoterRowOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_promoters_reactivate_promoter: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HubPromoterRowOut"];
                };
            };
        };
    };
    leadership_api_leadership_routers_promoters_approve_open_material: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                external_id: string;
                material_external_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MaterialApproveOut"];
                };
            };
        };
    };
    tools_api_base_health: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HealthOut"];
                };
            };
        };
    };
    tools_api_base_whoami: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WhoamiOut"];
                };
            };
        };
    };
    tools_api_tools_router_tools_leads: {
        parameters: {
            query?: {
                status?: string | null;
                created_after?: string | null;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ToolLeadOut"][];
                };
            };
        };
    };
    tools_api_tools_router_tools_notifications_send: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ToolsNotifyIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ToolsNotifySentOut"];
                };
            };
        };
    };
}
