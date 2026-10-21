"""
Itinerary Service — orchestrates trip generation, persistence, and retrieval.
"""
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from app.core.config import settings
from app.db.supabase_client import get_db
from app.schemas.trip import (
    GenerateTripRequest,
    RegenerateDayRequest,
    Trip,
    TripSummary,
    TripUpdate,
    ItineraryDay,
    ItineraryDayUpdate,
    TripStatus,
)
from app.services import ai_service, budget_service

logger = logging.getLogger(__name__)


def _serialize_days(days: List[ItineraryDay]) -> str:
    """Serialize itinerary days to JSON for storage."""
    return json.dumps([day.model_dump(mode="json") for day in days])


def _deserialize_days(days_json: str | list) -> List[ItineraryDay]:
    """Deserialize itinerary days from JSON storage."""
    if isinstance(days_json, str):
        days_data = json.loads(days_json)
    else:
        days_data = days_json or []
    return [ItineraryDay(**d) for d in days_data]


def _row_to_trip(row: dict) -> Trip:
    """Convert a Supabase row dict to a Trip schema."""
    days = _deserialize_days(row.get("days_json", []) or [])
    return Trip(
        id=row["id"],
        user_id=row["user_id"],
        title=row["title"],
        destination=row["destination"],
        departure_city=row.get("departure_city"),
        start_date=row["start_date"],
        end_date=row["end_date"],
        travelers=row["travelers"],
        total_budget=row["total_budget"],
        estimated_total_cost=row.get("estimated_total_cost"),
        currency=row.get("currency", "USD"),
        travel_style=row["travel_style"],
        interests=row.get("interests") or [],
        accommodation_preference=row.get("accommodation_preference"),
        dietary_preferences=row.get("dietary_preferences"),
        accessibility_requirements=row.get("accessibility_requirements"),
        daily_pace=row.get("daily_pace", "moderate"),
        additional_instructions=row.get("additional_instructions"),
        status=TripStatus(row.get("status", "active")),
        days=days,
        budget_breakdown=row.get("budget_breakdown"),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


async def generate_and_save_trip(
    request: GenerateTripRequest, user_id: str, user_token: Optional[str] = None
) -> Trip:
    """Generate an AI itinerary and persist it to Supabase."""
    title, estimated_cost, days = await ai_service.generate_itinerary(request)

    budget_breakdown = budget_service.calculate_budget(
        total_budget=request.total_budget,
        estimated_total_cost=estimated_cost,
        days=days,
        currency=request.currency,
        travelers=request.travelers,
    )

    trip_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    db = get_db(user_token)
    row = {
        "id": trip_id,
        "user_id": user_id,
        "title": title,
        "destination": request.destination,
        "departure_city": request.departure_city,
        "start_date": request.start_date.isoformat(),
        "end_date": request.end_date.isoformat(),
        "travelers": request.travelers,
        "total_budget": request.total_budget,
        "estimated_total_cost": estimated_cost,
        "currency": request.currency,
        "travel_style": request.travel_style.value,
        "interests": request.interests,
        "accommodation_preference": request.accommodation_preference,
        "dietary_preferences": request.dietary_preferences,
        "accessibility_requirements": request.accessibility_requirements,
        "daily_pace": request.daily_pace.value,
        "additional_instructions": request.additional_instructions,
        "status": TripStatus.ACTIVE.value,
        "days_json": json.dumps([d.model_dump(mode="json") for d in days]),
        "budget_breakdown": budget_breakdown.model_dump(mode="json"),
        "created_at": now,
        "updated_at": now,
    }

    result = db.table("trips").insert(row).execute()
    if not result.data:
        raise RuntimeError("Failed to save trip to database.")

    saved_row = result.data[0]
    return _row_to_trip(saved_row)


async def get_user_trips(
    user_id: str, page: int = 1, page_size: int = 20,
    user_token: Optional[str] = None
) -> tuple[List[TripSummary], int]:
    """Retrieve paginated list of trips for a user."""
    db = get_db(user_token)
    offset = (page - 1) * page_size

    count_result = (
        db.table("trips")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .execute()
    )
    total = count_result.count or 0

    result = (
        db.table("trips")
        .select(
            "id, title, destination, start_date, end_date, travelers, "
            "total_budget, estimated_total_cost, currency, travel_style, "
            "status, created_at"
        )
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .range(offset, offset + page_size - 1)
        .execute()
    )

    summaries = []
    for row in result.data or []:
        from datetime import date as date_type
        start = date_type.fromisoformat(row["start_date"])
        end = date_type.fromisoformat(row["end_date"])
        summaries.append(
            TripSummary(
                id=row["id"],
                title=row["title"],
                destination=row["destination"],
                start_date=start,
                end_date=end,
                travelers=row["travelers"],
                total_budget=row["total_budget"],
                estimated_total_cost=row.get("estimated_total_cost"),
                currency=row.get("currency", "USD"),
                travel_style=row["travel_style"],
                status=TripStatus(row.get("status", "active")),
                created_at=row["created_at"],
                num_days=(end - start).days + 1,
            )
        )
    return summaries, total


async def get_trip(
    trip_id: str, user_id: str, user_token: Optional[str] = None
) -> Optional[Trip]:
    """Retrieve a single trip, verifying ownership."""
    db = get_db(user_token)
    result = (
        db.table("trips")
        .select("*")
        .eq("id", trip_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        return None
    return _row_to_trip(result.data[0])


async def update_trip(
    trip_id: str, user_id: str, update: TripUpdate,
    user_token: Optional[str] = None
) -> Optional[Trip]:
    """Update a trip's metadata, verifying ownership."""
    db = get_db(user_token)
    update_data = update.model_dump(exclude_none=True, mode="json")
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = (
        db.table("trips")
        .update(update_data)
        .eq("id", trip_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        return None
    return _row_to_trip(result.data[0])


async def delete_trip(
    trip_id: str, user_id: str, user_token: Optional[str] = None
) -> bool:
    """Delete a trip, verifying ownership."""
    db = get_db(user_token)
    result = (
        db.table("trips")
        .delete()
        .eq("id", trip_id)
        .eq("user_id", user_id)
        .execute()
    )
    return bool(result.data)


async def update_day(
    trip_id: str,
    day_id: str,
    user_id: str,
    update: ItineraryDayUpdate,
    user_token: Optional[str] = None,
) -> Optional[Trip]:
    """Update a single day within a trip."""
    trip = await get_trip(trip_id, user_id, user_token)
    if not trip:
        return None

    updated_days = []
    found = False
    for day in trip.days:
        if day.id == day_id:
            found = True
            update_dict = update.model_dump(exclude_none=True)
            day_dict = day.model_dump()
            day_dict.update(update_dict)
            updated_days.append(ItineraryDay(**day_dict))
        else:
            updated_days.append(day)

    if not found:
        return None

    budget_breakdown = budget_service.calculate_budget(
        total_budget=trip.total_budget,
        estimated_total_cost=trip.estimated_total_cost,
        days=updated_days,
        currency=trip.currency,
        travelers=trip.travelers,
    )

    db = get_db(user_token)
    result = (
        db.table("trips")
        .update({
            "days_json": json.dumps([d.model_dump(mode="json") for d in updated_days]),
            "budget_breakdown": budget_breakdown.model_dump(mode="json"),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        .eq("id", trip_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        return None
    return _row_to_trip(result.data[0])


async def regenerate_trip_day(
    trip_id: str,
    day_id: str,
    user_id: str,
    request: RegenerateDayRequest,
    user_token: Optional[str] = None,
) -> Optional[Trip]:
    """Regenerate a single day using AI, preserving all other days."""
    trip = await get_trip(trip_id, user_id, user_token)
    if not trip:
        return None

    target_day = next((d for d in trip.days if d.id == day_id), None)
    if not target_day:
        return None

    trip_dict = {
        "id": trip.id,
        "destination": trip.destination,
        "travel_style": trip.travel_style,
        "total_budget": trip.total_budget,
        "currency": trip.currency,
        "travelers": trip.travelers,
        "daily_pace": trip.daily_pace,
    }

    new_day = await ai_service.regenerate_day(request, trip_dict, target_day)
    new_day.id = target_day.id  # preserve original day ID

    updated_days = [new_day if d.id == day_id else d for d in trip.days]

    budget_breakdown = budget_service.calculate_budget(
        total_budget=trip.total_budget,
        estimated_total_cost=trip.estimated_total_cost,
        days=updated_days,
        currency=trip.currency,
        travelers=trip.travelers,
    )

    db = get_db(user_token)
    result = (
        db.table("trips")
        .update({
            "days_json": json.dumps([d.model_dump(mode="json") for d in updated_days]),
            "budget_breakdown": budget_breakdown.model_dump(mode="json"),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        .eq("id", trip_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        return None
    return _row_to_trip(result.data[0])
