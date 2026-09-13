from __future__ import annotations

from users.documents import service as documents_iface
from users.roles import _analysis
from users.roles.enrollment.common import logger
from users.roles.enrollment.models import Enrollment
from users.roles.enrollment.notifications import _notify_rg_rejected, _notify_rg_review


def _rg_started_at(rg):
    raw = (rg.validation_result or {}).get("analysis_started_at") if rg else None
    return _analysis.started_at_from(raw, coerce_tz=False)


def _finish_rg(
    enr: Enrollment, rg, status: str, reason: str | None, result: dict
) -> None:
    from django.utils import timezone

    from users.roles import _document_ai as doc_ai

    result["reason"] = reason
    rg.validation_status = status
    rg.validation_result = result
    rg.validated_at = timezone.now()
    rg.save(update_fields=["validation_status", "validation_result", "validated_at"])
    logger.info(
        "enrollment.rg_validated", enrollment=str(enr.external_id), status=status
    )
    if status == doc_ai.REJECTED:
        _notify_rg_rejected(enr, reason)
    elif status == doc_ai.REVIEW:
        _notify_rg_review(enr, reason)


def _reconcile_stale_analyses(enr: Enrollment) -> None:
    rg = documents_iface.get_rg(str(enr.user.external_id))
    if rg is not None and _analysis.is_stale(rg.validation_status, _rg_started_at(rg)):
        logger.info(
            "enrollment.analysis_stale_flip",
            enrollment=str(getattr(enr, "external_id", None)),
            kind="rg",
        )
        _finish_rg(
            enr,
            rg,
            _analysis.REVIEW,
            _analysis.stale_reason(),
            rg.validation_result or {},
        )
