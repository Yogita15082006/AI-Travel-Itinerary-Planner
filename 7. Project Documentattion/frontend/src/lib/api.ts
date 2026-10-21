/**
 * Centralized API client for the Travel Itinerary Planner backend.
 * Automatically attaches the Supabase session token to protected requests.
 * Never exposes Groq API keys or service-role keys.
 */
import { supabase } from './supabase'
import type {
  Trip,
  TripSummary,
  TripListResponse,
  GenerateTripRequest,
  RegenerateDayRequest,
  BudgetBreakdown,
  HealthResponse,
  ApiError,
} from '../types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

class ApiClient {
  private async getAuthHeader(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return {}
    return { Authorization: `Bearer ${session.access_token}` }
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    authenticated = false
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (authenticated) {
      const authHeaders = await this.getAuthHeader()
      Object.assign(headers, authHeaders)
    }

    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    })

    if (response.status === 204) {
      return undefined as T
    }

    const data = await response.json()

    if (!response.ok) {
      const err = data as ApiError
      throw new ApiClientError(
        err.detail || err.error || `Request failed with status ${response.status}`,
        response.status,
        err.code
      )
    }

    return data as T
  }

  // ── Health ──────────────────────────────────────────────────

  async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/api/health')
  }

  // ── Trips ────────────────────────────────────────────────────

  async generateTrip(request: GenerateTripRequest): Promise<Trip> {
    return this.request<Trip>('/api/trips/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    }, true)
  }

  async listTrips(page = 1, pageSize = 20): Promise<TripListResponse> {
    return this.request<TripListResponse>(
      `/api/trips?page=${page}&page_size=${pageSize}`,
      {},
      true
    )
  }

  async getTrip(tripId: string): Promise<Trip> {
    return this.request<Trip>(`/api/trips/${tripId}`, {}, true)
  }

  async updateTrip(
    tripId: string,
    update: {
      title?: string
      status?: string
      total_budget?: number
      accommodation_preference?: string
      dietary_preferences?: string
      accessibility_requirements?: string
      additional_instructions?: string
    }
  ): Promise<Trip> {
    return this.request<Trip>(`/api/trips/${tripId}`, {
      method: 'PATCH',
      body: JSON.stringify(update),
    }, true)
  }

  async deleteTrip(tripId: string): Promise<void> {
    return this.request<void>(`/api/trips/${tripId}`, {
      method: 'DELETE',
    }, true)
  }

  async updateDay(
    tripId: string,
    dayId: string,
    update: {
      title?: string
      summary?: string
      activities?: unknown[]
      accommodation_suggestion?: string
      dining_recommendations?: string[]
      transportation_notes?: string
    }
  ): Promise<Trip> {
    return this.request<Trip>(`/api/trips/${tripId}/days/${dayId}`, {
      method: 'PATCH',
      body: JSON.stringify(update),
    }, true)
  }

  async regenerateDay(
    tripId: string,
    dayId: string,
    request: RegenerateDayRequest
  ): Promise<Trip> {
    return this.request<Trip>(`/api/trips/${tripId}/days/${dayId}/regenerate`, {
      method: 'POST',
      body: JSON.stringify(request),
    }, true)
  }

  async getBudget(tripId: string): Promise<BudgetBreakdown> {
    return this.request<BudgetBreakdown>(`/api/trips/${tripId}/budget`, {}, true)
  }
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiClientError'
  }

  get isUnauthorized() {
    return this.status === 401 || this.status === 403
  }

  get isNotFound() {
    return this.status === 404
  }

  get isServiceUnavailable() {
    return this.status === 503
  }
}

export const api = new ApiClient()
