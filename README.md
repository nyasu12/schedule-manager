# Schedule Manager

Airport transportation schedule management web application built with Cloudflare Workers.

This repository is a **public portfolio version** of the application. Production credentials, Cloudflare resource IDs, real company data, employee names, vehicle data, uploaded files, and schedule records are intentionally excluded.

## Features

- Monthly calendar and filtered schedule views
- Arrival / departure schedule management
- Company, store, employee, and vehicle master management
- Role-based access: admin, manager, and departure-time editor
- Multiple arrival / departure itinerary attachments
- Multiple face-photo attachments
- OCR-assisted itinerary parsing with Google Cloud Vision and OpenAI
- Flight verification with FlightAware AeroAPI
- Official-web fallback search through the OpenAI Responses API
- Possible flight-number-change detection without silently overwriting the saved flight number
- Cloudflare R2 file storage
- Cloudflare D1 schedule and master-data storage
- Japan Standard Time display for the latest flight-check timestamp

## Tech stack

| Area | Technology |
| --- | --- |
| Runtime / API | Cloudflare Workers |
| Frontend | Vanilla HTML, CSS, JavaScript |
| Database | Cloudflare D1 (SQLite) |
| File storage | Cloudflare R2 |
| OCR | Google Cloud Vision API |
| AI parsing / web fallback | OpenAI API |
| Flight information | FlightAware AeroAPI |
| Deployment | Wrangler |

## Architecture

```text
Browser
  |
  v
Cloudflare Worker
  |-- D1: schedules, users, masters, usage counters
  |-- R2: photos and itinerary files
  |-- Google Vision: OCR
  |-- OpenAI: itinerary parsing / official-web fallback
  `-- FlightAware AeroAPI: schedule and operational checks
```

## Public repository safety

The public version does **not** contain:

- API keys or authentication secrets
- Production Cloudflare resource IDs
- Default passwords
- Real company / store / employee / vehicle master data
- Production schedules
- Uploaded photos or itinerary documents
- Production Worker URLs

`wrangler.jsonc`, `.dev.vars`, and other local secret files are ignored by Git.

## Source layout

The two large runtime files are stored as ordered source fragments under `source-parts/` so this portfolio snapshot can be published and reviewed safely through the repository tooling used to create it.

```text
source-parts/worker/      -> src/index.js
source-parts/public-app/  -> public/app.js
```

Run the build command to reconstruct the runtime files:

```bash
npm run build
```

The build performs SHA-256 integrity checks against the sanitized application snapshot. `npm run dev` and `npm run deploy` run this build step automatically. The generated `src/index.js` and `public/app.js` files are intentionally excluded from Git.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create Cloudflare resources

Create a D1 database and R2 bucket. The examples in this repository use:

```text
schedule-manager-db
schedule-manager-files
```

### 3. Create Wrangler configuration

```bash
cp wrangler.example.jsonc wrangler.jsonc
```

Replace `REPLACE_WITH_YOUR_D1_DATABASE_ID` with the ID of your own D1 database.

### 4. Configure secrets

For local development:

```bash
cp .dev.vars.example .dev.vars
```

Authentication requires:

```text
AUTH_SECRET
```

Optional integrations:

```text
GOOGLE_VISION_API_KEY
FLIGHTAWARE_API_KEY
OPENAI_API_KEY
```

For production, register secrets with Cloudflare/Wrangler instead of committing them to Git.

### 5. Apply migrations

Local:

```bash
npm run db:migrate:local
```

Remote:

```bash
npm run db:migrate:remote
```

The public migrations create the schema but intentionally do not seed production business data.

### 6. Create an administrator

No default account or password is included.

Remote D1:

```bash
npm run user:set -- admin admin "<YOUR_STRONG_PASSWORD>" --remote
```

Local D1:

```bash
npm run user:set -- admin admin "<YOUR_STRONG_PASSWORD>" --local
```

### 7. Run locally

```bash
npm run dev
```

### 8. Deploy

```bash
npm run deploy
```

## Roles

| Role | Permission |
| --- | --- |
| `admin` | Full schedule editing and master-data management |
| `manager` | Schedule editing |
| `time_editor` | Departure-time changes only |

## Validation

GitHub Actions rebuilds both runtime files and runs JavaScript syntax checks on every pull request. The public snapshot has been validated successfully with the same integrity hashes used by the local build.

## Portfolio note

This repository demonstrates the architecture and implementation of the application while keeping operational data private. External integrations are optional; their related features remain unavailable until the corresponding API key is configured.

## Version

Public portfolio snapshot based on application version **0.3.13**.
