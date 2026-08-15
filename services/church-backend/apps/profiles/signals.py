"""Signals do app de profiles."""

from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.profiles.models import Profile

User = get_user_model()


def _split_full_name(full_name):
    """Separa nome completo em primeiro nome e sobrenome."""
    parts = [item for item in str(full_name or "").strip().split(" ") if item]
    if not parts:
        return "", ""
    return parts[0], parts[-1]


@receiver(post_save, sender=Profile)
def sync_profile_name_to_user(sender, instance, **kwargs):
    """Sincroniza `Profile.full_name` com `User.first_name` e `User.last_name`."""
    first_name, last_name = _split_full_name(instance.full_name)
    if not first_name:
        return

    user = instance.user
    changed_fields = []
    if user.first_name != first_name:
        user.first_name = first_name
        changed_fields.append("first_name")
    if user.last_name != last_name:
        user.last_name = last_name
        changed_fields.append("last_name")
    if changed_fields:
        user.save(update_fields=changed_fields)


@receiver(post_save, sender=User)
def ensure_profile_for_user(sender, instance, created, **kwargs):
    """Garante Profile automático para superusuário (admin)."""
    if not created or not instance.is_superuser:
        return
    Profile.objects.get_or_create(user=instance)
