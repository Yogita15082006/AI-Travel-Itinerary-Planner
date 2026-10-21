"""
JWT verification for Supabase tokens.
Primary path: JWKS-based verification (ES256/RS256) via Supabase's well-known endpoint.
Fallback: HS256 symmetric verification when SUPABASE_JWT_SECRET is configured.
"""
import logging
import time
from typing import Optional

from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings

logger = logging.getLogger(__name__)
security = HTTPBearer()

# ── JWKS cache ─────────────────────────────────────────────────────────────────
_jwks_cache: Optional[dict] = None
_jwks_cache_time: float = 0
_JWKS_TTL = 3600  # seconds


def _fetch_jwks() -> dict:
    """Fetch and cache JWKS from Supabase's public well-known endpoint."""
    global _jwks_cache, _jwks_cache_time
    now = time.time()
    if _jwks_cache and (now - _jwks_cache_time) < _JWKS_TTL:
        return _jwks_cache

    import httpx
    url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
    try:
        resp = httpx.get(url, timeout=10)
        resp.raise_for_status()
        _jwks_cache = resp.json()
        _jwks_cache_time = now
        logger.info("JWKS refreshed from %s", url)
        return _jwks_cache
    except Exception as exc:
        logger.error("Failed to fetch JWKS from %s: %s", url, exc)
        if _jwks_cache:
            logger.warning("Using stale JWKS cache.")
            return _jwks_cache
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable: cannot reach Supabase JWKS endpoint.",
        )


def decode_supabase_token(token: str) -> dict:
    """
    Decode and validate a Supabase JWT.

    Verification order:
    1. Inspect header algorithm.
    2. If ES256/RS256 (modern Supabase) → fetch JWKS and verify with public key.
    3. If HS256 and SUPABASE_JWT_SECRET is set → verify symmetrically.
    4. Otherwise raise 503.
    """
    if not settings.auth_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured. Set SUPABASE_URL or SUPABASE_JWT_SECRET.",
        )

    import jwt as pyjwt

    try:
        header = pyjwt.get_unverified_header(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    alg = header.get("alg", "HS256")
    kid = header.get("kid")

    try:
        if alg in ("ES256", "RS256", "ES384", "RS384", "EdDSA"):
            # Modern asymmetric Supabase project — use JWKS
            jwks = _fetch_jwks()
            keys = jwks.get("keys", [])
            if not keys:
                raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                                    detail="No keys in JWKS.")
            key_data = next((k for k in keys if kid and k.get("kid") == kid), keys[0])
            public_key = pyjwt.algorithms.ECAlgorithm.from_jwk(key_data)
            payload = pyjwt.decode(
                token, public_key, algorithms=[alg], options={"verify_aud": False}
            )
        elif settings.supabase_jwt_secret:
            # Legacy symmetric project with shared secret
            payload = pyjwt.decode(
                token, settings.supabase_jwt_secret,
                algorithms=["HS256"], options={"verify_aud": False}
            )
        elif settings.supabase_url:
            # We have JWKS available but the token claims HS256 — this is
            # either a tampered token or from a different project. Reject as 401.
            raise pyjwt.exceptions.InvalidTokenError(
                "Token uses HS256 but this project uses asymmetric signing. "
                "Token may be forged or from a different project."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Cannot verify token: authentication is not configured.",
            )
        return payload

    except pyjwt.exceptions.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except pyjwt.exceptions.InvalidTokenError as exc:
        logger.warning("JWT validation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unexpected error during JWT verification: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token verification failed.",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> dict:
    """FastAPI dependency: verify token and return user dict with raw token."""
    token = credentials.credentials
    payload = decode_supabase_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token does not contain a valid user identifier.",
        )
    return {
        "id": user_id,
        "email": payload.get("email", ""),
        "role": payload.get("role", "authenticated"),
        "token": token,  # raw JWT — used by supabase_client for RLS
    }


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(
        HTTPBearer(auto_error=False)
    ),
) -> Optional[dict]:
    """Optional auth — returns None if no token provided."""
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None
