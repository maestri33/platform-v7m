# 📘 Guia de Arquitetura, Integrações & Setup da Plataforma V7M

Este documento registra todas as decisões arquiteturais, regras de negócio, contratos de integração e procedimentos de operação e testes do ecossistema **V7M** (`admin-v7m`, `backend-v7m`, `notify-server`, `evolution-go` e `OmniRoute`).

---

## 🏛️ 1. Arquitetura Geral do Ecossistema

O ecossistema opera em containers Docker orquestrados na rede interna `v7m_network`:

```mermaid
graph TD
    subgraph "Docker Network: v7m_network"
        ADMIN["admin-v7m (Porta 3003/3000)<br>Next.js 15 + CopilotKit"] -->|HTTP /api/v1| BACKEND["backend-v7m (Porta 8001/8000)<br>Django 5.1 + Ninja + Django-Q"]
        BACKEND -->|http://notify-web:8000| NOTIFY["notify-server (Porta 8000)<br>Relay de Mensageria & Templates"]
        NOTIFY -->|http://evolution-go:4000| EVOGO["evolution-go (Porta 4000)<br>Motor WhatsApp"]
        NOTIFY -->|SMTP/JMAP| MAIL["Mailcow / Stalwart (E-mail)"]
        NOTIFY -->|http://10.0.1.35/v1| OMNI["OmniRoute (Porta 80)<br>Roteador Multi-LLM / OpenAI Gateway"]
        ADMIN -->|http://10.0.1.35/v1| OMNI
        BACKEND -->|postgresql://...:5432| POSTGRES["PostgreSQL (Porta 5432)"]
    end
```

---

## 🔒 2. Setup Inicial (First-Run Wizard) & Hard-Lock

### 🛡️ Regra de Segurança do Hard-Lock:
1. **Estado Inicial (`bootstrapped: false`)**:
   - Acessar a plataforma redireciona automaticamente para `/setup`.
   - O Wizard de 5 etapas é exibido.
2. **Conclusão do Setup (`bootstrapped: true`)**:
   - Cria o superusuário master no banco de dados e grava os parâmetros em `PlatformSetting`.
   - Emite o token JWT de acesso e redireciona para `/dashboard`.
3. **Bloqueio Definitivo**:
   - A rota `/setup` é **permanentemente trancada**. Qualquer tentativa futura de acesso a `/setup` resulta em redirecionamento instantâneo para `/login`.
   - O backend rejeita qualquer nova requisição em `POST /api/v1/staff/bootstrap/init` com `403 ALREADY_BOOTSTRAPPED`.

### 💾 Persistência de Rascunho (`sessionStorage`):
- Todos os campos digitados nas etapas 1 a 4 são salvos em tempo real na chave `v7m.setup.draft.v1`.
- Ao atualizar a página (`F5`) ou alternar abas, **nenhum dado é perdido**.
- O rascunho é expurgado automaticamente ao finalizar o bootstrap com sucesso.

---

## 💰 3. Modelo de Preços & Bolsa do Promotor Estudante

O modelo financeiro da plataforma é estruturado em 4 tabelas de preços explícitas + Bolsa 100% Gratuita:

| Campo / Chave | Tipo | Valor Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `price_pix` | `string` (Reais) | `97` | Matrícula Regular via PIX (R$ 97,00) |
| `price_card_cents` / `price_card_reais` | `int` (Centavos) / `string` | `9700` (`97.00`) | Matrícula Regular no Cartão (R$ 97,00) |
| `promo_price_pix` | `string` (Reais) | `47` | Matrícula Promocional via PIX (R$ 47,00) |
| `promo_price_card_cents` / `promo_price_card_reais` | `int` (Centavos) / `string` | `4700` (`47.00`) | Matrícula Promocional no Cartão (R$ 47,00) |
| `promoter_student_min_leads` | `int` | `3` | **Meta Mínima**: Alunos indicados para liberar matrícula gratuita |
| `promoter_student_target_leads` | `int` | `10` | **Meta Total**: Alunos indicados para quitar 100% o curso |
| `card_installments` | `int` | `12` | Máximo de parcelas permitidas no cartão |

