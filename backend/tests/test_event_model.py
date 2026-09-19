from pathlib import Path
import sys
import unittest

from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.models.event import ObstacleDetectedEvent


class EventModelTests(unittest.TestCase):
    def setUp(self):
        self.payload = {
            "event_id": "b7525210-a4bb-4d10-8fa6-9bb5da759062",
            "timestamp": "2026-09-19T15:30:00-04:00",
            "device_id": "wearable-pi-01",
            "object_label": "backpack",
        }

    def test_minimal_observation_does_not_invent_measurements(self):
        event = ObstacleDetectedEvent.model_validate(self.payload)
        for field in ("environment_id", "confidence", "distance_m", "direction"):
            self.assertIsNone(getattr(event, field))

    def test_example_survives_json_round_trip(self):
        path = Path(__file__).resolve().parents[1] / "examples" / "obstacle_event.json"
        event = ObstacleDetectedEvent.model_validate_json(path.read_text())
        restored = ObstacleDetectedEvent.model_validate_json(event.model_dump_json())
        self.assertEqual(event, restored)
        self.assertEqual(str(restored.event_id), self.payload["event_id"])
        self.assertEqual(restored.timestamp.utcoffset().total_seconds(), -14400)

    def test_required_fields_cannot_be_omitted(self):
        for field in self.payload:
            with self.subTest(field=field):
                payload = dict(self.payload)
                del payload[field]
                with self.assertRaises(ValidationError):
                    ObstacleDetectedEvent.model_validate(payload)

    def test_invalid_evidence_is_rejected(self):
        cases = [
            ("event_id", "not-a-uuid"),
            ("timestamp", "2026-09-19T15:30:00"),
            ("device_id", "   "),
            ("device_id", 123),
            ("environment_id", ""),
            ("object_label", "  "),
            ("object_label", "a" * 81),
            ("confidence", -0.1),
            ("confidence", 1.1),
            ("confidence", float("nan")),
            ("confidence", True),
            ("distance_m", -1),
            ("distance_m", float("inf")),
            ("distance_m", "0.9"),
            ("direction", "north"),
            ("event_type", "collision_warning"),
            ("warning_type", "stop"),
            ("distance", 0.9),
        ]
        for field, value in cases:
            with self.subTest(field=field, value=value):
                with self.assertRaises(ValidationError):
                    ObstacleDetectedEvent.model_validate({**self.payload, field: value})

    def test_valid_boundaries_and_whitespace(self):
        for confidence in (0, 1):
            event = ObstacleDetectedEvent.model_validate({
                **self.payload, "confidence": confidence, "distance_m": 0,
                "object_label": " backpack ",
            })
            self.assertEqual(event.object_label, "backpack")
            self.assertEqual(event.distance_m, 0)


if __name__ == "__main__":
    unittest.main()
