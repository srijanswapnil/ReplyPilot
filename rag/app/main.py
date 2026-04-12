"""
app/main.py — FastAPI application factory.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.middleware.error_handler import register_error_handlers
from app.api.routes import health, ingest, query
from app.core.config import get_settings
from app.core.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic."""
    logger.info("Starting YT-RAG API", env=settings.APP_ENV, version=settings.APP_VERSION)
    yield
    logger.info("Shutting down YT-RAG API")


def create_app() -> FastAPI:
    app = FastAPI(
        title="YT-RAG API",
        version=settings.APP_VERSION,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url=None,
        lifespan=lifespan,
    )

    # ── Middleware ─────────────────────────────────────────────────────────────
    register_error_handlers(app)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if not settings.is_production else [],
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    # ── Routes ────────────────────────────────────────────────────────────────
    app.include_router(health.router, tags=["Health"])
    app.include_router(ingest.router, prefix="/api/v1", tags=["Ingest"])
    app.include_router(query.router, prefix="/api/v1", tags=["Query"])

    return app


app = create_app()