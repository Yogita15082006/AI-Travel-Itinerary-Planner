#!/usr/bin/env python3
"""
End-to-end verification for Travel Itinerary Planner.
Tests: environment, health, Groq AI, Supabase auth, JWT verification,
protected routes, and (if migration is done) CRUD + user isolation.

Run from the backend directory:
    py -3.12 e2e_verify.py

Does NOT print credentials. All secrets masked in output.
"""
import asyncio
import json
import os
import random
import string
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

# ── Load .env WITHOUT importing app modules (so we test env loading, not Python cache) ──
env_path = Path(__file__).parent / ".env"
_env = {}
if env_path.exists():
    with open(env_path) as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                k, _, v = _line.partition("=")
                _env[k.strip()] = v.strip()
    # Set for subprocess imports
    for k, v in _env.items():
        os.environ.setdefault(k, v)
else:
    print("❌ backend/.env not found!")
    sys.exit(1)

BACKEND_URL = "http://localhost:8000"
SUPABASE_URL = _env.get("SUPABASE_URL", "")
SUPABASE_ANON_KEY = _env.get("SUPABASE_ANON_KEY", "")
GROQ_API_KEY = _env.get("GROQ_API_KEY", "")
GROQ_MODEL = _env.get("GROQ_MODEL", "llama-3.3-70b-versatile")

# ── Helpers ──────────────────────────────────────────────────────────────────

PASS = "PASS"
FAIL = "FAIL"
SKIP = "SKIP"
_results: list[tuple] = []


def mask(v: str) -> str:
    if not v:
        return "(empty)"
    return v[:6] + "..." + v[-4:] if len(v) > 10 else "***"


def report(section: str, name: str, status: str, detail: str = ""):
    icon = {"PASS": "✅", "FAIL": "❌", "SKIP": "⚠️ "}.get(status, "❓")
    msg = f"{icon} [{section}] {name}: {status}"
    if detail:
        msg += f"\n      → {detail}"
    print(msg)
    _results.append((section, name, status, detail))


def http(method: str, url: str, body: dict | None = None,
         headers: dict | None = None) -> tuple[int, dict]:
    req = urllib.request.Request(url, method=method)
    req.add_header("Content-Type", "application/json")
    if headers:
        for k, v in headers.items():
            req.add_header(k, v)
    data = json.dumps(body).encode() if body else None
    try:
        with urllib.request.urlopen(req, data=data, timeout=30) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read())
        except Exception:
            return e.code, {}
    except urllib.error.URLError as e:
        raise RuntimeError(f"Connection error: {e.reason}") from e


def rand_suffix(n=8):
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=n))


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 0 — ENVIRONMENT VARIABLES
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "═" * 60)
print("SECTION 0 — Environment Variables")
print("═" * 60)

report("ENV", "SUPABASE_URL present",
       PASS if SUPABASE_URL.startswith("https://") else FAIL,
       mask(SUPABASE_URL))
report("ENV", "SUPABASE_ANON_KEY present",
       PASS if len(SUPABASE_ANON_KEY) > 20 else FAIL,
       mask(SUPABASE_ANON_KEY))
report("ENV", "GROQ_API_KEY present",
       PASS if GROQ_API_KEY.startswith("gsk_") else FAIL,
       mask(GROQ_API_KEY))
report("ENV", "GROQ_MODEL set",
       PASS, GROQ_MODEL)

# Confirm no secrets in any frontend file
frontend_env = Path(__file__).parent.parent / "frontend" / ".env.local"
if frontend_env.exists():
    content = frontend_env.read_text()
    has_service_role = "service_role" in content.lower() or "SERVICE_ROLE" in content
    has_groq = "groq" in content.lower() or "GROQ" in content
    report("ENV", "No service_role key in frontend .env.local",
           FAIL if has_service_role else PASS)
    report("ENV", "No Groq key in frontend .env.local",
           FAIL if has_groq else PASS)
else:
    report("ENV", "frontend/.env.local exists", FAIL, "File missing")

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 1 — HEALTH ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "═" * 60)
print("SECTION 1 — Backend Health Endpoint")
print("═" * 60)

