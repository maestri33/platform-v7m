# Runbook Operacional — Recuperação e Sessões do Evolution GO

Este documento registra o diagnóstico, causa-raiz e o procedimento exato de recuperação para o problema recorrente de **Licença Inativa (`503 LICENSE_REQUIRED`)** e **Perda de Sessões WhatsApp** após recriação de containers, reinicialização ou troca de volumes no ambiente Docker.

---

## 1. Causa-Raiz Técnica

O daemon **Evolution GO (`0.7.2`)** depende de dois bancos PostgreSQL independentes:

1. **`evogo_users`**:
   * Contém a tabela **`runtime_configs`** com as chaves:
     * `instance_id`: Identificador único da instalação.
     * `api_key`: A API Key global/admin ativa (`c90867b94f7055c386c51a82b5dcb575e7cda8a83d7647382648458f20e48601` ou `621dbeb7c33b74cda265687b1d5e8d9e3f9a97ddfe2cbffec439124d884163e3`).
     * `tier`: Plano registrado (`evolution-go` ou `community`).
     * `customer_id`: ID do cliente na Evolution Foundation (`13850` ou `1`).
   * Contém a tabela **`instances`** com os registros de instâncias (`default`, `ieadpg`, etc.) e seus respectivos tokens.
   * ⚠️ **Se o banco subir vazio**, a licença não é encontrada e toda a API responde `503 LICENSE_REQUIRED`.

2. **`evogo_auth`**:
   * Contém todas as tabelas criptográficas do motor **whatsmeow** (`whatsmeow_device`, `whatsmeow_sessions`, `whatsmeow_sender_keys`, `whatsmeow_identity_keys`, `whatsmeow_lid_map`, etc.).
   * ⚠️ **A sessão física do WhatsApp vive aqui**, não no celular e nem nos arquivos da aplicação. Se `evogo_auth` for preservado ou restaurado, **as instâncias reconectam sem escanear QR Code**.

---

## 2. Diagnóstico Rápido em 3 Passos

### Passo 1: Checar o status da licença via HTTP
```bash
curl -s http://127.0.0.1:4000/license/status
```
* **Esperado (Ativo)**:
  `{"status":"active","instance_id":"...","api_key":"..."}`
* **Se retornar `"status":"inactive"` ou `503`**: O banco `evogo_users.runtime_configs` está sem os dados de ativação.

### Passo 2: Checar o estado das instâncias
```bash
curl -s -H "apikey: 621dbeb7c33b74cda265687b1d5e8d9e3f9a97ddfe2cbffec439124d884163e3" http://127.0.0.1:4000/instance/all
```
* Deve listar `default` e `ieadpg`. Se retornar `not authorized` ou lista vazia, a tabela `instances` precisa ser sincronizada/restaurada.

### Passo 3: Checar se a sessão WhatsApp está logada
```bash
curl -s -H "apikey: 7f8bc651-578c-416b-b371-4639256b2574" http://127.0.0.1:4000/instance/status
```
* **Esperado**: `{"data":{"Connected":true,"LoggedIn":true,"Name":"V7M"},"message":"success"}`
* **Se `LoggedIn: false`**: Chame o endpoint de reconexão (`POST /instance/connect`).

---

## 3. Procedimento de Restauração Cirúrgica (Sem QR Code)

### Cenário A: Volume anterior existente (`notify_postgres_data`)
Se os containers foram recriados com novo volume (`v7m-ecosystem_pgdata`), o volume antigo `notify_postgres_data` contém todo o estado:

1. **Extrair dumps dos bancos do volume anterior**:
   ```powershell
   docker run --name temp_pg_inspect -d -v notify_postgres_data:/var/lib/postgresql/data -e POSTGRES_PASSWORD=notify-local-password postgres:16-alpine
   docker exec temp_pg_inspect pg_dump -U postgres evogo_auth > evogo_auth.sql
   docker exec temp_pg_inspect pg_dump -U postgres evogo_users > evogo_users.sql
   docker rm -f temp_pg_inspect
   ```

2. **Restaurar no container Postgres ativo (`v7m-postgres`)**:
   ```powershell
   docker stop v7m-evolution-go
   cmd.exe /c "docker exec -i v7m-postgres psql -U postgres -d evogo_auth -c ""DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO evogo;"" && docker exec -i v7m-postgres psql -U postgres -d evogo_auth < evogo_auth.sql"
   cmd.exe /c "docker exec -i v7m-postgres psql -U postgres -d evogo_users -c ""DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO evogo;"" && docker exec -i v7m-postgres psql -U postgres -d evogo_users < evogo_users.sql"
   docker start v7m-evolution-go
   ```

