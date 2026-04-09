"""Admin do app profiles - Configuração completa e avançada."""

from django.contrib import admin
from django.utils.html import format_html
from unfold.admin import ModelAdmin, TabularInline
from unfold.decorators import action

from .models import Address, AddressProof, Phone, Profile


class PhoneInline(admin.StackedInline):
    """Inline para telefone do perfil."""
    model = Phone
    can_delete = False
    verbose_name_plural = "Telefone"
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (
            "Contato",
            {
                "fields": ("number",),
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


class AddressProofInline(TabularInline):
    """Inline para comprovantes de endereço."""
    model = AddressProof
    extra = 0
    readonly_fields = ("created_at", "updated_at")
    fields = ("file", "description", "created_at")


@admin.register(Address)
class AddressAdmin(ModelAdmin):
    """Admin de endereços - Configuração completa."""
    
    list_display = (
        "get_full_address",
        "zipcode",
        "city",
        "state",
        "neighborhood",
        "get_profile_link",
        "created_at",
    )
    list_filter = (
        "state",
        "city",
        "created_at",
    )
    search_fields = (
        "street",
        "neighborhood",
        "city",
        "zipcode",
        "profile__user__username",
        "profile__full_name",
    )
    readonly_fields = (
        "created_at",
        "updated_at",
    )
    ordering = ("state", "city", "street", "number")
    date_hierarchy = "created_at"
    
    fieldsets = (
        (
            "Endereço",
            {
                "fields": (
                    ("zipcode", "country"),
                    ("street", "number"),
                    "complement",
                    ("neighborhood", "city", "state"),
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
    
    @admin.display(description="Endereço Completo")
    def get_full_address(self, obj):
        """Retorna o endereço formatado."""
        parts = [
            obj.street,
            f"Nº {obj.number}" if obj.number else "",
            obj.complement,
            obj.neighborhood,
            f"{obj.city}/{obj.state}" if obj.city and obj.state else "",
        ]
        return ", ".join(filter(None, parts)) or "Endereço incompleto"
    
    @admin.display(description="Perfil")
    def get_profile_link(self, obj):
        """Retorna link para o perfil vinculado."""
        if hasattr(obj, "profile"):
            profile = obj.profile
            return format_html(
                '<a href="/admin/profiles/profile/{}/change/">{}</a>',
                profile.pk,
                profile,
            )
        return "-"


@admin.register(Profile)
class ProfileAdmin(ModelAdmin):
    """Admin de perfis - Configuração completa."""
    
    list_display = (
        "get_user_info",
        "uuid",
        "full_name",
        "get_age",
        "gender",
        "marital_status",
        "education_level",
        "get_phone",
        "has_address",
        "created_at",
    )
    list_filter = (
        "gender",
        "marital_status",
        "education_level",
        "created_at",
    )
    search_fields = (
        "user__username",
        "user__first_name",
        "user__last_name",
        "user__email",
        "full_name",
        "mother_name",
        "uuid",
        "phone__number",
        "address__street",
        "address__city",
    )
    readonly_fields = (
        "uuid",
        "created_at",
        "updated_at",
    )
    ordering = ("user__first_name", "user__last_name")
    date_hierarchy = "created_at"
    
    # Inlines
    inlines = [PhoneInline, AddressProofInline]
    
    fieldsets = (
        (
            "Identificação",
            {
                "fields": (
                    ("user", "uuid"),
                    "full_name",
                ),
            },
        ),
        (
            "Dados Pessoais",
            {
                "fields": (
                    "date_of_birth",
                    "gender",
                    "marital_status",
                    "mother_name",
                ),
            },
        ),
        (
            "Escolaridade",
            {
                "fields": ("education_level",),
            },
        ),
        (
            "Endereço",
            {
                "fields": ("address",),
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
    
    autocomplete_fields = ["user", "address"]
    
    actions = [
        "export_profiles",
        "mark_as_male",
        "mark_as_female",
        "mark_marital_status_single",
        "mark_marital_status_married",
    ]
    
    @admin.display(description="Usuário")
    def get_user_info(self, obj):
        """Retorna informações do usuário com link."""
        return format_html(
            '<strong>{}</strong><br/><small>@{}</small>',
            obj.user.get_full_name() or obj.user.username,
            obj.user.username,
        )
    
    @admin.display(description="Idade")
    def get_age(self, obj):
        """Calcula a idade do perfil."""
        if obj.date_of_birth:
            from datetime import date
            today = date.today()
            return today.year - obj.date_of_birth.year - (
                (today.month, today.day) < (obj.date_of_birth.month, obj.date_of_birth.day)
            )
        return "-"
    
    @admin.display(description="Telefone")
    def get_phone(self, obj):
        """Retorna o telefone do perfil."""
        if hasattr(obj, "phone"):
            return obj.phone.number
        return "-"
    
    @admin.display(description="Endereço", boolean=True)
    def has_address(self, obj):
        """Verifica se o perfil tem endereço completo."""
        if obj.address:
            return bool(obj.address.street and obj.address.city and obj.address.state)
        return False
    
    @action(description="Exportar perfis selecionados (CSV)")
    def export_profiles(self, request, queryset):
        """Exporta os perfis selecionados."""
        import csv
        from django.http import HttpResponse
        
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="profiles.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            "UUID", "Nome Completo", "Usuário", "Email", 
            "Data Nascimento", "Gênero", "Estado Civil", "Telefone"
        ])
        
        for profile in queryset:
            writer.writerow([
                profile.uuid,
                profile.full_name,
                profile.user.username,
                profile.user.email,
                profile.date_of_birth,
                profile.get_gender_display(),
                profile.get_marital_status_display(),
                profile.phone.number if hasattr(profile, "phone") else "",
            ])
        
        return response
    
    @action(description="Marcar gênero como Masculino")
    def mark_as_male(self, request, queryset):
        """Marca o gênero como masculino."""
        updated = queryset.update(gender="male")
        self.message_user(request, f"{updated} perfil(s) atualizado(s) para Masculino.")
    
    @action(description="Marcar gênero como Feminino")
    def mark_as_female(self, request, queryset):
        """Marca o gênero como feminino."""
        updated = queryset.update(gender="female")
        self.message_user(request, f"{updated} perfil(s) atualizado(s) para Feminino.")
    
    @action(description="Marcar estado civil como Solteiro(a)")
    def mark_marital_status_single(self, request, queryset):
        """Marca o estado civil como solteiro."""
        updated = queryset.update(marital_status="single")
        self.message_user(request, f"{updated} perfil(s) atualizado(s) para Solteiro(a).")
    
    @action(description="Marcar estado civil como Casado(a)")
    def mark_marital_status_married(self, request, queryset):
        """Marca o estado civil como casado."""
        updated = queryset.update(marital_status="married")
        self.message_user(request, f"{updated} perfil(s) atualizado(s) para Casado(a).")


@admin.register(Phone)
class PhoneAdmin(ModelAdmin):
    """Admin de telefones - Configuração completa."""
    
    list_display = (
        "number",
        "get_profile_info",
        "get_user_email",
        "created_at",
        "updated_at",
    )
    list_filter = (
        "created_at",
    )
    search_fields = (
        "number",
        "profile__user__username",
        "profile__user__email",
        "profile__full_name",
    )
    readonly_fields = (
        "created_at",
        "updated_at",
    )
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    
    fieldsets = (
        (
            "Vínculo",
            {
                "fields": ("profile",),
            },
        ),
        (
            "Contato",
            {
                "fields": ("number",),
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
    
    @admin.display(description="Perfil")
    def get_profile_info(self, obj):
        """Retorna informações do perfil."""
        return format_html(
            '<strong>{}</strong>',
            obj.profile,
        )
    
    @admin.display(description="Email do Usuário")
    def get_user_email(self, obj):
        """Retorna o email do usuário."""
        return obj.profile.user.email or "-"


@admin.register(AddressProof)
class AddressProofAdmin(ModelAdmin):
    """Admin de comprovantes de endereço - Configuração completa."""
    
    list_display = (
        "id",
        "get_profile_info",
        "description",
        "get_file_link",
        "created_at",
    )
    list_filter = (
        "created_at",
    )
    search_fields = (
        "profile__user__username",
        "profile__full_name",
        "description",
    )
    readonly_fields = (
        "created_at",
        "updated_at",
    )
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    
    fieldsets = (
        (
            "Vínculo",
            {
                "fields": ("profile",),
            },
        ),
        (
            "Arquivo",
            {
                "fields": ("file", "description"),
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
    
    @admin.display(description="Perfil")
    def get_profile_info(self, obj):
        """Retorna informações do perfil."""
        return obj.profile
    
    @admin.display(description="Arquivo")
    def get_file_link(self, obj):
        """Retorna link para o arquivo."""
        if obj.file:
            return format_html(
                '<a href="{}" target="_blank">📎 Ver arquivo</a>',
                obj.file.url,
            )
        return "-"
