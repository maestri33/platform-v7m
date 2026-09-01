# 🚀 Runbook Operacional: Reset e Homologação do MVP Beta (Issue #69)

Este runbook documenta os procedimentos operacionais para inicialização, auto-seeding, validação de chaves PIX no DICT Asaas, teste contínuo de APIs do usuário principal, governança de comissões e orquestração de rotinas financeiras do **MVP Beta da Platform V7M**.

---

## 📋 1. Visão Geral do MVP Beta

O MVP Beta estabelece a infraestrutura produtiva e parâmetros de negócio canônicos:
- **Startup Auto-Seed**: Migrações DDL e bootstrap automático no arranque dos containers sem intervenção manual.
- **Validação de PIX no DICT Asaas**: Chave PIX do staff/promotor registrada e confirmada no DICT Asaas e na tabela `PixKey` (`pix_validated=True`).
- **Auto-Teste do Usuário Principal**: Validação determinística de ponta a ponta (OTP real, login JWT, perfil, chave PIX e endpoints de promotor).
- **Parâmetros de Comissão MVP Beta**: R$ 50,00 de comissão direta, bônus fixo de R$ 200,00 ao atingir 3 alunos pagos, e R$ 25,00 por aluno para coordenadores de polo.
- **Controle de Schedules Financeiros**: Endpoints staff para consulta e disparo manual das rotinas de fechamento semanal e repasses PIX do Django-Q.

---

## 🐳 2. Startup Auto-Seed & Bootstrap de Containers

Ao iniciar o container do backend (`backend-web`), a esteira executa sequencialmente:
1. `python manage.py migrate --noinput`: Aplicação de migrações no banco PostgreSQL (Neon/Lakebase).
2. `python manage.py seed_defaults`:
   - Criação/sincronização do superusuário e perfil padrão a partir das variáveis de ambiente (`DEFAULT_STAFF_PHONE`, `DEFAULT_STAFF_EMAIL`, `DEFAULT_STAFF_CPF`, `DEFAULT_STAFF_NAME`).
   - Provisionamento do Polo Matriz (`Hub`) padrão.
   - Atribuição do papel de Promotor (`Promoter`) ao usuário padrão.
   - **Registro e validação da chave PIX no DICT Asaas** (`_ensure_pix` via `validate_pix_key` na tabela `PixKey`).
3. `python manage.py collectstatic --noinput`: Coleta de arquivos estáticos.
4. `python manage.py runserver 0.0.0.0:8000`: Inicialização do servidor WSGI/ASGI.

### ⚙️ Variáveis de Ambiente Requeridas (Infisical Vault / `.env`):
```bash
DEFAULT_STAFF_NAME="Victor Maestri"
DEFAULT_STAFF_PHONE="5511999999999"
DEFAULT_STAFF_EMAIL="admin@maestri.group"
DEFAULT_STAFF_CPF="09126367939"
DEFAULT_STAFF_PIX="09126367939"
```

---

## 🧪 3. Comando de Auto-Teste do Usuário Principal (`test_principal_user_apis`)

O comando de gerenciamento executa uma bateria diagnóstica de 5 fases contra o ambiente local ou de homologação:

```bash
# Execução completa com validação de OTP e chave PIX
python manage.py test_principal_user_apis

# Execução rápida (pulando chamadas de pagamento e OTP quando necessário)
python manage.py test_principal_user_apis --skip-payout --skip-otp
```

### 🔍 Fases do Diagnóstico:
1. **Fase 0 — OTP & Login**:
   - Gera e despacha OTP para o telefone do usuário principal via serviço de autenticação.
   - Valida o código OTP e obtém o token JWT de acesso (`access_token`).
2. **Fase 1 — Superusuário & Acesso Staff**:
   - Valida a existência do registro `User` com `is_superuser=True`.
   - Consulta `GET /api/v1/staff/system/stats` e verifica resposta HTTP 200.
3. **Fase 2 — Perfil & Promotor**:
   - Garante a existência do registro `Profile` e do papel `Promoter`.
   - Testa `GET /api/v1/collaborators/promoter/me` e valida dados de referral code e chave PIX.
4. **Fase 3 — Validação no DICT Asaas**:
   - Executa `validate_pix_key` contra a API do Asaas para confirmar a titularidade e status da chave PIX.
   - Confirma o registro na tabela `PixKey` com `pix_validated=True`.
5. **Fase 4 — Conclusão & Resumo**:
   - Emite o relatório formatado com status determinístico de cada camada.

---

## 💰 4. Regras e Configuração de Comissões do MVP Beta

Os parâmetros de comissão são dinâmicos, armazenados na tabela `PlatformSetting` e gerenciáveis via API Staff ou Cockpit Admin:

