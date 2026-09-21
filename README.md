# SAGE — Spatial Accessibility Guidance Engine

SAGE is an accessibility research prototype intended to help people understand their surroundings. The long-term goal is a wearable system combining environmental sensing, mapping, perception, and accessible guidance.

**This repository currently provides a web application, a Python API, and a laptop simulator.** It does not yet provide a complete wearable navigation system or validated collision-avoidance guidance. No Raspberry Pi is required to run the software demonstration.

## What currently works

| Component | Implemented behavior |
| --- | --- |
| Web application | React interface with light/dark themes, responsive layout, connection status, and observations. |
| 3D environment | Three.js demo room, simulated position/hazards, and local loading of self-contained GLB files up to 30 MB. |
| Simulator | Backend WebSocket sends simulated positions, observations, hazards, and system status. |
| External data display | Connects to a compatible WebSocket endpoint, validates messages, and marks stale data. |
| Accounts | Supabase email/password sign-up, sign-in, local sign-out, password reset, and password changes. |
| Saved data | Signed-in users can save observations, fetch their latest 50 saved observations, and explicitly save/load their account theme. |
| Image analysis | A signed-in user can select a JPEG/PNG, consent to sending it to Gemini through the backend, and receive object labels. This is single-image analysis, not a live camera feed. |
| Audio | Optional browser/device speech for high-priority hazard reports, where supported. |
| iOS preparation | A Capacitor iOS project wraps the web application. Mac/Xcode build, signing, and device validation are still required. |

GLB models stay on the local device; loading one does not create a sensor feed. Position and hazard overlays require matching coordinate frames. Coordinates use meters, X/Z for the floor plane, and Y for height.

Image analysis does not provide reliable distances, 3D object locations, or collision risk. Confidence values are unknown. Images are processed in memory by the backend and are not saved by this application; the selected image is sent to Google Gemini. Saving history stores observations, not images.

## Current limits and future work

The intended wearable pipeline is sensing → mapping/localization → perception → backend → application → guidance.

The demonstration uses simulated telemetry in place of hardware. Real RGB-D/IMU integration, SLAM, persistent spatial maps, haptic feedback, and calibrated navigation guidance remain future integration work. The simulator includes simple projected-risk geometry; it is not evidence of real-world navigation safety.

Gemini is an external model service. This repository does not implement model training, a validated perception evaluation pipeline, or Databricks integration. Supabase currently stores observations and theme preferences, not building models or persistent environment maps.

## Repository layout

- `frontend/`: React/Vite application, Three.js renderer, browser tests, and Capacitor iOS project.
- `backend/`: FastAPI application, simulator, image-analysis service, and Python tests.
- `supabase/migrations/001_user_data.sql`: application tables, grants, and row-level security policies.
- `hardware/`, `models/`, `data/`: additional project directories; not required for the simulator.

## Run locally without a Pi

Use Python 3.13 (matching the backend Docker image) and Node.js 22.12 or newer. Run these PowerShell commands from the repository root.

### Backend

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements-dev.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
```

The simulator works without a Gemini key. For image analysis, create or edit the repository-root `.env` using [backend/.env.example](backend/.env.example) as a reference. Preserve existing values if the file already exists.

| Backend variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Private Gemini credential; backend only. |
| `SAGE_GEMINI_MODEL` | Provider model name. Current code default: `gemini-3.5-flash`; availability depends on provider/account. |
| `SAGE_SUPABASE_URL` | Supabase project used to verify access tokens. |
| `SAGE_SUPABASE_PUBLISHABLE_KEY` | Publishable key for that same project. |
| `SAGE_ALLOWED_ORIGINS` | JSON array of allowed frontend origins. |
| `SAGE_DEMO_ENABLED` | Enables the demo WebSocket; defaults to `true`. |

The backend reads the root `.env`; hosted environment variables can supply these settings instead. Configure the same Supabase project in the frontend and backend.

### Frontend

In another terminal, from the repository root:

```powershell
npm.cmd --prefix frontend ci
npm.cmd --prefix frontend run dev
```

Open http://127.0.0.1:5173 and select **Connect** to receive simulated data.

Create or edit `frontend/.env.local` for account features:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Leave `VITE_API_URL` and `VITE_WS_URL` unset for default local development: Vite proxies `/api` and `/ws` to port 8000. The [frontend example](frontend/.env.example) includes deployment placeholders; replace or omit them rather than using them literally. Restart Vite after changing its environment.

All `VITE_` variables are public browser configuration. Never put Gemini credentials, Supabase secret keys, or service-role keys in them. Local environment files are ignored by Git.

## Supabase setup and account behavior

1. Select a Supabase project and obtain its project URL and publishable key.
2. In the SQL Editor, run the complete [migration](supabase/migrations/001_user_data.sql). Do not create the tables manually first.
3. Confirm `observations` and `preferences` appear under `public`. A successful SQL run reporting no rows is normal: the migration creates structures, not sample records.
4. Configure frontend and backend public settings for that project.
5. Enable the Email provider in Authentication settings. Configure the site's URL and allowed redirect URLs for password-reset links.

For registration without a confirmation email, turn **Confirm email off** in the Email provider settings. Supabase can then return a session immediately on successful sign-up. This allows unverified email addresses; it does not remove the password requirement. With confirmation enabled, new users must complete the email step before signing in. See [Supabase authentication configuration](https://supabase.com/docs/guides/auth/general-configuration).

The app displays **You are signed in** when sign-up or sign-in returns a session, and the account panel shows the user's email. Supabase persists sessions in browser storage and restores them on reload. A confirmation response without a session is not treated as a successful login.

Password reset still requires email delivery even when sign-up confirmation is disabled. Configure email delivery and redirect URLs before relying on it. Do not assume disabling confirmation repairs existing unconfirmed accounts; check their status in Supabase.

History and account-theme buttons require a signed-in session. Row-level security restricts rows to their owner. Saving/loading the account theme are explicit actions; changing the local theme alone does not sync it to the database.

Account submissions prevent duplicate requests and have a 20-second UI deadline. A timeout releases controls and reports failure; it does not prove the server never processed the request.

## Deployment

Vercel serves the frontend; Railway can run the separate FastAPI backend and WebSocket.

### Railway backend

Use `backend` as the service root and its Dockerfile to build. The Docker command listens on **port 8000**; configure the public domain target port accordingly. Set the backend environment variables above, including the private Gemini key if image analysis is needed.

Set `SAGE_ALLOWED_ORIGINS` to a JSON array containing the actual frontend origin, for example:

```json
["https://your-app.vercel.app", "capacitor://localhost"]
```

Add any specific preview/local origins you need. `/health` checks process liveness only, not Supabase, Gemini, sensors, or navigation readiness.

### Vercel frontend

Use `frontend` as the project Root Directory. The included `frontend/vercel.json` selects Vite, runs `npm run build`, and serves `dist`.

Set these variables for the environments you use (Production and/or Preview):

| Variable | Example |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your project's publishable key |
| `VITE_API_URL` | `https://your-backend.up.railway.app` |
| `VITE_WS_URL` | `wss://your-backend.up.railway.app/ws/demo` |
| `VITE_AUTH_REDIRECT_URL` | `https://your-app.vercel.app` |

