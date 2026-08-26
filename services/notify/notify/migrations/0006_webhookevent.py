from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("notify", "0005_service_status"),
    ]

    operations = [
        migrations.CreateModel(
            name="WebhookEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("received_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("instance_name", models.CharField(db_index=True, max_length=100)),
                ("event", models.CharField(blank=True, db_index=True, default="", max_length=64)),
                ("from_number", models.CharField(blank=True, default="", max_length=32)),
                ("preview", models.CharField(blank=True, default="", max_length=200)),
                ("payload", models.JSONField(default=dict)),
            ],
            options={
                "verbose_name": "webhook recebido",
                "verbose_name_plural": "webhooks recebidos",
            },
        ),
    ]
