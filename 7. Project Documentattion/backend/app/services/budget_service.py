"""
Budget Service — deterministic budget calculations.
"""
import logging
from typing import List, Optional
from app.schemas.trip import BudgetBreakdown, ItineraryDay

logger = logging.getLogger(__name__)


def calculate_budget(
    total_budget: float,
    estimated_total_cost: Optional[float],
    days: List[ItineraryDay],
    currency: str,
    travelers: int,
) -> BudgetBreakdown:
    """
    Compute a comprehensive budget breakdown from itinerary data.
    Clearly identifies missing estimates rather than treating them as zero.
    """
    notes = []
    missing_estimates = 0

    activity_total = 0.0
    activity_missing = 0
    accommodation_total = 0.0
    accommodation_missing = 0
    dining_total = 0.0
    transportation_total = 0.0

    estimated_daily_costs = []

    for day in days:
        day_activity_cost = 0.0
        day_missing = 0

        for activity in day.activities:
            if activity.estimated_cost is not None:
                # Assume per-person costs; multiply by travelers
                day_activity_cost += activity.estimated_cost * travelers
            else:
                day_missing += 1
                missing_estimates += 1

        if day.estimated_day_cost is not None:
            day_total = day.estimated_day_cost
        else:
            day_total = day_activity_cost
            if day_missing > 0:
                accommodation_missing += 1

        activity_total += day_activity_cost
        activity_missing += day_missing

        estimated_daily_costs.append({
            "day_number": day.day_number,
            "date": day.date.isoformat(),
            "title": day.title,
            "estimated_cost": day_total,
            "missing_estimates": day_missing,
        })

    # Use AI-provided total if available, otherwise sum daily costs
    computed_total = sum(
        d["estimated_cost"] for d in estimated_daily_costs
        if d["estimated_cost"] is not None
    )
    final_estimated_cost = estimated_total_cost if estimated_total_cost is not None else computed_total

    is_within_budget = None
    budget_utilization = None

    if final_estimated_cost is not None and total_budget > 0:
        budget_utilization = round((final_estimated_cost / total_budget) * 100, 1)
        is_within_budget = final_estimated_cost <= total_budget

    if missing_estimates > 0:
        notes.append(
            f"{missing_estimates} activity/activities have no cost estimate. "
            "Actual costs may be higher than shown."
        )
    if not is_within_budget and final_estimated_cost is not None:
        overage = final_estimated_cost - total_budget
        notes.append(
            f"Estimated cost exceeds budget by approximately "
            f"{currency} {overage:,.0f}. Consider adjusting your preferences."
        )
    notes.append(
        "All costs are AI-generated estimates and may differ from actual prices. "
        "Verify with official sources before booking."
    )

    return BudgetBreakdown(
        total_budget=total_budget,
        estimated_total_cost=final_estimated_cost,
        estimated_daily_costs=estimated_daily_costs,
        activity_total=activity_total if activity_total > 0 else None,
        accommodation_total=accommodation_total if accommodation_total > 0 else None,
        transportation_total=transportation_total if transportation_total > 0 else None,
        dining_total=dining_total if dining_total > 0 else None,
        miscellaneous_total=None,
        currency=currency,
        is_within_budget=is_within_budget,
        budget_utilization_percent=budget_utilization,
        missing_cost_estimates=missing_estimates,
        notes=notes,
    )
