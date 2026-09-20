"""Deterministic example content; no model inference or camera input."""
from datetime import datetime, timezone
from uuid import uuid4
from ..models.semantic import SemanticObservation


def demo_observation() -> SemanticObservation:
    return SemanticObservation(
        observation_id=uuid4(), timestamp=datetime.now(timezone.utc),
        simulated=True, object_label="backpack", confidence=0.91,
    )
