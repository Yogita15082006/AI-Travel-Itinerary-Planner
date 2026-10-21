-- =============================================================
-- Migration 001: Initial Schema
-- Travel Itinerary Planner
--
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- =============================================================

-- Enable UUID extension (already enabled in Supabase by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- TRIPS TABLE
-- Stores the main trip record with all preferences and the
-- entire itinerary stored as JSONB for flexible day/activity storage.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Trip identity
    title TEXT NOT NULL,
    destination TEXT NOT NULL,
    departure_city TEXT,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('draft', 'active', 'completed', 'archived')),

    -- Travel dates
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    CONSTRAINT end_after_start CHECK (end_date >= start_date),

    -- Travelers & budget
    travelers INTEGER NOT NULL DEFAULT 1 CHECK (travelers >= 1 AND travelers <= 50),
    total_budget NUMERIC(12, 2) NOT NULL CHECK (total_budget >= 0),
    estimated_total_cost NUMERIC(12, 2),
    currency CHAR(3) NOT NULL DEFAULT 'USD',

    -- Preferences
    travel_style TEXT NOT NULL DEFAULT 'balanced'
        CHECK (travel_style IN ('budget', 'balanced', 'luxury', 'adventure', 'relaxed', 'cultural', 'romantic')),
    interests TEXT[] DEFAULT '{}',
    accommodation_preference TEXT,
    dietary_preferences TEXT,
    accessibility_requirements TEXT,
    daily_pace TEXT NOT NULL DEFAULT 'moderate'
        CHECK (daily_pace IN ('slow', 'moderate', 'fast')),
    additional_instructions TEXT,

    -- Generated itinerary stored as JSONB
    -- Structure: array of ItineraryDay objects (see schema docs)
    days_json JSONB DEFAULT '[]'::jsonb,

    -- Budget breakdown stored as JSONB
    budget_breakdown JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user's trips list (ordered by creation)
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips (user_id, created_at DESC);
-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips (user_id, status);
-- Index for date-range filtering
CREATE INDEX IF NOT EXISTS idx_trips_dates ON public.trips (user_id, start_date, end_date);

-- =============================================================
-- ROW LEVEL SECURITY (RLS)
-- Users can only read/write their own trips.
-- The backend uses the service_role key for writes (bypasses RLS),
-- but RLS provides defense-in-depth for any direct access.
-- =============================================================

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Drop policies if re-running migration
DROP POLICY IF EXISTS "Users can view own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can insert own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can update own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can delete own trips" ON public.trips;

-- SELECT: users can only read their own trips
CREATE POLICY "Users can view own trips"
    ON public.trips
    FOR SELECT
    USING (auth.uid() = user_id);

-- INSERT: users can only create trips for themselves
CREATE POLICY "Users can insert own trips"
    ON public.trips
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: users can only update their own trips
CREATE POLICY "Users can update own trips"
    ON public.trips
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- DELETE: users can only delete their own trips
CREATE POLICY "Users can delete own trips"
    ON public.trips
    FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================================
-- AUTO-UPDATE TRIGGER
-- Automatically updates the updated_at timestamp on any row update
-- =============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_trips_updated_at ON public.trips;
CREATE TRIGGER set_trips_updated_at
    BEFORE UPDATE ON public.trips
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================
-- VERIFICATION QUERIES
-- Run these to confirm the migration worked:
-- =============================================================

-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- SELECT * FROM pg_policies WHERE tablename = 'trips';
