"""Sentry — init opt-in, PII desligada e report das falhas que o dispatch engole."""

import pytest
import sentry_sdk
from sentry_sdk.transport import Transport

from notify import dispatch
from notify.models import CHANNEL_WHATSAPP, STATUS_FAILED, STATUS_SKIPPED, Incident, Notification
from notify_server import sentry

FAKE_DSN = "https://public@o0.ingest.sentry.io/1"


class _CaptureTransport(Transport):
    """Transport de teste: guarda os eventos em memória, não fala com a rede."""

    def __init__(self):
        super().__init__()
        self.events = []

    def capture_envelope(self, envelope):
        event = envelope.get_event()
        if event is not None:
            self.events.append(event)


@pytest.fixture
def events():
    """SDK ligado com transport local; desliga de novo no teardown."""
    transport = _CaptureTransport()
    sentry_sdk.init(
        dsn=FAKE_DSN,
        environment="test",
        transport=transport,
        send_default_pii=False,
        include_local_variables=False,
    )
    try:
        yield transport.events
    finally:
        sentry_sdk.init(dsn=None)


class _FakeAccount:
    slug = "acme"


class _FakeNotification:
    account = _FakeAccount()
    external_id = "11111111-2222-3333-4444-555555555555"
    caller = "billing"
    attempts = 2
    mail_template = "default"
    media_url = ""
    want_tts = False
    recipient_phone = "+5511999999999"
    recipient_email = "cliente@example.com"


def test_init_com_dsn_liga_o_sdk(events):
    assert sentry_sdk.get_client().transport is not None


def test_pii_desligada_por_padrao(events):
    options = sentry_sdk.get_client().options
    assert options["send_default_pii"] is False
    assert options["include_local_variables"] is False
# ── Report ──────────────────────────────────────────────────────────────────

def test_falha_de_canal_vira_evento_com_tags(events):
    try:
        raise RuntimeError("evolution fora do ar")
    except RuntimeError as exc:
        sentry.capture_channel_failure(exc, channel="whatsapp", notification=_FakeNotification())

    assert len(events) == 1
    tags = events[0]["tags"]
    assert tags["notify.channel"] == "whatsapp"
    assert tags["notify.account"] == "acme"
    assert tags["notify.caller"] == "billing"
    assert events[0]["contexts"]["notification"]["attempts"] == 2


def test_falha_de_canal_nao_manda_destinatario(events):
    # Sem literais aqui: o SDK manda o source context do frame que capturou, e um
    # telefone escrito nesta função entraria no evento por essa via.
    notif = _FakeNotification()
    try:
        raise RuntimeError("smtp recusou")
    except RuntimeError as exc:
        sentry.capture_channel_failure(exc, channel="email", notification=notif)

    payload = str(events[0])
    assert notif.recipient_phone not in payload
    assert notif.recipient_email not in payload


def test_evento_nao_carrega_locais_do_frame(events):
    """`include_local_variables=False` é o que segura a PII das locais do dispatch."""
    numero_resolvido = _FakeNotification.recipient_phone
    try:
        raise RuntimeError("evolution recusou")
    except RuntimeError as exc:
        sentry.capture_channel_failure(exc, channel="whatsapp", notification=_FakeNotification())

    frames = events[0]["exception"]["values"][0]["stacktrace"]["frames"]
    assert frames
    assert all("vars" not in frame for frame in frames)
    assert numero_resolvido not in str(events[0])


def test_falha_de_task_vira_evento(events):
    try:
        raise ValueError("boom")
    except ValueError as exc:
        sentry.capture_task_failure(exc, task="notify.dispatch.dispatch", notification_id=7)

    assert len(events) == 1
    assert events[0]["tags"]["notify.task"] == "notify.dispatch.dispatch"
    assert events[0]["contexts"]["task"]["notification_id"] == 7


def test_report_nao_levanta_com_notification_quebrada(events):
    """Telemetria não pode derrubar o envio: FK que explode vira report sem tag."""

    class _Explode:
        caller = "billing"
        external_id = "x"
        attempts = 1
        mail_template = "default"
        media_url = ""
        want_tts = False

        @property
        def account(self):
            raise RuntimeError("conexão caiu")

    try:
        raise RuntimeError("falhou")
    except RuntimeError as exc:
        sentry.capture_channel_failure(exc, channel="whatsapp", notification=_Explode())

    assert len(events) == 1
    assert "notify.account" not in events[0]["tags"]


# ── Ponta a ponta pelo dispatch ─────────────────────────────────────────────

class _BrokenDriver:
    """Driver de WhatsApp que aceita o `async with` e falha no envio."""

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc_info):
        return False

    async def resolve_br_number(self, phone):
        return phone

    async def send_text(self, number, body):
        raise RuntimeError("evolution fora do ar")


def test_dispatch_reporta_falha_de_canal(events, account, settings, monkeypatch):
    """A falha vira FAILED no banco *e* evento no Sentry — o dispatch não a levanta."""
    settings.TEST_MODE = False
    monkeypatch.setattr("notify.channels.whatsapp._get_whatsapp_driver", lambda notif: _BrokenDriver())

    notif = Notification.objects.create(
        account=account,
        caller="pytest",
        recipient_phone=_FakeNotification.recipient_phone,
        text="corpo da mensagem",
        email_status=STATUS_SKIPPED,
        tts_status=STATUS_SKIPPED,
    )

    dispatch.dispatch(notif.id)

    notif.refresh_from_db()
    assert notif.whatsapp_status == STATUS_FAILED
    incident = Incident.objects.get(channel=CHANNEL_WHATSAPP)
    assert incident.status == Incident.STATUS_OPEN
    assert list(incident.notifications.all()) == [notif]
    assert len(events) == 1
    assert events[0]["tags"]["notify.channel"] == CHANNEL_WHATSAPP
    assert events[0]["tags"]["notify.account"] == account.slug
    # Traceback real passando pelos frames do dispatch: o destinatário não vai junto.
    assert notif.recipient_phone not in str(events[0])


def test_dispatch_reporta_erro_inesperado_e_relevanta(events, account, settings, monkeypatch):
    """Erro fora dos canais sobe (django-q marca falha e retenta) mas passa pelo Sentry."""
    settings.TEST_MODE = False

    def _explode(notif):
        raise RuntimeError("factory quebrada")

    monkeypatch.setattr("notify.channels.whatsapp._get_whatsapp_driver", _explode)

    notif = Notification.objects.create(
        account=account,
        caller="pytest",
        recipient_phone=_FakeNotification.recipient_phone,
        text="corpo da mensagem",
        email_status=STATUS_SKIPPED,
        tts_status=STATUS_SKIPPED,
    )

    with pytest.raises(RuntimeError):
        dispatch.dispatch(notif.id)

    assert len(events) == 1
    assert events[0]["tags"]["notify.task"] == "notify.dispatch.dispatch"
    assert events[0]["contexts"]["task"]["notification_id"] == notif.id


def test_report_sem_sdk_inicializado_e_no_op():
    sentry_sdk.init(dsn=None)
    try:
        raise RuntimeError("falhou")
    except RuntimeError as exc:
        sentry.capture_channel_failure(exc, channel="whatsapp", notification=_FakeNotification())
