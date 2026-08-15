"""Health check endpoints — público /healthz + rotas de staff health (adicionadas ao grupo staff)."""

from __future__ import annotations

import os
import time

import httpx
from django.conf import settings
from django.db import connections
from ninja import Router

from api.auth import JWTAuth, require_superuser
from api.base import build_group

# ── público: grupo health (auth=None) ──

health_api = build_group(
    "health", "Health check público — sem autenticação.", auth_override=None
)


@health_api.get("/healthz")
def healthz(request):
    """Health check público — sem auth. DB ping + migrations pendentes + build info."""
    db_ok = False
    try:
        with connections["default"].cursor() as c:
            c.execute("SELECT 1")
        db_ok = True
    except Exception:
        pass

    pending = _pending_migrations()

    sha = None
    build_file = settings.BASE_DIR / "build.txt"
    if build_file.exists():
        sha = build_file.read_text().strip()

    return {
        "status": "ok" if db_ok else "degraded",
        "db": db_ok,
        "migrations_pending": pending,
        "sha": sha,
        "built_at": None,
    }


# ── staff health: router adicionado ao grupo staff existente (ponytail: reusa build_group) ──

staff_health_router = Router(tags=["staff-health"])


def _ping(url: str, timeout: float = 5.0) -> dict:
    try:
        r = httpx.get(url, timeout=timeout)
        return {
            "ok": r.status_code < 500,
            "status": r.status_code,
            "ms": round(r.elapsed.total_seconds() * 1000),
        }
    except Exception as e:
        return {"ok": False, "error": str(e)[:120]}


# Path `/health/full` (não `/health`): `GET /api/v1/<grupo>/health` é liveness PÚBLICA em todo grupo
# (build_group, contrato do front — wiki/api/ninja.md). Registrar os pings autenticados em `/health`
# os deixava SOMBREADOS pelo esqueleto público (o Ninja resolve o 1º registrado), então o gate
# require_superuser nunca era alcançado. `/health/full` não colide.
@staff_health_router.get("/health/full", auth=JWTAuth())
def staff_health(request):
    require_superuser(request.auth)
    return {
        "db": _ping_db(),
        "asaas": _ping(settings.ASAAS_BASE_URL + "/status")
        if settings.ASAAS_BASE_URL
        else {"ok": None, "note": "não configurado"},
        "infinitepay": _ping("https://api.checkout.infinitepay.io/")
        if settings.INFINITEPAY_HANDLE
        else {"ok": None, "note": "não configurado"},
        "omniroute": _ping(
            getattr(settings, "IA_OMNIROUTE_BASE_URL", "") + "/v1/models"
        )
        if getattr(settings, "IA_OMNIROUTE_BASE_URL", "")
        else {"ok": None, "note": "não configurado"},
        "notify": _ping(settings.NOTIFY_SERVER_URL.rstrip("/") + "/v1/ready")
        if settings.NOTIFY_SERVER_URL
        else {"ok": None, "note": "não configurado"},
        "migrations_pending": _pending_migrations(),
        "deploy": _deploy_info(),
    }


@staff_health_router.post("/health/run-tests", auth=JWTAuth())
def run_tests(request):
    require_superuser(request.auth)
    token = os.environ.get("GH_PAT") or os.environ.get("GITHUB_TOKEN")
    if not token:
        return {"ok": False, "error": "GITHUB_TOKEN não configurado no .env"}
    repo = os.environ.get("GITHUB_REPOSITORY", "maestri33/backend-supletivo")
    try:
        r = httpx.post(
            f"https://api.github.com/repos/{repo}/actions/workflows/ci.yml/dispatches",
            json={"ref": "main"},
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
            },
            timeout=10,
        )
        return {"ok": r.status_code == 204, "status": r.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)[:120]}


def _ping_db() -> dict:
    try:
        t0 = time.monotonic()
        with connections["default"].cursor() as c:
            c.execute("SELECT 1")
        return {"ok": True, "ms": round((time.monotonic() - t0) * 1000)}
    except Exception as e:
        return {"ok": False, "error": str(e)[:120]}


def _pending_migrations() -> int:
    """Nº de migrations não aplicadas, IN-PROCESS via MigrationExecutor (sem subprocess/fork — o
    fork rodava o boot inteiro do Django a cada GET público de /healthz → vetor de DoS). -1 em erro."""
    try:
        from django.db.migrations.executor import MigrationExecutor

        executor = MigrationExecutor(connections["default"])
        targets = executor.loader.graph.leaf_nodes()
        return len(executor.migration_plan(targets))
    except Exception:
        return -1


def _deploy_info() -> dict:
    build_file = settings.BASE_DIR / "build.txt"
    sha = build_file.read_text().strip() if build_file.exists() else None
    return {"sha": sha, "built_at": None}
