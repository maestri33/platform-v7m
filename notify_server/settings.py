"""Settings do notify-server — mesmo padrão do monólito (django-environ)."""

from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env()
# .env existe? carrega; senão, variáveis de ambiente do sistema
_env_file = BASE_DIR / ".env"
if _env_file.exists():
    env.read_env(str(_env_file))

SECRET_KEY = env("SECRET_KEY", default="change-me-in-production")
DEBUG = env.bool("DEBUG", default=False)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["*"])

# ── Apps ────────────────────────────────────────────────────────────────────
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django_q",
    # projeto
    "accounts",
    "channels",
    "whatsapp",
    "mail",
    "tts",
    "notify",
    "seed",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "notify_server.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "notify_server.wsgi.application"

# ── Database ────────────────────────────────────────────────────────────────
DATABASES = {"default": env.db("DATABASE_URL", default="postgres://notify:notify@localhost:5432/notify_server")}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ── Internationalization ────────────────────────────────────────────────────
LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_I18N = True
USE_TZ = True

# ── Static / Media ──────────────────────────────────────────────────────────
STATIC_URL = "static/"
MEDIA_ROOT = env("MEDIA_ROOT", default=str(BASE_DIR / "media"))
MEDIA_URL = env("MEDIA_URL", default="/media/")

# ── URLs externas ───────────────────────────────────────────────────────────
EXTERNAL_URL = env("EXTERNAL_URL", default="")
MEDIA_LAN_BASE = env("MEDIA_LAN_BASE", default="")

# ── Omnirouter (TTS) ───────────────────────────────────────────────────────
OMNIROUTER_URL = env("OMNIROUTER_URL", default="http://10.1.30.35")
OMNIROUTER_API_KEY = env("OMNIROUTER_API_KEY", default="")

# ── WhatsApp — provider selecionável; GO é o contrato atual ─────────────────
# Default para chamadas SEM row WhatsAppNumber (legado). Com row, quem manda é
# o campo `driver` dela.
WHATSAPP_DRIVER = env("WHATSAPP_DRIVER", default="evolution-v2")
# Trava de emergência: se preenchido, ignora a row e força este provedor em TODAS
# as contas. Use só para contornar incidente de provedor; esvazie depois.
WHATSAPP_FORCE_DRIVER = env("WHATSAPP_FORCE_DRIVER", default="")
WHATSAPP_API_BASE_URL = env("WHATSAPP_API_BASE_URL", default="")
WHATSAPP_GLOBAL_API_KEY = env("WHATSAPP_GLOBAL_API_KEY", default="")
EVOLUTION_GO_BASE_URL = env("EVOLUTION_GO_BASE_URL", default="")
# Token da instância default (envio). Cada WhatsAppNumber pode ter o seu.
EVOLUTION_GO_API_KEY = env("EVOLUTION_GO_API_KEY", default="")
# Key GLOBAL da GO — só para administração (listar/criar instância). NÃO serve
# para enviar: com várias instâncias, a key global resolve para uma arbitrária.
EVOLUTION_GO_ADMIN_KEY = env("EVOLUTION_GO_ADMIN_KEY", default="")

# ── Mailcow (API administrativa — criar/editar caixas por app) ─────────────
# Serviço interno (VPN/Tailscale), certificado próprio: verify desligado por
# padrão. Ligue MAILCOW_VERIFY_TLS quando houver cadeia confiável.
MAILCOW_BASE_URL = env("MAILCOW_BASE_URL", default="")
MAILCOW_API_KEY = env("MAILCOW_API_KEY", default="")
MAILCOW_VERIFY_TLS = env.bool("MAILCOW_VERIFY_TLS", default=False)
MAILCOW_DEFAULT_QUOTA_MB = env.int("MAILCOW_DEFAULT_QUOTA_MB", default=1024)
# Host SMTP que as MailIdentity criadas pelo provisionamento vão usar.
MAILCOW_SMTP_HOST = env("MAILCOW_SMTP_HOST", default="mail.v7m.org")
MAILCOW_SMTP_PORT = env.int("MAILCOW_SMTP_PORT", default=587)

# ── Fernet (criptografia de segredos no DB — SMTP password etc.) ────────────
FERNET_KEY = env("FERNET_KEY", default="")

# ── TEST_MODE (dry-run: não envia nada pela rede) ───────────────────────────
TEST_MODE = env.bool("TEST_MODE", default=False)

# ── Django-Q ────────────────────────────────────────────────────────────────
Q_CLUSTER = {
    "name": "notify-server",
    "orm": "default",  # broker = DB (sem Redis)
    "timeout": 240,
    "retry": 300,  # retry > timeout (regra do monólito)
    "max_attempts": 3,
    "workers": 2,
}

# ── Logging (structlog) ────────────────────────────────────────────────────
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "plain": {"format": "%(message)s"},
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "plain",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}
