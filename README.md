# Schedule Manager

A configurable scheduling platform built on Cloudflare Workers, D1, and R2.

The Core is intentionally domain-neutral. Teams can define schedule types, workflow requirements, organizations, locations, assignees, resources, custom fields, locale/timezone settings, and attachments without changing application code. Specialized behavior is added through explicit opt-in extensions.

This repository is a **public portfolio version**. Production credentials, Cloudflare resource IDs, real organization data, staff names, resource data, uploaded files, and production schedules are intentionally excluded.

## Highlights

- Configurable schedule types instead of hard-coded business workflows
- Canonical Core model: Area / Schedule Type / Organization / Location / Assignee / Resource / Start Time
- Workflow status: draft, planned, confirmed, in progress, done, or cancelled
- Per-type rules for required start time, assignee, resource, and organization/location allocation
- Configurable custom fields: text, number, date, time, boolean, URL, and select
- Generic file attachments stored in Cloudflare R2
- Deployment-level locale and IANA timezone settings
- Role-based access for administrators, schedule editors, and start-time editors
- Strict server-side validation for real dates, valid clock times, and uploaded file signatures
- Extension Registry for optional domain modules
- Optional **Travel extension** for flights, itineraries, participant counts, OCR, and operational flight checks
- Fresh-install neutrality enforced by GitHub Actions

## Platform architecture

```text
Browser
├─ Core
│  ├─ Calendar / lists
│  ├─ Schedule form
│  ├─ Organizations / locations
│  ├─ Assignees / resources
│  ├─ Custom fields
│  └─ Settings
│
└─ Extensions
   └─ Travel
      ├─ Flights
      ├─ Itineraries
      ├─ OCR
      ├─ Participant counts
      └─ Flight verification

Cloudflare Worker
├─ Core schedule API
├─ Extension Registry
├─ Custom-field service
├─ Compatibility adapter
├─ D1
└─ R2
```

Core scheduling does not parse airline fields or apply aviation rules. A schedule is sanitized first as a generic schedule; enabled extension payloads are then delegated to the Extension Registry.

## Optional Travel extension

Travel is an extension, not a Core assumption.

The Travel template is installed but **disabled by default on untouched fresh installations**. An administrator deliberately enables it on a schedule type when that deployment needs travel workflows.

When enabled, Travel can provide:

- Multiple flights per schedule
- Arrival/departure itinerary attachments
- Optional face-photo attachments for workflows that need them
- Per-location arrival/departure participant counts
- OCR-assisted itinerary parsing with Google Cloud Vision and OpenAI
- Flight verification with FlightAware AeroAPI
- Official airline/airport website fallback through the OpenAI Responses API
- Possible flight-number-change detection without silently replacing saved data

The browser implementation lives in `public/extensions/travel.js`. Travel validation and persistence live behind the server Extension Registry and `src/extensions/travel/` modules. Ordinary Meeting, Visit, Task, or user-defined schedule types do not require Travel API keys or aviation data.

## Custom fields

Administrators can extend schedule types without source-code changes.

Supported field types:

```text
text
number
date
time
boolean
url
select
```

A field can apply globally or to one schedule type, can be required, and can have a custom display order. Select fields support administrator-defined options.

Examples include customer name, meeting URL, amount, priority, equipment reading, approval state, or any other deployment-specific metadata.

## Core terminology and compatibility

Version 0.5 introduces a canonical domain-neutral model:

| Core concept | Compatibility name from earlier versions |
| --- | --- |
| Area | Region |
| Schedule Type | Purpose |
| Organization | Company |
| Location | Store |
| Assignee | Employee |
| Resource | Car |
| Start Time | Departure Time |

Existing deployments are not destructively renamed. Migration `0011_platform_architecture.sql` adds canonical `core_*` read views, while `src/compat/legacy-v04.js` is the explicit compatibility boundary for the older physical D1 schema.

New application code uses the canonical vocabulary. Deprecated API aliases remain temporarily so existing v0.4 clients can migrate incrementally.

## Extension Registry

