# 🌍 Wandr AI – Setup Guide

A complete AI-powered personalized travel itinerary planner. This guide walks you through setting up **Supabase** and **Groq** credentials so the app works end-to-end.

---

## Architecture Overview

```
Frontend (React + Vite + Tailwind)   →   Backend (FastAPI + Python 3.12)
         http://localhost:5173                  http://localhost:8000
                  ↓                                      ↓
           Supabase Auth                    Supabase PostgreSQL + Groq AI
```

---

## Step 1 — Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in / create an account.
2. Click **New Project**, choose a name (e.g. `wandr-ai`), set a database password, and pick a region close to you.
3. Wait for the project to be provisioned (~1 min).

### Get your Supabase credentials

From your project dashboard:

- Go to **Project Settings → API**
- Copy:
  - **Project URL** → looks like `https://abcxyzabcxyz.supabase.co`
  - **anon public key** → starts with `eyJ...`
  - **service_role secret** → starts with `eyJ...` (keep this secret!)

### Enable Email Auth

- Go to **Authentication → Providers → Email**
- Enable **Email** provider (it's on by default)
- Optional: disable "Confirm email" for easy testing during development

---

## Step 2 — Run the Database Migration

1. In your Supabase project, go to **SQL Editor**
2. Open the file: `backend/migrations/001_initial_schema.sql`
3. Paste the entire SQL into the editor and click **Run**

This creates:
- `trips` table with all required columns
- Row Level Security (RLS) policies (users can only see their own trips)
- Auto-update `updated_at` trigger
- Performance indexes

---

## Step 3 — Get a Groq API Key

1. Go to [https://console.groq.com](https://console.groq.com) and sign in / create a free account.
2. Navigate to **API Keys** in the left sidebar.
3. Click **Create API Key**, give it a name, copy the key (starts with `gsk_...`).

> **Note:** Groq offers a generous free tier — suitable for development and personal use.

---

## Step 4 — Configure the Backend

1. Copy the example env file:
   ```powershell
   Copy-Item backend\.env.example backend\.env
   ```

2. Edit `backend/.env` and fill in:
   ```env
   SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   SUPABASE_ANON_KEY=eyJyour_anon_key...
   SUPABASE_SERVICE_ROLE_KEY=eyJyour_service_role_key...
   GROQ_API_KEY=gsk_your_groq_api_key...
   SECRET_KEY=any_random_32_char_string_for_jwt_signing
   ```

---

## Step 5 — Configure the Frontend

1. Copy the example env file:
   ```powershell
   Copy-Item frontend\.env.local.example frontend\.env.local
   ```

2. Edit `frontend/.env.local` and fill in:
   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJyour_anon_key...
   ```

> Never add the `service_role` key to the frontend `.env`!

---

## Step 6 — Run the Application

### Backend (Python 3.12 required)

```powershell
cd "Travel Itinerary Planner\backend"
py -3.12 -m uvicorn app.main:app --reload --port 8000
```

The API will be available at: `http://localhost:8000`
Swagger docs at: `http://localhost:8000/docs`

### Frontend

```powershell
cd "Travel Itinerary Planner\frontend"
npm run dev
```

The app will be available at: `http://localhost:5173`

---

## Step 7 — Verify Setup

Visit `http://localhost:8000/api/health` — you should see:

```json
{
  "status": "healthy",
  "supabase_configured": true,
  "ai_configured": true,
  "auth_configured": true
}
```

---

## How to Use

1. Open `http://localhost:5173`
2. Click **Get Started Free** to create an account
3. Check your email for the confirmation link (or disable email confirmation in Supabase for testing)
4. Sign in and go to **New Trip**
5. Fill in your destination, dates, budget, travel style, and interests
6. Click **Generate Itinerary** — AI generates a complete day-by-day plan
7. Browse the itinerary, expand activities for details, check the **Budget** tab
8. Click **Regenerate** on any day to get a fresh plan for just that day

---

## Project Structure

```
Travel Itinerary Planner/
├── backend/
│   ├── app/
│   │   ├── api/routes/       # FastAPI route handlers
│   │   ├── core/             # Config, security, JWT auth
│   │   ├── db/               # Supabase client
│   │   ├── schemas/          # Pydantic models
│   │   └── services/         # AI, budget, itinerary logic
│   ├── migrations/           # SQL schema migration
│   ├── tests/                # Pytest test suite
│   └── requirements.txt
│
└── frontend/
    └── src/
        ├── components/       # Reusable UI components
        │   ├── layout/       # AppLayout, sidebar
        │   └── trip/         # BudgetPanel, etc.
        ├── contexts/         # AuthContext (Supabase session)
        ├── lib/              # api.ts, supabase.ts clients
        ├── pages/            # All page components
        └── types/            # TypeScript types
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `supabase_configured: false` | Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env` |
| `ai_configured: false` | Check `GROQ_API_KEY` in `backend/.env` |
| Login doesn't work | Enable Email auth in Supabase dashboard |
| 401 errors on API calls | Make sure frontend `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` match your project |
| AI generation fails | Check Groq rate limits; try again in a few seconds |
| Trip costs seem wrong | AI estimates are approximate — always verify locally before booking |
| Python 3.14 error on pip | Use `py -3.12` instead of `py` — pydantic requires Python ≤ 3.13 |

---

> **Disclaimer:** All itinerary content, cost estimates, and recommendations are AI-generated and may be inaccurate. Always verify information before making travel bookings.
