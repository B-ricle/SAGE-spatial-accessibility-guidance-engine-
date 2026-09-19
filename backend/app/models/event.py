"""A semantic obstacle observation, not a navigation or warning decision."""

from typing import Annotated, Literal
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, StringConstraints

Identifier = Annotated[
    str, StringConstraints(strict=True, strip_whitespace=True, min_length=1, max_length=128)
]
ObjectLabel = Annotated[
    str, StringConstraints(strict=True, strip_whitespace=True, min_length=1, max_length=80)
]


class ObstacleDetectedEvent(BaseModel):
    """One meaningful labeled observation produced by the device.

    Producers assign event_id once and retain it on retry. Timestamp is the
    observation time with a UTC offset, not backend receipt time. Optional
    fields represent unavailable evidence as None, never as a safety judgment.
    """

    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    event_id: UUID
    timestamp: AwareDatetime
    device_id: Identifier
    object_label: ObjectLabel
    event_type: Literal["obstacle_detected"] = "obstacle_detected"
    environment_id: Identifier | None = None
    confidence: float | None = Field(default=None, ge=0, le=1, strict=True)
    distance_m: float | None = Field(default=None, ge=0, strict=True)
    direction: Literal["front", "left", "right", "behind"] | None = None
