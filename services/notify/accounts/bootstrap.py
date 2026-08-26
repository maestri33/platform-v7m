"""Bootstrap idempotente da conta padrão do notify-server."""

from __future__ import annotations

from django.conf import settings

from accounts.models import Account


def ensure_default_account() -> tuple[Account, bool]:
    """Garante o tenant usado quando o caller não informa ``account_id``
    e prepara as configurações básicas de canais (WhatsApp e E-mail).
    """
    from channels.models import DRIVER_GO, MailIdentity, WhatsAppNumber

    slug = str(getattr(settings, "NOTIFY_DEFAULT_ACCOUNT_SLUG", "default") or "default")
    name = str(getattr(settings, "NOTIFY_DEFAULT_ACCOUNT_NAME", "Notify") or "Notify")
    account, created = Account.objects.get_or_create(slug=slug, defaults={"name": name})

    # Garante instância de WhatsApp correspondente
    WhatsAppNumber.objects.get_or_create(
        account=account,
        slug="principal",
        defaults={
            "instance_name": slug,
            "driver": DRIVER_GO,
            "is_default": True,
        },
    )

    # Garante identidade de e-mail básica
    if not account.mail_identities.exists():
        domain = getattr(settings, "DEFAULT_EMAIL_DOMAIN", "v7m.org")
        MailIdentity.objects.get_or_create(
            account=account,
            from_email=f"no-reply@{domain}",
            defaults={
                "from_name": name,
                "smtp_host": getattr(settings, "STALWART_SMTP_HOST", "10.0.1.20"),
                "smtp_port": int(getattr(settings, "STALWART_SMTP_PORT", 587)),
                "smtp_user": f"no-reply@{domain}",
                "is_default": True,
            },
        )

    return account, created


def ensure_default_account_after_migrate(**_kwargs) -> None:
    ensure_default_account()

