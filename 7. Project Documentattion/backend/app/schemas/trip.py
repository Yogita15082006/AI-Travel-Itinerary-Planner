from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator
from enum import Enum
import uuid


# ============================================================
# Enums
# ============================================================

class TravelStyle(str, Enum):
    BUDGET = "budget"
    BALANCED = "balanced"
    LUXURY = "luxury"
    ADVENTURE = "adventure"
    RELAXED = "relaxed"
    CULTURAL = "cultural"
    ROMANTIC = "romantic"


class ActivityCategory(str, Enum):
    SIGHTSEEING = "sightseeing"
    FOOD = "food"
    NATURE = "nature"
    HISTORY = "history"
    SHOPPING = "shopping"
    NIGHTLIFE = "nightlife"
    ADVENTURE = "adventure"
    BEACH = "beach"
    CULTURE = "culture"
    TRANSPORT = "transport"
    ACCOMMODATION = "accommodation"
    OTHER = "other"


class TripStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class DailyPace(str, Enum):
    SLOW = "slow"
    MODERATE = "moderate"
    FAST = "fast"


class Currency(str, Enum):
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    INR = "INR"
    JPY = "JPY"
    AUD = "AUD"
    CAD = "CAD"
    SGD = "SGD"
    AED = "AED"
    THB = "THB"


# ============================================================
# Activity Schemas
# ============================================================

class ActivityBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    category: ActivityCategory = ActivityCategory.OTHER
    description: str = Field(..., min_length=1, max_length=2000)
    suggested_start_time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    suggested_end_time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    estimated_cost: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = Field(None, max_length=3)
    location_name: Optional[str] = Field(None, max_length=300)
    address: Optional[str] = Field(None, max_length=500)
    transportation_to_next: Optional[str] = Field(None, max_length=500)
    practical_tips: Optional[str] = Field(None, max_length=1000)
    booking_url: Optional[str] = Field(None, max_length=500)
    source_url: Optional[str] = Field(None, max_length=500)


class ActivityCreate(ActivityBase):
    pass


class Activity(ActivityBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

    class Config:
        from_attributes = True


# ============================================================
# Itinerary Day Schemas
# ============================================================

class ItineraryDayBase(BaseModel):
    day_number: int = Field(..., ge=1)
    date: date
    title: str = Field(..., min_length=1, max_length=200)
    summary: str = Field(..., min_length=1, max_length=1000)
    estimated_day_cost: Optional[float] = Field(None, ge=0)
    activities: List[Activity] = Field(default_factory=list)
    accommodation_suggestion: Optional[str] = Field(None, max_length=500)
    dining_recommendations: Optional[List[str]] = Field(None)
    transportation_notes: Optional[str] = Field(None, max_length=500)


class ItineraryDayCreate(ItineraryDayBase):
    pass


class ItineraryDay(ItineraryDayBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

    class Config:
        from_attributes = True


class ItineraryDayUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    summary: Optional[str] = Field(None, min_length=1, max_length=1000)
    activities: Optional[List[Activity]] = None
    accommodation_suggestion: Optional[str] = None
    dining_recommendations: Optional[List[str]] = None
    transportation_notes: Optional[str] = None


# ============================================================
# Trip Schemas
# ============================================================

class TripCreate(BaseModel):
    destination: str = Field(..., min_length=2, max_length=200)
    departure_city: Optional[str] = Field(None, max_length=200)
    start_date: date
    end_date: date
    travelers: int = Field(..., ge=1, le=50)
    total_budget: float = Field(..., ge=0)
    currency: str = Field(default="USD", max_length=3)
    travel_style: TravelStyle = TravelStyle.BALANCED
    interests: List[str] = Field(default_factory=list)
    accommodation_preference: Optional[str] = Field(None, max_length=200)
    dietary_preferences: Optional[str] = Field(None, max_length=500)
    accessibility_requirements: Optional[str] = Field(None, max_length=500)
    daily_pace: DailyPace = DailyPace.MODERATE
    additional_instructions: Optional[str] = Field(None, max_length=1000)

    @field_validator("end_date")
    @classmethod
    def end_date_must_be_after_start(cls, v, info):
        if info.data.get("start_date") and v < info.data["start_date"]:
            raise ValueError("end_date must be on or after start_date")
        return v

    @field_validator("interests")
    @classmethod
    def validate_interests(cls, v):
        allowed = {
            "food", "sightseeing", "nature", "history", "shopping",
            "nightlife", "adventure", "beaches", "culture", "art",
            "sports", "wellness", "photography", "architecture", "music"
        }
        for interest in v:
            if interest.lower() not in allowed:
                raise ValueError(f"Invalid interest: {interest}")
        return [i.lower() for i in v]

    @property
    def num_days(self) -> int:
        return (self.end_date - self.start_date).days + 1


class TripUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    status: Optional[TripStatus] = None
    total_budget: Optional[float] = Field(None, ge=0)
    additional_instructions: Optional[str] = Field(None, max_length=1000)


class TripSummary(BaseModel):
    """Lightweight trip representation for list views."""
    id: str
    title: str
    destination: str
    start_date: date
    end_date: date
    travelers: int
    total_budget: float
    estimated_total_cost: Optional[float]
    currency: str
    travel_style: str
    status: TripStatus
    created_at: datetime
    num_days: int

    class Config:
        from_attributes = True


class Trip(BaseModel):
    id: str
    user_id: str
    title: str
    destination: str
    departure_city: Optional[str]
    start_date: date
    end_date: date
    travelers: int
    total_budget: float
    estimated_total_cost: Optional[float]
    currency: str
    travel_style: str
    interests: List[str]
    accommodation_preference: Optional[str]
    dietary_preferences: Optional[str]
    accessibility_requirements: Optional[str]
    daily_pace: str
    additional_instructions: Optional[str]
    status: TripStatus
    days: List[ItineraryDay] = Field(default_factory=list)
    budget_breakdown: Optional[dict] = None
    created_at: datetime
    updated_at: datetime

    @property
    def num_days(self) -> int:
        return (self.end_date - self.start_date).days + 1

    class Config:
        from_attributes = True


# ============================================================
# Request / Response Schemas
# ============================================================

class GenerateTripRequest(TripCreate):
    """Request body for AI trip generation."""
    pass


class RegenerateDayRequest(BaseModel):
    """Request to regenerate a single itinerary day."""
    additional_instructions: Optional[str] = Field(None, max_length=500)
    keep_accommodation: bool = True


class BudgetBreakdown(BaseModel):
    total_budget: float
    estimated_total_cost: Optional[float]
    estimated_daily_costs: List[dict]
    activity_total: Optional[float]
    accommodation_total: Optional[float]
    transportation_total: Optional[float]
    dining_total: Optional[float]
    miscellaneous_total: Optional[float]
    currency: str
    is_within_budget: Optional[bool]
    budget_utilization_percent: Optional[float]
    missing_cost_estimates: int
    notes: List[str]


class TripListResponse(BaseModel):
    trips: List[TripSummary]
    total: int
    page: int
    page_size: int


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    code: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    version: str
    supabase_configured: bool
    ai_configured: bool
    auth_configured: bool
    environment: str
