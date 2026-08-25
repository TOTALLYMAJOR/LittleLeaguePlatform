---
authority: reference
answers: null
supersedes: []
superseded_by: null
reviewed: 2026-08-22
---
# API Specification

Status: initial catalog and OpenAPI draft. The machine-readable draft is `docs/api/openapi.yaml`.

## Contract Rules

- Private routes require a verified Supabase session.
- Route handlers derive actor identity from the session; clients must not submit actor IDs as authority.
- Services enforce parent, coach, admin, team, event, and organization scope.
- JSON responses use `{ "ok": boolean, "message"?: string, ... }` unless a route returns a file/export format later.
- Provider-facing routes create draft, review, retry, or attempt records only unless a provider execution slice explicitly enables live sends.

## Public Endpoints

| Method | Path | Purpose | Boundary |
| --- | --- | --- | --- |
| POST | `/api/registration-requests` | Create a pending registration request. | Public intake; abuse controls still open. |
| POST | `/api/mobile-usage-events` | Record anonymous or session-adjacent PWA/native usage signals. | Public telemetry; abuse controls still open. |

## Authenticated Parent/Coach/Admin Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/rsvps` | Save a guardian-scoped RSVP. |
| POST | `/api/snack-slots/claim` | Claim a snack slot. |
| POST | `/api/volunteer-signups/claim` | Claim a volunteer role. |
| POST | `/api/notification-preferences` | Save notification preferences. |
| POST | `/api/notification-preferences/unsubscribe` | Unsubscribe or suppress a channel/type. |
| POST | `/api/push-subscriptions` | Store a Web Push subscription record. |
| POST | `/api/support-requests` | Create a scoped support/help request. |
| POST | `/api/schedule` | Create or update a schedule event. |
| GET | `/api/schedule/export` | Export team schedule data. |
| GET/POST | `/api/field-locations` | Read or create field-location records. |
| POST | `/api/weather-alerts/draft` | Create a weather alert draft. |
| POST | `/api/media/report` | Report a media item. |
| POST | `/api/media/moderation` | Hide, restore, remove, or adjust media visibility. |
| POST | `/api/provider-delivery/review` | Approve, reject, or suppress provider delivery records. |
| GET | `/api/provider-delivery/retry-plan` | Read retry-plan information. |
| POST | `/api/team-chat/messages` | Send a team chat message or announcement. |
| POST | `/api/team-chat/read-receipts` | Mark messages read. |
| POST | `/api/team-chat/moderation` | Moderate team chat content. |
| POST | `/api/coach/weekly-update` | Save a coach weekly update and pending broadcast draft. |
| POST | `/api/coach/parent-replay` | Publish a reviewed Parent Replay. |
| POST | `/api/coach/ai-workspace` | Request a review-only AI Coach rewrite when provider env is enabled. |

## Authenticated Admin Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/admin/exports` | Generate audited admin exports. |
| POST | `/api/admin/teams` | Create or update teams. |
| POST | `/api/admin/seasons` | Create or update seasons. |
| POST | `/api/admin/rosters` | Save roster rows/status. |
| POST | `/api/admin/team-memberships` | Assign team membership. |
| POST | `/api/admin/team-branding` | Save team brand settings. |
| POST | `/api/admin/theme-defaults` | Save organization theme defaults. |
| POST | `/api/admin/team-logos` | Queue logo metadata for review. |
| POST | `/api/admin/roster-imports/audit` | Persist roster import audit evidence. |
| POST | `/api/admin/guardian-links/repair` | Repair guardian-child links. |
| POST | `/api/admin/registration-requests/{requestId}/approve` | Approve a registration request. |
| POST | `/api/admin/registration-requests/{requestId}/reject` | Reject a registration request. |
| POST | `/api/admin/sponsors` | Save sponsor and sponsor billing-proof records. |

## Contract Backlog

- Replace generic object request/response schemas in `docs/api/openapi.yaml` with field-level schemas from `lib/domain/*` and `lib/supabase/database.types.ts`.
- Add error-code enum standards after the route handlers converge on durable code strings.
- Add webhook/provider callback specs only when real provider execution is approved.
- Add rate-limit headers and error contracts when public intake abuse controls are implemented.
