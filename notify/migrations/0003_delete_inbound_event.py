from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [("notify", "0002_simplify_templates")]
    operations = [migrations.DeleteModel(name="InboundEvent")]
