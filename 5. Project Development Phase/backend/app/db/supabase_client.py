"""
Supabase client for server-side database access.

Two modes:
1. Service-role key (if SUPABASE_SERVICE_ROLE_KEY is set): bypasses RLS.
   Ownership is enforced at the application layer via .eq("user_id", user_id).
2. Anon key + user JWT (fallback): the user's JWT is injected into the
   PostgREST client so Supabase RLS policies (auth.uid() = user_id) apply.
"""
from typing import Optional
import logging

from supabase import create_client, Client
from app.core.config import settings

logger = logging.getLogger(__name__)

_service_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """
    Return a Supabase client for anonymous server-side use.
    Uses service-role key when available (bypasses RLS).
    Otherwise uses anon key — callers MUST use get_authed_client(token) for
    any operation that requires RLS context.
    """
    global _service_client
    if _service_client is None:
        if not settings.supabase_configured:
            raise RuntimeError(
                "Supabase is not configured. Please set SUPABASE_URL and "
                "SUPABASE_ANON_KEY in your .env file."
            )
        key = (
            settings.supabase_service_role_key
            if settings.supabase_uses_service_role
            else settings.supabase_anon_key
        )
        mode = "service-role" if settings.supabase_uses_service_role else "anon"
        _service_client = create_client(settings.supabase_url, key)
        logger.info("Supabase client initialised (%s key).", mode)
    return _service_client


def get_authed_client(user_token: str) -> Client:
    """
    Return a Supabase client authenticated with the given user JWT.
    Sets the Authorization header on the PostgREST client so that
    Supabase RLS policies (auth.uid() = user_id) apply correctly.

    Used when the service-role key is not available.
    """
    if not settings.supabase_configured:
        raise RuntimeError(
            "Supabase is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY."
        )
    client = create_client(settings.supabase_url, settings.supabase_anon_key)
    # Inject user JWT so RLS can evaluate auth.uid()
    client.postgrest.auth(user_token)
    return client


def get_db(user_token: Optional[str] = None) -> Client:
    """
    Convenience function. Returns:
    - Service-role client if SUPABASE_SERVICE_ROLE_KEY is configured, OR
    - User-authed client if user_token is provided, OR
    - Anon client as a last resort (RLS will block most writes).
    """
    if settings.supabase_uses_service_role:
        return get_supabase_client()
    if user_token:
        return get_authed_client(user_token)
    return get_supabase_client()
