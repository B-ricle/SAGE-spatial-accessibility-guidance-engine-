from typing import Literal
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field


class DemoHazard(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)
    id: str
    x: float
    z: float
    radius_m: float = Field(gt=0, le=20)
    severity: Literal['caution', 'high']


class HazardUpdate(BaseModel):
    type: Literal['hazard_update'] = 'hazard_update'
    simulated: Literal[True] = True
    timestamp: AwareDatetime
    coordinate_frame: Literal['demo_room'] = 'demo_room'
    units: Literal['meters'] = 'meters'
    hazards: list[DemoHazard]


class SystemStatus(BaseModel):
    type: Literal['system_status'] = 'system_status'
    simulated: Literal[True] = True
    timestamp: AwareDatetime
    localization: Literal['active', 'unavailable']
    perception: Literal['active', 'unavailable']
