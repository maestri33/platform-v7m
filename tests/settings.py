"""Settings de teste — sqlite em memória + TEST_MODE (dispatch dry-run, zero rede)."""

from cryptography.fernet import Fernet

from notify_server.settings import *  # noqa: F401,F403

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

TEST_MODE = True

# Sem chave, `mail.crypto` devolve o texto como veio (comportamento de dev) e o
# teste que verifica "a senha foi guardada cifrada" passava a comparar plaintext
# com plaintext — ou seja, não testava nada. Com chave, ele volta a ter sentido.
FERNET_KEY = Fernet.generate_key().decode()

# IA e rede externa não entram em teste.
OMNIROUTER_URL = "http://omnirouter.invalid"
AI_TIMEOUT_S = 1.0
