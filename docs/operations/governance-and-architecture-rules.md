# Diretrizes Mestre de Engenharia & Operação — V7M Ecosystem

## 1. Lei Fundamental Anti-Delírio
- É terminantemente proibido inventar suposições, bibliotecas, protocolos ou tarefas não solicitadas.
- Todo e qualquer desenvolvimento de código deve ser feito passo a passo, sob demanda explícita do usuário.
- Zero criação de abstrações especulativas, pastas duplicadas ou refatorações estéticas sem autorização.

## 2. Protocolo de Memória Obrigatório
- **Ao iniciar qualquer tarefa:** Obrigatoriamente consultar memórias e decisões anteriores no Hindsight (`10.0.1.99:8888`) e OpenViking (`viking://user/admin/memories/`).
- **Ao finalizar qualquer tarefa:** Registrar formalmente as decisões técnicas, aprendizados e regras consolidadas.

## 3. Os Dois Backends Django (CT 150 - 10.0.1.50)
- **Django Backend Web (`services/backend` :8001)**: API REST principal, Django 5.2 Ninja, PostgreSQL, regras de negócio, alunos, matrículas, promotores e financeiro.
- **Django Notify Server (`services/notify` :8000)**: Segundo Django, relay de mensageria WhatsApp (via Evolution GO :4000) e e-mails.

## 4. Topologia Real Proxmox LXC
- **Nginx Ingress (CT 110 - 10.1.0.10 / 10.2.0.10)**: Únicos pontos autorizados a expor as portas 80 e 443 para a internet.
- **Docker Host Principal (CT 150 - 10.0.1.50)**: Contêineres de backend (:8001), notify (:8000), evolution-go (:4000), portal unificado apps/group (:3003) e portal do aluno apps/supletivo (:3000).
- **Stalwart Mail Server (CT 120 - 10.0.1.20)**: Servidor de e-mail corporativo (SMTP 25/587, JMAP 8080).
- **Memória Centralizada (CT 99 - 10.0.1.99)**: Hindsight (:8888) e OpenViking (:1933).
- **Infisical Secrets (CT 61 - 10.0.1.61:8080)**: Cofre central de credenciais.
- **Plane (CT 11 - 10.0.1.11:80)**: Gerenciador de projetos e tarefas self-hosted.

## 5. Roteamento de Inteligência Artificial (OmniRoute HA)
- **Endpoint Canônico Único:** `https://ai.v7m.live/v1` (ou `https://ai.v7m.live`).
- **Arquitetura:** Cluster em Alta Disponibilidade (HA) composto por 3 contêineres LXC balanceados via Cloudflare.
- **Regra Estrita:** Proibido usar IPs locais fixos no código. Toda IA (LLM, OCR de documentos e TTS de áudios) deve ser captada através de `https://ai.v7m.live`.

## 6. Governança e GitHub
- Commits 100% em inglês seguindo Conventional Commits.
- Todo PR deve estar estritamente vinculado a uma issue real.
- Definição de Pronto (DoD): Testes do backend (pytest) e typecheck do frontend (turbo check-types) 100% verdes antes de qualquer merge.
- Interface do usuário sempre em PT-BR.
