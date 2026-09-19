import json
from pathlib import Path
import sys
import unittest

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.main import app


class EventApiTests(unittest.TestCase):
    def setUp(self):
        path = Path(__file__).resolve().parents[1] / "examples" / "obstacle_event.json"
        self.payload = json.loads(path.read_text(encoding="utf-8"))
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def test_valid_event_is_echoed_without_changing_identity(self):
        response = self.client.post("/events", json=self.payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), self.payload)

    def test_minimal_event_keeps_unknown_evidence_null(self):
        payload = {key: self.payload[key] for key in (
            "event_id", "timestamp", "device_id", "object_label"
        )}
        response = self.client.post("/events", json=payload)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["event_type"], "obstacle_detected")
        for field in ("environment_id", "confidence", "distance_m", "direction"):
            self.assertIsNone(body[field])

    def test_invalid_requests_return_field_errors(self):
        for field, value in (
            ("confidence", 1.2),
            ("distance_m", -1),
            ("timestamp", "2026-09-19T15:30:00"),
            ("warning_type", "stop"),
        ):
            with self.subTest(field=field):
                response = self.client.post("/events", json={**self.payload, field: value})
                self.assertEqual(response.status_code, 422)
                locations = [error["loc"] for error in response.json()["detail"]]
                self.assertIn(["body", field], locations)

    def test_missing_body_and_malformed_json_are_rejected(self):
        self.assertEqual(self.client.post("/events").status_code, 422)
        response = self.client.post(
            "/events", content="{", headers={"Content-Type": "application/json"}
        )
        self.assertEqual(response.status_code, 422)

    def test_repeated_submission_preserves_event_id(self):
        for _ in range(2):
            response = self.client.post("/events", json=self.payload)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["event_id"], self.payload["event_id"])

    def test_existing_routes_and_documented_contract(self):
        self.assertEqual(self.client.get("/").json(), {"name": "SAGE", "status": "running"})
        self.assertEqual(self.client.get("/health").json(), {"status": "healthy"})
        self.assertEqual(self.client.get("/docs").status_code, 200)
        operation = self.client.get("/openapi.json").json()["paths"]["/events"]["post"]
        self.assertTrue(operation["requestBody"]["required"])
        self.assertIn("200", operation["responses"])
        self.assertIn("422", operation["responses"])
        self.assertEqual(self.client.get("/events").status_code, 405)


if __name__ == "__main__":
    unittest.main()
