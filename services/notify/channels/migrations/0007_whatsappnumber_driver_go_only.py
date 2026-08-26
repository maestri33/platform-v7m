"""GO-only: driver default vira evolution-go e linhas v2 são migradas.

A Evolution v2 foi aposentada em 2026-08-18 — sobrou um provedor. As linhas
existentes com driver evolution-v2 passam a apontar pra GO (o fallback_driver
v2 é esvaziado: não existe mais pra onde cair).
"""

from django.db import migrations, models


def _migra_para_go(apps, schema_editor):
    WhatsAppNumber = apps.get_model("channels", "WhatsAppNumber")
    WhatsAppNumber.objects.filter(driver="evolution-v2").update(driver="evolution-go")
    WhatsAppNumber.objects.filter(fallback_driver="evolution-v2").update(fallback_driver="")


class Migration(migrations.Migration):

    dependencies = [
        ("channels", "0006_suppressed_email"),
    ]

    operations = [
        migrations.RunPython(_migra_para_go, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="whatsappnumber",
            name="driver",
            field=models.CharField(
                choices=[("evolution-go", "Evolution Go")],
                default="evolution-go",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="whatsappnumber",
            name="fallback_driver",
            field=models.CharField(
                blank=True,
                choices=[("evolution-go", "Evolution Go")],
                default="",
                help_text=(
                    "Para onde cair quando a sessão do driver preferido estiver fora. "
                    "Vazio = sem fallback."
                ),
                max_length=20,
            ),
        ),
    ]
