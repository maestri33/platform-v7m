# Fase 2 — inventário e ordem de execução

Atualizado em 2026-08-15.

## Estado comprovado

| Área | Estado | Evidência | Próxima entrega |
| --- | --- | --- | --- |
| App público da igreja | Importado em `apps/church` | 81 testes, lint e build aprovados | Conectar o contrato `/api/dizimo` ao backend |
| Componentes financeiros | Dízimo/Pix isolados em `src/components/dizimo` | Adapter HTTP, idempotência, polling e estados tipados | Extrair componentes compartilháveis conforme surgirem consumidores reais |
| Portal institucional | Histórico em `apps/church-portal` | Aplicação Next.js independente | Definir se substitui ou complementa `apps/church` |
| Backend da igreja | Histórico em `services/church-backend` | Captive portal e agente local presentes | Corrigir deriva de módulos antes de qualquer deploy |
| Presença física | Agente isolado em `services/presence` | 9 testes; push HMAC, polling, ACK, health e scripts de gateway | Instalar no equipamento e completar leitura de presença |
| Gateways | Asaas e InfinitePay no backend V7M | Adapters e testes existentes | Adicionar Stripe e expor uma fachada de contribuição |
| Automação/IA | Não implementada | Apenas serviços legados parciais | Definir eventos, consentimento e régua depois da presença confiável |

## Achados arquiteturais

1. `services/church-backend/core/settings.py` registra aplicações ausentes no checkout
   atual, inclusive `apps.finance` e integrações bancárias. Por isso esse serviço não deve
   ser tratado como implantável até seu grafo de módulos ser reconciliado.
2. O fluxo de captive portal é substancial: o agente local autentica com `X-Agent-Key`,
   valida credenciais HMAC, aplica liberações idempotentes e confirma o ACK na nuvem.
3. A leitura consolidada de presença ainda é um stub: `get_cult_attendees` sempre retorna
   lista vazia. O agente registra sessões, mas o domínio de culto não consome os dados.
4. Os repositórios remotos `local-ieadpg` e `capture-ieadpg` estão vazios. O código útil do
   servidor físico foi preservado e isolado em `services/presence`.
5. O backend V7M já possui Asaas e InfinitePay. Duplicar esses gateways no backend da
   igreja criaria duas fontes de verdade; a integração financeira deve ficar atrás de uma
   única fachada HTTP no backend V7M.
6. “Enfat Play” foi interpretado provisoriamente como InfinitePay. A grafia comercial deve
   ser confirmada antes de configurar credenciais de produção.

## Ordem de execução

1. Instalar `services/presence` no equipamento físico e validar uplink, AP e vínculo com a
   nuvem; a unidade já está isolada e testável sem dependências externas.
2. Implementar a consulta real de presença a partir das sessões do captive portal e do
   contexto de culto.
3. Expor no backend V7M uma fachada `/api/dizimo` independente de provedor, reutilizando
   Asaas/InfinitePay e adicionando Stripe.
4. Ligar `apps/church` à fachada e validar Pix, cartão, recorrência e reconciliação ponta a
   ponta em sandbox.
5. Mapear cadeiras, botinha e mapa somente depois de localizar consumidores reais; evitar
   uma biblioteca compartilhada especulativa.
6. Implementar a régua de mensagens sobre eventos persistidos, consentimento explícito e
   isolamento de tenant no Notfire.

## Limites de segurança

- Nenhuma credencial de gateway ou do agente físico entra no Git.
- Pagamentos dependem de idempotência no servidor e confirmação por webhook; o cliente não
  declara uma cobrança como paga.
- O servidor local continua funcional atrás de NAT por polling mesmo sem callback público.
- Deploy físico exige validação das interfaces e acesso alternativo, pois ativar o modo AP
  pode interromper a conexão SSH usada na instalação.
