# Runtime access boundary

The public frontend may be served without authentication, but operational data is not public.

Authenticated session required:

- `GET /api/bootstrap`
- `GET /files/:id`
- schedule and master-data write APIs
- OCR and flight verification APIs

Public:

- static frontend assets
- `GET /api/health`
- login endpoint

This boundary prevents a public deployment from exposing schedule, assignee, organization, reservation, OCR, or attachment metadata before login.
