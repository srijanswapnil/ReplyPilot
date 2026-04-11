import os
os.environ["PYTORCH_JIT"] = "0"

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import time

from dotenv import load_dotenv
load_dotenv()

from app.core.logging import setup_logging, get_logger


from app.api.v1.classify import router as classify_router
from app.api.v1.generate import router as generate_router

setup_logging()
logger = get_logger(__name__)


app = FastAPI(
    title       = "YT Comment AI Service",
    description = "Intent classification and reply generation for YouTube comments",
    version     = "1.0.0",
    docs_url    = "/docs",
    redoc_url   = "/redoc",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["http://localhost:5000","*"],
    allow_credentials = False,
    allow_methods     = ["POST", "GET"],
    allow_headers     = ["X-Internal-Key", "Content-Type"],
)


@app.middleware("http")
async def add_process_time(request: Request, call_next):
    start    = time.perf_counter()
    response = await call_next(request)
    elapsed  = (time.perf_counter() - start) * 1000   # ms
    response.headers["X-Process-Time-Ms"] = f"{elapsed:.1f}"
    logger.debug(f"{request.method} {request.url.path} → {response.status_code} ({elapsed:.1f}ms)")
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


app.include_router(classify_router, prefix="/api/v1", tags=["classify"])
app.include_router(generate_router, prefix="/api/v1", tags=["generate"])
