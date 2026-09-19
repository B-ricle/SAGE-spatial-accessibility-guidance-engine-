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
to `.env` at the repository root only if that file does not already exist. Preserve existing keys.
`SAGE_APP_TITLE` controls the title in the generated API documentation and must
not be blank. Process environment variables override values in the file.
The file path points to the repository root, independent of the shell's
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

## Section 2: Event data model

The standalone obstacle event contract, field decisions, code walkthrough, and
isolated test commands are documented in [Event data model](docs/event-model.md).
This adds no API endpoint or external integration.

## Section 3: Event API

`POST /events` validates an `ObstacleDetectedEvent` and returns it with HTTP 200.
It does not save, queue, deduplicate, or log the event payload, or trigger warnings.
There is no event retrieval endpoint yet. Keep the development server bound to
127.0.0.1; this section does not add authentication or deployment configuration.

`app/routes/events.py` uses FastAPI's `APIRouter` to group the event endpoint.
`main.py` registers that router with `app.include_router`. The typed `event`
parameter makes FastAPI validate JSON using the existing Pydantic model before
calling `receive_event`. Valid input reaches the function and is returned through
the declared response model. Invalid input produces FastAPI's standard HTTP 422
response with a `detail` list identifying the failing fields. No service layer is
needed until the route has storage or other business operations to delegate.

### Manual check

From the repository root, start the backend:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:8000/docs, expand POST /events, choose Try it out, and paste
the contents of `backend/examples/obstacle_event.json`. Execute the request.
Expect HTTP 200 with the same event. Change confidence to 1.2 and execute again:
expect HTTP 422 with an error pointing to confidence.

Alternatively, from a second PowerShell window at the repository root:

```powershell
$eventJson = Get-Content backend\examples\obstacle_event.json -Raw
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/events -ContentType 'application/json' -Body $eventJson
```

Connection refused means the server is not running at that address. A 404 on POST
/events usually means an older app process is running; restart with the command
above. GET /events returns 405 because only POST is supported. Validation errors
are expected for malformed JSON, missing required fields, and unsupported values.

### Automated checks

No running server is required. HTTPX is a development-only dependency used by
FastAPI's TestClient, which exercises the app in-process without network calls.

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend\requirements-dev.txt
.\.venv\Scripts\python.exe -m unittest discover -s backend\tests -v
```

Expect 11 passing tests across the model and API. Tests cover valid and minimal
requests, validation errors, malformed/missing bodies, repeated IDs, existing
routes, and the OpenAPI contract. Acceptance of a repeated ID is not deduplication.
The next section is MongoDB integration, only after explicit approval.
