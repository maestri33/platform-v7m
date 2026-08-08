"""
Taskiq broker configuration for Django.

This module sets up the Taskiq broker with Redis as the message broker.
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from django.conf import settings

# Add project root to Python path for proper imports
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
load_dotenv(BASE_DIR / ".env")

from taskiq import TaskiqEvents, TaskiqScheduler
from taskiq.schedule_sources import LabelScheduleSource
from taskiq_redis import ListQueueBroker
from taskiq.context import Context

from core.dashboard_middleware import CompatibleDashboardMiddleware
from core.sentry_taskiq import SentryTaskiqMiddleware

# Configure Django settings before importing models
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

# Create the broker with dashboard middleware
broker = (
    ListQueueBroker(
        url=settings.TASKIQ_REDIS_URL,
        queue_name=settings.TASKIQ_QUEUE_NAME,
    )
    .with_middlewares(
        CompatibleDashboardMiddleware(
            url=settings.TASKIQ_DASHBOARD_URL,
            api_token=settings.TASKIQ_DASHBOARD_TOKEN,
            broker_name=settings.TASKIQ_BROKER_NAME,
        ),
        # Erro de task nao passa pelo ciclo de request, entao a
        # DjangoIntegration nao o enxerga -- este middleware faz o report.
        SentryTaskiqMiddleware(),
    )
)

# Create scheduler for cron jobs
scheduler = TaskiqScheduler(
    broker=broker,
    sources=[LabelScheduleSource(broker)],
)


@broker.on_event(TaskiqEvents.WORKER_STARTUP)
async def startup(context: Context) -> None:
    """Initialize Django when worker starts."""
    import django
    django.setup()


@broker.on_event(TaskiqEvents.WORKER_SHUTDOWN)
async def shutdown(context: Context) -> None:
    """Cleanup when worker shuts down."""
    pass
