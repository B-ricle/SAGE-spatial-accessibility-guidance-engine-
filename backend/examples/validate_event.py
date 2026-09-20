"""Run from the repository root; no server or network is required."""

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.models.event import ObstacleDetectedEvent

payload = Path(__file__).with_name("obstacle_event.json").read_text(encoding="utf-8")
event = ObstacleDetectedEvent.model_validate_json(payload)
print(event.model_dump_json(indent=2))
