"""Admin de notificações - Configuração completa e avançada."""

from django.contrib import admin
from django.utils.html import format_html
from unfold.admin import ModelAdmin, TabularInline
from unfold.decorators import action

from .models import Notification, NotificationLog
from .services.queue import enqueue_notification


def _badge(text, background_color, *, text_color="white", padding="2px 6px", border_radius="3px", font_size="11px"):
    return format_html(
        '<span style="background-color: {}; color: {}; padding: {}; border-radius: {}; font-size: {};">{}</span>',
        background_color,
        text_color,
        padding,
        border_radius,
        font_size,
        text,
    )


class NotificationLogInline(TabularInline):
    """Inline para logs de entrega da notificação."""
    model = NotificationLog
    extra = 0
    readonly_fields = [
        "channel",
        "get_success_badge",
        "provider_message_id",
        "get_response_summary",
        "created_at",
    ]
    fields = [
        "channel",
        "get_success_badge",
        "provider_message_id",
        "get_response_summary",
        "created_at",
    ]
    can_delete = False
    ordering = ["-created_at"]
    
    def has_add_permission(self, request, obj=None):
        return False
    
    @admin.display(description="Status")
    def get_success_badge(self, obj):
        """Retorna badge de sucesso/falha."""
        if obj.success:
            return _badge("✓", "green")
        return _badge("✗", "red")
    
    @admin.display(description="Resposta")
    def get_response_summary(self, obj):
        """Retorna resumo da resposta."""
        if obj.response_data:
            return str(obj.response_data)[:50] + "..."
        return obj.error_message[:50] + "..." if obj.error_message else "-"


@admin.register(Notification)
class NotificationAdmin(ModelAdmin):
    """Admin de notificações - Configuração completa."""
    
    # Listagem
    list_display = [
        "title",
        "get_recipient_info",
        "get_media_badge",
        "use_tts",
        "get_template_badge",
        "get_status_badge",
        "channel_sent",
        "scheduled_for",
        "created_at",
    ]
    list_filter = [
        "status",
        "media_type",
        "use_tts",
        "channel_sent",
        "template_name",
        "created_at",
        "scheduled_for",
    ]
    search_fields = [
        "title",
        "content",
        "recipient__user__email",
        "recipient__full_name",
        "recipient__user__username",
        "event_key",
    ]
    readonly_fields = [
        "sent_at",
        "processed_at",
        "attempts",
        "channel_sent",
        "last_error_message",
        "created_at",
    ]
    ordering = ["-created_at"]
    date_hierarchy = "created_at"
    
    # Inlines
    inlines = [NotificationLogInline]
    
    # Fieldsets organizados
    fieldsets = (
        (
            "Destinatário e Conteúdo",
            {
                "fields": (
                    "recipient",
                    ("title", "event_key"),
                    "content",
                ),
            },
        ),
        (
            "Template",
            {
                "fields": ("template_name",),
                "description": "Template HTML utilizado para envio de e-mail.",
            },
        ),
        (
            "Mídia e TTS",
            {
                "fields": (
                    "use_tts",
                    "is_media",
                    "media_type",
                    ("media_filename", "media_mime_type"),
                    "media_payload",
                ),
                "description": "Configurações para envio de mídia via WhatsApp.",
                "classes": ("collapse",),
            },
        ),
        (
            "Controle de Envio",
            {
                "fields": (
                    ("status", "channel_sent"),
                    ("scheduled_for", "sent_at", "processed_at"),
                    "attempts",
                    "last_error_message",
                ),
            },
        ),
        (
            "Auditoria",
            {
                "fields": ("created_at",),
                "classes": ("collapse",),
            },
        ),
    )
    
    autocomplete_fields = ["recipient"]
    
    # Ações personalizadas
    actions = [
        "mark_as_pending",
        "mark_as_processing",
        "mark_as_sent",
        "mark_as_failed",
        "resend_notification",
        "cancel_scheduled",
    ]
    
    @admin.display(description="Destinatário")
    def get_recipient_info(self, obj):
        """Retorna informações do destinatário."""
        name = obj.recipient.full_name or obj.recipient.user.get_full_name()
        email = obj.recipient.user.email
        return format_html(
            '<strong>{}</strong><br/><small>{}</small>',
            name,
            email or obj.recipient.user.username,
        )
    
    @admin.display(description="Mídia")
    def get_media_badge(self, obj):
        """Retorna badge do tipo de mídia."""
        icons = {
            "text": "📝",
            "image": "🖼️",
            "video": "🎬",
            "audio": "🎵",
            "document": "📄",
        }
        icon = icons.get(obj.media_type, "📝")
        
        if obj.is_media:
            return format_html(
                '<span style="background-color: purple; color: white; padding: 2px 6px; '
                'border-radius: 3px; font-size: 11px;">{} {}</span>',
                icon,
                obj.get_media_type_display(),
            )
        return _badge("📝 Texto", "gray")
    
    @admin.display(description="Template")
    def get_template_badge(self, obj):
        """Retorna badge do template."""
        if obj.template_name:
            return format_html(
                '<span style="background-color: blue; color: white; padding: 2px 6px; '
                'border-radius: 3px; font-size: 11px;">{}</span>',
                obj.template_name[:20],
            )
        return _badge("Padrão", "gray")
    
    @admin.display(description="Status")
    def get_status_badge(self, obj):
        """Retorna badge colorido para o status."""
        colors = {
            "pending": "orange",
            "processing": "blue",
            "sent": "green",
            "failed": "red",
        }
        color = colors.get(obj.status, "gray")
        
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 4px; font-size: 12px;">{}</span>',
            color,
            obj.get_status_display(),
        )
    
    @action(description="Marcar como Pendente")
    def mark_as_pending(self, request, queryset):
        """Marca notificações como pendentes."""
        updated = queryset.update(status=Notification.Status.PENDING)
        self.message_user(request, f"{updated} notificação(ões) marcada(s) como Pendente.")
    
    @action(description="Marcar como Processando")
    def mark_as_processing(self, request, queryset):
        """Marca notificações como processando."""
        updated = queryset.update(status=Notification.Status.PROCESSING)
        self.message_user(request, f"{updated} notificação(ões) marcada(s) como Processando.")
    
    @action(description="Marcar como Enviado")
    def mark_as_sent(self, request, queryset):
        """Marca notificações como enviadas."""
        from django.utils import timezone
        updated = queryset.update(
            status=Notification.Status.SENT,
            sent_at=timezone.now(),
        )
        self.message_user(request, f"{updated} notificação(ões) marcada(s) como Enviado.")
    
    @action(description="Marcar como Falhou")
    def mark_as_failed(self, request, queryset):
        """Marca notificações como falhas."""
        updated = queryset.update(status=Notification.Status.FAILED)
        self.message_user(request, f"{updated} notificação(ões) marcada(s) como Falhou.")
    
    @action(description="Reenviar notificações selecionadas")
    def resend_notification(self, request, queryset):
        """Reenvia as notificações selecionadas."""
        count = 0
        for notification in queryset:
            notification.status = Notification.Status.PENDING
            notification.attempts = 0
            notification.last_error_message = ""
            notification.channel_sent = ""
            notification.sent_at = None
            notification.processed_at = None
            notification.save(
                update_fields=[
                    "status",
                    "attempts",
                    "last_error_message",
                    "channel_sent",
                    "sent_at",
                    "processed_at",
                ]
            )
            enqueue_notification(notification.id)
            count += 1
        self.message_user(request, f"{count} notificação(ões) preparada(s) para reenvio.")
    
    @action(description="Cancelar envio agendado")
    def cancel_scheduled(self, request, queryset):
        """Cancela notificações agendadas."""
        scheduled = queryset.filter(status=Notification.Status.PENDING, scheduled_for__isnull=False)
        count = scheduled.count()
        scheduled.update(scheduled_for=None)
        self.message_user(request, f"{count} agendamento(s) cancelado(s).")


