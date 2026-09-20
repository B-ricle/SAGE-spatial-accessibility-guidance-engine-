# SAGE — Spatial Accessibility Guidance Engine

SAGE is a mobile-oriented monitoring application that displays environment models,
positions, observations, hazards, and system state. The complete software demo runs
on a laptop. No Raspberry Pi, sensors, wristband, or firmware is required.

This is a development preview, not a validated mobility safety system.

## What is implemented

- React interface retaining the minimal light/dark design; account dialog, responsive
  touch controls, accessible text equivalents, and explicit unknown/stale states.
- Supabase email/password accounts, email reset flow, session restoration and sign-out.
- Three.js demo room, moving position marker, supplied hazard markers, local self-contained
  GLB import, orbit/zoom/reset, coordinate-frame checks, and GPU resource cleanup.
- A laptop FastAPI simulator streaming pose, observations, hazards and subsystem status.
- Configurable secure external WebSocket connection, reconnect backoff, message validation,
  raw-message inspection, bounded observation history, and stale/disconnected handling.
- Authenticated Gemini image analysis: bounded JPEG/PNG input, metadata stripping, structured
  label output, no invented spatial coordinates or confidence, and sanitized failures.
- Explicitly saved observation history and theme preferences through Supabase RLS policies.
- Optional browser/device speech for high-priority reports, off by default. Voice availability
  depends on the device; this is not an essential safety-warning mechanism.
- Vercel frontend configuration, backend Dockerfile, and generated Capacitor iOS project.

## Run without a Pi (Windows PowerShell)

Use two terminals from the repository root. Existing `.env` values are preserved.

Backend:

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend\requirements-dev.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Open http://127.0.0.1:5173 and choose Connect under Laptop simulator. You should see
positions move, simulated observations arrive, and reported hazard markers appear.
Disconnect: retained data becomes historical and hazard markers disappear. The gray
position marker indicates stale data. No perception or navigation measurements are real
when the source is the simulator. If a port is occupied, stop your older server or use
`SAGE_DEV_BACKEND` / `SAGE_DEV_API` to point Vite to alternate local backend ports.

## Reviewable software sections

1. `frontend/src/App.jsx`: React state and the Account, Environment, and App components.
2. `frontend/src/contracts.js`: validates incoming application messages; no provider logic.
3. `frontend/src/environment.js`: Three.js scene lifecycle and coordinate-aware rendering.
4. `backend/app/routes/telemetry.py`: demo stream; client disconnect cancels its tasks.
5. `backend/app/models/*`: explicit data contracts separating observations and hazards.
6. `backend/app/services/risk.py`: simple projected-path geometry for demo hazard severity.
   This is not calibrated or validated for real-world mobility decisions.
7. `backend/app/services/perception.py`: image normalization and structured Gemini output.
8. `backend/app/security.py`: server-side Supabase token verification for paid analysis.
9. `frontend/src/storage.js` and `supabase/migrations/001_user_data.sql`: opt-in persistence.
10. `frontend/ios`, `capacitor.config.json`, `vercel.json`, and `backend/Dockerfile`: packaging.

## Configuration and trust boundaries

The backend reads the repository-root `.env`. See `backend/.env.example` for supported
names. Existing `GEMINI_API_KEY` is supported; never prefix it with VITE_. The selected
Gemini model is configurable through `SAGE_GEMINI_MODEL` (default gemini-3.5-flash).
The older 2.5 model was rejected for this account; the new default was live-tested.

The browser reads `frontend/.env.local` for public Supabase configuration. For remote
or native builds set `VITE_API_URL` to an HTTPS API base, `VITE_WS_URL` to a WSS endpoint,
and `VITE_AUTH_REDIRECT_URL` to the hosted web app URL. These variables are baked into the
build, so rebuild after changes. Frontend variables must never contain privileged keys.

The app does not forward Supabase credentials to a user-entered EE WebSocket URL.
The EE team must supply its authentication protocol before private streams can be used.
The simulator is intentionally public; set `SAGE_DEMO_ENABLED=false` to disable it.
The legacy POST /events is a public validation/echo endpoint and does not persist data.

Gemini analysis requires a Supabase access token, verified server-side. Selecting and
submitting an image sends it through the backend to Google. This app does not retain the
image; provider data handling is governed by your Google account/terms. Confidence remains
unknown, and no physical coordinates or collision decisions are inferred from pixels.
The local rate guard is process-local: deploy an ingress/shared limiter before public scale.

