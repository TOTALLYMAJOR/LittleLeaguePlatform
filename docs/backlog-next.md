# Backlog Next

These tasks should follow after the Backlog Now foundation is in place. They are valuable, but they depend on persistence, auth, RLS, and provider boundaries.

## 1. Provider Integrations

- Status: implemented 2026-06-23.
- Tomorrow.io weather provider adapter creates event/venue forecast drafts.
- Google Maps field metadata stores map URLs/embed URLs when configured.
- Email/SMS/Web Push delivery is approval-gated through provider review and delivery-attempt logs.
- Web Push subscription storage, opt-in preferences, PWA usage metrics, and provider approval records are auditable.

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

- Status: implemented 2026-06-23.
- `/admin/themes` is a first-class admin console.
- The all-team table shows theme preset, mascot, colors, logo/default status, contrast status, and last updated audit evidence.
- Mobile/dark preview cards and contrast checks are visible in the editor.
- Tenant-level theme defaults can be saved for future teams.

Acceptance:
- Admin can update every team theme from one place.
- Coaches still see only their own editable team portal.
- Theme previews pass basic contrast checks.

## 6. Mobile App Decision

- Status: implemented 2026-06-23.
- PWA install, standalone launch, push-permission, and native-interest usage events can be measured in Supabase.
- Expo remains gated until the PWA metrics prove native app-store, stronger native push, camera/media, or OS integration needs.
- Parent-first workflows remain in the shared web domain model: schedule, RSVP, Team Chat, Parent Replay, snacks, and volunteers.

Acceptance:
- Native app reuses web domain models and policy rules.
- Push token registration and notification permissions are explicit and auditable.

## 7. Agentic Assistance

- Status: implemented 2026-06-23.
- Admin copilot summarizes registration review and readiness gaps from existing records.
- Coach assistant drafts weekly-update and Parent Replay recommendations without saving or sending.
- Parent help assistant is scoped to approved child/team records and recommends the next parent action.

Acceptance:
- Agents recommend, draft, and summarize only.
- Sensitive actions remain human-approved.
- Evaluations cover child privacy, team scope, provider-send safety, and hallucinated records.

## 8. Reporting And Archive

- Status: implemented 2026-06-23.
- Admin exports exist for roster, contacts, schedules, RSVP, snack/volunteer assignments, sponsor roster, and notification logs.
- Season archive readiness checklist is documented in `docs/archive-readiness-checklist.md`.
- Archive proof requires preserving non-chat season data and proving deleted chat text cannot be reconstructed from app-readable data.

Acceptance:
- Exports are permission-checked and audit-logged.
- Archived records preserve non-chat season data.
- Deleted chat text cannot be reconstructed from app data.
