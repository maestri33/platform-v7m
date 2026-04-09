#!/usr/bin/env python3
"""
Script para executar o Taskiq Dashboard.

Uso:
    python run_dashboard.py

Variáveis de ambiente:
    TASKIQ_DASHBOARD_TOKEN - Token de API (padrão: supersecret)
    TASKIQ_DASHBOARD_PORT - Porta do dashboard (padrão: 9000)
    TASKIQ_DASHBOARD_HOST - Host do dashboard (padrão: 0.0.0.0)
    TASKIQ_DASHBOARD_STORAGE - Tipo de storage: sqlite ou postgres (padrão: sqlite)
    TASKIQ_DASHBOARD_DATABASE_DSN - DSN explícito do dashboard
"""

import asyncio
import json
import sqlite3
from pathlib import Path

from dotenv import load_dotenv
from django.conf import settings as django_settings

from taskiq_dashboard import TaskiqDashboard

from core.broker import broker, scheduler


def _resolve_sqlite_dsn(database_dsn: str, base_dir: Path) -> str:
    """Converte DSNs SQLite relativos para caminhos absolutos do projeto."""
    prefix = "sqlite+aiosqlite:///"
    if not database_dsn.startswith(prefix):
        return database_dsn

    sqlite_path = database_dsn.removeprefix(prefix)
    if not sqlite_path or sqlite_path.startswith("/"):
        return database_dsn

    return f"{prefix}{base_dir / sqlite_path}"


def _extract_sqlite_path(database_dsn: str) -> Path | None:
    """Extrai o caminho local a partir de um DSN sqlite+aiosqlite."""
    prefix = "sqlite+aiosqlite:///"
    if not database_dsn.startswith(prefix):
        return None
    return Path(database_dsn.removeprefix(prefix))


def _normalize_legacy_task_results(database_dsn: str) -> int:
    """
    Corrige resultados escalares antigos que quebram a UI do taskiq-dashboard.

    O dashboard atual espera `result` como dict/list/null. Registros antigos com
    inteiros, strings ou booleanos causam erro ao abrir a lista de tarefas.
    """
    sqlite_path = _extract_sqlite_path(database_dsn)
    if sqlite_path is None or not sqlite_path.exists():
        return 0

    with sqlite3.connect(sqlite_path) as connection:
        cursor = connection.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'tasks'")
        if cursor.fetchone() is None:
            return 0

        cursor.execute("SELECT id, result FROM tasks WHERE result IS NOT NULL")
        updates: list[tuple[str, str]] = []

        for task_id, raw_result in cursor.fetchall():
            normalized_value = raw_result

            if isinstance(raw_result, str):
                try:
                    normalized_value = json.loads(raw_result)
                except json.JSONDecodeError:
                    normalized_value = raw_result

            if normalized_value is None or isinstance(normalized_value, (dict, list)):
                continue

            updates.append(
                (
                    json.dumps({"value": normalized_value}, ensure_ascii=False),
                    task_id,
                )
            )

        if not updates:
            return 0

        cursor.executemany("UPDATE tasks SET result = ? WHERE id = ?", updates)
        connection.commit()
        return len(updates)


async def run_dashboard() -> None:
    """Inicia o painel de administração do Taskiq."""
    base_dir = Path(__file__).resolve().parent
    load_dotenv(base_dir / ".env")

    storage_type = django_settings.TASKIQ_DASHBOARD_STORAGE
    database_dsn = _resolve_sqlite_dsn(
        django_settings.TASKIQ_DASHBOARD_DATABASE_DSN,
        base_dir,
    )
    normalized_results = 0
    if storage_type == "sqlite":
        normalized_results = _normalize_legacy_task_results(database_dsn)
    port = django_settings.TASKIQ_DASHBOARD_PORT
    address = django_settings.TASKIQ_DASHBOARD_HOST
    root_path = django_settings.TASKIQ_DASHBOARD_ROOT_PATH

    print(f"🚀 Iniciando Taskiq Dashboard...")
    print(f"   URL: http://{address}:{port}")
    print(f"   Storage: {storage_type}")
    print(f"   Broker: {django_settings.TASKIQ_BROKER_NAME}")
    print(f"   Scheduler: configurado")
    if root_path:
        print(f"   Root path: {root_path}")
    if normalized_results:
        print(f"   Legacy results corrigidos: {normalized_results}")
    print(f"   Pressione CTRL+C para parar\n")

    app = TaskiqDashboard(
        api_token=django_settings.TASKIQ_DASHBOARD_TOKEN,
        storage_type=storage_type,
        database_dsn=database_dsn,
        broker=broker,
        scheduler=scheduler,
        root_path=root_path,
        address=address,
        port=port,
    )
    await app.run()


if __name__ == "__main__":
    try:
        asyncio.run(run_dashboard())
    except KeyboardInterrupt:
        print("\n👋 Dashboard encerrado.")
