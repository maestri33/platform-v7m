# Especificação de UI/UX Slim: Notify Dashboard & Telemetria Visual

> **Status:** Documentado na Memória & Arquitetura V7M  
> **Data de Atualização:** 03 de Setembro de 2026  
> **Diretiva de Design:** Minimalista, Slim, Ações Diretas ("Só Botão"), Telemetria Visual por Bolhas de Fluxo ("Bolõezinhos").

---

## 1. Auditoria dos Envios Recentes & Verificação de Estados

Na inspeção técnica executada diretamente na infraestrutura do **Notify Server** (`10.0.1.50:8000` / CT 150), foram auditados os seguintes disparos e transições de estado:

### 1.1. Disparos de Autenticação (OTP / Mensagens de Sistema)
* **Destinatários Reais:** `554195990955` e `5543996648750`
* **Status Registrado:** `sent` ✅
* **Provedor:** `evolution-go` (WhatsApp)
* **Resultado:** Os códigos de verificação e mensagens de teste foram aceitos e despachados com sucesso.

### 1.2. Disparos de Notificações do Funil do Aluno (Matrícula, Prova e RG)
* **Destinatário Testado:** `5511999990000` (número fictício)
* **Conteúdo:** 
  * *"Victor, a selfie de uma matrícula precisa da sua análise..."*
  * *"Victor, um aluno do seu polo agendou a prova e aguarda a sua correção..."*
  * *"Parabéns! Sua indicação concluiu a matrícula e virou aluno..."*
  * *"Victor, o RG de uma matrícula precisa da sua análise..."*
* **Status Registrado:** `failed` ❌
* **Causa Raiz:** `WhatsAppGoError: Evolution GO 500: number +5511999990000@s.whatsapp.net is not registered on WhatsApp`.  
  O gateway tentou despachar, porém o número não possui WhatsApp registrado.
* **Resiliência do Notify:** As falhas foram catalogadas com o stacktrace exato e a ação de `Reenviar` (DLQ) ficou habilitada na interface.

### 1.3. Telemetria de Webhooks & Ciclo Completo de Estados
* **Destinatário Real:** `554220181533` (Diandra)
* **Transição de Estados Confirmada no Live Stream:**
  1. `DISPATCHED / SENT` ➔ Aceito pelo daemon Evolution GO.
  2. `MESSAGE` (`st-delivered`) ➔ Recebido no aparelho do usuário (dois traços cinzas).
  3. `RECEIPT` (`st-read`) ➔ Lido pelo usuário (dois traços azuis).
* **Conclusão:** A máquina de estados e o rastreamento ponta a ponta estão 100% operacionais quando o número de destino é válido.

---

## 2. Diagnóstico da Interface Atual vs. Diretiva "Slim Visual Flow"

### 2.1. Problemas da Interface Atual
* **Excesso de Texto / Poluição Visual:** Colunas com textos longos repetindo nomes de provedores (`evolution-go`), badges redundantes, cabeçalhos de tabela pesados e descrições óbvias.
* **Estrutura Tabular Rígida:** Não permite visualizar com clareza o ciclo de vida (jornada) da mensagem num relance visual.
* **Ações Poluídas:** Botões com textos compridos ("Ver", "Reenviar", "Concluir Visualização").

### 2.2. Diretrizes da Nova UI Slim (Visão do Usuário)
1. **Zero Excesso de Escrita:**
   * Ocultar textos estáticos desnecessários.
   * Substituir rótulos longos por micro-badges semânticos com tooltips nativos.
2. **"Só Botão" (Ações Compactas):**
   * Ações rápidas na linha: Botão de reenvio em 1 clique (ícone de rotação), botão de payload (ícone de código), botão de rastreio (ícone de olho).
   * Hover sutil, feedback tátil instantâneo via HTMX sem recarregar tela.
3. **"Bolãozinho de Fluxo" (Visual Pipeline Bubbles):**
   * Em vez de colunas de texto com estados separados, cada notificação exibe uma linha de bolhas conectadas que mostram o progresso instantâneo:
     ```
     [● Despacho] ─── [● Entregue] ─── [● Lido]
     ```
   * **Cores e Estados das Bolhas:**
     * 🟢 **Verde Sólido:** Etapa concluída com sucesso (com tooltip do timestamp).
     * 🟡 **Âmbar Pulsante:** Etapa em trânsito (aguardando confirmação da rede).
     * 🔴 **Vermelho:** Falha na etapa (hover revela erro, ex.: número sem WhatsApp).
     * ⚪ **Cinza Translúcido:** Etapa pendente ou canal não solicitado.

---

## 3. Mockup Arquitetural do Componente Slim: `FlowBubbles`

```html
<div class="notify-row-slim">
  <div class="row-target">
    <span class="phone-mono">554220181533</span>
    <span class="channel-dot wa" title="WhatsApp"></span>
  </div>

  <div class="flow-pipeline" title="Fluxo: Enviado -> Entregue -> Lido">
    <span class="bubble done" title="Enviado às 11:32:58">●</span>
    <span class="connector done"></span>
    <span class="bubble done" title="Entregue às 11:32:59">●</span>
    <span class="connector done"></span>
    <span class="bubble read" title="Lido às 11:37:07">●</span>
  </div>

  <div class="snippet-slim" title="Victor, o RG de uma matrícula...">
    Victor, o RG de uma matrícula...
  </div>

  <div class="row-actions-slim">
    <button class="btn-icon" title="Ver Detalhes" hx-get="...">
      <svg class="ico"><use href="#i-eye"></use></svg>
    </button>
    <button class="btn-icon retry" title="Reenviar" hx-post="...">
      <svg class="ico"><use href="#i-refresh"></use></svg>
    </button>
  </div>
</div>
```

---

## 4. Próximos Passos de Orquestração

1. **Persistência de Memória:** Diretriz de design registrada como padrão obrigatório para o `services/notify` e painéis de telemetria do ecossistema.
2. **Implementação do Layout Slim:** Aplicar nos templates `overview.html`, `messages.html` e `partials/_messages_table.html` mantendo compatibilidade HTMX e alta densidade de informação.
