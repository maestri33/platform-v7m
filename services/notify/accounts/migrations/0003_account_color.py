import accounts.models
from django.db import migrations, models


def assign_colors(apps, schema_editor):
    Account = apps.get_model("accounts", "Account")
    palette = accounts.models.ACCOUNT_PALETTE
    for acc in Account.objects.all().order_by("pk"):
        if not acc.color:
            acc.color = palette[acc.pk % len(palette)]
            acc.save(update_fields=["color"])


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_account_ai_adapt"),
    ]

    operations = [
        migrations.AddField(
            model_name="account",
            name="color",
            field=models.CharField(blank=True, default="", max_length=7),
        ),
        migrations.RunPython(assign_colors, migrations.RunPython.noop),
    ]
