from django.db import migrations


def ensure_gemini_image_log_table(apps, schema_editor):
    GeminiImageLog = apps.get_model("gemini", "GeminiImageLog")
    existing_tables = set(schema_editor.connection.introspection.table_names())
    if GeminiImageLog._meta.db_table in existing_tables:
        return
    schema_editor.create_model(GeminiImageLog)


class Migration(migrations.Migration):
    dependencies = [
        ("gemini", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(ensure_gemini_image_log_table, migrations.RunPython.noop),
    ]
