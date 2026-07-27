# Schedule Manager

A configurable scheduling platform built on Cloudflare Workers, D1, and R2.

The Core is intentionally domain-neutral. Teams can define schedule types, workflow requirements, organizations, locations, assignees, resources, custom fields, locale/timezone settings, attachments, and access capabilities without changing application code. Specialized behavior is added through explicit opt-in extensions.

This repository is a **public portfolio version**. Production credentials, Cloudflare resource IDs, real organization data, staff names, resource data, uploaded files, production schedules, and private audit records are intentionally excluded.

## Highlights

- Configurable schedule types instead of hard-coded business workflows
- Canonical Core model: Area / Schedule Type / Organization / Location / Assignee / Resource / Start Time
- Workflow status: draft, planned, confirmed, in progress, done, or cancelled
- Per-type rules for required start time, assignee, resource, and organization/location allocation
- Configurable custom fields: text, number, date, time, boolean, URL, and select
- Generic file attachments stored in Cloudflare R2
- Deployment-level locale and IANA timezone settings
- Role defaults plus per-user capability overrides
- Session invalidation when credentials or roles change
- Auditable administrative and schedule mutations
- Recoverable R2/D1 file lifecycle state
- Strict server-side validation for real dates, valid clock times, and uploaded file signatures
- Reason-based incomplete-work filtering and direct year/month navigation
- Extension Registry for optional domain modules
- Optional **Travel extension** for flights, itineraries, participant counts, OCR, and operational flight checks
- Fresh-install neutrality enforced by automated checks

## Platform architecture

```text
Browser
├─ Core
│  ├─ Calendar / lists
│  ├─ Schedule form
│  ├─ Organizations / locations
│  ├─ Assignees / resources
│  ├─ Custom fields
│  ├─ Access-aware actions
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
├─ Capability resolution
├─ Audit logging
├─ Extension Registry
├─ Custom-field service
├─ Compatibility adapter
├─ D1
└─ R2
```

Core scheduling does not parse airline fields or apply aviation rules. A schedule is sanitized first as a generic schedule; enabled extension payloads are then delegated to the Extension Registry.

## Generic access model

Version 0.6 keeps the existing roles as safe defaults while allowing per-user capability overrides.

| Role | Default behavior |
| --- | --- |
| `admin` | Full access |
| `manager` | Create/edit/delete schedules, edit start time and memo, manage schedule files, run extension operations |
| `time_editor` | Change start time only |

Current Core capabilities include:

```text
schedule.create
schedule.edit
schedule.delete
schedule.start_time.edit
schedule.memo.edit
file.add
file.read
file.delete
extension.execute
```

A deployment can grant or deny an individual capability without creating another database column or application role. This keeps the authorization model extensible for future workflows.

Example:

```bash
npm run capability:set -- editor schedule.memo.edit allow --local
npm run capability:set -- editor schedule.delete deny --local
npm run capability:set -- editor schedule.delete reset --local
```

`reset` removes the user-specific override and returns that capability to the role default.

Authorization is enforced at the API boundary. Browser controls are also hidden when the current session lacks the corresponding capability, but UI visibility is never treated as the security boundary.

## Session invalidation

Authenticated sessions are signed with `AUTH_SECRET` and also contain a per-user session nonce.

Running `user:set` rotates the nonce, so changing a password or role invalidates previously issued sessions for that user.

```bash
npm run user:set -- admin admin "<YOUR_STRONG_PASSWORD>" --local
```

## Audit trail

Administrative configuration changes and important schedule/file mutations are written to `app_audit_logs_v1`.

The admin-only endpoint:

```text
GET /api/audit-logs
```

returns the latest audit entries.

Request IP address and user-agent collection are **disabled by default**. A deployment that has a legitimate operational and privacy basis can explicitly opt in with `AUDIT_CAPTURE_REQUEST_METADATA=1`. The generic public version does not require network-identity logging.

## Recoverable file lifecycle

R2 attachments use a small storage state machine:

```text
pending -> ready -> deleting
```

A file is not exposed through bootstrap or download APIs until its R2 upload has completed and the database row is `ready`. Failed deletes restore the row to `ready` instead of silently leaving an inconsistent half-deleted record.