@admin.register(NotificationLog)
class NotificationLogAdmin(ModelAdmin):
    """Admin de logs de notificação - Configuração completa."""
    
    list_display = [
        "get_notification_info",
        "channel",
        "get_success_badge",
        "provider_message_id",
        "created_at",
    ]
    list_filter = [
        "channel",
        "success",
        "created_at",
    ]
    search_fields = [
        "notification__title",
        "notification__recipient__user__email",
        "provider_message_id",
        "error_message",
    ]
    readonly_fields = [
        "notification",
        "channel",
        "success",
        "provider_message_id",
        "response_data",
        "error_message",
        "created_at",
    ]
    ordering = ["-created_at"]
    date_hierarchy = "created_at"
    
    fieldsets = (
        (
            "Notificação",
            {
                "fields": ("notification",),
            },
        ),
        (
            "Entrega",
            {
                "fields": (
                    ("channel", "success"),
                    "provider_message_id",
                ),
            },
        ),
        (
            "Resposta",
            {
                "fields": ("response_data",),
                "classes": ("collapse",),
            },
        ),
        (
            "Erro",
            {
                "fields": ("error_message",),
                "classes": ("collapse",),
            },
        ),
        (
            "Auditoria",
            {
                "fields": ("created_at",),
                "classes": ("collapse",),
            },
        ),
    )
    
    autocomplete_fields = ["notification"]
    
    actions = ["export_logs", "delete_old_logs"]
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    @admin.display(description="Notificação")
    def get_notification_info(self, obj):
        """Retorna informações da notificação."""
        return format_html(
            '<strong>{}</strong><br/><small>→ {}</small>',
            obj.notification.title[:40],
            obj.notification.recipient.user.email or obj.notification.recipient.user.username,
        )
    
    @admin.display(description="Status")
    def get_success_badge(self, obj):
        """Retorna badge de sucesso/falha."""
        if obj.success:
            return _badge("✓ Sucesso", "green", padding="3px 8px", border_radius="4px", font_size="12px")
        return _badge("✗ Falha", "red", padding="3px 8px", border_radius="4px", font_size="12px")
    
    @action(description="Exportar logs selecionados (CSV)")
    def export_logs(self, request, queryset):
        """Exporta os logs selecionados para CSV."""
        import csv
        from django.http import HttpResponse
        
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="notification_logs.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            "Data/Hora", "Notificação", "Canal", "Sucesso", "Message ID"
        ])
        
        for log in queryset:
            writer.writerow([
                log.created_at,
                log.notification.title,
                log.get_channel_display(),
                "Sim" if log.success else "Não",
                log.provider_message_id,
            ])
        
        return response
    
    @action(description="Deletar logs antigos (> 90 dias)")
    def delete_old_logs(self, request, queryset):
        """Deleta logs com mais de 90 dias."""
        from datetime import timedelta
        from django.utils import timezone
        
        cutoff_date = timezone.now() - timedelta(days=90)
        old_logs = NotificationLog.objects.filter(created_at__lt=cutoff_date)
        count = old_logs.count()
        old_logs.delete()
        self.message_user(request, f"{count} logs antigos deletados com sucesso.")
