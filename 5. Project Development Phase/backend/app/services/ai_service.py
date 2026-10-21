"""
AI Service — Groq integration for itinerary generation.

All AI provider calls are made server-side. The Groq API key is never
exposed to the frontend.
"""
import json
import logging
import re
from datetime import date, timedelta
from typing import List, Optional

from groq import Groq, APITimeoutError, APIConnectionError, RateLimitError, APIStatusError
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log,
)

from app.core.config import settings
from app.schemas.trip import (
    Activity,
    ActivityCategory,
    ItineraryDay,
    TripCreate,
    GenerateTripRequest,
    RegenerateDayRequest,
)

logger = logging.getLogger(__name__)

# Retryable Groq exceptions
RETRYABLE_EXCEPTIONS = (APITimeoutError, APIConnectionError, RateLimitError)


def _get_groq_client() -> Groq:
    if not settings.ai_configured:
        raise RuntimeError(
            "Groq AI is not configured. Please set GROQ_API_KEY in your .env file. "
            "Get a free API key at https://console.groq.com/"
        )
    return Groq(api_key=settings.groq_api_key, timeout=settings.ai_request_timeout)


def _build_itinerary_prompt(request: GenerateTripRequest) -> str:
    num_days = (request.end_date - request.start_date).days + 1
    interests_str = ", ".join(request.interests) if request.interests else "general sightseeing"

    prompt = f"""You are an expert travel planner. Generate a detailed, realistic, day-by-day travel itinerary.

TRIP DETAILS:
- Destination: {request.destination}
- Departure City: {request.departure_city or 'Not specified'}
- Start Date: {request.start_date.isoformat()}
- End Date: {request.end_date.isoformat()}
- Number of Days: {num_days}
- Number of Travelers: {request.travelers}
- Total Budget: {request.total_budget} {request.currency} (for all travelers)
- Travel Style: {request.travel_style.value}
- Interests: {interests_str}
- Accommodation Preference: {request.accommodation_preference or 'Flexible'}
- Dietary Preferences: {request.dietary_preferences or 'None specified'}
- Accessibility Requirements: {request.accessibility_requirements or 'None'}
- Daily Pace: {request.daily_pace.value}
- Additional Instructions: {request.additional_instructions or 'None'}

IMPORTANT ACCURACY RULES:
1. All cost estimates are approximate — clearly reflect this in descriptions.
2. Do NOT invent specific booking URLs, exact ticket prices, or verified hours.
3. Include 3-5 activities per day based on the {request.daily_pace.value} pace preference.
4. Activities must not overlap in time.
5. Respect the budget style ({request.travel_style.value}) when suggesting venues.
6. Include local dining recommendations for each day.
7. Transportation guidance between major activities where relevant.
8. For {request.travelers} traveler(s), costs should reflect group totals where noted.

Return ONLY valid JSON matching this exact structure (no markdown, no extra text):

{{
  "title": "string (catchy trip title)",
  "estimated_total_cost": number (total estimated cost in {request.currency}),
  "days": [
    {{
      "day_number": 1,
      "date": "YYYY-MM-DD",
      "title": "string",
      "summary": "string (2-3 sentences overview of the day)",
      "estimated_day_cost": number,
      "accommodation_suggestion": "string (hotel/hostel name and type, with price range estimate)",
      "dining_recommendations": ["string", "string"],
      "transportation_notes": "string",
      "activities": [
        {{
          "id": "unique-string-id",
          "name": "string",
          "category": "sightseeing|food|nature|history|shopping|nightlife|adventure|beach|culture|transport|other",
          "description": "string (detailed, practical description)",
          "suggested_start_time": "HH:MM",
          "suggested_end_time": "HH:MM",
          "estimated_cost": number (per person in {request.currency}, or null if free/variable),
          "currency": "{request.currency}",
          "location_name": "string",
          "address": "string or null",
          "transportation_to_next": "string (how to get to next activity)",
          "practical_tips": "string (booking advice, best time to visit, etc.)",
          "booking_url": null,
          "source_url": null
        }}
      ]
    }}
  ]
}}

Generate exactly {num_days} days starting from {request.start_date.isoformat()}.
"""
    return prompt


