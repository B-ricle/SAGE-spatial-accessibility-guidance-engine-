from typing import Literal
from uuid import UUID
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field
from .event import ObjectLabel


class SemanticObservation(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    type: Literal["semantic_observation"] = "semantic_observation"
    observation_id: UUID
    timestamp: AwareDatetime
    simulated: bool = Field(strict=True)
    object_label: ObjectLabel
    confidence: float | None = Field(default=None, ge=0, le=1, strict=True)
