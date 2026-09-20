import asyncio
import time
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from ..config import Settings
from ..security import require_user
from ..services.perception import analyze
from ..models.semantic import SemanticObservation

router = APIRouter()
# Small single-process demo guard; production needs an ingress/shared rate limiter.
slots = asyncio.Semaphore(2)
last_call: dict[str, float] = {}


@router.post('/api/analyze', response_model=list[SemanticObservation])
async def analyze_image(request: Request, user_id: str = Depends(require_user)):
    settings = Settings()
    if not settings.gemini_api_key:
        raise HTTPException(503, 'Gemini is not configured on the backend.')
    if request.headers.get('content-type', '').split(';')[0] not in ('image/jpeg', 'image/png'):
        raise HTTPException(415, 'Upload a JPEG or PNG image.')
    now = time.monotonic()
    for key in list(last_call):
        if now - last_call[key] >= 10:
            del last_call[key]
    if user_id in last_call or len(last_call) >= 100:
        raise HTTPException(429, 'Wait 10 seconds before another analysis.')
    last_call[user_id] = now
    data = bytearray()
    async for chunk in request.stream():
        data.extend(chunk)
        if len(data) > 5 * 1024 * 1024:
            raise HTTPException(413, 'Image exceeds 5 MB.')
    try:
        async with asyncio.timeout(60):
            async with slots:
                return await analyze(bytes(data), settings)
    except ValueError:
        raise HTTPException(400, 'Invalid image. Use JPEG/PNG up to 16 megapixels.') from None
    except (TimeoutError, httpx.TimeoutException):
        raise HTTPException(504, 'Image analysis timed out. Try again later.') from None
    except (httpx.HTTPError, RuntimeError):
        raise HTTPException(502, 'Image analysis unavailable or returned invalid data.') from None
