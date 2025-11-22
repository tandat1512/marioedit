from __future__ import annotations

import os
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    allowed_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]
    
    class Config:
        env_file = ".env"
        case_sensitive = False
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Allow environment variable to override allowed_origins
        # Format: "https://domain1.com,https://domain2.com"
        env_origins = os.getenv("ALLOWED_ORIGINS")
        if env_origins:
            self.allowed_origins.extend([origin.strip() for origin in env_origins.split(",") if origin.strip()])


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()

