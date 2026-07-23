"""Gobron API — FastAPI application entrypoint.

Wires CORS, the versioned router and a health check. Models are imported (via
app.models) so their metadata is registered; schema changes are applied with
Alembic, not create_all.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import app.models  # noqa: F401,F811 — side-effect import: registers SQLAlchemy mappers
_ = app.models  # prevent pyflakes "redefinition of unused 'app'" false-positive
from app.api.v1.router import api_router
from app.core.config import settings

_docs = f"{settings.API_V1_PREFIX}/docs" if settings.DEBUG else None
_redoc = f"{settings.API_V1_PREFIX}/redoc" if settings.DEBUG else None
_openapi = f"{settings.API_V1_PREFIX}/openapi.json" if settings.DEBUG else None

app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
    docs_url=_docs,
    redoc_url=_redoc,
    openapi_url=_openapi,
)

# Bearer JWT in Authorization header — no cookies, so credentials=False is fine
# with allow_origins=["*"].
_origins = settings.CORS_ORIGINS
_allow_all = len(_origins) == 1 and _origins[0] == "*"
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if _allow_all else _origins,
    allow_credentials=not _allow_all,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)
app.mount("/uploads", StaticFiles(directory="uploads", check_dir=False), name="uploads")


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "app": settings.APP_NAME, "env": settings.ENVIRONMENT}
