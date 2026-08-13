from django.db import models


class ControlPanelState(models.Model):
    """Estado único e persistente do bootstrap desta instalação."""

    SINGLETON_PK = 1

    database_ready = models.BooleanField(default=False)
    queue_ready = models.BooleanField(default=False)
    whatsapp_ready = models.BooleanField(default=False)
    mail_ready = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    @classmethod
    def load(cls):
        state, _ = cls.objects.get_or_create(pk=cls.SINGLETON_PK)
        return state

    @property
    def readiness_approved(self):
        return all(
            (
                self.database_ready,
                self.queue_ready,
                self.whatsapp_ready,
                self.mail_ready,
            )
        )

    @property
    def is_completed(self):
        return self.completed_at is not None

    def save(self, *args, **kwargs):
        self.pk = self.SINGLETON_PK
        return super().save(*args, **kwargs)