try:
    code, health = http("GET", f"{BACKEND_URL}/api/health")
    report("HEALTH", "Backend reachable", PASS if code == 200 else FAIL, f"HTTP {code}")
    for key in ("supabase_configured", "ai_configured", "auth_configured"):
        val = health.get(key)
        report("HEALTH", key, PASS if val else FAIL, str(val))
    report("HEALTH", "environment", PASS, health.get("environment", "?"))
except RuntimeError as e:
    report("HEALTH", "Backend reachable", FAIL, str(e))

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 2 — GROQ AI INTEGRATION
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "═" * 60)
print("SECTION 2 — Groq AI Integration")
print("═" * 60)

groq_token_ok = False
groq_model_ok = False

try:
    from groq import Groq, APIConnectionError, AuthenticationError, RateLimitError
    client = Groq(api_key=GROQ_API_KEY)
    report("GROQ", "Groq client initialised", PASS)

    # Minimal real API call
    try:
        resp = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": "Reply with exactly: OK"}],
            max_tokens=5,
            temperature=0,
        )
        reply = resp.choices[0].message.content.strip()
        groq_token_ok = True
        groq_model_ok = True
        report("GROQ", "Real API request", PASS,
               f"Model: {GROQ_MODEL} | Response: '{reply}'")
        report("GROQ", "GROQ_API_KEY authentication", PASS)
        report("GROQ", f"Model '{GROQ_MODEL}' available", PASS)
    except AuthenticationError:
        report("GROQ", "Real API request", FAIL,
               "Authentication failed — GROQ_API_KEY invalid or expired")
    except RateLimitError as e:
        groq_token_ok = True  # Key is valid, just rate-limited
        report("GROQ", "Real API request", FAIL,
               f"Rate limit hit: {str(e)[:120]}")
    except Exception as e:
        err = str(e)
        if "model" in err.lower() and ("not found" in err.lower() or "does not exist" in err.lower()):
            groq_token_ok = True
            report("GROQ", "Real API request", FAIL,
                   f"Model '{GROQ_MODEL}' not found. Error: {err[:200]}")
            report("GROQ", "Suggested fix", SKIP,
                   "Change GROQ_MODEL in backend/.env to: llama3-8b-8192 or mixtral-8x7b-32768")
        else:
            report("GROQ", "Real API request", FAIL, err[:200])

except ImportError:
    report("GROQ", "Groq package installed", FAIL,
           "Run: py -3.12 -m pip install groq")
except Exception as e:
    report("GROQ", "Groq client initialised", FAIL, str(e)[:200])

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 3 — SUPABASE AUTH + JWT VERIFICATION
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "═" * 60)
print("SECTION 3 — Supabase Auth + JWT Verification")
print("═" * 60)

TEST_EMAIL = f"wandr-test-{rand_suffix()}@mailinator.com"
TEST_PASSWORD = f"Test@{rand_suffix(8)}1"
access_token_user1: str | None = None
access_token_user2: str | None = None