The Core validates both the filename extension and the actual file signature before storing an upload.

## Incomplete-work workflow

Schedule types can require a start time, assignee, or resource. Required custom fields and extension-owned requirements also participate in incomplete-work detection.

The incomplete list can be filtered by one or more reasons:

- unconfirmed workflow status
- missing start time
- missing assignee
- missing resource
- missing required custom field
- missing extension-owned requirement

Multiple selected reasons use OR semantics, making it easy to isolate the kind of work that needs attention without encoding any particular industry workflow into Core.

The calendar also supports direct year/month navigation in addition to previous/next/current-month controls.

## Optional Travel extension

Travel is an extension, not a Core assumption.

The Travel template is installed but **disabled by default on untouched fresh installations**. An administrator deliberately enables it on a schedule type when that deployment needs travel workflows.

When enabled, Travel can provide:

- Multiple flights per schedule
- Arrival/departure itinerary attachments
- Optional face-photo attachments for workflows that need them
- Per-location arrival/departure participant counts
- Explicit distinction between a known count of zero and an unknown participant count
- OCR-assisted itinerary parsing with Google Cloud Vision and OpenAI
- Flight verification with FlightAware AeroAPI
- Official airline/airport website fallback through the OpenAI Responses API
- Possible flight-number-change detection without silently replacing saved data
- Persisted alternative-flight candidates for human review

When a registered flight cannot be verified but same-day/same-route alternatives exist, the extension stores those alternatives as **review candidates**. It does not automatically replace the registered flight number.

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

The canonical domain-neutral model is:

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

The Core uses generic extension hooks for loading, validation, persistence, file categories, UI sections, settings, and schedule-detail rendering. Travel is the reference implementation; another domain module can follow the same boundary without changing the generic schedule model.

## Fresh-install neutrality

An untouched new installation starts with only domain-neutral starter types enabled:

- Meeting
- Visit
- Task

It does **not** start with active airport/transport workflows, active Travel workflows, organization-specific master data, locale-specific holiday seeds, production credentials, or production resource IDs.

Automated validation rebuilds a fresh SQLite database from every migration and verifies these properties.

## Source layout

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
│  ├─ capabilities.js
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

`npm run build` reconstructs only the Worker deployment entry. Browser Core and extension files are normal, directly reviewable source files.

## Architecture guard

`npm run check:architecture` protects the generic boundary.

Core browser and generic schedule paths are rejected if aviation-specific assumptions such as flights, airlines, airports, immigration directions, or Travel participant-count columns leak back into them. Travel-specific behavior belongs to the Travel extension.

This turns genericity into an automated rule rather than a README convention.

## Runtime validation

Reusable API-boundary checks include:

- calendar dates must be real dates rather than merely matching `YYYY-MM-DD`
- times must be within `00:00` through `23:59`
- supported uploads are checked by file signature before storage, not only filename or browser MIME type
- authorization is checked server-side for each protected action
- extension-specific fields are validated by the extension that owns them

Domain rules that are not universally valid are intentionally not Core rules.

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
- `0011_platform_architecture.sql` — Extension Registry, custom fields, locale/timezone settings, Travel-owned data, and canonical Core views
- `0012_operational_hardening.sql` — capabilities, session invalidation, audit trail, recoverable file lifecycle, and Travel operational review state

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
- capability model regression tests
- Travel extension regression tests
- every D1 migration against a fresh database in CI
- fresh-install neutrality checks

## Public repository safety

The public version does **not** contain API keys, authentication secrets, production Cloudflare resource IDs, default passwords, real organization/location/staff/resource master data, production schedules, uploaded photos/documents, private audit records, or production deployment URLs.

`wrangler.jsonc`, `.dev.vars`, and other local secret files are ignored by Git.

## Portfolio note

This project demonstrates the evolution of a real domain-specific workflow into a configurable platform while preserving useful specialized integrations behind explicit extension boundaries.

The important design choice is not simply renaming airport terminology. The Core scheduling model, browser UI, authorization, validation path, custom fields, audit trail, file lifecycle, and schedule persistence are domain-neutral, while Travel is an opt-in extension with its own specialized data and UI behavior.

**Public portfolio version: 0.6.0**
