# SAGE backend: Phase 1

Run these PowerShell commands from the repository root. Python 3.13 is the
currently verified runtime. If you do not have a virtual environment yet,
create one with `py -3.13 -m venv .venv`.

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
```

Use `--reload` for local development only. Stop the server with Ctrl+C.

## Configuration

Defaults work without configuration. Optionally copy `backend/.env.example`
to `backend/.env` if that file does not already exist, then edit it.
`SAGE_APP_TITLE` controls the title in the generated API documentation and must
not be blank. Process environment variables override values in the file.
The file path is resolved relative to the backend, independent of the shell's
working directory. Restart the server after changing settings.

Never commit secrets. `.env` files and virtual environments are ignored;
`.env.example` contains safe placeholders only. Unknown dotenv keys are ignored
so future services can share the file; misspelled setting names therefore will
not produce an error.

## Verify

With the server running, use a second PowerShell window:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/
Invoke-RestMethod http://127.0.0.1:8000/health
```

Expected JSON is `{"name":"SAGE","status":"running"}` and
`{"status":"healthy"}`, respectively. Both should return HTTP 200.
Open http://127.0.0.1:8000/docs and try both GET endpoints. The health response
schema is also available at http://127.0.0.1:8000/openapi.json.
An unknown route should return FastAPI's standard HTTP 404 response.

`/health` indicates that this API process responds. It does not check a database,
hardware, sensor quality, collision processing, or whether navigation is safe.

## Code and decisions

- `app/main.py` creates FastAPI, keeps the existing two endpoints, and declares
  the small `HealthResponse` model. `Literal["healthy"]` makes the permitted
  health status explicit in validation and OpenAPI.
- `app/config.py` uses `pydantic-settings` to read and validate configuration.
  Invalid recognized settings fail at startup instead of failing during a request.
- `requirements.txt` pins the direct dependencies verified in the local environment;
  it is not a complete lockfile for transitive dependencies.
- FastAPI's default exception handling remains in place. There are no custom
  domain errors to handle yet, and debug tracebacks are not enabled.
- Routes stay together because two small endpoints do not need a service layer.

Only the backend foundation is implemented here. Navigation events, persistence,
and edge processing belong to later sections.