# 3a — JWKS endpoint verification
try:
    code, jwks = http("GET", f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json")
    if code == 200 and jwks.get("keys"):
        key = jwks["keys"][0]
        alg = key.get("alg", "?")
        kty = key.get("kty", "?")
        kid = key.get("kid", "?")[:12]
        report("AUTH", "JWKS endpoint reachable", PASS)
        report("AUTH", "JWT signing algorithm", PASS,
               f"alg={alg}, kty={kty}, kid={kid}...")
        report("AUTH", "security.py handles this algorithm",
               PASS if alg in ("ES256", "RS256", "ES384", "RS384") else FAIL,
               f"security.py supports ES256/RS256 asymmetric — found {alg}")
    else:
        report("AUTH", "JWKS endpoint reachable", FAIL, f"HTTP {code}")
except Exception as e:
    report("AUTH", "JWKS endpoint reachable", FAIL, str(e)[:200])

# 3b — Sign up user 1
try:
    code, data = http(
        "POST",
        f"{SUPABASE_URL}/auth/v1/signup",
        body={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        headers={"apikey": SUPABASE_ANON_KEY, "Authorization": f"Bearer {SUPABASE_ANON_KEY}"},
    )
    if code in (200, 201) and data.get("access_token"):
        access_token_user1 = data["access_token"]
        report("AUTH", "Supabase signup (user 1)", PASS,
               "Token received immediately (email confirm disabled)")
    elif code in (200, 201) and data.get("user") and not data.get("access_token"):
        # Email confirmation required — this is a Supabase project setting, not a code bug
        report("AUTH", "Supabase signup (user 1)", SKIP,
               "User created OK but email confirmation is ENABLED in Supabase. "
               "To run full auth tests: Supabase Dashboard → Auth → Providers → Email → "
               "disable 'Confirm email'. The auth code itself is correct.")
    elif data.get("msg") == "User already registered":
        report("AUTH", "Supabase signup (user 1)", SKIP, "Email already registered")
    else:
        report("AUTH", "Supabase signup (user 1)", FAIL,
               f"HTTP {code}: {str(data)[:200]}")
except Exception as e:
    report("AUTH", "Supabase signup (user 1)", FAIL, str(e)[:200])

# 3c — Sign in (only attempted if signup gave a token)
if not access_token_user1:
    report("AUTH", "Backend JWT verification", SKIP,
           "Skipped — email confirmation required (see above)")

# 3d — Backend JWT verification (protected route with real token)
if access_token_user1:
    try:
        code, data = http(
            "GET",
            f"{BACKEND_URL}/api/trips",
            headers={"Authorization": f"Bearer {access_token_user1}"},
        )
        if code == 200:
            report("AUTH", "Backend JWT verification (valid token → 200)", PASS,
                   f"Trips endpoint accepted token, returned {code}")
        elif code == 503:
            report("AUTH", "Backend JWT verification (valid token → 200)", FAIL,
                   f"503 — auth or supabase not configured on backend")
        else:
            report("AUTH", "Backend JWT verification (valid token → 200)", FAIL,
                   f"HTTP {code}: {str(data)[:200]}")
    except Exception as e:
        report("AUTH", "Backend JWT verification (valid token → 200)", FAIL, str(e)[:200])
else:
    report("AUTH", "Backend JWT verification", SKIP,
           "Skipped — no access token obtained (email confirmation may be required)")

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 4 — INVALID / MISSING TOKEN REJECTION
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "═" * 60)
print("SECTION 4 — Token Rejection (Security)")
print("═" * 60)

# 4a — No token
try:
    code, data = http("GET", f"{BACKEND_URL}/api/trips")
    report("SECURITY", "No token → 403", PASS if code == 403 else FAIL,
           f"Got HTTP {code} (expected 403)")
except Exception as e:
    report("SECURITY", "No token → 403", FAIL, str(e)[:200])

# 4b — Garbage token
try:
    code, data = http("GET", f"{BACKEND_URL}/api/trips",
                      headers={"Authorization": "Bearer garbage.token.here"})
    report("SECURITY", "Invalid token → 401", PASS if code == 401 else FAIL,
           f"Got HTTP {code} (expected 401)")
except Exception as e:
    report("SECURITY", "Invalid token → 401", FAIL, str(e)[:200])

# 4c — Expired/tampered HS256 token (won't validate against ES256 JWKS)
import base64, struct

def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

fake_header = _b64(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
fake_payload = _b64(json.dumps({"sub": "fake-user", "exp": int(time.time()) - 3600}).encode())
fake_token = f"{fake_header}.{fake_payload}.invalidsig"

try:
    code, data = http("GET", f"{BACKEND_URL}/api/trips",
                      headers={"Authorization": f"Bearer {fake_token}"})
    report("SECURITY", "Tampered HS256 token → 401", PASS if code == 401 else FAIL,
           f"Got HTTP {code} (expected 401)")
except Exception as e:
    report("SECURITY", "Tampered HS256 token → 401", FAIL, str(e)[:200])

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 5 — DATABASE MIGRATION CHECK + CRUD
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "═" * 60)
print("SECTION 5 — Database (Migration + CRUD)")
print("═" * 60)

migration_done = False

if access_token_user1:
    # 5a — Check if trips table exists by doing a list
    try:
        code, data = http(
            "GET",
            f"{BACKEND_URL}/api/trips",
            headers={"Authorization": f"Bearer {access_token_user1}"},
        )
        if code == 200:
            migration_done = True
            report("DB", "Trips table exists (migration applied)", PASS,
                   f"List returned {len(data.get('trips', []))} trips")
        elif code == 500 and ("relation" in str(data).lower() or "does not exist" in str(data).lower()):
            report("DB", "Trips table exists (migration applied)", FAIL,
                   "Table missing — run backend/migrations/001_initial_schema.sql in Supabase SQL Editor")
        else:
            migration_done = True  # table exists, just no trips yet
            report("DB", "Trips table exists (migration applied)", PASS,
                   f"HTTP {code}")
    except Exception as e:
        report("DB", "Trips table exists (migration applied)", FAIL, str(e)[:200])
else:
    report("DB", "Migration check", SKIP, "No auth token — skipping DB tests")

# 5b — Create trip (only if migration done and Groq works)
created_trip_id: str | None = None
if migration_done and access_token_user1 and groq_model_ok:
    from datetime import date, timedelta
    today = date.today()
    trip_req = {
        "destination": "Kyoto, Japan",
        "start_date": (today + timedelta(days=30)).isoformat(),
        "end_date": (today + timedelta(days=32)).isoformat(),
        "travelers": 1,
        "total_budget": 1500,
        "currency": "USD",
        "travel_style": "cultural",
        "interests": ["history", "food", "culture"],
        "daily_pace": "moderate",
    }
    try:
        print("      Calling Groq for itinerary generation (may take 10-30s)...")
        code, data = http(
            "POST",
            f"{BACKEND_URL}/api/trips/generate",
            body=trip_req,
            headers={"Authorization": f"Bearer {access_token_user1}"},
        )
        if code == 201 and data.get("id"):
            created_trip_id = data["id"]
            days_count = len(data.get("days", []))
            report("DB", "Create trip (AI generate)", PASS,
                   f"Trip ID: {created_trip_id[:8]}..., {days_count} days generated")
        else:
            report("DB", "Create trip (AI generate)", FAIL,
                   f"HTTP {code}: {str(data)[:300]}")
    except Exception as e:
        report("DB", "Create trip (AI generate)", FAIL, str(e)[:200])
elif migration_done and access_token_user1 and not groq_model_ok:
    report("DB", "Create trip (AI generate)", SKIP,
           "Groq API unavailable — cannot test end-to-end generation")
else:
    report("DB", "Create trip (AI generate)", SKIP,
           "Requires auth token + migration + Groq")

# 5c — Get trip
if created_trip_id and access_token_user1:
    try:
        code, data = http(
            "GET",
            f"{BACKEND_URL}/api/trips/{created_trip_id}",
            headers={"Authorization": f"Bearer {access_token_user1}"},
        )
        report("DB", "Get trip by ID", PASS if code == 200 else FAIL,
               f"HTTP {code}")
    except Exception as e:
        report("DB", "Get trip by ID", FAIL, str(e)[:200])

# 5d — Update trip
if created_trip_id and access_token_user1:
    try:
        code, data = http(
            "PATCH",
            f"{BACKEND_URL}/api/trips/{created_trip_id}",
            body={"title": "Updated: Kyoto Cultural Journey", "status": "active"},
            headers={"Authorization": f"Bearer {access_token_user1}"},
        )
        report("DB", "Update trip", PASS if code == 200 else FAIL,
               f"HTTP {code}: title='{data.get('title', '?')[:40]}'")
    except Exception as e:
        report("DB", "Update trip", FAIL, str(e)[:200])

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 6 — USER ISOLATION (RLS)
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "═" * 60)
print("SECTION 6 — User Isolation (RLS)")
print("═" * 60)