def _build_day_regeneration_prompt(
    request: RegenerateDayRequest,
    trip: dict,
    day: ItineraryDay,
) -> str:
    prompt = f"""You are an expert travel planner. Regenerate ONLY day {day.day_number} of an existing itinerary.

TRIP CONTEXT:
- Destination: {trip['destination']}
- Travel Style: {trip['travel_style']}
- Budget: {trip['total_budget']} {trip['currency']}
- Travelers: {trip['travelers']}
- Daily Pace: {trip['daily_pace']}

DAY TO REGENERATE:
- Day Number: {day.day_number}
- Date: {day.date.isoformat()}
- Additional Instructions: {request.additional_instructions or 'Generate a fresh alternative plan for this day'}

Return ONLY valid JSON for a single day (same structure as before):
{{
  "day_number": {day.day_number},
  "date": "{day.date.isoformat()}",
  "title": "string",
  "summary": "string",
  "estimated_day_cost": number,
  "accommodation_suggestion": {"string" if request.keep_accommodation else "null (new suggestion welcome)"},
  "dining_recommendations": ["string"],
  "transportation_notes": "string",
  "activities": [
    {{
      "id": "unique-string-id",
      "name": "string",
      "category": "string",
      "description": "string",
      "suggested_start_time": "HH:MM",
      "suggested_end_time": "HH:MM",
      "estimated_cost": number or null,
      "currency": "{trip['currency']}",
      "location_name": "string",
      "address": null,
      "transportation_to_next": "string",
      "practical_tips": "string",
      "booking_url": null,
      "source_url": null
    }}
  ]
}}
"""
    return prompt


def _extract_json(text: str) -> str:
    """Extract JSON from a potentially markdown-wrapped response."""
    # Try to extract JSON from markdown code blocks
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        return match.group(1)
    # Try to find raw JSON object
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return match.group(0)
    return text


def _parse_day(day_data: dict, start_date: date) -> ItineraryDay:
    """Parse and validate a single day from AI response."""
    activities = []
    for act_data in day_data.get("activities", []):
        try:
            category_str = act_data.get("category", "other")
            # Normalize category
            try:
                category = ActivityCategory(category_str.lower())
            except ValueError:
                category = ActivityCategory.OTHER

            activity = Activity(
                id=act_data.get("id") or f"act-{len(activities)+1}",
                name=str(act_data.get("name", "Activity"))[:200],
                category=category,
                description=str(act_data.get("description", ""))[:2000],
                suggested_start_time=act_data.get("suggested_start_time"),
                suggested_end_time=act_data.get("suggested_end_time"),
                estimated_cost=act_data.get("estimated_cost"),
                currency=act_data.get("currency"),
                location_name=act_data.get("location_name"),
                address=act_data.get("address"),
                transportation_to_next=act_data.get("transportation_to_next"),
                practical_tips=act_data.get("practical_tips"),
                booking_url=None,  # Never trust AI-generated booking URLs
                source_url=None,
            )
            activities.append(activity)
        except Exception as e:
            logger.warning("Skipping malformed activity: %s", e)
            continue

    day_number = int(day_data.get("day_number", 1))
    # Use provided date or calculate from start_date
    try:
        day_date = date.fromisoformat(str(day_data.get("date", "")))
    except (ValueError, TypeError):
        day_date = start_date + timedelta(days=day_number - 1)

    dining_recs = day_data.get("dining_recommendations", [])
    if isinstance(dining_recs, list):
        dining_recs = [str(r) for r in dining_recs[:5]]
    else:
        dining_recs = []

    return ItineraryDay(
        day_number=day_number,
        date=day_date,
        title=str(day_data.get("title", f"Day {day_number}"))[:200],
        summary=str(day_data.get("summary", ""))[:1000],
        estimated_day_cost=day_data.get("estimated_day_cost"),
        activities=activities,
        accommodation_suggestion=str(day_data.get("accommodation_suggestion", "") or "")[:500] or None,
        dining_recommendations=dining_recs,
        transportation_notes=str(day_data.get("transportation_notes", "") or "")[:500] or None,
    )


