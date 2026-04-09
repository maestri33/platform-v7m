"""Admin do app visitors - Configuração completa e avançada."""

from django.contrib import admin
from django.utils.html import format_html
from unfold.admin import ModelAdmin, TabularInline
from unfold.decorators import action

from .models import EvangelicalChurchInfo, Visitor, VisitorApiLog


class EvangelicalChurchInfoInline(admin.StackedInline):
    """Inline para informações de igreja evangélica."""
    model = EvangelicalChurchInfo
    can_delete = False
    verbose_name_plural = "Informações de Igreja Evangélica"
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (
            "Igreja",
            {
                "fields": (
                    "church_name",
                    "is_in_communion",
                ),
            },
        ),
        (
            "Auditoria",
            {
                "fields": ("created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )


@admin.register(Visitor)
class VisitorAdmin(ModelAdmin):
    """Admin de visitantes - Configuração completa."""
    
    list_display = (
        "get_profile_info",
        "get_status_badge",
        "date_of_visit",
        "religion",
        "christianity_type",
        "has_church_info",
        "created_at",
    )
    list_filter = (
        "status",
        "religion",
        "christianity_type",
        "date_of_visit",
        "created_at",
    )
    search_fields = (
        "profile__user__username",
        "profile__user__email",
        "profile__full_name",
        "profile__uuid",
    )
    readonly_fields = (
        "created_at",
        "updated_at",
    )
    ordering = ("-created_at",)
    date_hierarchy = "date_of_visit"
    
    # Inlines
    inlines = [EvangelicalChurchInfoInline]
    
    fieldsets = (
        (
            "Perfil",
            {
                "fields": ("profile",),
            },
        ),
        (
            "Status e Data",
            {
                "fields": (
                    "status",
                    "date_of_visit",
                ),
            },
        ),
        (
            "Informações Religiosas",
            {
                "fields": (
                    "religion",
                    "christianity_type",
                ),
            },
        ),
        (
            "Auditoria",
            {
                "fields": ("created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )
    
    autocomplete_fields = ["profile"]
    
    actions = [
        "mark_status_new_online",
        "mark_status_data_completed",
        "mark_status_address_completed",
        "mark_status_awaiting_visit",
        "mark_status_new_presencial",
        "mark_status_awaiting_gift",
        "mark_religion_christianity",
        "mark_religion_no_religion",
    ]
    
    @admin.display(description="Perfil")
    def get_profile_info(self, obj):
        """Retorna informações do perfil."""
        return format_html(
            '<strong>{}</strong><br/><small>{}</small>',
            obj.profile.full_name or obj.profile.user.get_full_name(),
            obj.profile.user.email or obj.profile.user.username,
        )
    
    @admin.display(description="Status")
    def get_status_badge(self, obj):
        """Retorna badge colorido para o status."""
        status_colors = {
            1: "blue",      # NEW_ONLINE
            2: "orange",    # DATA_COMPLETED_ONLINE
            3: "purple",    # ADDRESS_COMPLETED_ONLINE
            4: "cyan",      # AWAITTING_PRESENTIAL_VISIT
            11: "green",    # NEW_PRESENCIAL
            12: "teal",     # DATA_COMPLETED_PRESENCIAL
            13: "indigo",   # ADDRESS_COMPLETED_PRESENCIAL
            14: "pink",     # AWAITING_TO_COLLECT_YOUR_GIFT
            21: "yellow",   # AWAITING_RECEPTION_CONTACT
        }
        color = status_colors.get(obj.status, "gray")
        status_label = obj.get_status_display()
        
        return format_html(
            '<span style="background-color: {}; color: white; padding: 4px 8px; '
            'border-radius: 4px; font-size: 12px;">{}</span>',
            color,
            status_label,
        )
    
    @admin.display(description="Info Igreja", boolean=True)
    def has_church_info(self, obj):
        """Verifica se tem informações de igreja."""
        return hasattr(obj, "evangelical_church_info")
    
    # Actions de Status
    @action(description="Marcar status: Cadastro online realizado")
    def mark_status_new_online(self, request, queryset):
        """Marca status como novo online."""
        updated = queryset.update(status=1)
        self.message_user(request, f"{updated} visitante(s) marcado(s) como 'Cadastro online realizado'.")
    
    @action(description="Marcar status: Dados iniciais salvos - online")
    def mark_status_data_completed(self, request, queryset):
        """Marca status como dados completados online."""
        updated = queryset.update(status=2)
        self.message_user(request, f"{updated} visitante(s) marcado(s) como 'Dados iniciais salvos - online'.")
    
    @action(description="Marcar status: Endereço salvo - online")
    def mark_status_address_completed(self, request, queryset):
        """Marca status como endereço completado online."""
        updated = queryset.update(status=3)
        self.message_user(request, f"{updated} visitante(s) marcado(s) como 'Endereço salvo - online'.")
    
    @action(description="Marcar status: Aguardando visita presencial")
    def mark_status_awaiting_visit(self, request, queryset):
        """Marca status como aguardando visita."""
        updated = queryset.update(status=4)
        self.message_user(request, f"{updated} visitante(s) marcado(s) como 'Aguardando visita presencial'.")
    
    @action(description="Marcar status: Visitante presencial registrado")
    def mark_status_new_presencial(self, request, queryset):
        """Marca status como novo presencial."""
        updated = queryset.update(status=11)
        self.message_user(request, f"{updated} visitante(s) marcado(s) como 'Visitante presencial registrado'.")
    
    @action(description="Marcar status: Aguardando coleta do presente")
    def mark_status_awaiting_gift(self, request, queryset):
        """Marca status como aguardando presente."""
        updated = queryset.update(status=14)
        self.message_user(request, f"{updated} visitante(s) marcado(s) como 'Aguardando coleta do presente'.")
    
    # Actions de Religião
    @action(description="Marcar religião: Cristianismo")
    def mark_religion_christianity(self, request, queryset):
        """Marca religião como cristianismo."""
        updated = queryset.update(religion="christianity")
        self.message_user(request, f"{updated} visitante(s) marcado(s) como 'Cristianismo'.")
    
    @action(description="Marcar religião: Sem religião")
    def mark_religion_no_religion(self, request, queryset):
        """Marca religião como sem religião."""
        updated = queryset.update(religion="no_religion")
        self.message_user(request, f"{updated} visitante(s) marcado(s) como 'Sem religião'.")


@admin.register(EvangelicalChurchInfo)
class EvangelicalChurchInfoAdmin(ModelAdmin):
    """Admin de informações de igreja evangélica - Configuração completa."""
    
    list_display = (
        "get_visitor_info",
        "church_name",
        "get_communion_status",
        "created_at",
    )
    list_filter = (
        "is_in_communion",
        "created_at",
    )
    search_fields = (
        "visitor__profile__full_name",
        "visitor__profile__user__username",
        "church_name",
    )
    readonly_fields = (
        "created_at",
        "updated_at",
    )
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    
    fieldsets = (
        (
            "Visitante",
            {
                "fields": ("visitor",),
            },
        ),
        (
            "Igreja",
            {
                "fields": (
                    "church_name",
                    "is_in_communion",
                ),
            },
        ),
        (
            "Auditoria",
            {
                "fields": ("created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )
    
    autocomplete_fields = ["visitor"]
    
    @admin.display(description="Visitante")
    def get_visitor_info(self, obj):
        """Retorna informações do visitante."""
        return format_html(
            '<strong>{}</strong>',
            obj.visitor.profile.full_name or obj.visitor.profile.user.get_full_name(),
        )
    
    @admin.display(description="Em Comunhão")
    def get_communion_status(self, obj):
        """Retorna status de comunhão formatado."""
        if obj.is_in_communion is None:
            return format_html('<span style="color: gray;">Não informado</span>')
        elif obj.is_in_communion:
            return format_html('<span style="color: green;">✓ Sim</span>')
        else:
            return format_html('<span style="color: red;">✗ Não</span>')


@admin.register(VisitorApiLog)
class VisitorApiLogAdmin(ModelAdmin):
    """Admin de logs da API de visitantes - Configuração completa (somente leitura)."""
    
    list_display = (
        "created_at",
        "operation",
        "request_method",
        "path",
        "get_user_info",
        "get_success_badge",
        "status_code",
        "duration_ms",
    )
    list_filter = (
        "success",
        "request_method",
        "operation",
        ("status_code", admin.EmptyFieldListFilter),
        "created_at",
    )
    search_fields = (
        "operation",
        "path",
        "authenticated_profile_uuid",
        "error_message",
        "response_text",
        "request_data",
    )
    readonly_fields = (
        "id",
        "operation",
        "request_method",
        "path",
        "authenticated_user_id",
        "authenticated_profile_uuid",
        "success",
        "status_code",
        "duration_ms",
        "request_data",
        "response_data",
        "response_text",
        "error_message",
        "created_at",
    )
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    
    fieldsets = (
        (
            "Requisição",
            {
                "fields": (
                    ("operation", "request_method"),
                    "path",
                ),
            },
        ),
        (
            "Autenticação",
            {
                "fields": (
                    "authenticated_user_id",
                    "authenticated_profile_uuid",
                ),
            },
        ),
        (
            "Resposta",
            {
                "fields": (
                    ("success", "status_code"),
                    "duration_ms",
                ),
            },
        ),
        (
            "Dados",
            {
                "fields": (
                    "request_data",
                    "response_data",
                    "response_text",
                ),
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
                "fields": ("id", "created_at"),
                "classes": ("collapse",),
            },
        ),
    )
    
    actions = ["export_logs", "delete_old_logs"]
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    @admin.display(description="Usuário")
    def get_user_info(self, obj):
        """Retorna informações do usuário autenticado."""
        if obj.authenticated_user_id:
            return format_html(
                'ID: <strong>{}</strong><br><small>Profile: {}</small>',
                obj.authenticated_user_id,
                obj.authenticated_profile_uuid[:8] + "..." if obj.authenticated_profile_uuid else "-",
            )
        return format_html('<span style="color: gray;">Anônimo</span>')
    
    @admin.display(description="Status")
    def get_success_badge(self, obj):
        """Retorna badge de sucesso/falha."""
        if obj.success:
            return format_html(
                '<span style="background-color: green; color: white; padding: 2px 6px; '
                'border-radius: 3px; font-size: 11px;">✓ Sucesso</span>'
            )
        return format_html(
            '<span style="background-color: red; color: white; padding: 2px 6px; '
            'border-radius: 3px; font-size: 11px;">✗ Falha</span>'
        )
    
    @action(description="Exportar logs selecionados (CSV)")
    def export_logs(self, request, queryset):
        """Exporta os logs selecionados para CSV."""
        import csv
        from django.http import HttpResponse
        
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="visitor_api_logs.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            "Data/Hora", "Operação", "Método", "Path", 
            "User ID", "Sucesso", "Status Code", "Duração (ms)"
        ])
        
        for log in queryset:
            writer.writerow([
                log.created_at,
                log.operation,
                log.request_method,
                log.path,
                log.authenticated_user_id,
                "Sim" if log.success else "Não",
                log.status_code,
                log.duration_ms,
            ])
        
        return response
    
    @action(description="Deletar logs antigos (> 30 dias)")
    def delete_old_logs(self, request, queryset):
        """Deleta logs com mais de 30 dias."""
        from datetime import timedelta
        from django.utils import timezone
        
        cutoff_date = timezone.now() - timedelta(days=30)
        old_logs = VisitorApiLog.objects.filter(created_at__lt=cutoff_date)
        count = old_logs.count()
        old_logs.delete()
        self.message_user(request, f"{count} logs antigos deletados com sucesso.")