## Supabase setup (external step still required)

Run `supabase/migrations/001_user_data.sql` in your project's SQL editor. This creates
observations and preferences and enables owner-only row-level security. A publishable
key cannot apply migrations. The project connection was verified, but the observations
table was absent at verification time. No remote schema was changed by the assistant.

In Auth URL configuration add your local and hosted web URLs, and set Site URL to your
hosted app. Signup confirmations and password resets can finish on that hosted app; users
can then sign in to iOS with their password. Native email deep-link handling is not included.

After migration, verify with two test accounts: account A saves an observation; account B
must not see it. Anonymous requests must not read rows. Browser tests mock this service;
live RLS behavior still requires this project-side verification. No service-role key is needed
in the frontend or in the current analysis backend.

## EE data contract

A self-contained `building.glb` can be selected locally (30 MB maximum, embedded assets;
compressed/externally referenced models may need conversion). Models retain their original
origin and scale. One model unit must mean one meter; Y is up, X/Z form the floor at Y=0.
Set the model's coordinate-frame identifier to match the messages. A mismatch hides the
position and hazards. Camera fitting changes the view, never the physical coordinates.

Messages are UTF-8 JSON with `type`, offset-aware ISO `timestamp`, and `simulated` boolean.

- `pose_update`: `sequence` increasing within a connection, `x`, `z`, `units: "meters"`,
  `coordinate_frame`. Pose becomes stale after five seconds without a valid pose.
- `semantic_observation`: UUID `observation_id`, nonblank `object_label`, optional numeric
  `confidence` from 0 to 1. No spatial placement is attempted for this contract.
- `hazard_update`: `coordinate_frame`, `units: "meters"`, `hazards` array with `id`, `x`, `z`,
  `radius_m`, and `severity: "caution" | "high"`. Each message replaces the hazard snapshot.
- `system_status`: `localization` and `perception`, each `active` or `unavailable`.

The receiver displays source-provided facts; message shape validation is not source
authentication or evidence that a hazard classification is correct. Agree coordinate
calibration and authentication with the EE team before using real data.

## Verify

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s backend\tests -v
cd frontend
npm.cmd test
npm.cmd run build
$env:PLAYWRIGHT_CHANNEL='msedge'
npm.cmd run test:browser
```

Browser tests start and stop isolated localhost servers on 8010/5180. On another system,
install Chromium with `npx playwright install chromium` and omit PLAYWRIGHT_CHANNEL.
The suite mocks sign-in, analysis, and saves: it does not create remote accounts or records.
An additional live Gemini check used a generated non-personal illustration and returned a
valid empty list; this validates the connection/schema, not perception accuracy.

## Vercel and backend hosting

Vercel project root: `frontend`; build: `npm run build`; output: `dist`.
Set the public VITE_* values in Vercel. The FastAPI WebSocket server runs separately;
Vite's local proxy is not a deployed backend. Build the backend container with
`docker build -t sage-api backend` and supply secrets through the host's environment.
Use HTTPS/WSS and set `SAGE_ALLOWED_ORIGINS` to a JSON list of exact frontend origins,
including `capacitor://localhost` for iOS. No deployment was performed.

## iOS handoff

A Capacitor Xcode project exists at `frontend/ios/App`. It packages the web interface in
an iOS app; it is not a SwiftUI rewrite. On a Mac with supported Xcode:

```sh
cd frontend
npm ci
# Configure reachable HTTPS/WSS and auth redirect URLs in .env.local first.
npm run ios:sync
npm run ios:open
```

Choose your Apple signing team and unique bundle ID, then build/run on an iPhone or
simulator. The current bundle ID `com.sage.preview` is a development placeholder.
`ios:sync` checks endpoint settings to prevent accidentally shipping localhost URLs.
Native compilation, signing, device testing, icons, and App Store submission are not verified
on this Windows machine. No iOS permissions for hardware control have been added.

## Remaining external verification

Apply the database migration; configure production URLs; build/sign on macOS; obtain the
real EE model and authenticated stream. Baseline image alignment, live camera capture,
SLAM, hardware feedback, and optional learned risk models have not been implemented; the
app consumes semantic/spatial outputs through the interface above instead.
