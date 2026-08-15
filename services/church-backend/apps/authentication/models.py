"""Modelos do app de autenticacao."""

from django.conf import settings
from django.db import models


class LoginOtpState(models.Model):
    """Estado operacional do OTP de login por usuario."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="login_otp_state",
        verbose_name="usuario",
    )
    otp_created_at = models.DateTimeField("otp gerado em", null=True, blank=True)
    last_sent_at = models.DateTimeField("ultimo envio em", null=True, blank=True)
    send_window_started_at = models.DateTimeField("janela de envio iniciada em", null=True, blank=True)
    sends_in_window = models.PositiveSmallIntegerField("envios na janela", default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "estado de otp de login"
        verbose_name_plural = "estados de otp de login"

    def __str__(self):
        return f"OTP state - {self.user}"
