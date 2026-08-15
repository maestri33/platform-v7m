# Sentry — monitoramento de erros e performance

Instalado em 2026-08-03. Cobre os quatro processos do backend: web (WSGI/ASGI),
`manage.py`, worker e scheduler do Taskiq.

## Como ligar

1. No [sentry.io](https://sentry.io), crie um projeto **Django** e copie o DSN
   em `Settings -> Client Keys (DSN)`.
2. No `.env` do servidor:

   ```bash
   SENTRY_DSN=https://<chave>@o<org>.ingest.sentry.io/<projeto>
   SENTRY_ENVIRONMENT=production
   ```

3. Reinicie os serviços: `systemctl restart backend-ieadpg-web backend-ieadpg-worker backend-ieadpg-scheduler`.

Sem `SENTRY_DSN` o SDK não inicializa — é o padrão em dev, CI e testes, e
nada sai da máquina. Não precisa de DSN pra rodar o projeto localmente.

## Variáveis

| Variável | Padrão | O que faz |
| --- | --- | --- |
| `SENTRY_DSN` | vazio | Vazio desliga o SDK. |
| `SENTRY_ENVIRONMENT` | `development` se `DEBUG=True`, senão `production` | Separa os ambientes na UI. |
| `SENTRY_RELEASE` | vazio (usa `GITHUB_SHA` se existir) | Casa a issue com o commit. |
| `SENTRY_TRACES_SAMPLE_RATE` | `0.1` | Fração de requests com trace de performance. `0` = só erros. |
| `SENTRY_PROFILE_SESSION_SAMPLE_RATE` | `0` | Profiling contínuo. Só perfila durante trace ativo. |
| `SENTRY_SEND_PII` | `False` | `True` passa a mandar IP, headers e usuário logado. |
| `SENTRY_ENABLE_LOGS` | `False` | Espelha os logs do Python no Sentry Logs (consome cota). |
| `SENTRY_DEBUG` | `False` | Log do próprio SDK no stdout, pra depurar a integração. |

## LGPD — o que não sai daqui

Este backend trafega CPF, senha, OTP e token de sessão. Duas travas:

- **`send_default_pii=False` por padrão.** IP, headers e usuário logado não
  são anexados aos eventos a menos que `SENTRY_SEND_PII=True`.
- **Filtro próprio no `before_send`** (`core.sentry._scrub_event`). Substitui
  por `[Filtered]` todo valor cuja chave contenha `cpf`, `senha`, `password`,
  `otp`, `token`, `secret`, `api_key`, `authorization`, `sessionid` e afins.
  Cobre corpo do request, headers, cookies, `extra`, `contexts` e — o ponto
  mais fácil de esquecer — as **variáveis locais de cada frame do
  stacktrace**, que o SDK anexa por padrão.

Pra incluir um campo novo no filtro, adicione a substring em
`_SENSITIVE_KEY_PARTS` (`core/sentry.py`) e cubra com teste.

Ressalva conhecida: o Sentry envia as linhas de código do frame
(`context_line`). Segredo hardcoded no fonte aparece na issue — o filtro não
tem como pegar isso. Segredo mora no `.env`.

## Onde está o código

| Arquivo | Papel |
| --- | --- |
| `core/sentry.py` | `init_sentry()` e o filtro `_scrub_event`. |
| `core/sentry_taskiq.py` | Middleware que reporta falha de task do Taskiq. |
| `core/settings.py` | Bloco `SENTRY_*` + chamada da init (roda no load das settings). |
| `core/broker.py` | Pluga o middleware no broker. |
| `core/tests_sentry.py` | Testes do filtro e da init — rodam offline. |

Erro de task **não** passa pelo ciclo de request, então a `DjangoIntegration`
não o enxerga: quem reporta falha de background job é o
`SentryTaskiqMiddleware`. As issues vêm com as tags `taskiq.task_name` e
`taskiq.task_id`.

## Testes

```bash
.venv/bin/python manage.py test core.tests_sentry
```

Rodam sem rede: o client usa um transport que guarda os eventos em memória.

## MCP — investigar issues pelo Claude Code

O `.mcp.json` da raiz registra o servidor MCP oficial do Sentry
(`https://mcp.sentry.dev/mcp`). Abrindo o Claude Code neste repo, aprove o
servidor e faça o OAuth na primeira conexão — depois dá pra listar e depurar
issues sem sair do editor.

Pra escopar num projeto só (recomendado quando a org tem vários), troque a
URL por `https://mcp.sentry.dev/mcp/{organizationSlug}/{projectSlug}`.

O MCP é ferramenta de quem desenvolve e **não** tem relação com o SDK que
roda em produção — são coisas independentes.
