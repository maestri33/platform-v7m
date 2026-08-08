"""
Middleware do Taskiq que reporta falhas de task pro Sentry.

O Taskiq engole a excecao da task (guarda em ``TaskiqResult.error``) e mantem
o worker vivo, entao a ``DjangoIntegration`` -- que so enxerga o ciclo de
request -- nunca ve erro de background job. Sem este middleware as falhas do
``backend-ieadpg-worker`` e do ``backend-ieadpg-scheduler`` ficariam invisiveis
no Sentry.

Fica em modulo separado de ``core.sentry`` de proposito: assim ``core.settings``
nao passa a importar o Taskiq so pra inicializar o SDK.
"""

from typing import Any

from taskiq.abc.middleware import TaskiqMiddleware
from taskiq.message import TaskiqMessage
from taskiq.result import TaskiqResult


class SentryTaskiqMiddleware(TaskiqMiddleware):
    """Envia pro Sentry toda excecao levantada dentro de uma task.

    No-op quando o Sentry nao esta inicializado (sem ``SENTRY_DSN``), entao
    pode ficar sempre plugado no broker.
    """

    def on_error(
        self,
        message: TaskiqMessage,
        result: TaskiqResult[Any],
        exception: BaseException,
    ) -> None:
        try:
            import sentry_sdk
        except ImportError:
            return

        if not sentry_sdk.get_client().is_active():
            return

        with sentry_sdk.new_scope() as scope:
            # Agrupa as issues por task em vez de juntar tudo no mesmo lugar.
            scope.set_tag("taskiq.task_name", message.task_name)
            scope.set_tag("taskiq.task_id", message.task_id)
            scope.set_context(
                "taskiq",
                {
                    "task_name": message.task_name,
                    "task_id": message.task_id,
                    "labels": message.labels,
                    # kwargs passa pelo scrub de ``core.sentry`` (filtra cpf,
                    # senha, token...). De args so vai a aridade: posicional
                    # nao tem nome pra filtrar.
                    "kwargs": message.kwargs,
                    "args_count": len(message.args),
                    "execution_time": result.execution_time,
                },
            )
            sentry_sdk.capture_exception(exception)
