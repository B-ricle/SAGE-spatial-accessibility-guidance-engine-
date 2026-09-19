from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel

from .config import Settings

settings = Settings()

app = FastAPI(
    title=settings.app_title,
    version="0.1.0",
)


class HealthResponse(BaseModel):
    status: Literal["healthy"] = "healthy"


@app.get("/")
def root():
    return {"name": "SAGE", "status": "running"}


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Process liveness only; does not assess sensors or navigation safety."""
    return HealthResponse()
