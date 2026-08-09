from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [("channels", "0001_initial")]

    operations = [
        migrations.RemoveField(model_name="whatsappnumber", name="connection_status"),
        migrations.RemoveField(model_name="whatsappnumber", name="driver"),
    ]
