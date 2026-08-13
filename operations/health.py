"""Safe, read-only health and readiness checks.

The public report deliberately exposes only stable detail codes and aggregate
counts. It never includes exception messages, endpoints, paths, credentials,
account identifiers, or instance names.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
import os
from pathlib import Path
import tempfile
from types import MappingProxyType
from typing import Any, Mapping, Protocol
from urllib.parse import quote, urlparse

import httpx
from django.conf import settings
from django.db import connections


class Status(StrEnum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    DISCONNECTED = "disconnected"
    MISCONFIGURED = "misconfigured"


@dataclass(frozen=True, slots=True)
class CheckResult:
    status: Status
    detail: str
    metadata: Mapping[str, int | bool] = MappingProxyType({})

    def __post_init__(self) -> None:
        object.__setattr__(self, "metadata", MappingProxyType(dict(self.metadata)))


@dataclass(frozen=True, slots=True)
class HealthReport:
    status: Status
    checks: Mapping[str, CheckResult]


class HealthProbes(Protocol):
    def run(self, component: str) -> CheckResult: ...


COMPONENTS = (
    "database",
    "django_q",
    "evolution_v2",
    "evolution_go",
    "smtp",
    "tts",
    "storage",
)

_PRIORITY = {
    Status.HEALTHY: 0,
    Status.DEGRADED: 1,
    Status.DISCONNECTED: 2,
    Status.MISCONFIGURED: 3,
}

_CONNECTED_STATES = {"connected", "open", "online", "ready", "working"}


class SystemHealthProbes:
    """Read-only probes for dependencies used by the notification pipeline."""

    def __init__(
        self,
        *,
        http_transport: httpx.BaseTransport | None = None,
        http_timeout: float = 3.0,
    ) -> None:
        self._http_transport = http_transport
        self._http_timeout = http_timeout

    def run(self, component: str) -> CheckResult:
        probe = getattr(self, f"_check_{component}", None)
        if component not in COMPONENTS or probe is None:
            raise ValueError(f"unknown health component: {component}")
        return probe()

    def _check_database(self) -> CheckResult:
        try:
            with connections["default"].cursor() as cursor:
                cursor.execute("SELECT 1")
                row = cursor.fetchone()
        except Exception:
            return CheckResult(Status.DISCONNECTED, "query_failed")
        if row != (1,):
            return CheckResult(Status.DEGRADED, "unexpected_query_result")
        return CheckResult(Status.HEALTHY, "query_succeeded")

    def _check_django_q(self) -> CheckResult:
        if not getattr(settings, "Q_CLUSTER", None):
            return CheckResult(Status.MISCONFIGURED, "not_configured")
        try:
            from django_q.brokers import get_broker

            broker = get_broker()
            if broker.ping() is not True:
                return CheckResult(Status.DISCONNECTED, "broker_unreachable")
            queued = broker.queue_size()
            locked = broker.lock_size()
        except Exception:
            return CheckResult(Status.DISCONNECTED, "broker_unreachable")
        return CheckResult(
            Status.HEALTHY,
            "broker_ready",
            {"queued": queued, "in_progress": locked},
        )

    def _check_evolution_v2(self) -> CheckResult:
        base_url = str(getattr(settings, "WHATSAPP_API_BASE_URL", "")).strip()
        api_key = str(getattr(settings, "WHATSAPP_GLOBAL_API_KEY", "")).strip()
        if not _valid_http_url(base_url) or not api_key:
            return CheckResult(Status.MISCONFIGURED, "not_configured")

        try:
            from channels.models import WhatsAppNumber

            instance_names = tuple(
                WhatsAppNumber.objects.values_list("instance_name", flat=True).distinct()
            )
        except Exception:
            return CheckResult(Status.DISCONNECTED, "configuration_unavailable")
        if not instance_names:
            return CheckResult(Status.MISCONFIGURED, "no_instances")

        connected = 0
        with self._client(base_url, api_key) as client:
            for instance_name in instance_names:
                try:
                    response = client.get(
                        f"/instance/connectionState/{quote(instance_name, safe='')}"
                    )
                    response.raise_for_status()
                    states = _collect_states(response.json())
                    connected += int(any(state in _CONNECTED_STATES for state in states))
                except Exception:
                    continue
        return _connection_result(connected, len(instance_names))

    def _check_evolution_go(self) -> CheckResult:
        base_url = str(getattr(settings, "EVOLUTION_GO_BASE_URL", "")).strip()
        api_key = str(getattr(settings, "EVOLUTION_GO_API_KEY", "")).strip()
        if not _valid_http_url(base_url) or not api_key:
            return CheckResult(Status.MISCONFIGURED, "not_configured")
        try:
            with self._client(base_url, api_key) as client:
                response = client.get("/instance/status")
                response.raise_for_status()
                states = _collect_states(response.json())
        except Exception:
            return CheckResult(Status.DISCONNECTED, "unreachable")
        if not states:
            return CheckResult(Status.DEGRADED, "unexpected_response")
        connected = sum(state in _CONNECTED_STATES for state in states)
        return _connection_result(connected, len(states))

    def _check_smtp(self) -> CheckResult:
        try:
            from channels.models import MailIdentity

            identities = MailIdentity.objects.values(
                "smtp_host",
                "smtp_port",
                "smtp_user",
                "smtp_password",
                "from_email",
            )
            total = 0
            configured = 0
            for identity in identities.iterator():
                total += 1
                configured += int(
                    bool(identity["smtp_host"].strip())
                    and 0 < identity["smtp_port"] <= 65535
                    and bool(identity["smtp_user"].strip())
                    and bool(identity["smtp_password"].strip())
                    and bool(identity["from_email"].strip())
                )
        except Exception:
            return CheckResult(Status.DISCONNECTED, "configuration_unavailable")
        invalid = total - configured
        metadata = {"configured": configured, "invalid": invalid}
        if configured == 0:
            return CheckResult(Status.MISCONFIGURED, "not_configured", metadata)
        if invalid:
            return CheckResult(Status.DEGRADED, "partially_configured", metadata)
        return CheckResult(Status.HEALTHY, "configured", metadata)

    def _check_tts(self) -> CheckResult:
        base_url = str(getattr(settings, "OMNIROUTER_URL", "")).strip()
        if not _valid_http_url(base_url):
            return CheckResult(Status.MISCONFIGURED, "not_configured")
        return CheckResult(
            Status.HEALTHY,
            "configured",
            {"authentication_configured": bool(getattr(settings, "OMNIROUTER_API_KEY", ""))},
        )

    def _check_storage(self) -> CheckResult:
        media_root = Path(str(getattr(settings, "MEDIA_ROOT", "")))
        if not str(media_root) or not media_root.is_dir():
            return CheckResult(Status.MISCONFIGURED, "directory_missing")
        try:
            with tempfile.NamedTemporaryFile(
                mode="wb",
                prefix=".health-",
                dir=media_root,
                delete=True,
            ) as probe_file:
                probe_file.write(b"ready")
                probe_file.flush()
                os.fsync(probe_file.fileno())
        except OSError:
            return CheckResult(Status.DISCONNECTED, "not_writable")
        return CheckResult(Status.HEALTHY, "writable")

    def _client(self, base_url: str, api_key: str) -> httpx.Client:
        return httpx.Client(
            base_url=base_url.rstrip("/"),
            headers={"apikey": api_key},
            timeout=self._http_timeout,
            transport=self._http_transport,
        )


def _valid_http_url(value: str) -> bool:
    parsed = urlparse(value)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def _collect_states(value: Any) -> tuple[str, ...]:
    states: list[str] = []
    if isinstance(value, Mapping):
        for key, item in value.items():
            if key.casefold() in {"state", "status", "connectionstatus"} and isinstance(item, str):
                states.append(item.casefold())
            else:
                states.extend(_collect_states(item))
    elif isinstance(value, list):
        for item in value:
            states.extend(_collect_states(item))
    return tuple(states)


def _connection_result(connected: int, total: int) -> CheckResult:
    metadata = {"connected": connected, "total": total}
    if connected == total:
        return CheckResult(Status.HEALTHY, "connected", metadata)
    if connected:
        return CheckResult(Status.DEGRADED, "partially_connected", metadata)
    return CheckResult(Status.DISCONNECTED, "disconnected", metadata)


def check_readiness(probes: HealthProbes | None = None) -> HealthReport:
    """Run every component probe and return an immutable readiness snapshot."""
    probes = probes or SystemHealthProbes()
    checked: dict[str, CheckResult] = {}
    for component in COMPONENTS:
        try:
            checked[component] = probes.run(component)
        except Exception:
            checked[component] = CheckResult(Status.DISCONNECTED, "probe_failed")

    overall = max(
        (result.status for result in checked.values()),
        key=_PRIORITY.__getitem__,
    )
    return HealthReport(overall, MappingProxyType(checked.copy()))
