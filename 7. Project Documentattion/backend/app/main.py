"""
FastAPI application entry point.
"""
import logging
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

# CORS — allow only the configured frontend origin in production
allowed_origins = [settings.frontend_origin]
if not settings.is_production:
    # Allow localhost variants in development
    allowed_origins += [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
