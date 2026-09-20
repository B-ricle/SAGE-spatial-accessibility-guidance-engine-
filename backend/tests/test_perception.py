import sys
from pathlib import Path
import unittest
from io import BytesIO
from unittest.mock import AsyncMock, patch
from PIL import Image
from fastapi.testclient import TestClient
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.main import app
from app.security import require_user
from app.services.perception import normalize_image
from app.services.risk import projected_risk
from app.routes.perception import last_call


class PerceptionTests(unittest.TestCase):
    def setUp(self):
        last_call.clear()
        self.client = TestClient(app)
        self.addCleanup(self.client.close)
        self.addCleanup(app.dependency_overrides.clear)

    def test_auth_required(self):
        self.assertEqual(self.client.post('/api/analyze', content=b'x', headers={'content-type':'image/png'}).status_code, 401)

    def test_image_decode(self):
        output = BytesIO()
        Image.new('RGB', (20, 20), 'white').save(output, 'PNG')
        self.assertTrue(normalize_image(output.getvalue()).startswith(b'\xff\xd8'))
        with self.assertRaises(ValueError): normalize_image(b'not an image')

    def test_authenticated_provider_contract(self):
        app.dependency_overrides[require_user] = lambda: 'test-user'
        with patch.dict('os.environ', {'GEMINI_API_KEY':'test-only'}), patch('app.routes.perception.analyze', new=AsyncMock(return_value=[])) as analyze:
            response = self.client.post('/api/analyze', content=b'placeholder', headers={'content-type':'image/png'})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json(), [])
            self.assertEqual(analyze.await_count, 1)
            self.assertEqual(self.client.post('/api/analyze', content=b'x', headers={'content-type':'image/png'}).status_code, 429)

    def test_unsupported_and_invalid_uploads(self):
        app.dependency_overrides[require_user] = lambda: 'test-user'
        with patch.dict('os.environ', {'GEMINI_API_KEY':'test-only'}):
            self.assertEqual(self.client.post('/api/analyze', content=b'x').status_code, 415)
            self.assertEqual(self.client.post('/api/analyze', content=b'x', headers={'content-type':'image/png'}).status_code, 400)
            last_call.clear()
            self.assertEqual(self.client.post('/api/analyze', content=b'x' * (5*1024*1024+1), headers={'content-type':'image/png'}).status_code, 413)

    def test_provider_failure_is_sanitized(self):
        app.dependency_overrides[require_user] = lambda: 'test-user'
        with patch.dict('os.environ', {'GEMINI_API_KEY':'test-only'}), patch('app.routes.perception.analyze', new=AsyncMock(side_effect=RuntimeError('secret provider detail'))):
            response = self.client.post('/api/analyze', content=b'x', headers={'content-type':'image/png'})
            self.assertEqual(response.status_code, 502)
            self.assertNotIn('secret provider detail', response.text)

    def test_projected_risk(self):
        self.assertEqual(projected_risk(0,0,0,1,0,1), 'high')
        self.assertEqual(projected_risk(0,0,0,1,2,1), 'caution')
        self.assertEqual(projected_risk(0,0,0,-1,0,1), 'caution')
        self.assertEqual(projected_risk(0,0,0,0,0,.2), 'high')
        with self.assertRaises(ValueError): projected_risk(float('nan'),0,0,1,0,1)
