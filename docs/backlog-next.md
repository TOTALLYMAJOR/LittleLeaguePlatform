# Backlog Next

These tasks should follow after the Backlog Now foundation is in place. They are valuable, but they depend on persistence, auth, RLS, and provider boundaries.

## 1. Provider Integrations

- Weather provider adapter for event/venue forecasts.
- Google Maps embedded maps, field markers, and venue metadata.
- Email/SMS provider adapters with approval queues and delivery logs.
- Web Push provider/VAPID setup with opt-in preferences and unsubscribe handling.

Acceptance:
- Provider credentials live only in environment-managed secrets.
- Provider sends require policy checks, recipient preferences, and human approval where sensitive.
- Delivery status and failures are visible to admins/coaches as appropriate.

## 2. Media Governance

- Status: implemented 2026-06-23.
- Google Photos and YouTube URL validation runs in parent-visible media cards.
- Team/org visibility settings are available in `/admin`.
- Report, hide, restore, and remove workflows are routed through authenticated Supabase APIs.
- Media report and moderation actions write audit events.

Acceptance:
- Parents cannot remove other users' media links.
- Reported media can be hidden pending review.
- Media links respect team visibility and child privacy rules.

## 3. Sponsor Management V2

- Status: implemented 2026-06-23.
- Sponsor CRUD and placement settings are available in `/admin`.
- Sponsor logo/image assets are captured as Supabase sponsor asset rows.
- Sponsor status workflow supports pending, active, and expired.
- Stripe remains intentionally disconnected unless sponsors pay through the platform.

Acceptance:
- Sponsor display never overrides team safety/parent workflow clarity.
- Sponsor changes are admin-only and audit logged.

## 4. Parent Replay V2

- Status: implemented 2026-06-23.
- Replay history persists per team through Supabase `parent_replays` and appears in Team Portal reads.
- Template infrastructure exists in `parent_replay_templates` by sport/theme and focus area; the current builder remains deterministic.
- Coach approval is required before publishing generated content through `/api/coach/parent-replay`.
- AI-generated learning plans remain intentionally disconnected until prompts, filters, and review workflow exist.

Acceptance:
- Parent Replay remains coach-approved.
- AI output, if introduced, is labeled draft until reviewed.
- No child-specific private data leaks into generated public/team content.

## 5. Admin Theme Studio

- Build `/admin/themes` as a first-class admin console.
- Show all teams in a table with theme preset, mascot, colors, logo status, contrast status, and last updated audit event.
- Add mobile/dark preview cards.
- Add tenant-level defaults for new teams.

Acceptance:
- Admin can update every team theme from one place.
- Coaches still see only their own editable team portal.
- Theme previews pass basic contrast checks.

## 6. Mobile App Decision

- Measure PWA usage and push-notification needs.
- If native is justified, start Expo app using shared domain contracts and notification architecture.
- Keep parent-first workflows: schedule, RSVP, Team Chat, Parent Replay, snacks, volunteers.

Acceptance:
- Native app reuses web domain models and policy rules.
- Push token registration and notification permissions are explicit and auditable.

## 7. Agentic Assistance

- Admin copilot for registration review, import diagnostics, and readiness summaries.
- Coach assistant for weekly updates and Parent Replay drafts.
- Parent help assistant scoped to approved child/team records.

Acceptance:
- Agents recommend, draft, and summarize only.
- Sensitive actions remain human-approved.
- Evaluations cover child privacy, team scope, provider-send safety, and hallucinated records.

## 8. Reporting And Archive

- Add exports for roster, contacts, schedules, RSVP, snack/volunteer assignments, sponsor roster, and notification logs.
- Add season archive readiness checklist.
- Implement read-only archived seasons and chat retention deletion proof.

Acceptance:
- Exports are permission-checked and audit-logged.
- Archived records preserve non-chat season data.
- Deleted chat text cannot be reconstructed from app data.
