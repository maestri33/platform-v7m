"""Settings de teste — sqlite em memória + TEST_MODE (dispatch dry-run, zero rede)."""

from notify_server.settings import *  # noqa: F401,F403

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

TEST_MODE = True
