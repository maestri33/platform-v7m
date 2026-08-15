from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [("bot", "0001_initial")]

    operations = [
        migrations.DeleteModel(name="Message"),
        migrations.DeleteModel(name="Conversation"),
        migrations.DeleteModel(name="InboundEvent"),
        migrations.DeleteModel(name="BotRateLimit"),
    ]
