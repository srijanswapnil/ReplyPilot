"""
app/api/routes/health.py

GET  /health        — liveness probe  (no external calls, always fast)
GET  /health/ready  — readiness probe (checks Redis + Pinecone connectivity)

Convention:
  /health       → Docker / K8s liveness probe.
                  Returns 200 immediately if the process is alive.
  /health/ready → Load balancer / K8s readiness probe.
                  Returns 200 only if all dependencies are reachable.
                  Returns 503 if any dependency is down.
"""

import asyncio
import time
from typing import Literal

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()
router = APIRouter()

_START_TIME = time.time()


# ── Response models ───────────────────────────────────────────────────────────

class LivenessResponse(BaseModel):
    status: Literal["ok"]
    app: str
    version: str
    uptime_seconds: float


class DependencyStatus(BaseModel):
    status: Literal["ok", "error"]
    latency_ms: float | None = None
    error: str | None = None


class ReadinessResponse(BaseModel):
    status: Literal["ok", "degraded"]
    dependencies: dict[str, DependencyStatus]


# ── Dependency checkers ───────────────────────────────────────────────────────

async def _check_redis() -> DependencyStatus:
    """
    Sends a PING to Redis and measures round-trip latency.
    Uses a fresh connection (not the shared pool) so pool exhaustion
    cannot produce a false-healthy result.
    """
    import redis.asyncio as aioredis

    t0 = time.monotonic()
    try:
        client = aioredis.from_url(
            settings.redis_url,
            socket_connect_timeout=3,
            socket_timeout=3,
        )
        await client.ping()
        await client.aclose()
        return DependencyStatus(
            status="ok",
            latency_ms=round((time.monotonic() - t0) * 1000, 2),
        )
    except Exception as exc:
        logger.warning("Redis health check failed", error=str(exc))
        return DependencyStatus(
            status="error",
            latency_ms=round((time.monotonic() - t0) * 1000, 2),
            error=str(exc),
        )


async def _check_pinecone() -> DependencyStatus:
    """
    Calls describe_index on the configured Pinecone index.
    Confirms both connectivity and that the index actually exists.
    """
    t0 = time.monotonic()
    try:
        from pinecone import Pinecone

        pc = Pinecone(api_key=settings.PINECONE_API_KEY)
        # Run in thread — Pinecone SDK is synchronous
        await asyncio.get_event_loop().run_in_executor(
            None, lambda: pc.describe_index(settings.PINECONE_INDEX_NAME)
        )
        return DependencyStatus(
            status="ok",
            latency_ms=round((time.monotonic() - t0) * 1000, 2),
        )
    except Exception as exc:
        logger.warning("Pinecone health check failed", error=str(exc))
        return DependencyStatus(
            status="error",
            latency_ms=round((time.monotonic() - t0) * 1000, 2),
            error=str(exc),
        )


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get(
    "/health",
    response_model=LivenessResponse,
    summary="Liveness probe — is the process alive?",
)
async def liveness() -> LivenessResponse:
    return LivenessResponse(
        status="ok",
        app=settings.APP_NAME,
        version=settings.APP_VERSION,
        uptime_seconds=round(time.time() - _START_TIME, 1),
    )


@router.get(
    "/health/ready",
    response_model=ReadinessResponse,
    summary="Readiness probe — are all dependencies reachable?",
)
async def readiness() -> ReadinessResponse:
    redis_status, pinecone_status = await asyncio.gather(
        _check_redis(),
        _check_pinecone(),
    )

    dependencies = {"redis": redis_status, "pinecone": pinecone_status}
    all_ok = all(d.status == "ok" for d in dependencies.values())
    overall: Literal["ok", "degraded"] = "ok" if all_ok else "degraded"

    response = ReadinessResponse(status=overall, dependencies=dependencies)

    if not all_ok:
        logger.warning("Readiness check degraded", redis=redis_status.status, pinecone=pinecone_status.status)
        return JSONResponse(status_code=503, content=response.model_dump())

    return response