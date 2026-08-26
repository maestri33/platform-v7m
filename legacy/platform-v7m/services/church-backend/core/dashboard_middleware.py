"""
Compatibilidade local para o Taskiq Dashboard.

O pacote atual falha ao renderizar tarefas cujo retorno final e um valor
escalar (por exemplo: int, str ou bool). O dashboard espera apenas dict/list/None
na coluna `result`. Este middleware encapsula valores escalares em um objeto
simples para evitar que a UI quebre.
"""

from typing import Any

from taskiq.compat import model_dump
from taskiq.message import TaskiqMessage
from taskiq.result import TaskiqResult
from taskiq_dashboard import DashboardMiddleware


def _normalize_return_value(value: Any) -> dict[str, Any] | list[Any] | None:
    """Mantem formatos aceitos pelo dashboard e encapsula escalares."""
    if value is None or isinstance(value, (dict, list)):
        return value
    return {"value": value}


class CompatibleDashboardMiddleware(DashboardMiddleware):
    async def post_execute(
        self,
        message: TaskiqMessage,
        result: TaskiqResult[Any],
    ) -> None:
        """Envia o resultado final em um formato sempre aceito pela UI."""
        dict_result: dict[str, Any] = model_dump(result)
        normalized_return_value = _normalize_return_value(dict_result.get("return_value"))

        await self._spawn_request(
            f"api/tasks/{message.task_id}/executed",
            {
                "finishedAt": self._now_iso(),
                "executionTime": result.execution_time,
                "error": None if result.error is None else repr(result.error),
                "returnValue": {"return_value": normalized_return_value},
            },
        )
