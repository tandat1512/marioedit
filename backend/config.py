from __future__ import annotations

import os
from functools import lru_cache
from typing import List

from pydantic import BaseModel, Field


class Settings(BaseModel):
    debug: bool = Field(default=os.getenv("BEAUTY_DEBUG", "0") == "1")
    allowed_origins: List[str] = Field(
        default_factory=lambda: [
            origin.strip()
            for origin in os.getenv("BEAUTY_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000").split(",")
            if origin.strip()
        ]
    )
    vertex_project_id: str | None = Field(default=os.getenv("VERTEX_PROJECT_ID"))
    vertex_location: str = Field(default=os.getenv("VERTEX_LOCATION", "asia-southeast1"))
    vertex_model_name: str = Field(default=os.getenv("VERTEX_MODEL_NAME", "gemini-1.5-pro-preview-0514"))
    vertex_enabled: bool = Field(
        default=os.getenv("VERTEX_ENABLED", "auto").lower() in {"1", "true", "auto"}
    )
    gemini_api_key: str | None = Field(default=os.getenv("GEMINI_API_KEY"))
    gemini_model_name: str = Field(default=os.getenv("GEMINI_MODEL_NAME", "gemini-1.5-flash"))
    ai_pro_timeout: float = Field(default=float(os.getenv("AI_PRO_TIMEOUT", "30")))


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