@retry(
    retry=retry_if_exception_type(RETRYABLE_EXCEPTIONS),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    before_sleep=before_sleep_log(logger, logging.WARNING),
)
def _call_groq(client: Groq, prompt: str) -> str:
    """Make a Groq API call with retry logic."""
    response = client.chat.completions.create(
        model=settings.groq_model,
        messages=[
            {
                "role": "system",
                "content": "You are an expert travel planner. Always respond with valid JSON only. No markdown, no explanations, just the JSON object.",
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.7,
        max_tokens=8000,
    )
    return response.choices[0].message.content or ""


async def generate_itinerary(request: GenerateTripRequest) -> tuple[str, float, List[ItineraryDay]]:
    """
    Generate a full itinerary using Groq AI.
    Returns (title, estimated_total_cost, list_of_days).
    """
    client = _get_groq_client()
    prompt = _build_itinerary_prompt(request)

    logger.info("Generating itinerary for destination: %s", request.destination)

    try:
        raw_response = _call_groq(client, prompt)
    except APITimeoutError:
        raise RuntimeError(
            "AI generation timed out. Please try again. "
            f"(Timeout: {settings.ai_request_timeout}s)"
        )
    except RateLimitError:
        raise RuntimeError(
            "Groq API rate limit reached. Please wait a moment and try again."
        )
    except APIStatusError as e:
        raise RuntimeError(f"Groq API error (HTTP {e.status_code}): {e.message}")
    except APIConnectionError:
        raise RuntimeError(
            "Cannot connect to Groq API. Please check your internet connection."
        )

    # Parse JSON response
    json_str = _extract_json(raw_response)
    try:
        data = json.loads(json_str)
    except json.JSONDecodeError as e:
        logger.error("Failed to parse AI response as JSON: %s\nRaw: %s", e, raw_response[:500])
        raise RuntimeError(
            "AI returned malformed data. Please try again. "
            "If this persists, contact support."
        )

    title = str(data.get("title", f"Trip to {request.destination}"))[:300]
    estimated_total_cost = data.get("estimated_total_cost")
    if estimated_total_cost is not None:
        try:
            estimated_total_cost = float(estimated_total_cost)
        except (ValueError, TypeError):
            estimated_total_cost = None

    num_days = (request.end_date - request.start_date).days + 1
    days_data = data.get("days", [])

    if not days_data:
        raise RuntimeError(
            "AI did not return any itinerary days. Please try again."
        )

    days = []
    for day_data in days_data[:num_days]:  # Enforce expected day count
        try:
            day = _parse_day(day_data, request.start_date)
            days.append(day)
        except Exception as e:
            logger.warning("Failed to parse day %s: %s", day_data.get("day_number"), e)

    if not days:
        raise RuntimeError("Failed to parse any valid itinerary days from AI response.")

    # Sort days by day_number
    days.sort(key=lambda d: d.day_number)

    logger.info("Successfully generated %d-day itinerary for %s", len(days), request.destination)
    return title, estimated_total_cost, days


async def regenerate_day(
    request: RegenerateDayRequest,
    trip: dict,
    day: ItineraryDay,
) -> ItineraryDay:
    """Regenerate a single itinerary day using Groq AI."""
    client = _get_groq_client()
    prompt = _build_day_regeneration_prompt(request, trip, day)

    logger.info("Regenerating day %d for trip %s", day.day_number, trip.get("id", "unknown"))

    try:
        raw_response = _call_groq(client, prompt)
    except APITimeoutError:
        raise RuntimeError("AI generation timed out. Please try again.")
    except RateLimitError:
        raise RuntimeError("Groq API rate limit reached. Please wait a moment.")
    except APIStatusError as e:
        raise RuntimeError(f"Groq API error: {e.message}")
    except APIConnectionError:
        raise RuntimeError("Cannot connect to Groq API. Check your internet connection.")

    json_str = _extract_json(raw_response)
    try:
        day_data = json.loads(json_str)
    except json.JSONDecodeError as e:
        logger.error("Failed to parse regenerated day JSON: %s", e)
        raise RuntimeError("AI returned malformed data for day regeneration. Please try again.")

    return _parse_day(day_data, day.date)
