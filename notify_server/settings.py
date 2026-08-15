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
    "notify_server.middleware.CorrelationIdMiddleware",
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
# Chat (assistente de templates). IA é assistiva: se o gateway estiver fora, o
# envio continua — só a sugestão não aparece. Timeout curto por isso.
AI_MODEL = env("AI_MODEL", default="auto/fast")
AI_TIMEOUT_S = env.float("AI_TIMEOUT_S", default=90.0)
# Adaptação de conteúdo POR CANAL no pipeline de envio (fail-open; ver
# ai/adapt.py). Timeout curto de propósito: roda dentro do worker.
AI_ADAPT_ENABLED = env.bool("AI_ADAPT_ENABLED", default=True)
# 30s: medido em produção (2026-08-02), o auto/fast oscila entre 8s e 22s.
# Roda no worker (não segura request HTTP) e é fail-open de toda forma.
AI_ADAPT_TIMEOUT_S = env.float("AI_ADAPT_TIMEOUT_S", default=30.0)
AI_ADAPT_MODEL = env("AI_ADAPT_MODEL", default="")  # vazio = AI_MODEL
# Cadeia de TTS: "modelo|voz_para_M|voz_para_F, ...". Tentada em ordem — um
# provedor sem crédito não pode matar o canal de voz. Vazio = default do código.
TTS_CHAIN = env("TTS_CHAIN", default="")

# ── WhatsApp — provider selecionável; GO é o contrato atual ─────────────────
# Default para chamadas SEM row WhatsAppNumber (legado). Com row, quem manda é
# o campo `driver` dela.
WHATSAPP_DRIVER = env("WHATSAPP_DRIVER", default="evolution-v2")
# Trava de emergência: se preenchido, ignora a row e força este provedor em TODAS
# as contas. Use só para contornar incidente de provedor; esvazie depois.
WHATSAPP_FORCE_DRIVER = env("WHATSAPP_FORCE_DRIVER", default="")
# Retry/backoff da cascata: tentativas POR PROVEDOR antes de cair pro próximo,
# com backoff exponencial (0.4s, 0.8s, ...). Só para sessão fora — erro de
# negócio nunca é retentado.
WHATSAPP_RETRY_ATTEMPTS = env.int("WHATSAPP_RETRY_ATTEMPTS", default=2)
WHATSAPP_RETRY_BACKOFF_S = env.float("WHATSAPP_RETRY_BACKOFF_S", default=0.4)
# Recursos que a GO faz melhor que a v2 (mapa de capacidades). Nesses, a cadeia
# é reordenada e a GO assume a frente. Ver whatsapp/capabilities.py.
WHATSAPP_GO_FIRST_FEATURES = env(
    "WHATSAPP_GO_FIRST_FEATURES", default="voice_note,poll,location"
)
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

# ── Conta default (envio sem account_id — decisão: serviço sem API key) ────
NOTIFY_DEFAULT_ACCOUNT_SLUG = env("NOTIFY_DEFAULT_ACCOUNT_SLUG", default="default")

# ── Watchdog / alertas / canário (Q1-Q3, K1, J3) ────────────────────────────
# Alertas do admin saem DIRETO pela instância default da GO + e-mail da conta
# default — nunca pelo pipeline (que pode ser o próprio doente).
ADMIN_ALERT_PHONE = env("ADMIN_ALERT_PHONE", default="")
ADMIN_ALERT_EMAIL = env("ADMIN_ALERT_EMAIL", default="")
WATCHDOG_INTERVAL_MIN = env.int("WATCHDOG_INTERVAL_MIN", default=5)
WATCHDOG_HEAL_COOLDOWN_MIN = env.int("WATCHDOG_HEAL_COOLDOWN_MIN", default=10)
WATCHDOG_QUEUE_ALERT = env.int("WATCHDOG_QUEUE_ALERT", default=50)
CANARY_ENABLED = env.bool("CANARY_ENABLED", default=True)
CANARY_PHONE = env("CANARY_PHONE", default="")
CANARY_EMAIL = env("CANARY_EMAIL", default="")
CANARY_HOUR = env.int("CANARY_HOUR", default=8)  # todo dia às 08h (local)

# ── Retenção de dados pessoais (M3/LGPD) ────────────────────────────────────
NOTIFY_RETENTION_DAYS = env.int("NOTIFY_RETENTION_DAYS", default=90)

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

# ── Rate limit / breaker / cadência (H2, I5, K3, L3) ───────────────────────
RATE_LIMIT_PER_MIN_ACCOUNT = env.int("RATE_LIMIT_PER_MIN_ACCOUNT", default=120)
RATE_LIMIT_PER_MIN_GLOBAL = env.int("RATE_LIMIT_PER_MIN_GLOBAL", default=600)
BREAKER_FAIL_THRESHOLD = env.int("BREAKER_FAIL_THRESHOLD", default=5)
BREAKER_COOLDOWN_S = env.float("BREAKER_COOLDOWN_S", default=60)
# Cadência anti-bloqueio POR CONTA (0 = desligada) + jitter entre envios WA.
WA_RATE_PER_MIN_ACCOUNT = env.int("WA_RATE_PER_MIN_ACCOUNT", default=30)
MAIL_RATE_PER_MIN_ACCOUNT = env.int("MAIL_RATE_PER_MIN_ACCOUNT", default=60)
WA_JITTER_MAX_S = env.float("WA_JITTER_MAX_S", default=1.5)

# ── N2: validação de env no boot (ligar em produção) ────────────────────────
# Com NOTIFY_REQUIRE_ENV=1, variável crítica ausente/placeholder derruba o boot
# com mensagem clara — em vez de subir um serviço meia-boca.
if env.bool("NOTIFY_REQUIRE_ENV", default=False):
    from django.core.exceptions import ImproperlyConfigured

    _criticas = {
        "SECRET_KEY": SECRET_KEY not in ("", "change-me-in-production"),
        "FERNET_KEY": bool(FERNET_KEY) and not FERNET_KEY.startswith("change-me"),
        "EXTERNAL_URL": bool(EXTERNAL_URL),
        "WHATSAPP_API_BASE_URL": bool(WHATSAPP_API_BASE_URL),
        "EVOLUTION_GO_BASE_URL": bool(EVOLUTION_GO_BASE_URL),
        "MAILCOW_BASE_URL": bool(MAILCOW_BASE_URL),
        "OMNIROUTER_URL": bool(OMNIROUTER_URL),
    }
    _faltando = [nome for nome, ok in _criticas.items() if not ok]
    if _faltando:
        raise ImproperlyConfigured(
            "NOTIFY_REQUIRE_ENV=1 e variáveis críticas ausentes/placeholder: "
            + ", ".join(_faltando)
        )

# ── Logging (structlog) ────────────────────────────────────────────────────
# LOG_JSON=1 (produção): uma linha JSON por evento, com request_id/external_id
# do contexto — grep-ável e parseável no journald. Dev: console legível.
LOG_JSON = env.bool("LOG_JSON", default=False)

import structlog as _structlog  # noqa: E402

_structlog.configure(
    processors=[
        _structlog.contextvars.merge_contextvars,
        _structlog.processors.add_log_level,
        _structlog.processors.TimeStamper(fmt="iso"),
        (_structlog.processors.JSONRenderer(ensure_ascii=False)
         if LOG_JSON else _structlog.dev.ConsoleRenderer()),
    ],
    cache_logger_on_first_use=True,
)

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
