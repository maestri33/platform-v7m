# 🐘 Guia de Integração: Neon Cloud Postgres (Lakebase Serverless)

Este documento estabelece as diretrizes canônicas para a utilização do **Neon Cloud Postgres** no ecossistema V7M, contemplando `services/backend` e `services/notify`.

---

## 🏛️ 1. Arquitetura de Conexões (Pooled vs Unpooled)

O Neon desacopla computação e armazenamento em nuvem e provê dois endpoints para o mesmo banco de dados:

```text
                                  ┌─────────────────────────────┐
                                  │   Neon Compute Endpoint     │
                                  │     (PostgreSQL Engine)     │
                                  └──────────────┬──────────────┘
                                                 ▲
                                                 │
                     ┌───────────────────────────┴───────────────────────────┐
                     │                                                       │
                     ▼                                                       ▼
      ┌─────────────────────────────┐                         ┌─────────────────────────────┐
      │   PgBouncer (Pooler)        │                         │      Direct Connection      │
      │   (-pooler endpoint)        │                         │    (unpooled endpoint)      │
      └──────────────▲──────────────┘                         └──────────────▲──────────────┘
                     │                                                       │
        DATABASE_URL (Transacional)                            DATABASE_URL_UNPOOLED (DDL)
                     │                                                       │
        ┌────────────┴────────────┐                             ┌────────────┴────────────┐
        │  Requisições HTTP / API │                             │  Migrações DDL Django   │
        │  Workers QCluster       │                             │  manage.py migrate      │
        └─────────────────────────┘                             └─────────────────────────┘
```

### 🔌 1.1 `DATABASE_URL` (Pooled / PgBouncer)
- **Host**: Contém o sufixo `-pooler` (ex: `ep-xyz-pooler.c-5.us-east-2.aws.neon.tech`).
- **Finalidade**: Tráfego comum da aplicação (consultas, inserções, atualizações, workers assíncronos).
- **Vantagem**: Reaproveitamento de conexões de baixo custo e alta concorrência.

### ⚡ 1.2 `DATABASE_URL_UNPOOLED` (Direct / Migrações DDL)
- **Host**: Conexão direta sem o sufixo `-pooler` (ex: `ep-xyz.c-5.us-east-2.aws.neon.tech`).
- **Finalidade**: Execução de migrações (`python manage.py migrate`), criação/alteração de tabelas e comandos DDL.
- **Por que é obrigatório**: PgBouncer em modo transação não mantém estado de sessão (`SET search_path`) e conflita com `prepared statements` de ferramentas de migração.

---

## ⚙️ 2. Configuração nos Serviços Django

Ambos os serviços (`services/backend` e `services/notify`) implementam a seguinte lógica resiliente de resolução:

```python
_MIGRATION_COMMANDS = {"migrate", "makemigrations", "sqlmigrate", "squashmigrations", "inspectdb"}
_is_migration_run = any(cmd in sys.argv for cmd in _MIGRATION_COMMANDS)
_unpooled_db_url = env("DATABASE_URL_UNPOOLED", default="")

if _is_migration_run and _unpooled_db_url:
    DATABASES = {"default": env.db_url_config(_unpooled_db_url)}
else:
    DATABASES = {"default": env.db("DATABASE_URL", default="sqlite:///db.sqlite3")}

DATABASES["default"]["CONN_MAX_AGE"] = env.int("DB_CONN_MAX_AGE", default=60)
DATABASES["default"]["CONN_HEALTH_CHECKS"] = True
```

### 🛡️ Resiliência contra Scale-to-Zero (Cold-Start)
- O Neon suspende computações inativas após 5 minutos para economizar recursos.
- A flag `CONN_HEALTH_CHECKS = True` (nativa do Django 5+) valida a integridade do socket antes de executar a query, evitando erros de conexão fechada pelo backend do Neon ao reativar.

---

## 🌿 3. Branching de Banco de Dados para CI/CD e PRs

Com o Neon, branches de banco de dados são clones *copy-on-write* criados em milissegundos:

1. **Criar Branch Efêmero para Teste**:
   ```bash
   npx neonctl branches create --name pr-128 --project-id <project-id>
   ```
2. **Obter Connection String do Branch**:
   ```bash
   npx neonctl connection-string pr-128 --project-id <project-id> --pooled
   ```
3. **Destruir Branch após Merge do PR**:
   ```bash
   npx neonctl branches delete pr-128 --project-id <project-id>
   ```

---

## 📋 4. Checklist de Migração de Dados (Local ➔ Neon)

1. [ ] Fazer dump do banco local:
   ```bash
   docker exec -t v7m-postgres pg_dump -U postgres -d backend -F c -b -v -f /tmp/backend_dump.dump
   docker cp v7m-postgres:/tmp/backend_dump.dump ./backend_dump.dump
   ```
2. [ ] Restaurar no Neon via conexão direta (`DATABASE_URL_UNPOOLED`):
   ```bash
   pg_restore -d "<DATABASE_URL_UNPOOLED>" --no-owner --no-privileges -v ./backend_dump.dump
   ```
3. [ ] Validar migrações DDL pendentes:
   ```bash
   cd services/backend && uv run python manage.py migrate
   cd services/notify && uv run python manage.py migrate
   ```
4. [ ] Atualizar `.env` dos serviços em produção no Proxmox e reiniciar os containers.

---

## 🔐 5. Governança de Segredos e Credenciais

- As strings de conexão do Neon (`DATABASE_URL` e `DATABASE_URL_UNPOOLED`) contêm credenciais de autenticação e nunca devem ser comitadas em arquivos de código ou documentação.
- Em desenvolvimento, armazene as credenciais em `.env` locais (ignorados pelo Git).
- Em pipelines de CI/CD, injete via **GitHub Repository Secrets**.
- No ambiente de produção Proxmox CT 150, gerencie os segredos via cofre seguro (Infisical / variáveis de ambiente injetadas no host).

