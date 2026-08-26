"""Cliente SMTP — porte do monólito (integrations/communication/mail/client.py).

Config vem da row MailIdentity em vez de settings globais.
"""

from __future__ import annotations

import asyncio
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formatdate, make_msgid
from typing import Any

import structlog

logger = structlog.get_logger()


class MailError(Exception):
    def __init__(self, message: str, *, recipients_refused: dict | None = None):
        self.recipients_refused = recipients_refused or {}
        super().__init__(message)


class MailClient:
    """Envio de email via SMTP STARTTLS — config explícita (sem settings)."""

    def __init__(
        self,
        *,
        host: str,
        port: int = 587,
        user: str,
        password: str,
        from_email: str,
        from_name: str,
        timeout: float = 10.0,
    ) -> None:
        self._host = host
        self._port = port
        self._user = user
        self._password = password
        self._from_email = from_email
        self._from_name = from_name
        self._timeout = timeout

    @property
    def from_header(self) -> str:
        return f"{self._from_name} <{self._from_email}>"

    async def send_email(
        self,
        to_email: str,
        subject: str,
        *,
        html_body: str,
        plain_body: str | None = None,
    ) -> dict[str, Any]:
        msg = MIMEMultipart("alternative")
        msg["To"] = to_email
        msg["Subject"] = subject
        msg["From"] = self.from_header
        # Date e Message-ID não são opcionais: sem eles o SpamAssassin cobra
        # ~4.3 pontos (MISSING_DATE + DOS_BODY_HIGH_NO_MID) — medido no
        # mail-tester em 2026-08-02, nota caiu a 5.9/10 só por isso.
        msg["Date"] = formatdate(localtime=True)
        msg_id = make_msgid(domain=self._from_email.rsplit("@", 1)[-1])
        msg["Message-ID"] = msg_id
        if plain_body:
            msg.attach(MIMEText(plain_body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        refused = await asyncio.to_thread(self._send_sync, msg, to_email)
        logger.info("mail.sent", to=to_email, subject=subject[:80], message_id=msg_id, refused=bool(refused))
        return {
            "to": to_email,
            "subject": subject,
            "from": self.from_header,
            "message_id": msg_id,
            "refused": refused,
        }

    def _send_sync(self, msg: MIMEMultipart, to_email: str) -> dict:
        try:
            with smtplib.SMTP(self._host, self._port, timeout=self._timeout) as srv:
                self._upgrade_and_login(srv)
                srv.send_message(msg)
        except smtplib.SMTPRecipientsRefused as exc:
            logger.warning("mail.recipients_refused", to=to_email)
            raise MailError(
                f"destinatário recusado: {to_email}", recipients_refused=exc.recipients
            ) from exc
        except smtplib.SMTPException as exc:
            raise MailError(f"SMTP falhou: {type(exc).__name__}: {exc}") from exc
        except OSError as exc:
            raise MailError(f"conexão SMTP falhou: {type(exc).__name__}: {exc}") from exc
        return {}

    async def verify_login(self) -> None:
        await asyncio.to_thread(self._verify_login_sync)
        logger.info("mail.login_ok", host=self._host, port=self._port, user=self._user)

    def _verify_login_sync(self) -> None:
        try:
            with smtplib.SMTP(self._host, self._port, timeout=self._timeout) as srv:
                self._upgrade_and_login(srv)
                srv.noop()
        except smtplib.SMTPException as exc:
            raise MailError(f"login SMTP falhou: {type(exc).__name__}: {exc}") from exc
        except OSError as exc:
            raise MailError(f"conexão SMTP falhou: {type(exc).__name__}: {exc}") from exc

    def _upgrade_and_login(self, srv: smtplib.SMTP) -> None:
        """STARTTLS + login, degradando com honestidade para relays internos.

        Produção (mailcow:587) anuncia STARTTLS e exige login — caminho cheio.
        Um relay interno de dev (ex.: mailhog) pode não ter nenhum dos dois:
        seguir sem TLS/login vale mais que falhar o canal inteiro; o aviso fica
        no log para ninguém rodar assim em produção sem saber.
        """
        try:
            srv.starttls()
        except smtplib.SMTPNotSupportedError:
            logger.warning(
                "mail.starttls_unsupported", host=self._host, port=self._port,
                hint="seguindo sem TLS — ok para relay interno/dev",
            )
        if self._user and self._password:
            srv.login(self._user, self._password)


def get_client_from_identity(identity, *, from_name: str | None = None) -> MailClient:
    """Constrói MailClient a partir de uma row MailIdentity."""
    # ponytail: desencriptar smtp_password se Fernet estiver configurado
    from mail import crypto
    password = crypto.decrypt(identity.smtp_password)
    return MailClient(
        host=identity.smtp_host,
        port=identity.smtp_port,
        user=identity.smtp_user or identity.from_email,
        password=password,
        from_email=identity.from_email,
        from_name=from_name or identity.from_name,
        timeout=identity.timeout,
    )
