"""Reproduz o fluxo do notify-server pra descobrir o que falha."""
import os, sys
os.environ["DJANGO_SETTINGS_MODULE"] = "notify_server.settings"
sys.path.insert(0, "/app")
import django
django.setup()

from mail.client import get_client_from_identity
from channels.models import MailIdentity

mi = MailIdentity.objects.get(smtp_host="mailhog")
print(f"MailIdentity: {mi.smtp_host}:{mi.smtp_port} user={mi.smtp_user!r} from={mi.from_email}")

client = get_client_from_identity(mi)
print(f"Client: host={client._host} port={client._port} user={client._user!r} from_header={client.from_header}")

try:
    import asyncio
    async def go():
        return await client.send_email(
            "destino@teste.local",
            "probe via client",
            html_body="<p>oi</p>",
            plain_body="oi",
        )
    res = asyncio.run(go())
    print(f"send_email returned: {res}")
except Exception as e:
    import traceback
    traceback.print_exc()
