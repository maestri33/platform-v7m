"""Seed IDEMPOTENTE dos padrões (Victor 2026-06-03): a conta-mãe + o hub padrão.

No início **TUDO centralizado na conta do Victor**: staff (superuser) + promoter + coordinator do
hub padrão, na MESMA conta. O hub padrão (marca `DEFAULT_HUB_BRAND`, dev = `standard`) é o **fallback
de captação** (candidato/lead sem `ref` cai nele). Pode rodar a cada boot (em prod, no entrypoint do
deploy) — não duplica. Dados vêm do `.env` (`DEFAULT_STAFF_*`, `DEFAULT_HUB_BRAND`). NÃO passa por
CPFHub/WhatsApp: é seed de sistema, não register.

A conta-mãe ganha **3 camadas** de promotor/coordenador, todas idempotentes:
1. `UserRole` `promoter` + `coordinator` — DIRETO (bypass do catálogo: `promoter` não é role de entrada,
   vem de training→promoter, então `roles.assign` recusaria; aqui é seed de sistema);
2. `Hub` padrão coordenado por ela (fallback de captação);
3. a row de domínio `Promoter` ligada ao hub padrão — sem ela `validate_ref` (captação por `?ref=`) e o
   filtro de polo da listagem (`promoter__promoter__hub`) não pegam a conta-mãe (Victor 2026-06-05).
"""

from __future__ import annotations

import structlog
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from hub import config
from hub.models import Hub
from users.address import interface as address_iface
from users.auth.models import User
from users.profiles import interface as profiles
from users.profiles.models import Profile
from users.roles.models import UserRole
from users.roles.promoter import service as promoter_iface

logger = structlog.get_logger()


class Command(BaseCommand):
    help = "Cria (idempotente) a conta-mãe (staff superuser + promoter + coordinator) e o hub padrão."

    def handle(self, *args, **options):
        cpf = settings.DEFAULT_STAFF_CPF
        phone = settings.DEFAULT_STAFF_PHONE
        name = settings.DEFAULT_STAFF_NAME
        email = settings.DEFAULT_STAFF_EMAIL
        password = settings.DEFAULT_STAFF_PASSWORD
        if not (cpf and phone and password):
            raise CommandError(
                "Configure DEFAULT_STAFF_CPF / DEFAULT_STAFF_PHONE / DEFAULT_STAFF_PASSWORD no .env."
            )
        brand = config.default_brand()
        if not config.is_valid_brand(brand):
            raise CommandError(
                f"DEFAULT_HUB_BRAND '{brand}' não está em HUB_BRANDS ({config.brands()})."
            )

        with transaction.atomic():
            user, user_created = self._ensure_staff(
                cpf=cpf, phone=phone, name=name, email=email, password=password
            )
            self._ensure_roles(user)
            self._ensure_pix(user)
            hub, hub_created = self._ensure_default_hub(brand=brand, coordinator=user)
            promoter = promoter_iface.create_promoter(user=user, hub=hub)  # idempotente

        logger.info(
            "hub.seed_defaults",
            staff_external_id=str(user.external_id),
            staff_created=user_created,
            hub_external_id=str(hub.external_id),
            hub_created=hub_created,
            promoter_external_id=str(promoter.external_id),
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"staff external_id={user.external_id} (novo={user_created}); "
                f"hub padrão external_id={hub.external_id} brand={hub.brand} (novo={hub_created}); "
                f"promoter external_id={promoter.external_id} (ref de captação = staff external_id)"
            )
        )

    def _ensure_staff(self, *, cpf, phone, name, email, password):
        """Acha a conta-mãe pelo cpf (idempotente) ou cria como superuser + Profile + Address vazio."""
        existing = Profile.objects.filter(cpf=cpf).select_related("user").first()
        if existing is not None:
            user = existing.user
            changed = []
            if not user.is_superuser:
                user.is_superuser = True
                changed.append("is_superuser")
            if not user.is_staff:
                user.is_staff = True
                changed.append("is_staff")
            # Email da conta-mãe: grava se veio do .env e o Profile está sem email (não sobrescreve).
            if email and not existing.email:
                existing.email = email
                existing.save(update_fields=["email", "updated_at"])
            if changed:
                user.save(update_fields=changed)
            return user, False

        user = User.objects.create_superuser(password=password)
        profile = profiles.create(
            user=user, cpf=cpf, phone=phone, name=name, email=email or None
        )
        profiles.attach_address(profile, address_iface.create_empty())
        return user, True

    def _ensure_roles(self, user):
        """promoter + coordinator + staff DIRETO (bypass catálogo — seed de sistema). Idempotente.

        `staff` NÃO é role de catálogo (o gate do painel /api/staff é `is_superuser`, não role), mas o
        bot (`bot/router.resolve`) decide o público pelo `roles_set` de `active_roles` — que lê só
        UserRole. Sem a row `staff`, o bot nunca trata a conta-mãe como staff, só como coordinator.
        get_or_create direto é seguro: bypass do catálogo, mesmo caminho das outras duas roles."""
        for role in ("promoter", "coordinator", "staff"):
            UserRole.objects.get_or_create(user=user, role=role, revoked_at=None)

    def _ensure_pix(self, user):
        """Pix da conta-mãe (destino dos payouts dela) — grava DEFAULT_STAFF_PIX se o Profile está
        sem chave. Fecha o «rabo» dos flashes (06-06/06-10): toda recriação do db exigia setar à mão,
        e sem pix o fechamento semanal trava o payout. Não sobrescreve chave já definida."""
        pix = settings.DEFAULT_STAFF_PIX
        if not pix:
            return
        profile = Profile.objects.filter(user=user).first()
        if profile is not None and not profile.pix_key:
            profile.pix_key = pix
            profile.save(update_fields=["pix_key", "updated_at"])

    def _ensure_default_hub(self, *, brand, coordinator):
        """Garante o hub padrão (coordenador = conta-mãe). Idempotente pelo flag is_default."""
        hub = Hub.objects.filter(is_default=True).first()
        if hub is not None:
            if hub.coordinator_id != coordinator.id:
                hub.coordinator = coordinator
                hub.save(update_fields=["coordinator", "updated_at"])
            return hub, False
        address = address_iface.create_empty()
        hub = Hub.objects.create(
            address=address, brand=brand, coordinator=coordinator, is_default=True
        )
        return hub, True
