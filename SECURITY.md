# Security

This public portfolio repository intentionally excludes production credentials and operational data.

## Public repository rules

- Do not commit `.dev.vars`, `.env`, `wrangler.jsonc`, API keys, authentication secrets, Cloudflare resource IDs, production URLs, uploaded files, or production database exports.
- Do not commit real organization, location, assignee, resource, schedule, reservation, OCR, or attachment data.
- Use `.dev.vars.example` and `wrangler.example.jsonc` only as templates.
- Rotate any credential immediately if it is accidentally committed, even if the commit is later reverted.

## Runtime access

Schedule/bootstrap data requires an authenticated application session. Stored attachments are restricted to manager/admin roles. The limited `time_editor` role does not receive attachment metadata, memo text, reservation numbers, or flight-check URLs/notes. Raw OCR text remains server-side and is not included in the bootstrap payload. The health endpoint and static frontend assets may remain public.

## Reporting

For a real deployment, report suspected credential or data exposure privately to the deployment owner rather than opening a public issue containing sensitive details.
