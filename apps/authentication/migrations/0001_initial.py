from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="LoginOtpState",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("otp_created_at", models.DateTimeField(blank=True, null=True, verbose_name="otp gerado em")),
                ("last_sent_at", models.DateTimeField(blank=True, null=True, verbose_name="ultimo envio em")),
                (
                    "send_window_started_at",
                    models.DateTimeField(blank=True, null=True, verbose_name="janela de envio iniciada em"),
                ),
                ("sends_in_window", models.PositiveSmallIntegerField(default=0, verbose_name="envios na janela")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="login_otp_state",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="usuario",
                    ),
                ),
            ],
            options={
                "verbose_name": "estado de otp de login",
                "verbose_name_plural": "estados de otp de login",
            },
        ),
    ]
