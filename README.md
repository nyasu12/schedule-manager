# Schedule Manager

A configurable schedule and resource management platform built on Cloudflare Workers, D1, and R2.

The core application is intentionally domain-neutral: teams can define schedule types, workflow rules, organizations, locations, assignees, resources, statuses, and attachments without changing the source code. Optional domain modules can add specialized behavior only where it is needed.

This repository is a **public portfolio version**. Production credentials, Cloudflare resource IDs, real organization data, staff names, resource data, uploaded files, and schedule records are intentionally excluded.

## Highlights

- Configurable schedule types instead of hard-coded workflows
- Per-type rules for required start time, assignee, resource, and organization
- Workflow status: draft, planned, confirmed, in progress, done, or cancelled
- Organization / location / assignee / resource allocation
- Generic file attachments stored in Cloudflare R2
- Unassigned and incomplete-work views
- Role-based access for administrators, schedule editors, and start-time editors
- Strict server-side validation for dates, times, and supported uploaded file signatures
- Optional **Travel extension** for flights, itineraries, OCR, and operational flight checks

## Optional Travel extension

Travel functionality is an extension of the scheduling platform, not a core assumption. A schedule type can enable the extension without requiring a flight, so ordinary schedules remain valid even when no airline segment is present. Flight requirements can be enabled separately for workflows such as airport transfers; the OCR and flight-verification features are intentionally specialized for air-travel operations.

Travel-specific validation, persistence, and API hydration live under `src/extensions/travel/`. The generic schedule sanitizer does not parse flight fields. When a schedule is saved, the selected schedule type is checked first; Travel payloads are only parsed and persisted when that type explicitly enables the Travel extension.

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
  |-- Core: schedules, configuration, workflow state, generic attachments
  |-- D1: schedules, users, configuration, workflow state, usage counters
  |-- R2: generic attachments and optional extension documents
  `-- Optional extensions
      `-- Travel: OCR, flight data, itinerary parsing, operational checks
```

Travel integrations may use Google Vision, OpenAI, and FlightAware AeroAPI. None of them are required for ordinary scheduling workflows.

## Tech stack

| Area | Technology |
| --- | --- |
| Runtime / API | Cloudflare Workers |
| Frontend | Vanilla HTML, CSS, JavaScript |
| Database | Cloudflare D1 (SQLite) |
| File storage | Cloudflare R2 |
| Optional OCR | Google Cloud Vision API |
| Optional AI parsing / web fallback | OpenAI API |
| Optional Travel flight information | FlightAware AeroAPI |
| Deployment | Wrangler |
| CI | GitHub Actions |

## Source layout

The two large runtime entry files are assembled deterministically from ordered source fragments. Smaller reusable modules are committed directly. This keeps the public implementation reviewable while allowing the generated Worker and browser bundles to be validated in CI.

```text
source-parts/worker/          -> src/index.js
source-parts/public-app/      -> public/app.js
src/runtime-guards.js         Domain-neutral server-side validation helpers
src/extensions/travel/        Optional Travel-only validation and persistence
public/index.html             Main UI markup
public/styles.css              UI styles
migrations/                   D1 schema and migrations
scripts/                      Validation and user-management utilities
```

Run `npm run build` to reconstruct the generated runtime entry files before local development, deployment, or syntax validation.

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

Migration `0009_generic_fresh_defaults.sql` makes untouched fresh installs domain-neutral: only the generic starter schedule types remain active and locale-specific legacy holiday samples are removed. Existing deployments that already contain users or schedules keep their compatibility data unchanged.

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
- Optional domain extensions such as Travel

Fresh installs activate only the generalized examples: meetings, visits, tasks, and Travel. Legacy domain-specific type IDs are retained for backwards compatibility, but remain inactive on untouched new installations. Existing populated deployments preserve their current compatibility data.

## Fresh-install neutrality

A new public installation starts without organization-specific master data or locale-specific calendar assumptions. CI verifies that a fresh database exposes only the generic starter schedule types and does not seed country-specific holidays.

This keeps the default experience reusable for teams in different industries and regions while still allowing optional domain extensions to be enabled deliberately.

## Runtime validation

The public version keeps operational rules domain-neutral while applying reusable safety checks at the API boundary:

- calendar dates must be real dates rather than merely matching `YYYY-MM-DD`
- times must be within `00:00` through `23:59`
- supported uploads are checked by file signature before storage, not only by filename extension or browser-provided MIME type

Extension-specific validation belongs to the extension that owns the data. For example, Travel dates and times are validated inside `src/extensions/travel/`, not inside the core schedule sanitizer.

Domain-specific rules, such as whether two schedules may share a date or whether a Travel itinerary should be split into multiple schedule records, intentionally remain outside the core validation layer.

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

`npm run check` performs the public-repository safety scan, rebuilds the generated runtime sources, checks JavaScript syntax, and runs separate regression suites for the domain-neutral runtime and optional Travel extension. GitHub Actions also applies every migration to a fresh SQLite database and asserts domain-neutral starter types plus zero locale-specific holiday seeds.

## Portfolio note

This project demonstrates how a real domain-specific workflow can evolve into a configurable platform without discarding valuable specialized integrations. Compatibility-oriented internal table names remain in a few places so existing deployments can migrate incrementally, while the public UI and configuration model expose general scheduling concepts.

## Version

Public portfolio version **0.4.1**.
