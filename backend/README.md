# SAGE backend

Run from the repository root:

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend\requirements-dev.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
```

- GET `/health`: API liveness only.
- POST `/events`: validates and echoes an obstacle event; no persistence.
- WebSocket `/ws/demo`: simulated pose, semantic observations, hazards and status.
- POST `/api/analyze`: Supabase bearer token required; raw JPEG/PNG body up to 5 MB.
  Calls Gemini, returning validated semantic observations with unknown confidence/location.

Configuration is read from repository-root `.env`; see `.env.example` in this folder.
The default CORS origins are local development plus `capacitor://localhost`. Set exact
production origins before hosting. Raw uploads are normalized in memory, never stored.
Errors do not reveal provider credentials or raw provider responses. The process-local
analysis limiter is a demo safeguard; use shared limits at production ingress.

Tests:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s backend\tests -v
```

See the repository README for the full laptop-only flow, Supabase migration, message
contracts, Vercel configuration and iOS handoff. No Pi is required to run the simulator.
