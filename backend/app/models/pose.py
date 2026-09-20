"""Simulation-only pose contract; coordinates are not real localization."""
from typing import Literal
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field


class PoseUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    type: Literal["pose_update"] = "pose_update"
    simulated: Literal[True] = True
    coordinate_frame: Literal["demo_room"] = "demo_room"
    units: Literal["meters"] = "meters"
    sequence: int = Field(ge=0)
    timestamp: AwareDatetime
    x: float
    z: float
