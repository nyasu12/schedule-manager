# Schedule Manager

A configurable schedule and resource management platform built on Cloudflare Workers, D1, and R2.

The core application is intentionally domain-neutral: teams can define schedule types, workflow rules, organizations, locations, assignees, resources, statuses, and attachments without changing the source code. Optional domain modules can add specialized behavior only where it is needed.

This repository is a **public portfolio version**. Production credentials, Cloudflare resource IDs, real organization data, staff names, resource data, uploaded files, and schedule records are intentionally excluded.

## Highlights

- Configurable schedule types instead of hard-coded workflows
- Per-type rules for required start time, assignee, resource, organization, and flight information
- Workflow status: draft, planned, confirmed, in progress, done, or cancelled
- Organization / location / assignee / resource allocation
- Generic file attachments stored in Cloudflare R2
- Unassigned and incomplete-work views
- Role-based access for administrators, schedule editors, and start-time editors
- Optional **Travel extension** for flights, itineraries, OCR, and operational flight checks

## Optional Travel extension

Travel functionality is an extension of the scheduling platform, not a core assumption. A schedule type can enable the extension without requiring a flight, so ordinary schedules remain valid even when no airline segment is present. Flight requirements can be enabled separately for workflows such as airport transfers; the OCR and flight-verification features are intentionally specialized for air-travel operations.

When enabled, the Travel extension provides:

- Multiple flights per schedule
- Arrival / departure itinerary attachments
- Face-photo attachments where an operational workflow needs them
- OCR-assisted itinerary parsing with Google Cloud Vision and OpenAI
- Flight verification with FlightAware AeroAPI
- Official airline / airport website fallback through the OpenAI Responses API
- Possible flight-number-change detection without silently replacing the saved flight number
- Japan Standard Time display for flight-check timestamps

## Architecture

```text
Browser
  |
  v
Cloudflare Worker
  |-- D1: schedules, users, configuration, workflow state, usage counters
  |-- R2: generic attachments and optional Travel documents
  |-- Google Vision: optional OCR
  |-- OpenAI: optional document parsing / official-web fallback
  `-- FlightAware AeroAPI: optional Travel flight checks
```

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
| CI | GitHub Actions |

## Source layout

The application sources are committed directly so the implementation can be reviewed without a generation step.

```text
src/index.js          Cloudflare Worker / API
public/app.js         Browser application
public/index.html     Main UI markup
public/styles.css     UI styles
migrations/           D1 schema and migrations
scripts/              User-management utilities
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create Cloudflare resources

Create a D1 database and R2 bucket. Example names:

```text
schedule-manager-db
schedule-manager-files
```

### 3. Create Wrangler configuration

```bash
cp wrangler.example.jsonc wrangler.jsonc
```

Replace the placeholder D1 database ID with your own resource ID.

### 4. Configure secrets

For local development:

```bash
cp .dev.vars.example .dev.vars
```

Authentication requires `AUTH_SECRET`.

Optional Travel integrations use:

```text
GOOGLE_VISION_API_KEY
FLIGHTAWARE_API_KEY
OPENAI_API_KEY
```

For production, register secrets with Cloudflare/Wrangler instead of committing them to Git.

### 5. Apply migrations

```bash
npm run db:migrate:local
# or
npm run db:migrate:remote
```

Migration `0008_generalize_schedule_manager.sql` adds schedule-type rules, workflow status, generic attachments, generic starter schedule types, and optional Travel configuration while preserving legacy data.

### 6. Create an administrator

No default account or password is included.

```bash
npm run user:set -- admin admin "<YOUR_STRONG_PASSWORD>" --local
# use --remote for Remote D1
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
| `admin` | Full schedule editing and configuration management |
| `manager` | Schedule editing |
| `time_editor` | Start-time changes only |

## Schedule-type configuration

Each schedule type can independently enable or require:

- Start time
- Assignee
- Resource
- Organization / location allocation
- Travel extension
- Flight information when Travel is enabled

Default generalized examples include meetings, visits, tasks, and Travel. The legacy airport-transfer type remains available as a Travel-enabled example for compatibility with existing deployments.

## Public repository safety

The public version does **not** contain:

- API keys or authentication secrets
- Production Cloudflare resource IDs
- Default passwords
- Real organization / location / staff / resource master data
- Production schedules
- Uploaded photos or documents
- Production Worker URLs

`wrangler.jsonc`, `.dev.vars`, and other local secret files are ignored by Git.

## Validation

GitHub Actions runs JavaScript syntax checks and applies every migration to a fresh SQLite database on pull requests.

## Portfolio note

This project demonstrates how a real domain-specific workflow can evolve into a configurable platform without discarding valuable specialized integrations. Compatibility-oriented internal table names remain in a few places so existing deployments can migrate incrementally, while the public UI and configuration model expose general scheduling concepts.

## Version

Public portfolio version **0.4.0**.
