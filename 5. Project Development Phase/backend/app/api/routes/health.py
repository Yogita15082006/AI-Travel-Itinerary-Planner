from fastapi import APIRouter
from app.schemas.trip import HealthResponse
from app.core.config import settings

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Application health check.
    Returns configuration status for all external services.
    """
    return HealthResponse(
        status="ok",
        version="1.0.0",
        supabase_configured=settings.supabase_configured,
        ai_configured=settings.ai_configured,
        auth_configured=settings.auth_configured,
        environment=settings.environment,
    )
