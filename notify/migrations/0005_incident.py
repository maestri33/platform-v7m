from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("notify", "0004_notification_allow_alternate_sender")]

    operations = [
        migrations.CreateModel(
            name="Incident",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("channel", models.CharField(max_length=20)),
                ("category", models.SlugField(max_length=80)),
                ("summary", models.CharField(max_length=200)),
                ("detail", models.TextField(blank=True)),
                ("status", models.CharField(choices=[("open", "aberta"), ("resolved", "resolvida")], default="open", max_length=12)),
                ("occurrences", models.PositiveIntegerField(default=1)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("account", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="incidents", to="accounts.account")),
                ("notifications", models.ManyToManyField(related_name="incidents", to="notify.notification")),
            ],
            options={"ordering": ["-updated_at"]},
        ),
        migrations.AddConstraint(
            model_name="incident",
            constraint=models.UniqueConstraint(fields=("account", "channel", "category"), name="uniq_incident_cause_per_account"),
        ),
    ]
