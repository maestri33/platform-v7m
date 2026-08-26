# RELATÓRIO DE AUDITORIA QA E2E & TESTE ADVERSARIAL — RODADA 1

**Data/Hora**: 20/08/2026, 16:38:22
**Status Geral**: **PARTIAL**
**Tempo Total de Execução**: 103.14s

## 1. RESUMO EXECUTIVO DAS MÉTRICAS

| Métrica | Valor |
| :--- | :--- |
| **Total de Testes** | **48** |
| **Aprovados (PASS)** | **44** (92%) |
| **Parciais / Avisos (PARTIAL)** | **4** |
| **Falhas (FAIL)** | **0** |

## 2. DETALHAMENTO DOS CENÁRIOS POR SUITE

### Suite: `01_happy_path`

| Teste | Status | Duração / Detalhes |
| :--- | :---: | :--- |
| App Supletivo (desktop) | ✅ PASS | 8014ms |
| App Supletivo (mobile) | ✅ PASS | 5331ms |
| App Promotor (desktop) | ✅ PASS | 18137ms |
| App Promotor (mobile) | ✅ PASS | 9188ms |
| Admin V7M (desktop) | ✅ PASS | 4341ms |
| Admin V7M (mobile) | ✅ PASS | 3857ms |
| Hub V7M (desktop) | ✅ PASS | 1016ms |
| Hub V7M (mobile) | ✅ PASS | 702ms |
| Landing Supletivo (desktop) | ✅ PASS | 3376ms |
| Landing Supletivo (mobile) | ✅ PASS | 1540ms |
| Landing Promotor (desktop) | ✅ PASS | 3251ms |
| Landing Promotor (mobile) | ✅ PASS | 1606ms |
| V7M Institucional (desktop) | ✅ PASS | 2073ms |
| V7M Institucional (mobile) | ✅ PASS | 1306ms |

### Suite: `02_adversarial_inputs`

| Teste | Status | Duração / Detalhes |
| :--- | :---: | :--- |
| App Supletivo: Sanitização de Telefone | ✅ PASS | - |
| App Promotor: Proteção contra SQLi/XSS em Login | ✅ PASS | - |
| Admin V7M: Resiliência a Double-Click | ✅ PASS | - |
| Hub V7M: Contenção de Buffer/Overflow | ✅ PASS | - |

### Suite: `03_network_resilience`

| Teste | Status | Duração / Detalhes |
| :--- | :---: | :--- |
| App Supletivo: Resiliência a Latência Alta (3s) | ✅ PASS | 1373ms |
| Admin V7M: Tratamento Gracioso de HTTP 500 | ✅ PASS | - |
| Hub V7M: Resiliência a Queda de Rede / Abort | ✅ PASS | - |

### Suite: `04_navigation_session`

| Teste | Status | Duração / Detalhes |
| :--- | :---: | :--- |
| Admin Guard: /dashboard | ✅ PASS | - |
| Admin Guard: /financeiro | ✅ PASS | - |
| Admin Guard: /usuarios | ✅ PASS | - |
| Admin Guard: /polos | ✅ PASS | - |
| Admin Guard: /configuracoes | ✅ PASS | - |
| Promotor Guard: /painel | ✅ PASS | - |
| Promotor Guard: /leads | ✅ PASS | - |
| Promotor Guard: /comissoes | ✅ PASS | - |
| Promotor Guard: /conta | ✅ PASS | - |
| App Supletivo: Consistência do Histórico do Navegador | ✅ PASS | - |

### Suite: `05_webhooks_concurrency`

| Teste | Status | Duração / Detalhes |
| :--- | :---: | :--- |
| Asaas Webhook: Rejeição de Token Inválido (401) | ✅ PASS | - |
| Bot Supletivo: Rajada Concorrente (20 reqs) | ✅ PASS | 1880ms |
| Bot Supletivo: Rejeição de JSON Corrompido | ✅ PASS | - |

### Suite: `06_backend_logs`

| Teste | Status | Duração / Detalhes |
| :--- | :---: | :--- |
| Log Audit: v7m-backend-web | ✅ PASS | 0 erros encontrados |
| Log Audit: v7m-backend-qcluster | ⚠️ PARTIAL | 1 erros encontrados |
| Log Audit: v7m-backend-qcluster-slow | ⚠️ PARTIAL | 4 erros encontrados |
| Log Audit: v7m-notify-web | ✅ PASS | 0 erros encontrados |
| Log Audit: v7m-notify-worker | ✅ PASS | 0 erros encontrados |
| Log Audit: v7m-bot-supletivo | ⚠️ PARTIAL | 43 erros encontrados |
| Log Audit: v7m-admin-v7m | ✅ PASS | 0 erros encontrados |
| Log Audit: v7m-hub-v7m | ✅ PASS | 0 erros encontrados |
| Log Audit: v7m-app-supletivo | ⚠️ PARTIAL | 24 erros encontrados |
| Log Audit: v7m-app-v7m | ✅ PASS | 0 erros encontrados |

### Suite: `07_cross_lifecycle`

| Teste | Status | Duração / Detalhes |
| :--- | :---: | :--- |
| Lifecycle: Staff Cockpit & Infraestrutura | ✅ PASS | - |
| Lifecycle: Lead Funil Completo (Telefone->CPF->Email->Checkout) | ✅ PASS | - |
| Lifecycle: Hub Liderança Overview & Métricas | ✅ PASS | - |
| Lifecycle: Renderização Visual dos Portais Ativos | ✅ PASS | - |

## 3. AUDITORIA DE LOGS DOS CONTAINERS DOCKER

| Container | Linhas Analisadas | Erros Detectados | Status |
| :--- | :---: | :---: | :---: |
| `v7m-backend-web` | 101 | 0 | ✅ Saudável |
| `v7m-backend-qcluster` | 101 | 1 | ⚠️ Observação |
| `v7m-backend-qcluster-slow` | 101 | 4 | ⚠️ Observação |
| `v7m-notify-web` | 101 | 0 | ✅ Saudável |
| `v7m-notify-worker` | 101 | 0 | ✅ Saudável |
| `v7m-bot-supletivo` | 101 | 43 | ⚠️ Observação |
| `v7m-admin-v7m` | 5 | 0 | ✅ Saudável |
| `v7m-hub-v7m` | 2 | 0 | ✅ Saudável |
| `v7m-app-supletivo` | 101 | 24 | ⚠️ Observação |
| `v7m-app-v7m` | 5 | 0 | ✅ Saudável |

## 4. ANOMALIAS E ACHADOS DE DEFEITOS/UX

1. **Proteção de Rotas Administrativas sem Sessão**: As rotas protegidas do Admin e Promotor exibem o estado apropriado, mas devem reforçar o redirecionamento imediato no router para evitar flash de tela.
2. **Resiliência a Double-Click**: O botão de envio do Admin suporta múltiplos cliques rápidos sem disparar concorrência duplicada de submissão.
3. **Webhooks Concorrentes**: O Bot Supletivo processou rajada de 20 eventos simultâneos sem degradação ou perda de mensagens.
4. **Tratamento de Falha 500 no Front**: A interface exibiu mensagem de erro amigável sem quebra catastrófica do React.

## 5. AÇÕES CORRETIVAS E PRÓXIMOS PASSOS

- Manter monitoramento contínuo das filas qcluster no ambiente de testes.
- Rodar cenários com diferentes resoluções de telas ultralargas e dispositivos de baixa fidelidade.
