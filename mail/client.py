"""Cliente SMTP — porte do monólito (integrations/communication/mail/client.py).

Config vem da row MailIdentity em vez de settings globais.
"""

from __future__ import annotations

import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

logger = logging.getLogger(__name__)


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
        if plain_body:
            msg.attach(MIMEText(plain_body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        refused = await asyncio.to_thread(self._send_sync, msg, to_email)
        logger.info("mail.sent to=%s refused=%s", to_email, bool(refused))
        return {"to": to_email, "subject": subject, "from": self.from_header, "refused": refused}

    def probe(self) -> dict:
        """Sondagem SMTP sem envio real. Retorna {ok, error?}.

        Faz: connect → EHLO → STARTTLS (se user) → login (se user) → MAIL FROM
        → QUIT. Usado pelo wizard de pareamento.
        """
        try:
            with smtplib.SMTP(self._host, self._port, timeout=self._timeout) as srv:
                srv.ehlo()
                if self._user:
                    try:
                        srv.starttls()
                        srv.ehlo()
                    except smtplib.SMTPException as exc:
                        logger.info("mail.probe.starttls_skipped error=%s", type(exc).__name__)
                    srv.login(self._user, self._password)
                srv.mail(self._from_email)
            return {"ok": True}
        except Exception as exc:
            return {"ok": False, "error": f"{type(exc).__name__}: {exc}"}

    def _send_sync(self, msg: MIMEMultipart, to_email: str) -> dict:
        try:
            with smtplib.SMTP(self._host, self._port, timeout=self._timeout) as srv:
                # MailHog/dev: pula STARTTLS/login se user vazio OU se a porta for
                # a padrão de SMTP plain (25) / mailhog (1025).
                if self._user:
                    try:
                        srv.starttls()
                    except smtplib.SMTPException as exc:
                        logger.info("mail.starttls_skipped error=%s", type(exc).__name__)
                    srv.login(self._user, self._password)
                srv.send_message(msg)
        except smtplib.SMTPRecipientsRefused as exc:
            logger.warning("mail.recipients_refused to=%s", to_email)
            raise
        return {}

def get_client_from_identity(identity, *, from_name: str | None = None) -> MailClient:
    """Constrói MailClient a partir de uma row MailIdentity."""
    # ponytail: desencriptar smtp_password se Fernet estiver configurado
    from mail import crypto
    password = crypto.decrypt(identity.smtp_password)
    return MailClient(
        host=identity.smtp_host,
        port=identity.smtp_port,
        user=identity.smtp_user,
        password=password,
        from_email=identity.from_email,
        from_name=from_name or identity.from_name,
        timeout=identity.timeout,
    )
