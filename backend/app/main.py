from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel

from .config import Settings
from .routes.events import router as events_router
from .routes.telemetry import router as telemetry_router

settings = Settings()

app = FastAPI(
    title=settings.app_title,
    version="0.1.0",
)


app.include_router(events_router)
app.include_router(telemetry_router)


class HealthResponse(BaseModel):
    status: Literal["healthy"] = "healthy"


@app.get("/")
def root():
    return {"name": "SAGE", "status": "running"}


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Process liveness only; does not assess sensors or navigation safety."""
    return HealthResponse()
