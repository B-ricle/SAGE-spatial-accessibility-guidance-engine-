"""Validate the bearer token with Supabase, not with client claims."""
import httpx
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from .config import Settings

bearer = HTTPBearer(auto_error=False)


async def require_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> str:
    if not credentials:
        raise HTTPException(401, "Sign in before analyzing images.")
    settings = Settings()
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(settings.supabase_url.rstrip('/') + '/auth/v1/user', headers={
                'apikey': settings.supabase_publishable_key,
                'Authorization': 'Bearer ' + credentials.credentials,
            })
        if response.status_code in (401, 403):
            raise HTTPException(401, "Session expired. Sign in again.")
        response.raise_for_status()
        user_id = response.json().get('id')
        if not user_id:
            raise HTTPException(401, "Invalid session.")
        return user_id
    except (httpx.HTTPError, ValueError):
        raise HTTPException(503, "Authentication service unavailable.") from None
