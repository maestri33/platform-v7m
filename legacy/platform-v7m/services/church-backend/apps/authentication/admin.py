"""Admin de autenticação com Unfold - Configuração completa."""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.admin import GroupAdmin as BaseGroupAdmin
from django.contrib.auth.models import User, Group
from django.utils.html import format_html
from unfold.admin import ModelAdmin
from unfold.forms import AdminPasswordChangeForm, UserChangeForm, UserCreationForm
from unfold.decorators import action

from .models import LoginOtpState


admin.site.unregister(User)
admin.site.unregister(Group)


def _status_label(text, color):
    return format_html('<span style="color: {};">{}</span>', color, text)


class LoginOtpStateInline(admin.StackedInline):
    """Inline para estado OTP do usuário."""
    model = LoginOtpState
    can_delete = False
    verbose_name_plural = "Estado OTP"
    readonly_fields = (
        "otp_created_at",
        "last_sent_at",
        "send_window_started_at",
        "sends_in_window",
        "created_at",
        "updated_at",
    )
    fieldsets = (
        (
            "Informações de OTP",
            {
                "fields": (
                    "otp_created_at",
                    "last_sent_at",
                ),
            },
        ),
        (
            "Controle de Janela",
            {
                "fields": (
                    "send_window_started_at",
                    "sends_in_window",
                ),
            },
        ),
        (
            "Auditoria",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                ),
            },
        ),
    )


@admin.register(User)
class UserAdmin(BaseUserAdmin, ModelAdmin):
    """Admin de usuários com Unfold - Configuração completa."""
    
    form = UserChangeForm
    add_form = UserCreationForm
    change_password_form = AdminPasswordChangeForm
    
    # Listagem
    list_display = (
        "username",
        "email",
        "first_name",
        "last_name",
        "is_staff",
        "is_active",
        "date_joined",
        "last_login",
        "get_profile_status",
    )
    list_filter = (
        "is_staff",
        "is_superuser",
        "is_active",
        "date_joined",
        "last_login",
    )
    search_fields = (
        "username",
        "first_name",
        "last_name",
        "email",
    )
    ordering = ("-date_joined",)
    
    # Inlines
    inlines = [LoginOtpStateInline]
    
    # Fieldsets para edição
    fieldsets = (
        (
            "Informações Básicas",
            {
                "fields": ("username", "password"),
            },
        ),
        (
            "Informações Pessoais",
            {
                "fields": ("first_name", "last_name", "email"),
            },
        ),
        (
            "Permissões",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Datas Importantes",
            {
                "fields": ("last_login", "date_joined"),
                "classes": ("collapse",),
            },
        ),
    )
    
    # Fieldsets para criação
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("username", "password1", "password2"),
            },
        ),
    )
    
    # Ações
    actions = ["activate_users", "deactivate_users", "make_staff", "remove_staff"]
    
    @admin.display(description="Perfil", ordering="profile__uuid")
    def get_profile_status(self, obj):
        """Verifica se o usuário tem perfil vinculado."""
        if hasattr(obj, "profile"):
            return _status_label("✓ Criado", "green")
        return _status_label("✗ Pendente", "red")
    
    @action(description="Ativar usuários selecionados")
    def activate_users(self, request, queryset):
        """Ativa os usuários selecionados."""
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} usuário(s) ativado(s) com sucesso.")
    
    @action(description="Desativar usuários selecionados")
    def deactivate_users(self, request, queryset):
        """Desativa os usuários selecionados."""
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} usuário(s) desativado(s) com sucesso.")
    
    @action(description="Tornar staff")
    def make_staff(self, request, queryset):
        """Concede privilégios de staff aos usuários selecionados."""
        updated = queryset.update(is_staff=True)
        self.message_user(request, f"{updated} usuário(s) agora são staff.")
    
    @action(description="Remover staff")
    def remove_staff(self, request, queryset):
        """Remove privilégios de staff dos usuários selecionados."""
        updated = queryset.update(is_staff=False)
        self.message_user(request, f"{updated} usuário(s) não são mais staff.")


@admin.register(Group)
class GroupAdmin(BaseGroupAdmin, ModelAdmin):
    """Admin de grupos com Unfold - Configuração completa."""
    
    list_display = ("name", "get_permissions_count", "get_users_count")
    search_fields = ("name",)
    ordering = ("name",)
    filter_horizontal = ("permissions",)
    
    fieldsets = (
        (
            "Informações do Grupo",
            {
                "fields": ("name",),
            },
        ),
        (
            "Permissões",
            {
                "fields": ("permissions",),
                "classes": ("collapse",),
            },
        ),
    )
    
    @admin.display(description="Permissões")
    def get_permissions_count(self, obj):
        """Retorna a quantidade de permissões do grupo."""
        return obj.permissions.count()
    
    @admin.display(description="Usuários")
    def get_users_count(self, obj):
        """Retorna a quantidade de usuários no grupo."""
        return obj.user_set.count()


@admin.register(LoginOtpState)
class LoginOtpStateAdmin(ModelAdmin):
    """Admin para estado OTP de login - Configuração completa."""
    
    list_display = (
        "user",
        "otp_created_at",
        "last_sent_at",
        "sends_in_window",
        "send_window_started_at",
        "get_window_status",
        "created_at",
    )
    list_filter = (
        "sends_in_window",
        "otp_created_at",
        "last_sent_at",
        "created_at",
    )
    search_fields = (
        "user__username",
        "user__email",
        "user__first_name",
        "user__last_name",
    )
    readonly_fields = (
        "created_at",
        "updated_at",
    )
    ordering = ("-updated_at",)
    date_hierarchy = "created_at"
    
    fieldsets = (
        (
            "Usuário",
            {
                "fields": ("user",),
            },
        ),
        (
            "Informações de OTP",
            {
                "fields": (
                    "otp_created_at",
                    "last_sent_at",
                ),
            },
        ),
        (
            "Controle de Janela de Envio",
            {
                "fields": (
                    "send_window_started_at",
                    "sends_in_window",
                ),
            },
        ),
        (
            "Auditoria",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                ),
                "classes": ("collapse",),
            },
        ),
    )
    
    actions = ["reset_window_counter"]
    
    @admin.display(description="Status da Janela")
    def get_window_status(self, obj):
        """Retorna o status visual da janela de envio."""
        if obj.sends_in_window == 0:
            return _status_label("Livre", "green")
        if obj.sends_in_window < 3:
            return format_html(
                '<span style="color: {};">{}/5 envios</span>',
                "orange",
                obj.sends_in_window,
            )
        return format_html(
            '<span style="color: {};">{}/5 - Próximo do limite</span>',
            "red",
            obj.sends_in_window,
        )
    
    @action(description="Resetar contador de janela")
    def reset_window_counter(self, request, queryset):
        """Reseta o contador de envios na janela."""
        for obj in queryset:
            obj.sends_in_window = 0
            obj.send_window_started_at = None
            obj.save()
        self.message_user(request, f"{queryset.count()} contador(es) resetado(s).")