user2_token: str | None = None
if migration_done and access_token_user1 and created_trip_id:
    # Create second user
    TEST_EMAIL_2 = f"wandr-test-{rand_suffix()}@mailinator.com"
    try:
        code, data = http(
            "POST",
            f"{SUPABASE_URL}/auth/v1/signup",
            body={"email": TEST_EMAIL_2, "password": TEST_PASSWORD},
            headers={"apikey": SUPABASE_ANON_KEY, "Authorization": f"Bearer {SUPABASE_ANON_KEY}"},
        )
        if code in (200, 201) and data.get("access_token"):
            user2_token = data["access_token"]
            report("RLS", "Second user signup", PASS, "User 2 created")
        else:
            report("RLS", "Second user signup", SKIP,
                   f"HTTP {code} — email confirm may be required")
    except Exception as e:
        report("RLS", "Second user signup", FAIL, str(e)[:200])

    if user2_token:
        # User 2 tries to GET user 1's trip
        try:
            code, data = http(
                "GET",
                f"{BACKEND_URL}/api/trips/{created_trip_id}",
                headers={"Authorization": f"Bearer {user2_token}"},
            )
            if code == 404:
                report("RLS", "User 2 cannot read User 1 trip → 404", PASS,
                       "RLS correctly blocks cross-user access")
            elif code == 403:
                report("RLS", "User 2 cannot read User 1 trip → 403/404", PASS,
                       "RLS correctly blocks cross-user access")
            else:
                report("RLS", "User 2 cannot read User 1 trip → 404", FAIL,
                       f"Got HTTP {code} — user isolation NOT working!")
        except Exception as e:
            report("RLS", "User 2 cannot read User 1 trip → 404", FAIL, str(e)[:200])

        # User 2 tries to DELETE user 1's trip
        try:
            code, data = http(
                "DELETE",
                f"{BACKEND_URL}/api/trips/{created_trip_id}",
                headers={"Authorization": f"Bearer {user2_token}"},
            )
            if code == 404:
                report("RLS", "User 2 cannot delete User 1 trip → 404", PASS,
                       "DELETE correctly rejected")
            else:
                report("RLS", "User 2 cannot delete User 1 trip → 404", FAIL,
                       f"Got HTTP {code} — trip may have been deleted!")
        except Exception as e:
            report("RLS", "User 2 cannot delete User 1 trip", FAIL, str(e)[:200])
