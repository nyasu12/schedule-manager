# Schedule Manager

Configurable schedule and resource management web application built with Cloudflare Workers.

This repository is a **public portfolio version** of the application. It is designed as a general-purpose scheduling platform that can be adapted to different operational workflows. Airport transportation is included as one domain-specific **Travel module**, not as the core assumption of the system.

Production credentials, Cloudflare resource IDs, real organization data, staff names, resource data, uploaded files, and schedule records are intentionally excluded.

## Features

### Core scheduling

- Monthly calendar and filtered schedule views
- Configurable schedule types
- Workflow statuses: draft, planned, confirmed, in progress, done, and cancelled
- Area / region filtering
- Organization and location assignment
- Assignee and resource allocation
- Incomplete / unassigned schedule detection
- Generic file attachments
- Role-based access: admin, manager, and time editor

### Configurable workflow

Schedule types can represent workflows such as:

- Meetings
- Business trips
- Customer visits
- Field work
- Events
- Transportation
- Airport transfers
- Other custom operational schedules

Each schedule type can control which capabilities are required or displayed, including time, assignees, resources, organization/location data, and the Travel module.

### Optional Travel module

Travel-enabled schedule types can additionally use:

- Arrival / departure itinerary management
- Multiple itinerary and face-photo attachments
- OCR-assisted itinerary parsing with Google Cloud Vision and OpenAI
- Flight verification with FlightAware AeroAPI
- Official-web fallback search through the OpenAI Responses API
- Possible flight-number-change detection without silently overwriting the saved flight number
- Japan Standard Time display for the latest flight-check timestamp

The Travel functionality is intentionally isolated from the core scheduling model so non-travel schedules do not need flight or itinerary fields.

## Tech stack

| Area | Technology |
| --- | --- |
| Runtime / API | Cloudflare Workers |
| Frontend | Vanilla HTML, CSS, JavaScript |
| Database | Cloudflare D1 (SQLite) |
| File storage | Cloudflare R2 |
| OCR | Google Cloud Vision API |
| AI parsing / web fallback | OpenAI API |
| Optional flight information | FlightAware AeroAPI |
| Deployment | Wrangler |

## Architecture

```text
Browser
  |
  v
Cloudflare Worker
  |-- D1: schedules, users, configuration, resources, usage counters
  |-- R2: generic attachments and Travel documents
  |-- Google Vision: optional OCR
  |-- OpenAI: optional document parsing / official-web fallback
  `-- FlightAware AeroAPI: optional Travel flight checks
```

## Design approach

The application originally grew from a real airport-transportation workflow. Version 0.4 generalizes that implementation into a reusable scheduling platform while keeping the original Travel capabilities as an optional module.

The compatibility-oriented design keeps the existing operational data model usable while moving user-facing concepts toward configurable schedule types, organizations, locations, assignees, and resources.

## Public repository safety

The public version does **not** contain:

- API keys or authentication secrets
- Production Cloudflare resource IDs
- Default passwords
- Real organization / location / assignee / resource master data
- Production schedules
- Uploaded photos or documents
- Production Worker URLs

`wrangler.jsonc`, `.dev.vars`, and other local secret files are ignored by Git.

## Source layout

The current public snapshot uses ordered source fragments for the two large runtime files:

```text
source-parts/worker/      -> src/index.js
source-parts/public-app/  -> public/app.js
```

Run the build command to reconstruct the runtime files:

```bash
npm run build
```

`npm run dev` and `npm run deploy` run the build automatically.

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
| `admin` | Full schedule, configuration, and master-data management |
| `manager` | Schedule management |
| `time_editor` | Time changes only |

## Portfolio note

This project demonstrates how a domain-specific internal workflow can be evolved into a configurable platform without throwing away the specialized capabilities that made the original system useful.

The core application can be used for general scheduling and resource coordination, while integrations such as OCR, OpenAI-assisted parsing, and FlightAware are optional modules enabled only when a workflow needs them.

## Version

Generalized platform work: **0.4.0**.
