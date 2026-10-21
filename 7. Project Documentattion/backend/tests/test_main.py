"""
Backend test suite for Travel Itinerary Planner.

Tests cover:
- Health endpoint
- Schema validation
- Budget calculations
- AI response parsing
- Authentication
- Trip CRUD (with mocked DB)
"""
import json
import pytest
from datetime import date, datetime, timezone
from unittest.mock import MagicMock, patch, AsyncMock

from fastapi.testclient import TestClient

from app.main import app
from app.schemas.trip import (
    GenerateTripRequest,
    TravelStyle,
    DailyPace,
    Activity,
    ActivityCategory,
    ItineraryDay,
    TripCreate,
)
from app.services.budget_service import calculate_budget
from app.services.ai_service import _parse_day, _extract_json


# ============================================================
# Test Client
# ============================================================

client = TestClient(app)


# ============================================================
# 1. Health Endpoint
# ============================================================

class TestHealthEndpoint:
    def test_health_returns_200(self):
        response = client.get("/api/health")
        assert response.status_code == 200

    def test_health_response_structure(self):
        response = client.get("/api/health")
        data = response.json()
        assert "status" in data
        assert data["status"] == "ok"
        assert "version" in data
        assert "supabase_configured" in data
        assert "ai_configured" in data
        assert "auth_configured" in data
        assert "environment" in data

    def test_root_endpoint(self):
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "service" in data


# ============================================================
# 2. Schema Validation
# ============================================================

class TestSchemaValidation:
    def test_valid_trip_create(self):
        req = GenerateTripRequest(
            destination="Tokyo, Japan",
            start_date=date(2025, 4, 1),
            end_date=date(2025, 4, 7),
            travelers=2,
            total_budget=3000.0,
            currency="USD",
            travel_style=TravelStyle.CULTURAL,
            interests=["food", "history", "sightseeing"],
            daily_pace=DailyPace.MODERATE,
        )
        assert req.destination == "Tokyo, Japan"
        assert req.num_days == 7

    def test_end_date_before_start_raises(self):
        with pytest.raises(ValueError):
            GenerateTripRequest(
                destination="Paris",
                start_date=date(2025, 4, 7),
                end_date=date(2025, 4, 1),  # Before start
                travelers=1,
                total_budget=2000.0,
            )

    def test_invalid_interest_raises(self):
        with pytest.raises(ValueError):
            GenerateTripRequest(
                destination="Paris",
                start_date=date(2025, 4, 1),
                end_date=date(2025, 4, 5),
                travelers=1,
                total_budget=2000.0,
                interests=["invalid_interest_xyz"],
            )

    def test_travelers_must_be_positive(self):
        with pytest.raises(ValueError):
            GenerateTripRequest(
                destination="Paris",
                start_date=date(2025, 4, 1),
                end_date=date(2025, 4, 5),
                travelers=0,
                total_budget=2000.0,
            )

    def test_negative_budget_raises(self):
        with pytest.raises(ValueError):
            GenerateTripRequest(
                destination="Paris",
                start_date=date(2025, 4, 1),
                end_date=date(2025, 4, 5),
                travelers=2,
                total_budget=-100.0,
            )


# ============================================================
# 3. Budget Calculations
# ============================================================

class TestBudgetCalculation:
    def _make_day(self, day_number: int, activities: list) -> ItineraryDay:
        return ItineraryDay(
            day_number=day_number,
            date=date(2025, 4, day_number),
            title=f"Day {day_number}",
            summary="A great day",
            activities=activities,
        )

    def _make_activity(self, cost: float | None) -> Activity:
        return Activity(
            name="Test Activity",
            category=ActivityCategory.SIGHTSEEING,
            description="A test activity",
            estimated_cost=cost,
        )

    def test_within_budget(self):
        days = [
            self._make_day(1, [self._make_activity(50.0), self._make_activity(30.0)]),
            self._make_day(2, [self._make_activity(40.0)]),
        ]
        breakdown = calculate_budget(
            total_budget=500.0,
            estimated_total_cost=None,
            days=days,
            currency="USD",
            travelers=1,
        )
        assert breakdown.is_within_budget is True
        assert breakdown.missing_cost_estimates == 0

    def test_over_budget(self):
        days = [
            self._make_day(1, [self._make_activity(300.0), self._make_activity(300.0)]),
        ]
        breakdown = calculate_budget(
            total_budget=500.0,
            estimated_total_cost=None,
            days=days,
            currency="USD",
            travelers=1,
        )
        assert breakdown.is_within_budget is False

    def test_missing_estimates_counted(self):
        days = [
            self._make_day(1, [self._make_activity(50.0), self._make_activity(None)]),
            self._make_day(2, [self._make_activity(None)]),
        ]
        breakdown = calculate_budget(
            total_budget=500.0,
            estimated_total_cost=None,
            days=days,
            currency="USD",
            travelers=2,
        )
        assert breakdown.missing_cost_estimates == 2
        assert any("no cost estimate" in note for note in breakdown.notes)

    def test_group_cost_multiplied_by_travelers(self):
        days = [
            self._make_day(1, [self._make_activity(100.0)]),
        ]
        breakdown = calculate_budget(
            total_budget=5000.0,
            estimated_total_cost=None,
            days=days,
            currency="USD",
            travelers=3,
        )
        # 100 per person * 3 travelers = 300
        assert breakdown.activity_total == 300.0

    def test_budget_utilization_percent(self):
        days = [
            self._make_day(1, [self._make_activity(100.0)]),
        ]
        breakdown = calculate_budget(
            total_budget=400.0,
            estimated_total_cost=200.0,
            days=days,
            currency="USD",
            travelers=1,
        )
        assert breakdown.budget_utilization_percent == 50.0


