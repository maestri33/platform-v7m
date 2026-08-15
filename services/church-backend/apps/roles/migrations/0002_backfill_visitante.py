"""Backfill: todo perfil que já tem linha de Visitor recebe o papel "visitante".

Reversível — a volta apaga só o que este backfill criou (``source="backfill"``),
preservando papéis concedidos pelo portal ou pelo admin.
"""

from django.db import migrations


def conceder_visitante(apps, schema_editor):
    Visitor = apps.get_model("visitors", "Visitor")
    ProfileRole = apps.get_model("roles", "ProfileRole")

    ja_tem = set(
        ProfileRole.objects.filter(is_active=True).values_list("profile_id", flat=True)
    )
    novos = [
        ProfileRole(profile_id=pid, role="visitante", is_active=True, source="backfill")
        for pid in Visitor.objects.values_list("profile_id", flat=True).distinct()
        if pid and pid not in ja_tem
    ]
    ProfileRole.objects.bulk_create(novos, batch_size=1000)


def desfazer(apps, schema_editor):
    ProfileRole = apps.get_model("roles", "ProfileRole")
    ProfileRole.objects.filter(source="backfill").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("roles", "0001_initial"),
        ("visitors", "0009_visitorapilog"),
    ]

    operations = [migrations.RunPython(conceder_visitante, desfazer)]