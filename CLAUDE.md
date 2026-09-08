# Diretrizes Mestre de Engenharia & Operação — V7M Ecosystem

> **LEI FUNDAMENTAL ANTI-DELÍRIO:**
> 1. É terminantemente proibido inventar suposições, bibliotecas, protocolos ou tarefas não solicitadas.
> 2. Toda e qualquer ação de código deve ser feita passo a passo, sob demanda explícita do usuário.
> 3. Zero invenção de "novos padrões" ou refatorações estéticas sem autorização.

---

## 🧠 1. Memória Obrigatória: Início e Fim de Cada Tarefa
O cérebro e a memória do projeto estão centralizados no nó **`10.0.1.99`**.

1. **AO COMEÇAR qualquer tarefa:**
   - Obrigatoriamente consultar memórias e decisões anteriores:
     - `hindsight_recall` / `hindsight_reflect` (Bank: `v7m`)
     - `openviking_find` / `openviking_search` (URI: `viking://user/admin/memories/`)
   - NUNCA assumir regras de negócio do MEC, fluxos financeiros ou topologia de rede sem consultar a memória primeiro.
2. **AO TERMINAR qualquer tarefa:**
   - Registrar as novas decisões técnicas, aprendizados e regras criadas:
     - `mcp_hindsight_sync_retain` (resumo claro da decisão tomada)
     - `mcp_openviking_remember` ou gravação em `viking://user/admin/memories/patterns/`

---

## 🏗️ 2. Topologia Real do Proxmox & Infraestrutura

A infraestrutura real é composta por contêineres LXC e Docker Hosts dedicados:

| Nó / IP | Serviço | Papel no Ecossistema |
| :--- | :--- | :--- |
| **`10.1.0.10` / `10.2.0.10`** | **Nginx Ingress (CT 110)** | ÚNICOS pontos autorizados a expor as portas **80** e **443** para a internet. Terminam SSL e fazem proxy reverso. |
| **`10.0.1.50` (CT 150)** | **Docker Host V7M** | Onde rodam os containers de aplicação: |
| ↳ `:8001` | **Django Backend Web** | API REST principal (`services/backend`), Django 5.2 Ninja, PostgreSQL e regras de negócio. |
| ↳ `:8000` | **Notify Server (Django)** | Segundo Django (`services/notify`), relay de mensageria (WhatsApp/Email) e templates. |
| ↳ `:4000` | **Evolution GO** | Motor de WhatsApp conectado ao chip oficial. |
| ↳ `:3003` | **apps/group** | Portal Unificado (Next.js): Promotor, Hub e Admin. |
| ↳ `:3000` | **apps/supletivo** | Portal do Aluno (Next.js): Funil e Onboarding do estudante. |
| **`10.0.1.20` (CT 120)** | **Stalwart Mail Server** | Servidor de e-mail corporativo (SMTP :25/:587, JMAP :8080). |
| **`10.0.1.99` (CT 99)** | **Memória Centralizada** | Hindsight (`:8888`) e OpenViking (`:1933`). |
| **`10.0.1.61` (CT 61)** | **Infisical Secrets** | Cofre de credenciais (`:8080`). Projeto: `1712fb45-2d75-4024-bc6b-0163d5e582a0`. |
| **`10.0.1.11` (CT 11)** | **Plane Project Manager** | Cockpit de gestão de projetos self-hosted (:80). |

---

## 🤖 3. Roteamento de Inteligência Artificial (OmniRoute HA)

- **Endpoint Canônico Único:** **`https://ai.v7m.live/v1`**
- **Arquitetura:** Cluster em Alta Disponibilidade (HA) composto por **3 contêineres LXC** com balanceamento e proxy Cloudflare.
- **Regra Estrita de Código:**
  - **PROIBIDO** usar IPs fixos locais (`10.0.1.35` ou `10.0.1.135`) no código-fonte.
  - Toda e qualquer chamada de LLM, visão multimodal (OCR documental de RG/CNH/Comprovante) e síntese de voz (TTS) DEVE ser captada através de **`https://ai.v7m.live/v1`** (ou `https://ai.v7m.live` para a URL base do Notify).

---

## 🐙 4. Fluxo de Trabalho com GitHub & Qualidade

1. **Rastreabilidade**:
   - Commits 100% em inglês seguindo Conventional Commits (`feat: ...`, `fix: ...`, `refactor: ...`).
   - Todo PR deve referenciar sua issue real correspondente.
2. **Definição de Pronto (DoD)**:
   - Antes de dar uma tarefa como concluída:
     1. Testes do Backend: `services/backend/.venv/Scripts/python.exe -m pytest` aprovado.
     2. Tipagem do Frontend: `pnpm turbo run check-types` aprovado.
     3. Build das Landings: `pnpm turbo run build` aprovado.
3. **Interface do Usuário**:
   - Todo texto visível ao usuário final (aluno, promotor, coordenador) DEVE estar em **Português do Brasil (PT-BR)**.
