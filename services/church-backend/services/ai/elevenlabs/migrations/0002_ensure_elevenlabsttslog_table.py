from django.db import migrations


def ensure_elevenlabs_tts_log_table(apps, schema_editor):
    ElevenLabsTTSLog = apps.get_model("elevenlabs", "ElevenLabsTTSLog")
    existing_tables = set(schema_editor.connection.introspection.table_names())
    if ElevenLabsTTSLog._meta.db_table in existing_tables:
        return
    schema_editor.create_model(ElevenLabsTTSLog)


class Migration(migrations.Migration):
    dependencies = [
        ("elevenlabs", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(ensure_elevenlabs_tts_log_table, migrations.RunPython.noop),
    ]
