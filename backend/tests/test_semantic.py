import sys
from pathlib import Path
import unittest
from pydantic import ValidationError
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.models.semantic import SemanticObservation
from app.services.demo import demo_observation


class SemanticTests(unittest.TestCase):
    def test_demo_and_round_trip(self):
        event = demo_observation()
        self.assertEqual(event, SemanticObservation.model_validate_json(event.model_dump_json()))
        self.assertTrue(event.simulated)
        self.assertNotEqual(event.observation_id, demo_observation().observation_id)

    def test_optional_confidence_and_no_spatial_claims(self):
        payload = demo_observation().model_dump()
        del payload['confidence']
        self.assertIsNone(SemanticObservation.model_validate(payload).confidence)
        for field, value in [('confidence', 1.2), ('confidence', float('nan')),
                             ('simulated', 'true'), ('object_label', ' '),
                             ('timestamp', '2026-09-19T12:00:00'), ('distance_m', 1),
                             ('hazard', True)]:
            with self.subTest(field=field), self.assertRaises(ValidationError):
                SemanticObservation.model_validate({**payload, field: value})
