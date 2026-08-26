"""Admin dos papéis."""

from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import ProfileRole, Role
from .services import RoleTransitionError, grant_role


@admin.register(ProfileRole)
class ProfileRoleAdmin(ModelAdmin):
    list_display = ("profile", "role", "is_active", "granted_at", "source")
    list_filter = ("role", "is_active", "source")
    search_fields = ("profile__full_name", "profile__user__username")
    raw_id_fields = ("profile", "granted_by")
    readonly_fields = ("granted_at", "revoked_at")
    actions = ("promover_para_congregado", "promover_para_membro")

    def _promover(self, request, queryset, role):
        promovidos = recusados = 0
        for row in queryset:
            try:
                grant_role(row.profile, role, source="admin", granted_by=request.user)
                promovidos += 1
            except RoleTransitionError as exc:
                recusados += 1
                self.message_user(request, f"{row.profile}: {exc}", level=30)
        self.message_user(request, f"{promovidos} promovido(s), {recusados} recusado(s).")

    @admin.action(description="Promover para congregado")
    def promover_para_congregado(self, request, queryset):
        self._promover(request, queryset, Role.CONGREGADO)

    @admin.action(description="Promover para membro")
    def promover_para_membro(self, request, queryset):
        self._promover(request, queryset, Role.MEMBRO)
