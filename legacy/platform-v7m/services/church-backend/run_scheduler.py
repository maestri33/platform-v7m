#!/usr/bin/env python3
"""
Script para executar o Taskiq Scheduler via CLI.

O Scheduler é responsável por executar tasks agendadas (cron).
Ele verifica a cada minuto se há tasks para executar.

Uso:
    python run_scheduler.py

Ou diretamente:
    taskiq scheduler core.broker:broker --fs-discover --log-level INFO
"""

import subprocess
import sys


def run_scheduler() -> None:
    """Inicia o scheduler de tasks usando a CLI do Taskiq."""
    
    print("🕐 Iniciando Taskiq Scheduler...")
    print("   Verificando cron jobs a cada minuto")
    print("   Pressione CTRL+C para parar\n")
    
    # Executa o scheduler via CLI
    cmd = [
        sys.executable, "-m", "taskiq",
        "scheduler",
        "core.broker:broker",  # Path to broker
        "--fs-discover",        # Auto-discover tasks
        "--log-level", "INFO",
    ]
    
    subprocess.run(cmd)


if __name__ == "__main__":
    try:
        run_scheduler()
    except KeyboardInterrupt:
        print("\n👋 Scheduler encerrado.")
