"""Backend settings. Secrets never enter the frontend build."""
from pathlib import Path
from pydantic import AliasChoices, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="SAGE_", env_file=Path(__file__).resolve().parents[2] / ".env",
        env_file_encoding="utf-8", extra="ignore", str_strip_whitespace=True,
    )
    app_title: str = Field(default="SAGE API", min_length=1)
    supabase_url: str = "https://iapsirheddgaiksxienc.supabase.co"
    supabase_publishable_key: str = "sb_publishable_B4ZKE4v-tQA9-D_sRaKhHg_zoxVvEUI"
    gemini_api_key: SecretStr | None = Field(default=None, validation_alias=AliasChoices("SAGE_GEMINI_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY"))
    gemini_model: str = "gemini-3.5-flash"
    allowed_origins: list[str] = ["http://127.0.0.1:5173", "http://localhost:5173", "http://127.0.0.1:5174", "capacitor://localhost"]
    demo_enabled: bool = True
