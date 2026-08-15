import os, sys
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "notify_server.settings")
sys.path.insert(0, ".")
import django
try:
    django.setup()
except Exception as e:
    print(f"setup error: {type(e).__name__}: {e}")
    sys.exit(1)

from django.db import connection
try:
    with connection.cursor() as cur:
        cur.execute("SELECT 1")
        print("DB OK:", cur.fetchone())
except Exception as e:
    print(f"DB error: {type(e).__name__}: {e}")
