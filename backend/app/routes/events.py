from fastapi import APIRouter

from ..models.event import ObstacleDetectedEvent

router = APIRouter(prefix="/events", tags=["events"])


@router.post("", response_model=ObstacleDetectedEvent, status_code=200)
def receive_event(event: ObstacleDetectedEvent) -> ObstacleDetectedEvent:
    """Validate and echo an obstacle event. No storage or warning is triggered."""
    return event
