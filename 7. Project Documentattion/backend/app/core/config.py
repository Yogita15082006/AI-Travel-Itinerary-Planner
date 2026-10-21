from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import Optional
import logging


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    # Groq AI
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    # Application
    frontend_origin: str = "http://localhost:5173"
    environment: str = "development"
    log_level: str = "INFO"

    # Rate limiting
    ai_rate_limit_per_hour: int = 10
    ai_request_timeout: int = 120

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def supabase_configured(self) -> bool:
        """True when the minimum Supabase credentials (URL + anon key) are present."""
        return bool(self.supabase_url and self.supabase_anon_key)

    @property
    def supabase_uses_service_role(self) -> bool:
        """True when a privileged service-role key is available (bypasses RLS)."""
        return bool(self.supabase_service_role_key)

    @property
    def ai_configured(self) -> bool:
        return bool(self.groq_api_key)

    @property
    def auth_configured(self) -> bool:
        """True when JWTs can be verified — either via shared secret or JWKS endpoint."""
        return bool(self.supabase_jwt_secret or self.supabase_url)


settings = Settings()

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)
