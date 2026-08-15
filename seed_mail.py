"""Atualiza MailIdentity da conta teste-real pra apontar pro mailhog."""
import os, sys
os.environ["DJANGO_SETTINGS_MODULE"] = "notify_server.settings"
sys.path.insert(0, ".")
import django
django.setup()

from mail import crypto
from accounts.models import Account
from channels.models import MailIdentity

acc = Account.objects.get(slug="teste-real")
mi, _ = MailIdentity.objects.update_or_create(
    account=acc, from_email="notify@teste-real.local",
    defaults={
        "smtp_host": "mailhog",
        "smtp_port": 1025,
        "smtp_user": "",
        "smtp_password": crypto.encrypt(""),  # mailhog não exige senha
        "from_name": "Notify Teste",
        "is_default": True,
        "timeout": 5,
    },
)
print(f"OK MailIdentity: {mi.from_email} via {mi.smtp_host}:{mi.smtp_port}")
