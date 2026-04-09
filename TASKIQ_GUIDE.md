# Taskiq - Guia de Uso

O [Taskiq](https://github.com/taskiq-python/taskiq) é um task queue assíncrono para Python integrado ao projeto Django.

## Instalação

O Taskiq já está instalado no projeto com suporte a Redis:

```bash
pip install taskiq taskiq-redis
```

## Configuração

As configurações estão em `core/settings.py`:

```python
TASKIQ_REDIS_URL = os.getenv("TASKIQ_REDIS_URL", "redis://localhost:6379/0")
TASKIQ_QUEUE_NAME = os.getenv("TASKIQ_QUEUE_NAME", "taskiq")
```

Variáveis no `.env`:

```env
TASKIQ_REDIS_URL=redis://localhost:6379/0
TASKIQ_QUEUE_NAME=taskiq
```

## Como Usar

### 1. Criar uma Task

Crie um arquivo `tasks.py` em qualquer app Django:

```python
from core.taskiq import task

@task
def minha_tarefa(parametro: str) -> None:
    # Sua lógica aqui
    print(f"Processando: {parametro}")

@task
def minha_tarefa_async(user_id: int) -> None:
    # Com acesso ao ORM do Django
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    user = User.objects.get(id=user_id)
    # Faça algo com o usuário
```

### 2. Enviar uma Task para Execução

```python
from apps.meuapp.tasks import minha_tarefa

# Enviar para execução assíncrona
minha_tarefa.kiq("meu parametro")

# Ou de forma assíncrona
await minha_tarefa.kiq("meu parametro")
```

### 3. Iniciar o Worker

```bash
# Usando o script
./start_worker.sh 4

# Ou manualmente
source .venv/bin/activate
taskiq worker core.broker:broker --workers 4 --fs-discover
```

### 4. Iniciar o Scheduler (para tarefas agendadas)

```bash
# Usando pycron para agendamento
taskiq scheduler core.broker:broker --fs-discover
```

## Estrutura de Arquivos

```
core/
├── broker.py       # Configuração do broker Redis
├── taskiq.py       # Decorador de tasks com Django
└── settings.py     # Configurações

apps/
├── authentication/
│   └── tasks.py    # Tasks de autenticação
└── ...

notifications/
└── tasks.py        # Tasks de notificação
```

## Exemplos

### Enviar Email Assíncrono

```python
from core.taskiq import task
from django.core.mail import send_mail

@task
def send_email_async(subject: str, message: str, to_email: str) -> None:
    send_mail(
        subject=subject,
        message=message,
        from_email="noreply@example.com",
        recipient_list=[to_email],
    )

# Uso
send_email_async.kiq("Assunto", "Mensagem", "usuario@email.com")
```

### Processar em Lote

```python
from core.taskiq import task

@task
def processar_itens_async(item_ids: list[int]) -> None:
    from meuapp.models import Item
    
    for item in Item.objects.filter(id__in=item_ids):
        item.processar()

# Uso
processar_itens_async.kiq([1, 2, 3, 4, 5])
```

## Monitoramento

Para ver o dashboard de tarefas, você pode usar:

```bash
taskiq worker core.broker:broker --workers 4 --fs-discover --prometheus-port=9000
```

Acesse `http://localhost:9000/metrics` para métricas Prometheus.

## Documentação Oficial

- [Taskiq GitHub](https://github.com/taskiq-python/taskiq)
- [Taskiq Documentation](https://taskiq-python.github.io/)
- [Taskiq Redis](https://github.com/taskiq-python/taskiq-redis)
