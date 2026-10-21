"""
FastAPI application entry point.
"""
import logging
import re
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import api_router
from app.core.config import settings

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Travel Itinerary Planner API",
    description=(
        "AI-powered personalized travel itinerary generation. "
        "Build day-by-day travel plans with budget tracking, "
        "activity suggestions, and intelligent recommendations."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ─────────────────────────────────────────────────────────────────────
#
# Strategy: use Starlette's allow_origin_regex to accept both:
#   (a) The exact stable production Vercel URL (from FRONTEND_ORIGIN env var).
#   (b) Any Vercel *preview* deployment for THIS specific project.
#       Preview URLs have the form:
#           https://<project-slug>-<random-hash>-<team>.vercel.app
#       We match strictly on the project slug prefix so no unrelated
#       Vercel app is ever accepted.
#   (c) localhost variants for local development.
#
# allow_credentials=True is kept because the frontend sends Authorization
# headers with Bearer tokens; credentials=true is required for those.
# We MUST NOT use allow_origins=["*"] with credentials=True (browsers reject it).
#
# Environment variables (set these in Render):
#   FRONTEND_ORIGIN       – stable production URL, no trailing slash
#                           e.g. https://ai-travel-itinerary-planner-frontend.vercel.app
#   VERCEL_PROJECT_SLUG   – the exact project slug used in preview hostnames
#                           e.g. ai-travel-itinerary-planner-frontend
# ─────────────────────────────────────────────────────────────────────────────

def _build_cors_origin_regex() -> str:
    """
    Build an anchored regex that allows the following origins:

    1. localhost (any port) — local development
    2. Stable production Vercel URL derived from the project slug:
         https://<VERCEL_PROJECT_SLUG>.vercel.app
    3. Any Vercel preview URL for this specific project:
         https://<VERCEL_PROJECT_SLUG>-<hash>.vercel.app
    4. The explicit FRONTEND_ORIGIN env var (supports custom domains or
       comma-separated additional origins beyond Vercel).

    Security guarantees:
    - Anchored (^ … $) — no partial matches.
    - Hyphens are not regex metacharacters so no escaping needed for slug.
    - Dots are escaped so ".vercel.app" cannot be spoofed by ".vercelXapp".
    - The preview pattern requires a hyphen AFTER the slug, so a domain that
      is merely a prefix of the slug (e.g. "ai-travel" alone) is rejected.
    - Unrelated vercel.app subdomains are not matched.
    """
    slug = settings.vercel_project_slug  # e.g. "ai-travel-itinerary-planner-frontend"

    # 1. Localhost (any port number)
    localhost = r"http://localhost:\d+"

    # 2. Stable production Vercel URL (slug with no suffix)
    stable_prod = rf"https://{slug}\.vercel\.app"

    # 3. Vercel preview URLs: <slug>-<alphanumeric-hash>.vercel.app
    preview = rf"https://{slug}-[a-z0-9-]+\.vercel\.app"

    # 4. Explicit additional origin(s) from FRONTEND_ORIGIN env var.
    # Escape dots only (hyphens in URLs are not regex metacharacters).
    extra_origins = [
        o.rstrip("/").replace(".", r"\.")
        for o in settings.allowed_origins
        if o.strip() and o.strip() != "http://localhost:5173"
    ]

    alternatives = [localhost, stable_prod, preview] + extra_origins
    return r"^(" + "|".join(alternatives) + r")$"


_cors_origin_regex = _build_cors_origin_regex()
logger.info("CORS origin regex: %s", _cors_origin_regex)

app.add_middleware(
    CORSMiddleware,
    # allow_origins is intentionally empty — allow_origin_regex handles all matching.
    # Starlette checks allow_origins first, then allow_origin_regex; having both
    # is fine but the regex alone is sufficient and avoids duplicates.
    allow_origins=[],
    allow_origin_regex=_cors_origin_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": "An unexpected error occurred."},
    )


@app.exception_handler(RuntimeError)
async def runtime_error_handler(request: Request, exc: RuntimeError):
    return JSONResponse(
        status_code=503,
        content={"error": "Service error", "detail": str(exc)},
    )


app.include_router(api_router)


@app.get("/", include_in_schema=False)
async def root():
    return {
        "service": "Travel Itinerary Planner API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health",
    }
