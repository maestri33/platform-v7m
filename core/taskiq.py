"""
Taskiq task decorator with Django integration.

Import this decorator to create background tasks that have access to Django ORM and settings.

Example usage:
    from core.taskiq import task
    
    @task
    async def my_background_task(user_id: int) -> None:
        user = await User.objects.aget(id=user_id)
        # Do something with user
"""

from core.broker import broker

# Create the task decorator
task = broker.task

__all__ = ["task", "broker"]
