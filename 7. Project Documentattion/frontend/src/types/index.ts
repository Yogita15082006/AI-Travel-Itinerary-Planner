// TypeScript types mirroring the backend Pydantic schemas

export type TravelStyle = 'budget' | 'balanced' | 'luxury' | 'adventure' | 'relaxed' | 'cultural' | 'romantic'
export type DailyPace = 'slow' | 'moderate' | 'fast'
export type TripStatus = 'draft' | 'active' | 'completed' | 'archived'
export type ActivityCategory =
  | 'sightseeing' | 'food' | 'nature' | 'history' | 'shopping'
  | 'nightlife' | 'adventure' | 'beach' | 'culture' | 'transport'
  | 'accommodation' | 'other'

export interface Activity {
  id: string
  name: string
  category: ActivityCategory
  description: string
  suggested_start_time?: string | null
  suggested_end_time?: string | null
  estimated_cost?: number | null
  currency?: string | null
  location_name?: string | null
  address?: string | null
  transportation_to_next?: string | null
  practical_tips?: string | null
  booking_url?: string | null
  source_url?: string | null
}

export interface ItineraryDay {
  id: string
  day_number: number
  date: string
  title: string
  summary: string
  estimated_day_cost?: number | null
  activities: Activity[]
  accommodation_suggestion?: string | null
  dining_recommendations?: string[] | null
  transportation_notes?: string | null
}

export interface Trip {
  id: string
  user_id: string
  title: string
  destination: string
  departure_city?: string | null
  start_date: string
  end_date: string
  travelers: number
  total_budget: number
  estimated_total_cost?: number | null
  currency: string
  travel_style: TravelStyle
  interests: string[]
  accommodation_preference?: string | null
  dietary_preferences?: string | null
  accessibility_requirements?: string | null
  daily_pace: DailyPace
  additional_instructions?: string | null
  status: TripStatus
  days: ItineraryDay[]
  budget_breakdown?: BudgetBreakdown | null
  created_at: string
  updated_at: string
}

export interface TripSummary {
  id: string
  title: string
  destination: string
  start_date: string
  end_date: string
  travelers: number
  total_budget: number
  estimated_total_cost?: number | null
  currency: string
  travel_style: TravelStyle
  status: TripStatus
  created_at: string
  num_days: number
}

export interface BudgetBreakdown {
  total_budget: number
  estimated_total_cost?: number | null
  estimated_daily_costs: Array<{
    day_number: number
    date: string
    title: string
    estimated_cost: number | null
    missing_estimates: number
  }>
  activity_total?: number | null
  accommodation_total?: number | null
  transportation_total?: number | null
  dining_total?: number | null
  miscellaneous_total?: number | null
  currency: string
  is_within_budget?: boolean | null
  budget_utilization_percent?: number | null
  missing_cost_estimates: number
  notes: string[]
}

export interface TripListResponse {
  trips: TripSummary[]
  total: number
  page: number
  page_size: number
}

export interface GenerateTripRequest {
  destination: string
  departure_city?: string
  start_date: string
  end_date: string
  travelers: number
  total_budget: number
  currency: string
  travel_style: TravelStyle
  interests: string[]
  accommodation_preference?: string
  dietary_preferences?: string
  accessibility_requirements?: string
  daily_pace: DailyPace
  additional_instructions?: string
}

export interface RegenerateDayRequest {
  additional_instructions?: string
  keep_accommodation: boolean
}

export interface HealthResponse {
  status: string
  version: string
  supabase_configured: boolean
  ai_configured: boolean
  auth_configured: boolean
  environment: string
}

export interface ApiError {
  error: string
  detail?: string
  code?: string
}
