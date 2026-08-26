"""Servicos do app worship — geracao, aprovacao e publicacao de escalas.

IA: por enquanto stubbed — `generate_scale` tenta chamar o engine multi-provider
(quando portado em M1.7) e cai pra um fallback deterministico (1 assignment com o
primeiro lider do ministerio) se a IA nao estiver disponivel. O importante nesta
task e o fluxo de aprovacao funcionar ponta a ponta.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Literal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.ministries.models import Ministry, MinistryMembership
from apps.profiles.models import Profile
from apps.worship.models import Scale, ScaleAssignment, WorshipEvent

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers internos
# ---------------------------------------------------------------------------


def _list_candidate_profiles(ministry: Ministry) -> list[Profile]:
    """Lista profiles com membership ativa LEADER ou VOLUNTEER no ministerio."""
    qs = (
        MinistryMembership.objects.filter(
            ministry=ministry,
            removed_at__isnull=True,
            role__in=[
                MinistryMembership.Role.LEADER,
                MinistryMembership.Role.VOLUNTEER,
            ],
        )
        .select_related("profile")
        .order_by("-appointed_at")
    )
    return [m.profile for m in qs]


def _try_call_ai_generate_json(prompt: str) -> list[dict] | None:
    """Tenta chamar ``integrations.ai.service.generate_json`` (M1.13).

    Retorna None se a IA não estiver disponível — caller usa fallback
    determinístico. Não importa qual provider tá ativo (DeepSeek, MiniMax,
    etc): single source of truth = ``IA_TEXT_CHAIN`` no .env.
    """
    try:
        from integrations.ai.service import generate_json
    except Exception as exc:  # pragma: no cover - integração não importada
        logger.debug("integrations.ai.generate_json indisponível: %s", exc)
        return None

    try:
        result = generate_json(
            prompt=prompt,
            schema={
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "profile_id": {"type": "string"},
                        "role": {"type": "string"},
                    },
                    "required": ["profile_id", "role"],
                },
            },
            caller="worship.generate_scale",
        )
    except Exception as exc:  # pragma: no cover - IA fora do ar
        logger.warning("integrations.ai.generate_json falhou: %s", exc)
        return None

    if not isinstance(result, list):
        return None
    return [item for item in result if isinstance(item, dict)]


def _is_leader(profile: Profile, ministry: Ministry) -> bool:
    """Verifica se o profile tem membership ativa de LIDER no ministerio."""
    return MinistryMembership.objects.filter(
        profile=profile,
        ministry=ministry,
        role=MinistryMembership.Role.LEADER,
        removed_at__isnull=True,
    ).exists()


# ---------------------------------------------------------------------------
# Geracao e aprovacao
# ---------------------------------------------------------------------------


def generate_scale(worship_event: WorshipEvent, ministry: Ministry) -> Scale:
    """Cria uma `Scale(DRAFT)` para o culto/ministerio.

    Fluxo:
    1. Cria a escala em DRAFT.
    2. Lista candidatos (LEADER/VOLUNTEER ativos do ministerio).
    3. Tenta `ai.generate_json(prompt=...)` — se funcionar, usa o retorno.
    4. Fallback deterministico: cria 1 assignment com o primeiro LIDER.
    5. Salva o payload bruto da IA em `ai_suggestion`.
    """
    if not isinstance(worship_event, WorshipEvent):
        raise TypeError("worship_event precisa ser instancia de WorshipEvent.")
    if not isinstance(ministry, Ministry):
        raise TypeError("ministry precisa ser instancia de Ministry.")

    candidates = _list_candidate_profiles(ministry)
    prompt = (
        f"Gere uma escala para o culto {worship_event} no ministerio {ministry}. "
        f"Candidatos disponiveis: {[c.full_name or str(c) for c in candidates]}. "
        "Responda JSON no formato: "
        '[{"profile_id": <int>, "role": "leader|assistant"}, ...]'
    )

    with transaction.atomic():
        scale = Scale.objects.create(
            worship_event=worship_event,
            ministry=ministry,
            status=Scale.Status.DRAFT,
            generated_by_ai=True,
        )

        ai_payload = _try_call_ai_generate_json(prompt)
        if ai_payload is not None:
            scale.ai_suggestion = {
                "prompt": prompt,
                "candidates": [c.id for c in candidates],
                "response": ai_payload,
            }
            scale.save(update_fields=["ai_suggestion", "updated_at"])

            valid_roles = {choice[0] for choice in ScaleAssignment.Role.choices}
            for item in ai_payload:
                profile_id = item.get("profile_id")
                role = item.get("role", ScaleAssignment.Role.ASSISTANT)
                if profile_id is None or role not in valid_roles:
                    continue
                try:
                    profile = Profile.objects.get(pk=profile_id)
                except Profile.DoesNotExist:
                    continue
                ScaleAssignment.objects.create(
                    scale=scale,
                    profile=profile,
                    role=role,
                    status=ScaleAssignment.Status.PENDING,
                )
        else:
            scale.ai_suggestion = {
                "prompt": prompt,
                "candidates": [c.id for c in candidates],
                "response": None,
                "fallback": "ai_unavailable",
            }
            scale.save(update_fields=["ai_suggestion", "updated_at"])

            leader = next(
                (c for c in candidates if _is_leader(c, ministry)),
                None,
            )
            if leader is not None and candidates:
                ScaleAssignment.objects.create(
                    scale=scale,
                    profile=leader,
                    role=ScaleAssignment.Role.LEADER,
                    status=ScaleAssignment.Status.PENDING,
                )

    return scale


def approve_scale_by_leader(
    scale: Scale, leader: Profile, notes: str = ""
) -> Scale:
    """Lider aprova a escala. Requer membership ativa de LIDER no ministerio da escala."""
    if not isinstance(scale, Scale):
        raise TypeError("scale precisa ser instancia de Scale.")

    if not _is_leader(leader, scale.ministry):
        raise ValidationError(
            f"Profile {leader} nao e lider ativo do ministerio {scale.ministry}."
        )

    if scale.status not in {Scale.Status.DRAFT, Scale.Status.LEADER_APPROVED}:
        raise ValidationError(
            f"Escala em status {scale.get_status_display()} nao pode ser aprovada pelo lider."
        )

    with transaction.atomic():
        scale.status = Scale.Status.LEADER_APPROVED
        scale.leader_approved_at = timezone.now()
        scale.leader_approved_by = leader
        if notes:
            scale.leader_notes = notes
        scale.save(
            update_fields=[
                "status",
                "leader_approved_at",
                "leader_approved_by",
                "leader_notes",
                "updated_at",
            ]
        )

    return scale


def publish_scale(scale: Scale, dirigente: Profile, notes: str = "") -> Scale:
    """Dirigente publica a escala. So funciona se ja passou pelo lider."""
    if not isinstance(scale, Scale):
        raise TypeError("scale precisa ser instancia de Scale.")

    if scale.status != Scale.Status.LEADER_APPROVED:
        raise ValidationError(
            f"Escala precisa estar com status 'Lider aprovou' para ser publicada "
            f"(status atual: {scale.get_status_display()})."
        )

    with transaction.atomic():
        scale.status = Scale.Status.PUBLISHED
        scale.published_at = timezone.now()
        scale.published_by = dirigente
        if notes:
            existing = scale.leader_notes or ""
            sep = "\n" if existing else ""
            scale.leader_notes = f"{existing}{sep}[dirigente] {notes}"
        scale.save(
            update_fields=[
                "status",
                "published_at",
                "published_by",
                "leader_notes",
                "updated_at",
            ]
        )

    return scale


# ---------------------------------------------------------------------------
# Assignments
# ---------------------------------------------------------------------------


def confirm_assignment(assignment: ScaleAssignment) -> ScaleAssignment:
    """Voluntario confirmou presenca."""
    if not isinstance(assignment, ScaleAssignment):
        raise TypeError("assignment precisa ser instancia de ScaleAssignment.")

    if assignment.status in {ScaleAssignment.Status.CONFIRMED, ScaleAssignment.Status.REALLOCATED}:
        return assignment

    with transaction.atomic():
        assignment.status = ScaleAssignment.Status.CONFIRMED
        assignment.confirmed_at = timezone.now()
        assignment.save(
            update_fields=["status", "confirmed_at", "updated_at"]
        )
    return assignment


def decline_assignment(assignment: ScaleAssignment) -> ScaleAssignment:
    """Voluntario recusou a escala."""
    if not isinstance(assignment, ScaleAssignment):
        raise TypeError("assignment precisa ser instancia de ScaleAssignment.")

    if assignment.status == ScaleAssignment.Status.DECLINED:
        return assignment

    with transaction.atomic():
        assignment.status = ScaleAssignment.Status.DECLINED
        assignment.declined_at = timezone.now()
        assignment.save(
            update_fields=["status", "declined_at", "updated_at"]
        )
    return assignment


def reallocate_assignment(
    assignment: ScaleAssignment, replacement_profile: Profile
) -> ScaleAssignment:
    """Marca o assignment original como REALLOCATED e cria um novo PENDING para o substituto."""
    if not isinstance(assignment, ScaleAssignment):
        raise TypeError("assignment precisa ser instancia de ScaleAssignment.")
    if not isinstance(replacement_profile, Profile):
        raise TypeError("replacement_profile precisa ser instancia de Profile.")

    if assignment.status == ScaleAssignment.Status.REALLOCATED:
        return assignment

    if assignment.profile_id == replacement_profile.id:
        raise ValidationError(
            "Substituto nao pode ser o mesmo profile do assignment original."
        )

    with transaction.atomic():
        new_assignment = ScaleAssignment.objects.create(
            scale=assignment.scale,
            profile=replacement_profile,
            role=assignment.role,
            status=ScaleAssignment.Status.PENDING,
            reallocated_to=assignment,
        )
        assignment.status = ScaleAssignment.Status.REALLOCATED
        assignment.reallocated_to = new_assignment
        assignment.save(
            update_fields=["status", "reallocated_to", "updated_at"]
        )

    return new_assignment


def mark_reminder_sent(assignment: ScaleAssignment) -> ScaleAssignment:
    """Marca o timestamp do ultimo lembrete enviado para esse assignment."""
    if not isinstance(assignment, ScaleAssignment):
        raise TypeError("assignment precisa ser instancia de ScaleAssignment.")

    with transaction.atomic():
        assignment.reminder_sent_at = timezone.now()
        assignment.save(update_fields=["reminder_sent_at", "updated_at"])
    return assignment


def auto_reallocate_if_unconfirmed(
    assignment: ScaleAssignment, deadline_hour: int = 24
) -> bool:
    """Se o lembrete foi enviado ha mais de `deadline_hour` e a pessoa nao confirmou,
    realoca automaticamente com o proximo candidato do ministerio.

    Retorna True se realocou, False caso contrario.
    """
    if not isinstance(assignment, ScaleAssignment):
        raise TypeError("assignment precisa ser instancia de ScaleAssignment.")

    if assignment.status != ScaleAssignment.Status.PENDING:
        return False

    if assignment.reminder_sent_at is None:
        return False

    threshold = timezone.now() - timedelta(hours=deadline_hour)
    if assignment.reminder_sent_at > threshold:
        return False

    candidates = _list_candidate_profiles(assignment.scale.ministry)
    already_taken_ids = set(
        ScaleAssignment.objects.filter(
            scale=assignment.scale
        ).values_list("profile_id", flat=True)
    )
    replacement = next(
        (c for c in candidates if c.id not in already_taken_ids),
        None,
    )
    if replacement is None:
        logger.info(
            "auto_reallocate: sem candidatos disponiveis para scale=%s",
            assignment.scale_id,
        )
        return False

    reallocate_assignment(assignment, replacement)
    return True


# ---------------------------------------------------------------------------
# Cron de culto (qua/dom 22h) + push de avisos durante o culto (M1.9)
# ---------------------------------------------------------------------------


PUSH_RATE_LIMIT_SECONDS = 600  # 10 min entre chamadas do push


class PushRateLimited(Exception):
    """Levantada quando o push do culto e chamado antes do rate-limit (10 min)."""

    def __init__(self, worship_event_id: int, seconds_remaining: int):
        self.worship_event_id = worship_event_id
        self.seconds_remaining = seconds_remaining
        super().__init__(
            f"Push do culto {worship_event_id} limitado; tente em {seconds_remaining}s."
        )


_push_call_log: dict[int, datetime] = {}


def _profile_role_atual(profile) -> str:
    """Role ativa do profile (prioridade: membro > congregado > visitante)."""
    user = getattr(profile, "user", None)
    if user is None:
        return ""
    try:
        from apps.roles.interface import active_roles
    except Exception:
        return ""
    try:
        roles = active_roles(user)
    except Exception:
        return ""
    for r in ("membro", "congregado", "visitante"):
        if r in roles:
            return r
    return roles[0] if roles else ""


def _first_name(profile) -> str:
    """Primeiro nome do profile (fallback user.first_name / username)."""
    name = (getattr(profile, "full_name", "") or "").strip()
    user = getattr(profile, "user", None)
    if not name and user is not None:
        name = (user.first_name or user.get_full_name() or user.username or "").strip()
    if not name and user is not None:
        name = user.username or ""
    if not name:
        return "amigo"
    return name.split(" ", 1)[0]


def _complete_signup_link() -> str:
    """Link pra completar cadastro (URL_FRONTEND com fallback pro typo URL_FROTEND)."""
    frontend = (
        getattr(settings, "URL_FROTEND", "")
        or getattr(settings, "URL_FRONTEND", "")
        or ""
    ).rstrip("/")
    return f"{frontend}/completar-cadastro" if frontend else "(link completar cadastro)"


def build_cult_message_for_profile(profile, category: str) -> dict | None:
    """Monta `{title, content, event_key, use_tts}` pos-culto por (role, category).

    `use_tts` e True para `present` e `first_time` (voz masculina agradecendo
    o visitante/congregado/membro pos-culto) e False para `absent` (sem audio
    pra quem faltou — so texto).

    `None` significa que nao manda pra essa combinacao (ex.: ausente visitante).
    """
    if not getattr(settings, "WORSHIP_CULT_MESSAGES_ENABLED", False):
        return None
    role = _profile_role_atual(profile)
    first = _first_name(profile)
    event_key = f"cult_post:{category}:{role}"
    use_tts = category in ("present", "first_time")

    if category == "present":
        if role == "visitante":
            return {
                "title": "Foi bom ter voce no culto!",
                "content": f"Que bom te ver no culto ontem, {first}! Foi uma alegria te receber.",
                "event_key": event_key,
                "use_tts": use_tts,
            }
        if role in ("congregado", "membro"):
            return {
                "title": "Obrigado por estar presente!",
                "content": (
                    f"Foi um prazer ter voce no culto ontem, {first}! "
                    "Sua presenca edifica a nossa igreja."
                ),
                "event_key": event_key,
                "use_tts": use_tts,
            }
        return None

    if category == "absent":
        if role in ("congregado", "membro"):
            return {
                "title": "Sentimos sua falta!",
                "content": (
                    f"Sentimos sua falta no culto, {first}. Te esperamos no proximo!"
                ),
                "event_key": event_key,
                "use_tts": use_tts,
            }
        return None

    if category == "first_time":
        if role == "visitante":
            return {
                "title": "Sua primeira vez na nossa igreja!",
                "content": (
                    f"Foi a sua primeira vez na nossa igreja, {first}! "
                    f"Que alegria te receber. Pra continuar recebendo as mensagens, "
                    f"complete seu cadastro: {_complete_signup_link()}. "
                    "So assim vira congregado."
                ),
                "event_key": event_key,
                "use_tts": use_tts,
            }
        if role in ("congregado", "membro"):
            return build_cult_message_for_profile(profile, "present")
        return None

    return None


def _build_cult_push_message_for_profile(profile, channel: str) -> dict:
    """Mensagem do push durante o culto (oferta/avisos) por role."""
    if not getattr(settings, "WORSHIP_CULT_MESSAGES_ENABLED", False):
        return None
    role = _profile_role_atual(profile)
    first = _first_name(profile)
    event_key = f"cult_push:{channel}:{role}"

    if role == "membro":
        title = "Aviso do culto"
        content = (
            f"Aviso do culto de hoje: oferta, programacao e avisos da semana, {first}."
        )
    elif role == "congregado":
        title = "Aviso do culto"
        content = (
            f"Hoje no culto: oferta e avisos importantes, {first}. "
            "Sua presenca faz diferenca na familia."
        )
    elif role == "visitante":
        title = "Aviso do culto"
        content = (
            f"Seja bem-vindo(a) ao nosso culto, {first}! "
            "Hoje temos oferta e avisos. Fique a vontade."
        )
    else:
        title = "Aviso do culto"
        content = f"Aviso do culto de hoje, {first}: oferta e avisos."

    return {"title": title, "content": content, "event_key": event_key}


def _check_push_rate_limit(worship_event_id: int, *, now: datetime | None = None):
    """Levanta PushRateLimited se a ultima chamada foi < PUSH_RATE_LIMIT_SECONDS atras."""
    last = _push_call_log.get(worship_event_id)
    if last is None:
        return
    reference = now or timezone.now()
    delta = (reference - last).total_seconds()
    if delta < PUSH_RATE_LIMIT_SECONDS:
        raise PushRateLimited(
            worship_event_id,
            int(PUSH_RATE_LIMIT_SECONDS - delta),
        )


def _mark_push_called(worship_event_id: int, *, now: datetime | None = None) -> None:
    _push_call_log[worship_event_id] = now or timezone.now()


def reset_push_rate_limit_state() -> None:
    """Limpa o estado in-memory do rate-limit (usado por testes)."""
    _push_call_log.clear()


def send_cult_notifications(worship_event, dry_run: bool = False) -> dict:
    """Envia notificacoes pos-culto (present / absent / first_time).

    Cria `Notification` por destinatario — o `post_save` do model cuida do
    enfileiramento via `notifications/services/queue.py`. Retorna contadores.
    """
    from apps.captive.services.presence import get_cult_attendees
    from notifications.models import Notification

    if not isinstance(worship_event, WorshipEvent):
        raise TypeError("worship_event precisa ser instancia de WorshipEvent.")

    attendees = get_cult_attendees(worship_event)
    counts = {"present": 0, "absent": 0, "first_time": 0, "created": 0}

    for category in ("present", "absent", "first_time"):
        for profile in attendees.get(category, []):
            msg = build_cult_message_for_profile(profile, category)
            if msg is None:
                continue
            counts[category] += 1
            if dry_run:
                continue
            Notification.objects.create(
                recipient=profile,
                title=msg["title"],
                content=msg["content"],
                event_key=msg["event_key"],
                use_tts=msg.get("use_tts", False),
            )
            counts["created"] += 1

    return counts


def send_cult_push_announcements(
    worship_event,
    *,
    channel: Literal["whatsapp", "email"] = "whatsapp",
    dry_run: bool = False,
    now: datetime | None = None,
) -> dict:
    """Envia push (oferta/avisos) durante o culto. Aplica rate-limit 10min.

    So envia pra quem esta no culto (`present`). Retorna `{"created": N}`.
    """
    from apps.captive.services.presence import get_cult_attendees
    from notifications.models import Notification

    if not isinstance(worship_event, WorshipEvent):
        raise TypeError("worship_event precisa ser instancia de WorshipEvent.")

    _check_push_rate_limit(worship_event.id, now=now)

    attendees = get_cult_attendees(worship_event)
    created = 0
    for profile in attendees.get("present", []):
        msg = _build_cult_push_message_for_profile(profile, channel)
        if not dry_run:
            Notification.objects.create(
                recipient=profile,
                title=msg["title"],
                content=msg["content"],
                event_key=msg["event_key"],
            )
        created += 1

    if not dry_run:
        _mark_push_called(worship_event.id, now=now)

    return {"created": created}