3. **Reconectar as sessões via API (sem re-pareamento)**:
   ```powershell
   # Instância default (V7M)
   curl.exe -s -X POST -H "apikey: 7f8bc651-578c-416b-b371-4639256b2574" -H "Content-Type: application/json" -d "{\"webhookUrl\":\"http://notify-web:8000/v1/webhook/evolution/default\",\"subscribe\":[\"MESSAGE\",\"READ_RECEIPT\",\"HISTORY_SYNC\"],\"immediate\":false}" http://127.0.0.1:4000/instance/connect

   # Instância ieadpg (IEADPG - Jd. Amália)
   curl.exe -s -X POST -H "apikey: 9bc13e9d-bd42-4c6f-b312-e5dfaf9728e1" -H "Content-Type: application/json" -d "{\"webhookUrl\":\"http://notify-web:8000/v1/webhook/evolution/ieadpg\",\"subscribe\":[\"MESSAGE\",\"READ_RECEIPT\",\"HISTORY_SYNC\"],\"immediate\":false}" http://127.0.0.1:4000/instance/connect
   ```

---

### Cenário B: Ativação manual direta no banco `evogo_users`
Se o banco for totalmente novo e não houver dump:

```sql
-- Executar no banco evogo_users
INSERT INTO runtime_configs (key, value, created_at, updated_at) VALUES 
('api_key', '621dbeb7c33b74cda265687b1d5e8d9e3f9a97ddfe2cbffec439124d884163e3', NOW(), NOW()),
('tier', 'community', NOW(), NOW()),
('customer_id', '1', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
```
Em seguida, reinicie o container `v7m-evolution-go` e execute `python manage.py notify_bootstrap` no `notify-web`.

---

## 4. Tabela de Credenciais e Tokens Válidos

| Recurso | Chave / Token | JID / Número |
|---|---|---|
| **Admin Key Global (Manager)** | `621dbeb7c33b74cda265687b1d5e8d9e3f9a97ddfe2cbffec439124d884163e3` | — |
| **Instância `default` (V7M)** | `7f8bc651-578c-416b-b371-4639256b2574` | `5511920062177:15@s.whatsapp.net` |
| **Instância `ieadpg` (IEADPG)** | `9bc13e9d-bd42-4c6f-b312-e5dfaf9728e1` | `554299384069:30@s.whatsapp.net` |

---

## 5. Script Utilitário

Para automatizar a verificação ou restauração, execute o script PowerShell do repositório:
```powershell
.\deploy\local\restore-evogo-sessions.ps1 -Action status
.\deploy\local\restore-evogo-sessions.ps1 -Action reconnect
.\deploy\local\restore-evogo-sessions.ps1 -Action backup
```

---

## 6. Recursos Interativos Homologados

| Recurso | Endpoint GO | Contrato `POST /notify` | Compatibilidade |
|---|---|---|---|
| **Botão Pix Nativo** | `POST /send/button` (`type: "pix"`) | `options.pix` (`key`, `key_type`, `name`) | Business e Pessoal (todas as chaves: cpf, cnpj, phone, email, random) |
| **Carrossel Interativo** | `POST /send/carousel` | `options.carousel` (`cards`) | Business e Pessoal (com fotos e botões URL/Copy) |
| **Enquete / Poll** | `POST /send/poll` | `options.poll` (`question`, `options`) | Business e Pessoal |
| **Localização / Mapa** | `POST /send/location` | `options.location` (`latitude`, `longitude`) | Business e Pessoal |
| **Contato vCard** | `POST /send/contact` | `options.contact` (`full_name`, `phone`) | Business e Pessoal |
| **QR Code / EMV** | `POST /send/media` | `options.pix` (`payload`) ou `options.qr_code` | Todos os canais |

---

## 7. Mecanismo Automatizado de Auto-Cura (Watchdog Bot)

Para garantir que o serviço nunca fique dependente de intervenção humana em quedas de container, reinicializações do Docker ou oscilações de rede:

1. **Auto-recuperação de Licença (`_check_and_heal_license`)**:
   - Consulta `GET /license/status`.
   - Se retornar inativo ou `503 LICENSE_REQUIRED`, dispara auto-registro com o servidor de licença (`GET /license/register`) e valida as credenciais administrativas.

2. **Auto-reconexão de Sessões (`_heal_go`)**:
   - Itera por todas as instâncias cadastradas em `WhatsAppNumber`.
   - Em caso de desconexão (`LoggedIn: false`), dispara `POST /instance/connect` com as inscrições corretas do dialeto GO (`["MESSAGE", "READ_RECEIPT", "HISTORY_SYNC"]`) e a URL de webhook da instância.
   - Sincroniza o estado no Django (`connection_status = 'open'`).

3. **Gatilhos de Execução**:
   - **No Boot (`notify_bootstrap`)**: Executa imediatamente ao iniciar o container.
   - **Em Background (Django-Q Schedule)**: Executa periodicamente a cada `WATCHDOG_INTERVAL_MIN` minutos.
   - **Sob Demanda (CLI)**: `python manage.py notify_autoheal`.
