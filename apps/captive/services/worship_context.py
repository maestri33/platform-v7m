"""Fase D — contexto de culto (passos 20-22 do design).

Tenta a agenda real de ``apps.worship`` (quando os models existem no
checkout); fallback é a agenda fixa ``CAPTIVE_WORSHIP_SCHEDULE`` do .env,
com tolerância em minutos. Retorna se há culto agora e o próximo horário.
"""

import logging
from datetime import datetime, timedelta

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

DAY_ALIASES = {
    "mon": 0, "seg": 0,
    "tue": 1, "ter": 1,
    "wed": 2, "qua": 2,
    "thu": 3, "qui": 3,
    "fri": 4, "sex": 4,
    "sat": 5, "sab": 5,
    "sun": 6, "dom": 6,
}


def _parse_schedule():
    """Converte "dom 09:00-11:30;qua 19:30-21:30" em tuplas (dia, ini, fim)."""

    entries = []
    raw = str(getattr(settings, "CAPTIVE_WORSHIP_SCHEDULE", "") or "")
    for chunk in raw.split(";"):
        parts = chunk.strip().split()
        if len(parts) != 2 or "-" not in parts[1]:
            continue
        day = DAY_ALIASES.get(parts[0].lower())
        if day is None:
            continue
        try:
            start_raw, end_raw = parts[1].split("-")
            start = datetime.strptime(start_raw, "%H:%M").time()
            end = datetime.strptime(end_raw, "%H:%M").time()
        except ValueError:
            continue
        entries.append((day, start, end))
    return entries


def _occurrences(now, days_ahead=8):
    """Gera (início, fim) datetimes das próximas ocorrências da agenda."""

    for offset in range(days_ahead):
        day = (now + timedelta(days=offset)).date()
        for weekday, start, end in _parse_schedule():
            if day.weekday() != weekday:
                continue
            tz = timezone.get_current_timezone()
            starts_at = timezone.make_aware(datetime.combine(day, start), tz)
            ends_at = timezone.make_aware(datetime.combine(day, end), tz)
            yield starts_at, ends_at


def _from_worship_app(now, tolerance):
    """Agenda real do apps.worship, se os models existirem neste checkout."""

    try:
        from apps.worship.models import WorshipEvent
    except Exception:
        return None

    try:
        current = (
            WorshipEvent.objects.filter(
                starts_at__lte=now + tolerance, ends_at__gte=now - tolerance
            )
            .order_by("starts_at")
            .first()
        )
        upcoming = (
            WorshipEvent.objects.filter(starts_at__gt=now).order_by("starts_at").first()
        )
    except Exception as exc:  # campos diferentes no checkout completo
        logger.debug("Agenda do apps.worship indisponível: %s", exc)
        return None

    return {
        "live": current is not None,
        "ends_at": getattr(current, "ends_at", None),
        "next_starts_at": getattr(upcoming, "starts_at", None),
        "source": "worship",
    }


def current_worship_context():
    """Passo 20 — há culto acontecendo agora? (com tolerância)."""

    now = timezone.localtime()
    tolerance = timedelta(
        minutes=int(getattr(settings, "CAPTIVE_WORSHIP_TOLERANCE_MIN", 30))
    )

    from_app = _from_worship_app(now, tolerance)
    if from_app is not None:
        return from_app

    live_until = None
    next_starts_at = None
    for starts_at, ends_at in _occurrences(now):
        if starts_at - tolerance <= now <= ends_at + tolerance:
            live_until = ends_at
            break
        if starts_at > now and next_starts_at is None:
            next_starts_at = starts_at

    return {
        "live": live_until is not None,
        "ends_at": live_until,
        "next_starts_at": next_starts_at,
        "source": "schedule",
    }
