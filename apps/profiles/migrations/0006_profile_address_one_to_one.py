import django.db.models.deletion
from django.db import migrations, models


def ensure_profile_addresses(apps, schema_editor):
    Address = apps.get_model("profiles", "Address")
    Profile = apps.get_model("profiles", "Profile")

    for profile in Profile.objects.all().order_by("id"):
        if profile.address_id is None:
            address = Address.objects.create(
                zipcode="",
                street="",
                number="",
                complement="",
                neighborhood="",
                city="",
                state="",
                country="Brasil",
            )
            profile.address_id = address.id
            profile.save(update_fields=["address"])

    duplicated_address_ids = (
        Profile.objects.values_list("address_id", flat=True)
        .exclude(address_id=None)
        .distinct()
    )

    for address_id in duplicated_address_ids:
        linked_profiles = list(Profile.objects.filter(address_id=address_id).order_by("id"))
        if len(linked_profiles) <= 1:
            continue

        original_address = Address.objects.get(id=address_id)
        for profile in linked_profiles[1:]:
            cloned_address = Address.objects.create(
                zipcode=original_address.zipcode,
                street=original_address.street,
                number=original_address.number,
                complement=original_address.complement,
                neighborhood=original_address.neighborhood,
                city=original_address.city,
                state=original_address.state,
                country=original_address.country,
            )
            profile.address_id = cloned_address.id
            profile.save(update_fields=["address"])


class Migration(migrations.Migration):

    dependencies = [
        ("profiles", "0005_remove_cpf_profile_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="address",
            name="street",
            field=models.CharField(blank=True, default="", max_length=255, verbose_name="endereço"),
        ),
        migrations.AlterField(
            model_name="address",
            name="number",
            field=models.CharField(blank=True, default="", max_length=20, verbose_name="número"),
        ),
        migrations.AlterField(
            model_name="address",
            name="neighborhood",
            field=models.CharField(blank=True, default="", max_length=120, verbose_name="bairro"),
        ),
        migrations.AlterField(
            model_name="address",
            name="city",
            field=models.CharField(blank=True, default="", max_length=120, verbose_name="cidade"),
        ),
        migrations.AlterField(
            model_name="address",
            name="state",
            field=models.CharField(
                blank=True,
                choices=[
                    ("AC", "Acre"),
                    ("AL", "Alagoas"),
                    ("AP", "Amapá"),
                    ("AM", "Amazonas"),
                    ("BA", "Bahia"),
                    ("CE", "Ceará"),
                    ("DF", "Distrito Federal"),
                    ("ES", "Espírito Santo"),
                    ("GO", "Goiás"),
                    ("MA", "Maranhão"),
                    ("MT", "Mato Grosso"),
                    ("MS", "Mato Grosso do Sul"),
                    ("MG", "Minas Gerais"),
                    ("PA", "Pará"),
                    ("PB", "Paraíba"),
                    ("PR", "Paraná"),
                    ("PE", "Pernambuco"),
                    ("PI", "Piauí"),
                    ("RJ", "Rio de Janeiro"),
                    ("RN", "Rio Grande do Norte"),
                    ("RS", "Rio Grande do Sul"),
                    ("RO", "Rondônia"),
                    ("RR", "Roraima"),
                    ("SC", "Santa Catarina"),
                    ("SP", "São Paulo"),
                    ("SE", "Sergipe"),
                    ("TO", "Tocantins"),
                ],
                db_index=True,
                default="",
                max_length=2,
                verbose_name="estado",
            ),
        ),
        migrations.RunPython(ensure_profile_addresses, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="profile",
            name="address",
            field=models.OneToOneField(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="profile",
                to="profiles.address",
                verbose_name="endereço",
            ),
        ),
    ]
