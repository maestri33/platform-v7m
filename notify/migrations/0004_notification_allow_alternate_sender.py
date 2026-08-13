from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("notify", "0003_delete_inbound_event")]

    operations = [
        migrations.AddField(
            model_name="notification",
            name="allow_alternate_sender",
            field=models.BooleanField(default=False),
        ),
    ]