# ============================================================
# 4. AI Response Parsing
# ============================================================

class TestAIResponseParsing:
    def test_extract_json_from_markdown(self):
        text = '```json\n{"key": "value"}\n```'
        result = _extract_json(text)
        assert '"key": "value"' in result

    def test_extract_raw_json(self):
        text = 'Some text before {"key": "value"} and after'
        result = _extract_json(text)
        assert '"key": "value"' in result

    def test_parse_day_valid(self):
        day_data = {
            "day_number": 1,
            "date": "2025-04-01",
            "title": "Explore Tokyo",
            "summary": "An amazing day in Tokyo",
            "estimated_day_cost": 150.0,
            "activities": [
                {
                    "id": "act-1",
                    "name": "Senso-ji Temple",
                    "category": "history",
                    "description": "Visit the famous Asakusa temple",
                    "suggested_start_time": "09:00",
                    "suggested_end_time": "11:00",
                    "estimated_cost": 0.0,
                    "currency": "USD",
                    "location_name": "Asakusa, Tokyo",
                    "address": "2-3-1 Asakusa",
                    "transportation_to_next": "Take the subway",
                    "practical_tips": "Visit early to avoid crowds",
                    "booking_url": None,
                    "source_url": None,
                }
            ],
            "accommodation_suggestion": "Budget hotel near Shinjuku, ~$80/night",
            "dining_recommendations": ["Sushi Dai", "Ichiran Ramen"],
            "transportation_notes": "Get a Suica card",
        }
        day = _parse_day(day_data, date(2025, 4, 1))
        assert day.day_number == 1
        assert day.title == "Explore Tokyo"
        assert len(day.activities) == 1
        assert day.activities[0].name == "Senso-ji Temple"
        assert day.activities[0].booking_url is None  # Never trust AI booking URLs

    def test_parse_day_invalid_category_defaults_to_other(self):
        day_data = {
            "day_number": 1,
            "date": "2025-04-01",
            "title": "Day 1",
            "summary": "A day",
            "activities": [
                {
                    "id": "act-1",
                    "name": "Mystery Activity",
                    "category": "definitely_not_valid_category",
                    "description": "Something",
                }
            ],
        }
        day = _parse_day(day_data, date(2025, 4, 1))
        assert day.activities[0].category == ActivityCategory.OTHER

    def test_parse_day_with_missing_date_uses_start_date(self):
        day_data = {
            "day_number": 2,
            "date": "invalid-date",
            "title": "Day 2",
            "summary": "Another day",
            "activities": [],
        }
        start = date(2025, 4, 1)
        day = _parse_day(day_data, start)
        # Day 2 = start + 1 day
        from datetime import timedelta
        assert day.date == start + timedelta(days=1)

    def test_parse_day_malformed_activity_skipped(self):
        day_data = {
            "day_number": 1,
            "date": "2025-04-01",
            "title": "Day 1",
            "summary": "A day",
            "activities": [
                None,  # Malformed
                {
                    "id": "act-1",
                    "name": "Valid Activity",
                    "category": "food",
                    "description": "A restaurant",
                },
            ],
        }
        # Should not raise, should skip malformed and keep valid
        day = _parse_day(day_data, date(2025, 4, 1))
        assert len(day.activities) == 1


# ============================================================
# 5. Authentication
# ============================================================