| Parâmetro | Chave `PlatformSetting` | Valor MVP Beta | Descrição |
| :--- | :--- | :--- | :--- |
| **Comissão Direta** | `COMMISSION_DIRECT` | `50` (R$ 50,00) | Valor pago ao promotor por cada matrícula confirmada |
| **Bônus Fixo por Volume** | `COMMISSION_BONUS_FLAT` | `200` (R$ 200,00) | Bônus creditado ao atingir a meta da semana |
| **Meta do Bônus** | `COMMISSION_BONUS_THRESHOLD` | `3` | Número de alunos pagos na semana para liberar o bônus |
| **Comissão do Polo** | `COMMISSION_COORDINATOR` | `25` (R$ 25,00) | Valor repassado ao coordenador do polo por aluno matriculado |
| **Dia do Fechamento** | `COMMISSION_CLOSING_WEEKDAY` | `4` (Sexta-feira) | Dia da semana para corte e consolidação da folha |
| **Horário do Fechamento** | `COMMISSION_CLOSING_HOUR` | `18` (18:00h) | Horário do fechamento semanal |

### 🛠️ Endpoints de Gestão:
- **Consultar Configurações Atuais**:
  ```http
  GET /api/v1/staff/config/setup
  Authorization: Bearer <STAFF_JWT_TOKEN>
  ```
- **Atualizar Parâmetros de Comissão**:
  ```http
  PUT /api/v1/staff/config/setup
  Authorization: Bearer <STAFF_JWT_TOKEN>
  Content-Type: application/json

  {
    "commissions": {
      "commission_direct": "50",
      "commission_bonus_flat": "200",
      "commission_bonus_threshold": 3,
      "commission_coordinator": "25",
      "commission_closing_weekday": 4,
      "commission_closing_hour": 18
    }
  }
  ```

---

## ⏰ 5. Gestão e Disparo de Schedules Financeiros (Django-Q)

As rotinas automáticas de fechamento e repasse são orquestradas pelo Django-Q (`Schedule`). Os operadores podem inspecionar o status de execução e forçar fechamentos imediatos via API Staff:

### 1. Listar Tarefas Agendadas:
```http
GET /api/v1/staff/finance/schedules
Authorization: Bearer <STAFF_JWT_TOKEN>
```
*Retorno*:
```json
[
  {
    "id": 1,
    "name": "finance.weekly_closing",
    "func": "finance.tasks.weekly_closing",
    "schedule_type": "W",
    "repeats": -1,
    "next_run": "2026-09-04T18:00:00Z",
    "last_run": null,
    "last_status": "pending",
    "is_active": true
  },
  {
    "id": 2,
    "name": "finance.process_payouts",
    "func": "finance.tasks.process_payouts",
    "schedule_type": "W",
    "repeats": -1,
    "next_run": "2026-09-04T19:00:00Z",
    "last_run": null,
    "last_status": "pending",
    "is_active": true
  }
]
```

### 2. Disparar Execução Imediata de Fechamento:
```http
POST /api/v1/staff/finance/schedules/finance.weekly_closing/run
Authorization: Bearer <STAFF_JWT_TOKEN>
```
*Retorno*:
```json
{
  "success": true,
  "schedule_name": "finance.weekly_closing",
  "func": "finance.tasks.weekly_closing",
  "result": {
    "promoters_processed": 12,
    "commissions_consolidated": 18,
    "total_payout_amount": "1450.00"
  },
  "executed_at": "2026-09-01T15:30:00Z"
}
```

### 3. Disparar Execução Imediata de Processamento de Payouts PIX:
```http
POST /api/v1/staff/finance/schedules/finance.process_payouts/run
Authorization: Bearer <STAFF_JWT_TOKEN>
```

---

## 🛡️ 6. Checklist de Homologação em Produção / CT 150

Antes de liberar o tráfego de vendas no MVP Beta, validar fisicamente:

- [ ] **Container Startup**: Logs do container `backend-web` exibem execução com sucesso de `seed_defaults`.
- [ ] **PIX DICT**: Chave PIX do staff validada com sucesso no Asaas e presente em `PixKey` com `pix_validated=True`.
- [ ] **Comando Diagnóstico**: `python manage.py test_principal_user_apis` retorna `100%` com status `SUCCESS`.
- [ ] **Painel de Setup**: `GET /api/v1/staff/config/setup` retorna `commission_direct="50"`, `commission_bonus_flat="200"`, `commission_bonus_threshold=3` e `commission_coordinator="25"`.
- [ ] **Schedules Django-Q**: `GET /api/v1/staff/finance/schedules` retorna tarefas ativas para sexta-feira 18h e 19h.
- [ ] **Segurança de Segredos**: Nenhuma chave Asaas ou senha exposta em logs ou respostas HTTP.
