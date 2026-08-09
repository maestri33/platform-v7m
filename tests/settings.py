"""Settings de teste — sqlite em memória + TEST_MODE (dispatch dry-run, zero rede)."""

from notify_server.settings import *  # noqa: F401,F403
import sentry_sdk

# Um .env local com SENTRY_DSN já inicializou o SDK no import acima — desliga.
sentry_sdk.init(dsn=None)
SENTRY_ENABLED = False

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

TEST_MODE = True
