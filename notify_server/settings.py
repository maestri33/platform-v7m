"""Settings do notify-server — mesmo padrão do monólito (django-environ)."""

from pathlib import Path

import environ
import sentry_sdk


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
    "controlpanel",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "notify_server.middleware.LocalOnlyMiddleware",
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

# ── WhatsApp — Evolution v2 primeiro, GO como fallback ──────────────────────
WHATSAPP_API_BASE_URL = env("WHATSAPP_API_BASE_URL", default="")
WHATSAPP_GLOBAL_API_KEY = env("WHATSAPP_GLOBAL_API_KEY", default="")
EVOLUTION_GO_BASE_URL = env("EVOLUTION_GO_BASE_URL", default="")
EVOLUTION_GO_API_KEY = env("EVOLUTION_GO_API_KEY", default="")

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

# ── Logging ────────────────────────────────────────────────────────────────
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

# ── Sentry (opt-in: sem SENTRY_DSN o SDK nem sobe) ──────────────────────────
SENTRY_DSN = env("SENTRY_DSN", default="")
SENTRY_ENVIRONMENT = env("SENTRY_ENVIRONMENT", default="development" if DEBUG else "production")
SENTRY_RELEASE = env("SENTRY_RELEASE", default="")
SENTRY_TRACES_SAMPLE_RATE = env.float("SENTRY_TRACES_SAMPLE_RATE", default=0.0)
SENTRY_PROFILES_SAMPLE_RATE = env.float("SENTRY_PROFILES_SAMPLE_RATE", default=0.0)
# Telefone e e-mail de destinatário são PII — só ligue os dois conscientemente.
SENTRY_SEND_DEFAULT_PII = env.bool("SENTRY_SEND_DEFAULT_PII", default=False)
# As locais dos frames do dispatch são o destinatário e o corpo da mensagem.
SENTRY_INCLUDE_LOCAL_VARIABLES = env.bool("SENTRY_INCLUDE_LOCAL_VARIABLES", default=False)

SENTRY_ENABLED = bool(SENTRY_DSN)
if SENTRY_ENABLED:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=SENTRY_ENVIRONMENT,
        release=SENTRY_RELEASE or None,
        traces_sample_rate=SENTRY_TRACES_SAMPLE_RATE,
        profiles_sample_rate=SENTRY_PROFILES_SAMPLE_RATE,
        send_default_pii=SENTRY_SEND_DEFAULT_PII,
        include_local_variables=SENTRY_INCLUDE_LOCAL_VARIABLES,
    )
