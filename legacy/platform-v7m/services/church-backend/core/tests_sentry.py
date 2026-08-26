"""
Testes da integracao com o Sentry (``core.sentry`` + ``core.sentry_taskiq``).

O foco e o filtro de dado sensivel: este backend trafega CPF, senha e OTP, e
um vazamento pro Sentry seria incidente de LGPD. Os testes rodam offline --
o client usa um transport de mentira e nenhum evento sai da maquina.
"""

import uuid
from unittest import mock

import sentry_sdk
from django.test import SimpleTestCase
from sentry_sdk.transport import Transport

from core.sentry import _scrub_event, init_sentry, is_enabled
from core.sentry_taskiq import SentryTaskiqMiddleware

# DSN sintatico valido apontando pra lugar nenhum: o transport e substituido
# antes de qualquer envio.
FAKE_DSN = "https://publickey@o0.ingest.sentry.io/0"


class _CapturingTransport(Transport):
    """Transport que guarda os eventos em memoria em vez de enviar."""

    def __init__(self):
        Transport.__init__(self)
        self.events = []

    def capture_envelope(self, envelope):
        event = envelope.get_event()
        if event is not None:
            self.events.append(event)

    def flush(self, *args, **kwargs):
        pass

    def kill(self):
        pass


class ScrubEventTests(SimpleTestCase):
    """``_scrub_event`` roda como ``before_send`` em todo evento."""

    def test_filtra_corpo_do_request(self):
        event = {
            "request": {
                "data": {"cpf": "12345678900", "senha": "hunter2", "nome": "Maria"},
                "headers": {"Authorization": "Bearer x", "User-Agent": "curl"},
                "cookies": {"sessionid": "abc123"},
            }
        }

        scrubbed = _scrub_event(event, {})

        self.assertEqual(scrubbed["request"]["data"]["cpf"], "[Filtered]")
        self.assertEqual(scrubbed["request"]["data"]["senha"], "[Filtered]")
        self.assertEqual(scrubbed["request"]["headers"]["Authorization"], "[Filtered]")
        self.assertEqual(scrubbed["request"]["cookies"]["sessionid"], "[Filtered]")
        # Dado nao sensivel sobrevive -- senao a issue fica inutil pra debug.
        self.assertEqual(scrubbed["request"]["data"]["nome"], "Maria")
        self.assertEqual(scrubbed["request"]["headers"]["User-Agent"], "curl")

    def test_filtra_vars_do_stacktrace(self):
        """Variaveis locais vao no evento por padrao -- e o vazamento mais facil."""
        event = {
            "exception": {
                "values": [
                    {
                        "type": "ValueError",
                        "stacktrace": {
                            "frames": [
                                {
                                    "function": "submit_cpf",
                                    "vars": {
                                        "cpf": "12345678900",
                                        "otp_code": "483920",
                                        "session_id": 42,
                                    },
                                }
                            ]
                        },
                    }
                ]
            }
        }

        frame = _scrub_event(event, {})["exception"]["values"][0]["stacktrace"]["frames"][0]

        self.assertEqual(frame["vars"]["cpf"], "[Filtered]")
        self.assertEqual(frame["vars"]["otp_code"], "[Filtered]")
        self.assertEqual(frame["vars"]["session_id"], 42)

    def test_filtra_estruturas_aninhadas(self):
        event = {
            "extra": {
                "payload": {
                    "usuarios": [
                        {"nome": "Ana", "cpf": "98765432100"},
                        {"nome": "Joao", "api_key": "sk-123"},
                    ]
                }
            }
        }

        usuarios = _scrub_event(event, {})["extra"]["payload"]["usuarios"]

        self.assertEqual(usuarios[0]["cpf"], "[Filtered]")
        self.assertEqual(usuarios[0]["nome"], "Ana")
        self.assertEqual(usuarios[1]["api_key"], "[Filtered]")

    def test_evento_sem_secoes_conhecidas_passa_intacto(self):
        event = {"message": "tudo certo", "level": "info"}

        self.assertEqual(_scrub_event(event, {}), event)