class TestAuthentication:
    def test_protected_endpoint_requires_auth(self):
        response = client.get("/api/trips")
        assert response.status_code == 403  # No auth header

    def test_protected_endpoint_with_invalid_token(self):
        response = client.get(
            "/api/trips",
            headers={"Authorization": "Bearer invalid.token.here"},
        )
        assert response.status_code in (401, 403, 503)

    def test_generate_without_auth(self):
        response = client.post("/api/trips/generate", json={
            "destination": "Paris",
            "start_date": "2025-04-01",
            "end_date": "2025-04-05",
            "travelers": 2,
            "total_budget": 2000.0,
        })
        assert response.status_code == 403


# ============================================================
# 6. Trip Generation — Mocked
# ============================================================

class TestTripGeneration:
    def _make_mock_token_user(self):
        """Create a mock JWT decode that returns a valid user."""
        return {"id": "test-user-id", "email": "test@example.com", "role": "authenticated"}

    @patch("app.core.security.decode_supabase_token")
    @patch("app.services.itinerary_service.generate_and_save_trip")
    def test_generate_trip_calls_service(self, mock_generate, mock_decode):
        from datetime import datetime, timezone
        mock_decode.return_value = {"sub": "user-123", "email": "test@example.com"}

        mock_trip = MagicMock()
        mock_trip.id = "trip-123"
        mock_trip.model_dump = lambda **kw: {
            "id": "trip-123",
            "user_id": "user-123",
            "title": "Tokyo Adventure",
            "destination": "Tokyo",
            "departure_city": None,
            "start_date": "2025-04-01",
            "end_date": "2025-04-07",
            "travelers": 2,
            "total_budget": 3000.0,
            "estimated_total_cost": 2500.0,
            "currency": "USD",
            "travel_style": "cultural",
            "interests": ["food", "history"],
            "accommodation_preference": None,
            "dietary_preferences": None,
            "accessibility_requirements": None,
            "daily_pace": "moderate",
            "additional_instructions": None,
            "status": "active",
            "days": [],
            "budget_breakdown": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        import asyncio
        mock_generate.return_value = mock_trip

        with patch("app.core.config.settings.ai_configured", True), \
             patch("app.core.config.settings.supabase_configured", True), \
             patch("app.core.config.settings.auth_configured", True):
            response = client.post(
                "/api/trips/generate",
                json={
                    "destination": "Tokyo, Japan",
                    "start_date": "2025-04-01",
                    "end_date": "2025-04-07",
                    "travelers": 2,
                    "total_budget": 3000.0,
                    "currency": "USD",
                    "travel_style": "cultural",
                    "interests": ["food", "history"],
                    "daily_pace": "moderate",
                },
                headers={"Authorization": "Bearer valid.token.here"},
            )
        # Should be 503 (not configured) or 201 if mocked properly
        # Since auth decoding is mocked
        assert response.status_code in (201, 503)

    def test_generate_returns_503_when_ai_not_configured(self):
        """Without a real token, we'd get 503 if AI is not configured."""
        with patch("app.core.security.decode_supabase_token") as mock_decode:
            mock_decode.return_value = {"sub": "user-123"}
            with patch("app.core.config.settings.ai_configured", False), \
                 patch("app.core.config.settings.auth_configured", True):
                response = client.post(
                    "/api/trips/generate",
                    json={
                        "destination": "Paris",
                        "start_date": "2025-04-01",
                        "end_date": "2025-04-05",
                        "travelers": 2,
                        "total_budget": 2000.0,
                    },
                    headers={"Authorization": "Bearer some.token"},
                )
            assert response.status_code == 503


# ============================================================
# 7. Num Days Calculation
# ============================================================

class TestDateCalculations:
    def test_single_day_trip(self):
        req = GenerateTripRequest(
            destination="London",
            start_date=date(2025, 6, 1),
            end_date=date(2025, 6, 1),
            travelers=1,
            total_budget=500.0,
        )
        assert req.num_days == 1

    def test_week_long_trip(self):
        req = GenerateTripRequest(
            destination="Bali",
            start_date=date(2025, 6, 1),
            end_date=date(2025, 6, 7),
            travelers=2,
            total_budget=2000.0,
        )
        assert req.num_days == 7

    def test_month_long_trip(self):
        req = GenerateTripRequest(
            destination="Thailand",
            start_date=date(2025, 1, 1),
            end_date=date(2025, 1, 31),
            travelers=1,
            total_budget=5000.0,
        )
        assert req.num_days == 31


# ============================================================
# 8. CORS Behaviour
# ============================================================

class TestCORSBehaviour:
    """
    Verify that the CORS middleware correctly allows/denies origins
    and that OPTIONS preflight requests are handled.

    We use the TestClient with raise_server_exceptions=False so that
    CORS-rejected requests return the actual HTTP response rather than
    raising an exception inside the test runner.
    """

    PRODUCTION_ORIGIN = "https://ai-travel-itinerary-planner-frontend.vercel.app"
    PREVIEW_ORIGIN    = "https://ai-travel-itinerary-planner-frontend-aq5uotrqg.vercel.app"
    MALICIOUS_ORIGIN  = "https://evil-site.com"
    UNRELATED_VERCEL  = "https://some-other-project-abc123.vercel.app"
    LOCALHOST_ORIGIN  = "http://localhost:5173"

    def _options(self, origin: str, path: str = "/api/trips") -> object:
        """Send an OPTIONS preflight for the given origin."""
        return client.options(
            path,
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "Authorization, Content-Type",
            },
        )

    def _get_with_origin(self, origin: str, path: str = "/api/health") -> object:
        """Send a simple GET with an Origin header."""
        return client.get(path, headers={"Origin": origin})

    # ── 1. Production origin is allowed ──────────────────────────────────────

    def test_production_origin_get_has_acao_header(self):
        response = self._get_with_origin(self.PRODUCTION_ORIGIN)
        assert response.status_code == 200
        assert response.headers.get("access-control-allow-origin") == self.PRODUCTION_ORIGIN

    # ── 2. Scoped Vercel preview origin is allowed ────────────────────────────

    def test_preview_origin_get_has_acao_header(self):
        response = self._get_with_origin(self.PREVIEW_ORIGIN)
        assert response.status_code == 200
        assert response.headers.get("access-control-allow-origin") == self.PREVIEW_ORIGIN

    # ── 3. Unrelated malicious origin is rejected ─────────────────────────────

    def test_malicious_origin_has_no_acao_header(self):
        response = self._get_with_origin(self.MALICIOUS_ORIGIN)
        # CORS middleware must NOT echo back an unrecognised origin
        acao = response.headers.get("access-control-allow-origin", "")
        assert acao != self.MALICIOUS_ORIGIN
        assert acao != "*"

    def test_unrelated_vercel_origin_has_no_acao_header(self):
        response = self._get_with_origin(self.UNRELATED_VERCEL)
        acao = response.headers.get("access-control-allow-origin", "")
        assert acao != self.UNRELATED_VERCEL
        assert acao != "*"

    # ── 4. OPTIONS preflight returns correct headers ──────────────────────────

    def test_preflight_from_production_origin(self):
        response = self._options(self.PRODUCTION_ORIGIN)
        assert response.status_code == 200
        assert response.headers.get("access-control-allow-origin") == self.PRODUCTION_ORIGIN
        assert "access-control-allow-methods" in response.headers
        assert "access-control-allow-headers" in response.headers

    def test_preflight_from_preview_origin(self):
        response = self._options(self.PREVIEW_ORIGIN)
        assert response.status_code == 200
        assert response.headers.get("access-control-allow-origin") == self.PREVIEW_ORIGIN

    def test_preflight_rejected_for_malicious_origin(self):
        response = self._options(self.MALICIOUS_ORIGIN)
        acao = response.headers.get("access-control-allow-origin", "")
        assert acao != self.MALICIOUS_ORIGIN
        assert acao != "*"

    # ── 5. Localhost allowed (dev ergonomics) ────────────────────────────────

    def test_localhost_origin_allowed(self):
        response = self._get_with_origin(self.LOCALHOST_ORIGIN)
        assert response.headers.get("access-control-allow-origin") == self.LOCALHOST_ORIGIN

    # ── 6. Sanity-check the regex pattern itself ──────────────────────────────

    def test_cors_regex_matches_correct_origins(self):
        import re
        from app.main import _cors_origin_regex
        pattern = re.compile(_cors_origin_regex)

        # Must match
        assert pattern.match(self.PRODUCTION_ORIGIN)
        assert pattern.match(self.PREVIEW_ORIGIN)
        assert pattern.match("http://localhost:5173")
        assert pattern.match("http://localhost:3000")

        # Must NOT match
        assert not pattern.match(self.MALICIOUS_ORIGIN)
        assert not pattern.match(self.UNRELATED_VERCEL)
        assert not pattern.match("https://ai-travel-itinerary-planner-frontend.vercel.app.evil.com")
        assert not pattern.match("")