The hosted `/ws/demo` endpoint is still simulated data. A real source requires a compatible external WebSocket endpoint.

**Rebuild/redeploy after changing frontend variables.** They are embedded at build time; refreshing is insufficient. The local Vite proxy does not run in the deployed frontend.

## API and data contracts

| Endpoint | Behavior |
| --- | --- |
| `GET /` | Basic service name/status. |
| `GET /health` | Process liveness. |
| `POST /events` | Validates and echoes an obstacle event; no persistence. |
| `WS /ws/demo` | Public simulated telemetry when enabled. |
| `POST /api/analyze` | Supabase bearer token required; raw JPEG/PNG body, up to 5 MB and 16 megapixels. Returns semantic observations. |

WebSocket types are `pose_update`, `semantic_observation`, `hazard_update`, and `system_status`. They carry timestamps and a `simulated` flag. Spatial messages carry coordinate frame and units. See [frontend validation](frontend/src/contracts.js) and [backend models](backend/app/models/) for exact rules.

The backend verifies image-analysis access tokens through Supabase. The browser accesses saved observations/preferences directly through Supabase using the user's session. Receiving telemetry does not automatically save it.

Analysis concurrency/rate guards are process-local. Shared production limits and operational validation remain deployment work.

## iOS preparation

The native project uses Capacitor to package the web interface, including Three.js; it is not a separate SwiftUI application.

Configure reachable HTTPS API/auth redirect URLs, a WSS endpoint, and Supabase settings before running:

```powershell
npm.cmd --prefix frontend run ios:sync
npm.cmd --prefix frontend run ios:open
```

Sync validates endpoints, builds the frontend, and syncs Capacitor. Opening, compiling, signing, and distributing the app requires macOS/Xcode. The generated project and browser tests do not establish iPhone compatibility; authentication redirects and device behavior still need testing.

## Verification

From the repository root:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s backend\tests -v
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run build
```

For browser tests on Windows with Microsoft Edge installed:

```powershell
$env:PLAYWRIGHT_CHANNEL = "msedge"
npm.cmd --prefix frontend run test:browser
```

Browser tests start their own services on ports 8010 and 5180. They require the Python environment, frontend dependencies, and nonempty frontend Supabase configuration. Auth/storage/analysis requests in relevant tests are mocked; they do not validate deployed credentials, email delivery, database policies, or Gemini availability.

Tests cover contracts, simulator behavior, account flows, stalled requests, saved-history UI, and session restoration. They do not establish real-world navigation safety.

## Troubleshooting

- **Account controls unavailable:** verify frontend Supabase variables and rebuild. History/theme controls also require an authenticated session.
- **Account request times out:** check the displayed error, network access, and Supabase settings. A timeout is not necessarily an incorrect password.
- **Sign-up asks for confirmation:** check the Email provider's Confirm email setting and whether a session was returned.
- **History reports an error:** confirm the migration ran in the project used by the app; check authentication, grants, and row-level security.
- **Hosted simulator/analysis cannot connect:** check frontend endpoint variables, backend availability, and exact CORS origin.
- **GLB overlays are hidden:** match its coordinate frame, origin, and meter scale to telemetry.
