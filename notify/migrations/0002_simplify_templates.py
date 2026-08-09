from django.db import migrations, models


def copy_active(apps, _schema_editor):
    Trigger = apps.get_model("notify", "Trigger")
    Template = apps.get_model("notify", "Template")
    inactive = Trigger.objects.filter(active=False).values_list("template_id", flat=True)
    Template.objects.filter(pk__in=inactive).update(active=False)


class Migration(migrations.Migration):
    dependencies = [("notify", "0001_initial")]

    operations = [
        migrations.AddField(
            model_name="template",
            name="active",
            field=models.BooleanField(db_index=True, default=True),
        ),
        migrations.RunPython(copy_active, migrations.RunPython.noop),
        migrations.DeleteModel(name="Trigger"),
        migrations.RemoveField(model_name="template", name="story_prompt"),
        migrations.RemoveField(model_name="template", name="storytelling"),
    ]
