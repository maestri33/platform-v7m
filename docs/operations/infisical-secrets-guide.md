# 🔐 Guia de Segredos e Consumo via Infisical

Este guia orienta desenvolvedores e agentes autônomos sobre como consumir e gerenciar credenciais e variáveis sensíveis centralizadas no cofre self-hosted do **Infisical** (`http://10.0.1.61:8080`).

---

## 🏛️ 1. Detalhes do Ambiente

| Parâmetro | Valor |
| :--- | :--- |
| **Host URL** | `http://10.0.1.61:8080` |
| **Projeto Principal** | `supletivo` |
| **Project ID** | `1712fb45-2d75-4024-bc6b-0163d5e582a0` |
| **Ambientes** | `dev` (Padrão), `staging`, `prod` |
| **Identidade de Máquina** | `Antigravity MCP` (Universal Auth / Admin) |

---

## 🤖 2. Consumo por Agentes de IA (MCP Tools)

Os assistentes e agentes com suporte a **Model Context Protocol (MCP)** possuem o servidor `@infisical/mcp` configurado globalmente e podem chamar as ferramentas:

### 🔹 `get-secret` (Recuperar Segredo Específico)
Obtém uma credencial sob demanda para autenticação sem gravá-la em disco:
```json
{
  "secretName": "DATABASE_URL",
  "projectId": "1712fb45-2d75-4024-bc6b-0163d5e582a0",
  "environment": "dev"
}
```

### 🔹 `list-secrets` (Listar Segredos)
Lista todos os nomes de segredos presentes no ambiente para verificar disponibilidade:
```json
{
  "projectId": "1712fb45-2d75-4024-bc6b-0163d5e582a0",
  "environment": "dev"
}
```

### 🔹 `create-secret` / `update-secret`
Cria ou atualiza uma credencial quando um novo serviço for provisionado:
```json
{
  "secretName": "NOVA_INTEGRACAO_API_KEY",
  "secretValue": "...",
  "projectId": "1712fb45-2d75-4024-bc6b-0163d5e582a0",
  "environment": "dev",
  "secretComment": "Chave de API do serviço X"
}
```

---

## 💻 3. Consumo Programático em Código

### Node.js / TypeScript (`@infisical/sdk`)
```typescript
import { InfisicalSDK } from '@infisical/sdk';

const client = new InfisicalSDK({ siteUrl: 'http://10.0.1.61:8080' });
await client.auth().universalAuth.login({
  clientId: process.env.INFISICAL_UNIVERSAL_AUTH_CLIENT_ID!,
  clientSecret: process.env.INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET!
});

const secret = await client.secrets().getSecret({
  projectId: '1712fb45-2d75-4024-bc6b-0163d5e582a0',
  environment: 'dev',
  secretName: 'GITHUB_TOKEN'
});
console.log(secret.secretValue);
```

### Python (`infisical-sdk`)
```python
import os
from infisical_sdk import InfisicalSDKClient

client = InfisicalSDKClient(host="http://10.0.1.61:8080")
client.auth.universal_auth.login(
    client_id=os.environ.get("INFISICAL_UNIVERSAL_AUTH_CLIENT_ID"),
    client_secret=os.environ.get("INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET")
)

secret = client.secrets.get_secret_by_name(
    secret_name="DATABASE_URL",
    project_id="1712fb45-2d75-4024-bc6b-0163d5e582a0",
    environment="dev"
)
```

---

## ⚡ 4. Execução de Comandos com Injeção Dinâmica

Para inicializar aplicações sem arquivos `.env` físicos:
```bash
infisical run --env=dev --projectId=1712fb45-2d75-4024-bc6b-0163d5e582a0 -- pnpm turbo run dev
```

---

## 🛡️ 5. Regras de Governança para Agentes (Invariantes)

1. **Blindagem de Segredos**: Nunca gravar valores de segredos em arquivos comitáveis ou rastreados no Git.
2. **Higiene do Cofre**: O Infisical deve conter exclusivamente credenciais reais (tokens, senhas, chaves privadas, URLs de banco). Flags de runtime (`DEBUG`, `NODE_ENV`), portas e valores dummy não devem ser persistidos no cofre.
3. **Consulta On-Demand**: Agentes devem consultar o cofre sempre que precisarem de autenticação, evitando solicitar credenciais repetidas vezes ao usuário.
