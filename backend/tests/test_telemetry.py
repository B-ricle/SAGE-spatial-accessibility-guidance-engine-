import sys
from pathlib import Path
import unittest
from fastapi.testclient import TestClient
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.main import app
from app.models.pose import PoseUpdate
from app.models.semantic import SemanticObservation


class TelemetryTests(unittest.TestCase):
    def test_demo_contract_and_sequence(self):
        with TestClient(app) as client:
            with client.websocket_connect('/ws/demo') as socket:
                first = PoseUpdate.model_validate_json(socket.receive_text())
                observation = SemanticObservation.model_validate_json(socket.receive_text())
                self.assertTrue(observation.simulated)
                self.assertEqual(observation.object_label, 'backpack')
                second = PoseUpdate.model_validate_json(socket.receive_text())
                self.assertTrue(first.simulated)
                self.assertEqual(first.coordinate_frame, 'demo_room')
                self.assertEqual(first.sequence, 0)
                self.assertEqual(second.sequence, 1)
                self.assertGreaterEqual(second.timestamp, first.timestamp)
                self.assertNotEqual(first.x, second.x)
            with client.websocket_connect('/ws/demo') as socket:
                self.assertEqual(socket.receive_json()['sequence'], 0)