Schedule types can opt into installed extensions through:

```text
app_extensions_v1
app_purpose_extensions_v1
```

The Core uses generic extension hooks for loading, validation, persistence, file categories, UI sections, settings, and schedule-detail rendering. Travel is the first reference implementation; another domain module can follow the same boundary without changing the generic schedule model.

## Fresh-install neutrality

An untouched new installation starts with only domain-neutral starter types enabled:

- Meeting
- Visit
- Task

It does **not** start with:

- active airport/transport legacy types
- active Travel workflows
- organization-specific master data
- locale-specific holiday seeds
- production credentials or resource IDs

CI rebuilds a fresh SQLite database from every migration and verifies these properties.

## Source layout

The browser source is committed directly so the Core/extension boundary is obvious to GitHub readers.

```text
public/
├─ core/
│  ├─ 01-base.js
│  ├─ 02-render.js
│  ├─ 03-form.js
│  ├─ 04-settings.js
│  └─ 05-init.js
├─ extensions/
│  └─ travel.js
├─ index.html
└─ styles.css

src/
├─ core/
│  ├─ custom-fields.js
│  └─ settings.js
├─ extensions/
│  ├─ registry.js
│  └─ travel/
│     └─ server.js
├─ compat/
│  └─ legacy-v04.js
├─ runtime-guards.js
└─ index.js               # generated Worker entry

source-parts/worker/       # ordered Worker deployment fragments
migrations/                # D1 schema and migrations
scripts/                   # build, safety, architecture, and regression checks
```

`npm run build` reconstructs only the Worker deployment entry. Browser Core and extension files are normal, directly reviewable source files rather than a generated monolithic bundle.

## Architecture guard

`npm run check:architecture` protects the generic boundary.

Core browser and generic schedule paths are rejected if aviation-specific assumptions such as flights, airlines, airports, immigration directions, or Travel participant-count columns leak back into them. Travel-specific behavior belongs to the Travel extension.

This turns genericity into a CI-enforced rule rather than a README convention.

## Runtime validation

Reusable API-boundary checks include:

- calendar dates must be real dates rather than merely matching `YYYY-MM-DD`
- times must be within `00:00` through `23:59`
- supported uploads are checked by file signature before storage, not only filename or browser MIME type

Extension-specific fields are validated by the extension that owns them.

Domain rules that are not universally valid—such as forbidding multiple schedules on the same date or automatically splitting a travel itinerary into multiple schedules—are intentionally not Core rules.

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

Only deployments that enable the relevant Travel integrations need:

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

Important migrations:

- `0008_generalize_schedule_manager.sql` — configurable schedule model and generic starter types
- `0009_generic_fresh_defaults.sql` — neutral fresh-install defaults
- `0010_optional_extensions_default_off.sql` — optional Travel defaults to off
- `0011_platform_architecture.sql` — Extension Registry, custom fields, locale/timezone settings, Travel participant counts, and canonical Core views

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

## Validation

```bash
npm run check
```

The validation pipeline includes:

- public-repository secret and production-data safety scan
- architecture-boundary enforcement
- deterministic Worker rebuild
- Worker syntax validation
- independent syntax validation for every browser Core/extension source file
- generic runtime regression tests
- Travel extension regression tests
- every D1 migration against a fresh database
- fresh-install neutrality checks

## Public repository safety

The public version does **not** contain:

- API keys or authentication secrets
- production Cloudflare resource IDs
- default passwords
- real organization/location/staff/resource master data
- production schedules
- uploaded photos or documents
- production Worker URLs

`wrangler.jsonc`, `.dev.vars`, and other local secret files are ignored by Git.

## Portfolio note

This project demonstrates the evolution of a real domain-specific workflow into a configurable platform while preserving useful specialized integrations behind explicit extension boundaries.

The important design choice is not simply renaming airport terminology. The Core scheduling model, browser UI, validation path, custom fields, and schedule persistence are domain-neutral, while Travel is an opt-in extension with its own specialized data and UI behavior.

**Public portfolio version: 0.5.0**
