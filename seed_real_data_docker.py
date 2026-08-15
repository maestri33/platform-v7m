"""Seed pra teste real — cria Account + ApiKey + WhatsApp + Mail + TTS + Template + superuser.

Roda uma vez. Tudo com placeholders — você edita os valores reais via /admin/.
"""
import os
import sys

os.environ["DJANGO_SETTINGS_MODULE"] = "notify_server.settings"
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import django
django.setup()

from django.contrib.auth import get_user_model

from accounts.models import Account, ApiKey
from channels.models import WhatsAppNumber, MailIdentity, TtsVoices
from mail import crypto
from notify.models import Template

User = get_user_model()

# 1) superuser pra acessar /admin/
admin_user, admin_created = User.objects.get_or_create(
    username="admin",
    defaults={"email": "admin@example.com", "is_staff": True, "is_superuser": True},
)
if admin_created:
    admin_user.set_password("admin")
    admin_user.save()
    print(f"[OK] superuser criado: admin / admin")
else:
    print(f"[skip] superuser 'admin' já existe")

# 2) Account
acc, acc_created = Account.objects.get_or_create(
    slug="teste-real",
    defaults={"name": "Conta de teste real", "is_active": True},
)
print(f"[{'OK' if acc_created else 'skip'}] Account: {acc.slug} (id={acc.id})")

# 3) ApiKey
RAW_KEY = "tk_real_local_dev_nao_use_em_prod"
api_key, key_created = ApiKey.objects.get_or_create(
    account=acc, label="real-key",
    defaults={"key_hash": ApiKey.hash_key(RAW_KEY), "is_active": True},
)
print(f"[{'OK' if key_created else 'skip'}] ApiKey: label={api_key.label}  raw={RAW_KEY}")

# 4) WhatsAppNumber
wn, wn_created = WhatsAppNumber.objects.get_or_create(
    account=acc, slug="padrao",
    defaults={
        "instance_name": "PLACEHOLDER_INSTANCE",
        "is_default": True,
    },
)
print(f"[{'OK' if wn_created else 'skip'}] WhatsAppNumber: {wn.slug}  instance={wn.instance_name}  default={wn.is_default}")

# 5) MailIdentity
SMTP_PASS_PLAIN = "PLACEHOLDER_SMTP_PASSWORD"
mi, mi_created = MailIdentity.objects.get_or_create(
    account=acc, from_email="placeholder@example.com",
    defaults={
        "smtp_host": "smtp.placeholder.local",
        "smtp_port": 587,
        "smtp_user": "placeholder@user",
        "smtp_password": crypto.encrypt(SMTP_PASS_PLAIN),
        "from_name": "Notify Teste",
        "is_default": True,
        "timeout": 10,
    },
)
print(f"[{'OK' if mi_created else 'skip'}] MailIdentity: {mi.from_email}  host={mi.smtp_host}  default={mi.is_default}")

# 6) TtsVoices
tv, tv_created = TtsVoices.objects.get_or_create(
    account=acc,
    defaults={
        "voice_male": "PLACEHOLDER_VOICE_MASCULINA",
        "voice_female": "PLACEHOLDER_VOICE_FEMININA",
    },
)
print(f"[{'OK' if tv_created else 'skip'}] TtsVoices: male={tv.voice_male}  female={tv.voice_female}")

# 7) Template
tpl, tpl_created = Template.objects.get_or_create(
    account=acc, event="teste.real",
    defaults={
        "title": "Teste real",
        "subject": "Assunto do teste real",
        "body_md": "Oi {nome}, este eh um teste real do notify-server disparado por evento.",
        "is_tts": False,
        "channels": "whatsapp,email",
        "mail_template": "default",
        "active": True,
    },
)
print(f"[{'OK' if tpl_created else 'skip'}] Template: event={tpl.event}  channels={tpl.channels}  active={tpl.active}")

print()
print("=" * 70)
print("  DADOS CRIADOS — O QUE VOCE PRECISA EDITAR")
print("=" * 70)
print()
print("  A) /admin/  (login: admin / admin)")
print("     -> Channels > WhatsApp numbers > 'padrao'")
print("        trocar 'PLACEHOLDER_INSTANCE' pelo instance_name real da Evolution")
print("     -> Channels > Mail identities > 'placeholder@example.com'")
print("        trocar smtp_host / smtp_user / smtp_password pelos reais")
print("        (a senha atual eh placeholder — substitua e salve; o .env ja tem")
print("         FERNET_KEY, entao a nova senha eh gravada encriptada)")
print("     -> Channels > Tts voices")
print("        trocar voice_male / voice_female pelos IDs reais do OmniRoute")
print()
print("  B) .env na raiz do projeto — preencher:")
print("     WHATSAPP_API_BASE_URL=https://evolution.sua.rede")
print("     WHATSAPP_GLOBAL_API_KEY=<sua-api-key>")
print("     EVOLUTION_GO_BASE_URL=https://evolution-go.sua.rede")
print("     EVOLUTION_GO_API_KEY=<sua-api-key>")
print("     OMNIROUTER_URL=https://omnirouter.sua.rede")
print("     OMNIROUTER_API_KEY=<sua-api-key>")
print("     TEST_MODE=0   (1 = dry-run, 0 = envio real)")
print("     EXTERNAL_URL=https://url.publica.da.instancia  (pra Evolution baixar midia)")
print()
print("  C) Reiniciar o runserver depois de mexer no .env")
print()
print("=" * 70)
print("  COMO DISPARAR (depois de tudo plugado)")
print("=" * 70)
print()
print(f'  # Direto (texto, WhatsApp):')
print(f'  curl -X POST http://127.0.0.1:8001/v1/send \\')
print(f'    -H "Authorization: Bearer {RAW_KEY}" \\')
print(f'    -H "Content-Type: application/json" \\')
print(f'    -d \'{{"text":"ola do teste real","phone":"SEU_NUMERO_AQUI","caller":"teste.real"}}\'')
print()
print(f'  # Por evento (renderiza o template acima):')
print(f'  curl -X POST http://127.0.0.1:8001/v1/send-event \\')
print(f'    -H "Authorization: Bearer {RAW_KEY}" \\')
print(f'    -H "Content-Type: application/json" \\')
print(f'    -d \'{{"event":"teste.real","phone":"SEU_NUMERO_AQUI","nome":"Fulano"}}\'')
print()
print(f'  # Lista as ultimas notificacoes:')
print(f'  curl -H "Authorization: Bearer {RAW_KEY}" http://127.0.0.1:8001/v1/notifications?limit=5')
print()
print("=" * 70)
print("  WORKER — pra processar a fila django-q:")
print("=" * 70)
print()
print("  Em outro terminal, com o mesmo .env:")
print("  .venv\\Scripts\\python.exe manage.py qcluster")
print()
