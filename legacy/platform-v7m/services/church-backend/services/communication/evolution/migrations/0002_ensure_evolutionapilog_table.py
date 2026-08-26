from django.db import migrations


def ensure_evolution_api_log_table(apps, schema_editor):
    EvolutionApiLog = apps.get_model("evolution", "EvolutionApiLog")
    existing_tables = set(schema_editor.connection.introspection.table_names())
    if EvolutionApiLog._meta.db_table in existing_tables:
        return
    schema_editor.create_model(EvolutionApiLog)


class Migration(migrations.Migration):
    dependencies = [
        ("evolution", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(ensure_evolution_api_log_table, migrations.RunPython.noop),
    ]