> [!IMPORTANT]
> **Bolsa Promotor Estudante (R$ 0,00)**: O promotor de vendas não paga mensalidade nem matrícula em dinheiro. Ele ganha liberação imediata ao bater 3 indicações e tem a formação 100% quitada ao atingir 10 formandos.

---

## ⚡ 4. Mensageria Desacoplada: `notify-server`

O backend e o frontend **não chamam mais APIs do WhatsApp ou SMTP diretamente**. Toda comunicação passa pelo microserviço `notify-server`.

### 🌐 Endereços de Conexão:
- **Rede Interna Docker**: `http://notify-web:8000`
- **Ambiente de Desenvolvimento Host**: `http://localhost:8000`
- **Produção / Domínio Externo**: `https://notify.v7m.org` *(quando publicado com DNS)*

### 📨 Contrato de Disparo (`POST /notify`):
```json
{
  "whatsapp": "5543996648750",
  "email": "victorrmaestri@gmail.com",
  "content": "Conteúdo da mensagem ou markdown",
  "options": {
    "title": "Título Opcional",
    "subject": "Assunto do E-mail",
    "run_sync": true
  }
}
```

### ⚙️ Fallback e Gestão de Instâncias na Evolution GO:
- O `notify-server` conecta-se na Evolution GO (`http://evolution-go:4000`).
- A conta `default` deve possuir `instance_name` e `token` vinculados a uma instância conectada (ex: `ieadpg`).

---

## 🧠 5. Gateway de Inteligência Artificial: `OmniRoute`

Substituição de chamadas diretas ao Google Gemini em favor do gateway centralizado OpenAI-compatible **OmniRoute**:

- **URL Base**: `http://10.0.1.35/v1`
- **Modelo Padrão**: `gemini-2.5-flash` / `auto/best-fast`
- **Frontend (`src/app/api/copilotkit/route.ts`)**: Utiliza `OpenAIAdapter({ baseURL: "http://10.0.1.35/v1", apiKey })`.
- **Notify Server**: Realiza adaptação automática de tom de voz, quebra de linha e TTS consultando o OmniRoute antes do despacho.

---

## 🐳 6. Docker Compose & Variáveis de Ambiente

No arquivo [`docker-compose.yml`](file:///c:/Users/maestri33/dev/v7m/docker-compose.yml):

```yaml
# ── MODO DE ENVIO REAL (NÃO DRY-RUN) ──
TEST_MODE: "0"

# ── URLS ENTRE CONTAINERS ──
NOTIFY_SERVER_URL: http://notify-web:8000
EVOLUTION_GO_BASE_URL: http://evolution-go:4000
OMNIROUTE_BASE_URL: http://10.0.1.35/v1
```

> [!WARNING]
> Se `TEST_MODE="1"`, o `notify-worker` entra em modo **dry-run** e apenas simula o envio (`notify.dispatched_dry_run`), sem disparar para o WhatsApp ou e-mail real. Para envios reais, mantenha `TEST_MODE="0"`.

---

## 🛠️ 7. Guia Rápido de Operação e Troubleshooting

### 🔄 Como resetar a plataforma do zero (para testar o Setup):
```bash
# 1. Limpar banco de dados no container backend
docker exec v7m-backend-web python manage.py flush --no-input

# 2. Verificar que o status retornou para não-inicializado:
curl http://localhost:8001/api/v1/staff/bootstrap/status
# Resposta esperada: {"bootstrapped": false, "setup_required": true}
```

### 📱 Como testar disparo direto no notify-server:
```powershell
$body = @{
  whatsapp = "5543996648750"
  email = "victorrmaestri@gmail.com"
  content = "Teste de envio V7M"
  options = @{ run_sync = $true }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Uri "http://localhost:8000/notify" -Method POST -Body $body -ContentType "application/json"
```

### 🧪 Executar Suítes de Testes Automatizados:
- **Backend (296 testes)**:
  ```bash
  cd backend-v7m
  .venv\Scripts\python.exe -m pytest
  ```
- **Frontend E2E Playwright (20 testes)**:
  ```bash
  cd admin-v7m
  $env:PLAYWRIGHT_BASE_URL="http://localhost:3000"; npx playwright test
  ```
