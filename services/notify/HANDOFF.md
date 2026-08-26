# 📋 Gateway de Notificações (`services/notify`) — Handoff Técnico

> **Última Atualização:** 26 de Agosto de 2026  
> **Status:** Em Validação com o Usuário (Aguardando homologação de envios e testes)

---

## 🎯 1. Escopo das Alterações Recentes

### 1.1. Separação Estrita de Responsabilidades (Templates & TTS no Backend)
- **Eliminação de Templates no Notify:**
  - O Notify Server opera como gateway puro de despacho e entrega multicanal (WhatsApp via Evolution Go, E-mail via Stalwart JMAP/SMTP e Webhooks).
  - Todo o gerenciamento e renderização de templates pertence exclusivamente ao `services/backend`.
- **Eliminação de Síntese de TTS no Notify:**
  - O Notify recebe diretamente o áudio pronto através do payload (`media_url`, `media_type="audio"`).

### 1.2. Evolution Go 0.7.2 & Persistência de Sessão
- **Diagnóstico da Licença (`503 LICENSE_REQUIRED`):**
  - A licença do Evolution Go reside na tabela `runtime_configs` do banco `evogo_users` (`instance_id`, `api_key`, `tier`, `customer_id`).
- **Sessões WhatsApp (`whatsmeow_*`):**
  - Residem no banco `evogo_auth`.
  - A reconexão sem novo QR code é executada via `POST /instance/connect` ou rotina de auto-heal do watchdog (`notify/watchdog.py`).
- **Configuração de Ambiente no Docker Compose:**
  - `NOTIFY_DATABASE_URL` isolada de `DATABASE_URL` (para evitar conflito com instâncias de banco remotas/Neon durante desenvolvimento).

---

## 🛠️ 2. Arquivos Modificados / Criados

- `docker-compose.yml`:
  - `notify-web` e `notify-worker` utilizam `NOTIFY_DATABASE_URL: ${NOTIFY_DATABASE_URL:-postgresql://notify:v7m-local-password@postgres:5432/notify}`.
  - `backend-web` e workers utilizam `BACKEND_DATABASE_URL: ${BACKEND_DATABASE_URL:-postgresql://backend:v7m-local-password@postgres:5432/backend}`.
  - `evolution-go` com `POSTGRES_AUTH_DB` e `POSTGRES_USERS_DB` desacoplados de `DATABASE_URL` (garantindo carregamento da licença ativa `0105590c-...` e sessões `whatsmeow_*` do Postgres local).
- `services/notify/notify/watchdog.py`:
  - Watchdog ativo monitorando `evolution-go`, `mailcow`/`stalwart`, `omnirouter` e `queue`.

---

## 🧪 3. Validação Executada

- **Suíte Pytest Notify:** 269 testes aprovados (0 falhas) em 19.31s.
- **Saúde dos Containers:** `v7m-notify-web`, `v7m-notify-worker` e `v7m-evolution-go` em execução e saudáveis (`healthy`).
- **Watchdog Tick:** Todos os 4 serviços com status `ok: True` (`evolution-go`, `mailcow`/`stalwart`, `omnirouter`, `queue`).
- **Instâncias WhatsApp:** Sessões ativas e reconectadas (`ieadpg`, `victor-maestri` em status `open`).
- **Envios Multicanal:** Envios de e-mail via Stalwart JMAP/SMTP processados com status `sent` e Message-IDs registrados no banco.
- **Endpoint `POST /notify`:** Claim & dispatch operando com resposta síncrona/assíncrona e isolamento de templates no backend.
