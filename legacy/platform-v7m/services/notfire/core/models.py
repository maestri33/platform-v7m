"""Models base — ExternalIdModel (porte de core/models.py do monólito)."""

import uuid
from django.db import models


class ExternalIdModel(models.Model):
    """Base abstrata com external_id (UUID) de borda — nunca a PK."""

    external_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    class Meta:
        abstract = True