class InitSentryTests(SimpleTestCase):
    def test_sem_dsn_e_noop(self):
        self.assertFalse(init_sentry(dsn="", environment="development"))
        self.assertFalse(init_sentry(dsn="   ", environment="development"))

    def test_sdk_ausente_avisa_e_nao_derruba_o_boot(self):
        with mock.patch.dict("sys.modules", {"sentry_sdk": None}):
            with self.assertWarns(UserWarning):
                enabled = init_sentry(dsn=FAKE_DSN, environment="production")

        self.assertFalse(enabled)

    def test_dsn_ativa_o_client_com_o_filtro_plugado(self):
        client = sentry_sdk.Client(dsn=FAKE_DSN, transport=_CapturingTransport())
        with sentry_sdk.new_scope() as scope:
            scope.set_client(client)
            self.assertTrue(is_enabled())
        # Fora do escopo o client global (inativo em teste) volta a valer.
        self.assertFalse(is_enabled())

    def test_excecao_real_chega_filtrada_no_transport(self):
        """E2E: da excecao ate o payload, passando pelo before_send.

        Os segredos sao gerados em runtime de proposito: o Sentry manda junto
        as linhas de codigo do frame (``context_line``), entao um literal no
        fonte do teste apareceria no payload sem que isso significasse falha
        do filtro.
        """
        cpf = uuid.uuid4().hex[:11]
        senha = uuid.uuid4().hex
        token = uuid.uuid4().hex

        transport = _CapturingTransport()
        client = sentry_sdk.Client(
            dsn=FAKE_DSN,
            transport=transport,
            before_send=_scrub_event,
            include_local_variables=True,
        )

        def cadastra_visitante(cpf, senha):
            token_interno = token
            raise ValueError("falha no cadastro")

        with sentry_sdk.new_scope() as scope:
            scope.set_client(client)
            try:
                cadastra_visitante(cpf, senha)
            except ValueError:
                sentry_sdk.capture_exception()
            client.flush()

        self.assertEqual(len(transport.events), 1)
        payload = str(transport.events[0])
        self.assertNotIn(cpf, payload)
        self.assertNotIn(senha, payload)
        self.assertNotIn(token, payload)
        # A causa do erro continua legivel -- filtrar nao pode cegar o debug.
        self.assertIn("falha no cadastro", payload)


class SentryTaskiqMiddlewareTests(SimpleTestCase):
    def _message(self):
        from taskiq.message import TaskiqMessage

        return TaskiqMessage(
            task_id="task-1",
            task_name="notifications:enviar_whatsapp",
            labels={},
            args=[1, 2],
            kwargs={"telefone": "11999998888", "token": "secreto"},
        )

    def _result(self):
        from taskiq.result import TaskiqResult

        return TaskiqResult(is_err=True, return_value=None, execution_time=0.5, log=None)

    def test_noop_quando_sentry_desligado(self):
        """Sem client ativo o middleware nao pode explodir dentro do worker."""
        self.assertIsNone(
            SentryTaskiqMiddleware().on_error(
                self._message(), self._result(), ValueError("boom")
            )
        )

    def test_captura_erro_da_task_com_contexto(self):
        transport = _CapturingTransport()
        client = sentry_sdk.Client(
            dsn=FAKE_DSN, transport=transport, before_send=_scrub_event
        )

        with sentry_sdk.new_scope() as scope:
            scope.set_client(client)
            SentryTaskiqMiddleware().on_error(
                self._message(), self._result(), ValueError("task quebrou")
            )
            client.flush()

        self.assertEqual(len(transport.events), 1)
        event = transport.events[0]
        self.assertEqual(
            event["tags"]["taskiq.task_name"], "notifications:enviar_whatsapp"
        )
        self.assertEqual(event["contexts"]["taskiq"]["args_count"], 2)
        # kwargs da task tambem passam pelo filtro.
        self.assertEqual(event["contexts"]["taskiq"]["kwargs"]["token"], "[Filtered]")
