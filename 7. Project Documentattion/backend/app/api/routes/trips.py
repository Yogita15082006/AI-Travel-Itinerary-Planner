import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.config import settings
from app.core.security import get_current_user
from app.schemas.trip import (
    BudgetBreakdown,
    GenerateTripRequest,
    RegenerateDayRequest,
    Trip,
    TripListResponse,
    TripUpdate,
    ItineraryDayUpdate,
)
from app.services import itinerary_service, budget_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/trips", tags=["trips"])


@router.post("/generate", response_model=Trip, status_code=status.HTTP_201_CREATED)
async def generate_trip(
    request: GenerateTripRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Generate a new AI-powered travel itinerary and save it.
    Requires authentication.
    """
    if not settings.ai_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "AI service is not configured. "
                "Please set GROQ_API_KEY in the backend environment. "
                "Get a free key at https://console.groq.com/"
            ),
        )
    if not settings.supabase_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY.",
        )

    try:
        trip = await itinerary_service.generate_and_save_trip(
            request, current_user["id"], user_token=current_user.get("token")
        )
        return trip
    except RuntimeError as e:
        logger.error("Trip generation failed for user %s: %s", current_user["id"], str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
    except Exception as e:
        logger.exception("Unexpected error during trip generation: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during itinerary generation. Please try again.",
        )


@router.get("", response_model=TripListResponse)
async def list_trips(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    """List all trips for the authenticated user (paginated)."""
    trips, total = await itinerary_service.get_user_trips(
        current_user["id"], page=page, page_size=page_size,
        user_token=current_user.get("token")
    )
    return TripListResponse(trips=trips, total=total, page=page, page_size=page_size)


@router.get("/{trip_id}", response_model=Trip)
async def get_trip(
    trip_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get a specific trip by ID. Users can only access their own trips."""
    trip = await itinerary_service.get_trip(
        trip_id, current_user["id"], user_token=current_user.get("token")
    )
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found or you do not have access to it.",
        )
    return trip


@router.patch("/{trip_id}", response_model=Trip)
async def update_trip(
    trip_id: str,
    update: TripUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update a trip's metadata."""
    trip = await itinerary_service.update_trip(
        trip_id, current_user["id"], update,
        user_token=current_user.get("token")
    )
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found or you do not have access to it.",
        )
    return trip


@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trip(
    trip_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a trip."""
    deleted = await itinerary_service.delete_trip(
        trip_id, current_user["id"], user_token=current_user.get("token")
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found or you do not have access to it.",
        )


@router.patch("/{trip_id}/days/{day_id}", response_model=Trip)
async def update_day(
    trip_id: str,
    day_id: str,
    update: ItineraryDayUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update a specific day in a trip's itinerary."""
    trip = await itinerary_service.update_day(
        trip_id, day_id, current_user["id"], update,
        user_token=current_user.get("token")
    )
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip or day not found, or you do not have access.",
        )
    return trip


@router.post("/{trip_id}/days/{day_id}/regenerate", response_model=Trip)
async def regenerate_day(
    trip_id: str,
    day_id: str,
    request: RegenerateDayRequest,
    current_user: dict = Depends(get_current_user),
):
    """Regenerate a single itinerary day using AI, keeping all other days intact."""
    if not settings.ai_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is not configured. Please set GROQ_API_KEY.",
        )
    try:
        trip = await itinerary_service.regenerate_trip_day(
            trip_id, day_id, current_user["id"], request,
            user_token=current_user.get("token")
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip or day not found, or you do not have access.",
        )
    return trip


@router.get("/{trip_id}/budget", response_model=BudgetBreakdown)
async def get_budget(
    trip_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get budget breakdown for a trip."""
    trip = await itinerary_service.get_trip(
        trip_id, current_user["id"], user_token=current_user.get("token")
    )
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found or you do not have access.",
        )
    breakdown = budget_service.calculate_budget(
        total_budget=trip.total_budget,
        estimated_total_cost=trip.estimated_total_cost,
        days=trip.days,
        currency=trip.currency,
        travelers=trip.travelers,
    )
    return breakdown
