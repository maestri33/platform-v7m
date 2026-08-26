"""
Tasks assíncronas para processamento de notificações via Taskiq.

IMPORTANTE: Todos os imports do Django são feitos DENTRO das funções
para evitar AppRegistryNotReady quando o worker importa este módulo.
"""

import logging

from asgiref.sync import sync_to_async

from core.taskiq import task

logger = logging.getLogger(__name__)


@task
async def process_notification_async(notification_id: int) -> None:
    """
    Processa uma notificação de forma assíncrona.
    
    - Se scheduled_for estiver vazio: processa imediatamente
    - Se scheduled_for for no passado: processa imediatamente  
    - Se scheduled_for for no futuro: aguarda até o momento correto
    
    Args:
        notification_id: ID da notificação a ser processada
    """
    # Imports lazy para evitar AppRegistryNotReady
    from django.utils import timezone
    from notifications.models import Notification
    from notifications.send import send_notification
    
    try:
        # Busca a notificação de forma assíncrona
        get_notification = sync_to_async(
            Notification.objects.filter(pk=notification_id).first,
            thread_sensitive=True
        )
        notification = await get_notification()
        
        if not notification:
            logger.warning(f"Notificação {notification_id} não encontrada")
            return
        
        # Verifica se já foi enviada
        if notification.status == Notification.Status.SENT:
            logger.info(f"Notificação {notification_id} já foi enviada")
            return
        
        # Verifica agendamento
        now = timezone.now()
        scheduled = notification.scheduled_for
        
        if scheduled and scheduled > now:
            # Data futura - reagenda para mais tarde (simples: deixa para próxima execução do worker)
            delay_minutes = int((scheduled - now).total_seconds() / 60)
            logger.info(
                f"Notificação {notification_id} agendada para {scheduled}. "
                f"Será processada em ~{delay_minutes} minutos"
            )
            # Não faz nada agora - o comando process_pending_notifications pegará depois
            return
        
        # Processa imediatamente (sem agendamento ou data no passado)
        logger.info(f"Processando notificação {notification_id}")
        
        # Executa o envio sincronamente em thread separada
        await sync_to_async(send_notification, thread_sensitive=True)(notification_id)
        
    except Exception as e:
        logger.exception(f"Erro ao processar notificação {notification_id}: {e}")
        raise


@task(schedule=[{"cron": "* * * * *"}])
async def check_and_process_scheduled_notifications() -> int:
    """
    Task periódica para processar notificações agendadas que já venceram.
    
    Returns:
        Quantidade de notificações processadas
    """
    from notifications.services.queue import process_due_notifications
    
    try:
        count = await sync_to_async(process_due_notifications, thread_sensitive=True)()
        logger.info(f"Processadas {count} notificações agendadas")
        return count
    except Exception as e:
        logger.exception(f"Erro ao processar notificações agendadas: {e}")
        return 0