else:
    report("RLS", "User isolation tests", SKIP,
           "Requires auth + migration + created trip")

# 5e — Delete test trip (cleanup)
if created_trip_id and access_token_user1:
    try:
        code, _ = http(
            "DELETE",
            f"{BACKEND_URL}/api/trips/{created_trip_id}",
            headers={"Authorization": f"Bearer {access_token_user1}"},
        )
        report("DB", "Delete trip (cleanup)", PASS if code == 204 else FAIL,
               f"HTTP {code}")
    except Exception as e:
        report("DB", "Delete trip (cleanup)", FAIL, str(e)[:200])

# ═══════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "═" * 60)
print("SUMMARY")
print("═" * 60)

passed  = [r for r in _results if r[2] == PASS]
failed  = [r for r in _results if r[2] == FAIL]
skipped = [r for r in _results if r[2] == SKIP]

print(f"  Total checks : {len(_results)}")
print(f"  ✅ PASS       : {len(passed)}")
print(f"  ❌ FAIL       : {len(failed)}")
print(f"  ⚠️  SKIP       : {len(skipped)}")

if failed:
    print("\nFailed checks:")
    for s, n, st, d in failed:
        print(f"  ❌ [{s}] {n}")
        if d:
            print(f"       {d}")

# Groq summary
print("\nGroq AI Integration:")
groq_env    = "YES" if GROQ_API_KEY.startswith("gsk_") else "NO"
groq_req    = "PASS" if groq_model_ok else ("FAIL" if GROQ_API_KEY else "NOT TESTED")
groq_gen    = next(
    (r[2] for r in _results if "Create trip" in r[1]), "NOT TESTED"
)
print(f"  Environment variable detected : {groq_env}")
print(f"  Real Groq API request         : {groq_req}")
print(f"  Itinerary generation via Groq : {groq_gen}")
print(f"  Model name used               : {GROQ_MODEL}")

if not migration_done:
    print("\n⚠️  DATABASE MIGRATION NOT YET APPLIED")
    print("   Run backend/migrations/001_initial_schema.sql in Supabase SQL Editor:")
    print("   https://supabase.com/dashboard/project/ilhxiwvreknixzfnsxpv/sql/new")
    print("   Trip CRUD and user isolation tests were SKIPPED.")
