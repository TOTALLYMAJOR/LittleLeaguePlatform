# Build Progress

This file tracks implementation progress while moving the app from the local reducer scaffold to Supabase-backed production slices.

## 2026-06-22

### Completed

- Added the core Supabase schema migration in `supabase/migrations/0001_core_schema.sql`.
- Added demo UUID seed data in `supabase/seed.sql`.
- Added typed Supabase client helpers in `lib/supabase/`.
- Added public registration API route at `app/api/registration-requests/route.ts`.
- Wired `/registration` to load Supabase teams and existing registration requests with local fallback.
- Wired `/admin` to load Supabase registration requests with local fallback.
- Added `/auth` with Supabase signup/signin UI.
- Added an auth user trigger that creates a `profiles` row from signup metadata.
- Added `/account` to show signed-in profile and team membership visibility.
- Added `/admin/memberships` and an admin API route to grant coach/parent team memberships.
- Added `supabase/migrations/0002_platform_hardening.sql` for guardian safety, notification consent, schedule history, chat production depth, Parent Replay review/learning plans, sponsor fulfillment, and registration approval actions.
- Applied `0001_core_schema.sql`, `0002_platform_hardening.sql`, and `supabase/seed.sql` to the remote Supabase project through the IPv4 transaction pooler.
- Verified remote table access with the service role client: `organizations`, `teams`, `registration_requests`, `guardian_authorizations`, `notification_preferences`, `event_series`, `team_chat_threads`, `learning_plans`, `sponsor_packages`, and `registration_approval_actions`.
- Added `0003_registration_approval_workflow.sql` with atomic approve/reject RPCs.
- Added `/admin/registrations` and admin API routes for approving or rejecting pending registration requests.
- Added `0004_fix_registration_approval_digest.sql` after live QA found the approval RPC needed a text-safe pgcrypto digest overload.
- Applied `0003_registration_approval_workflow.sql` and `0004_fix_registration_approval_digest.sql` to the remote Supabase project.
- Verified the live approval/rejection workflow with temporary QA records and cleanup: approval produced approved request status, player, guardian, invite, and approval actions; rejection produced rejected request status and approval action.
- Moved `/team-portal` reads behind a Supabase server adapter with local seed fallback.
- Team Portal now renders teams, team branding, approved roster players, guardian links, parent invites, team memberships, schedules, media, and Parent Replay records from Supabase when rows are available.
- Added Supabase-backed Team Portal branding writes with actor-scope validation and audit events.
- Added `/admin/themes` as the first-class admin theme console with team-wide editing, contrast checks, previews, and audit history.
- Added Supabase-backed Team Chat route loading, missing channel creation, message posting, coach announcements, moderation, read receipts, and Realtime subscription wiring.
- Added `0005_provider_and_mobile_hardening.sql` for media moderation columns, Google Maps field metadata, weather review metadata, chat retention cleanup, and Realtime publication setup.
- Applied `0005_provider_and_mobile_hardening.sql` to the remote Supabase project.
- Added provider/mobile API foundations for Tomorrow.io weather alert drafts, Web Push subscription storage, Google Maps field metadata, media moderation, RSVPs, snack claims, and volunteer claims.
- Added route smoke tests and migration/RLS policy tests.

### Validation

- `npm run typecheck` passed.
- `npm test` passed.
- `git diff --check` passed for the active Supabase/registration slice.

### Blocked

- None for schema application. Direct database URL still requires IPv6 from this environment, so keep using `SUPABASE_POOLER_DATABASE_URL` for CLI migration pushes.

### Migration Command

For future migrations:

```bash
npm run supabase:push
```

### Next

- Add Supabase write adapters for Team Portal branding updates and route the coach/admin theme designer through the database.
- Wire parent/coach UI forms to the persisted RSVP, snack, volunteer, weather, push, field-location, and media moderation APIs where the current screens still show local state.
- Add authenticated browser-session enforcement in API routes before production launch; current scaffold validates actor IDs against Supabase rows but still runs through server service adapters.

## 2026-06-23

### Completed

- Added Supabase bearer-session enforcement to private mutation API routes. The public registration request intake remains intentionally open for unauthenticated family signup.
- Private mutation routes now derive reviewer/actor/parent/user IDs from the verified Supabase session instead of trusting client-submitted actor IDs.
- Updated authenticated browser POSTs so Team Portal branding, Admin theme saves, Team Chat messages/moderation/read receipts, admin membership grants, and parent RSVP actions attach the current Supabase access token.
- Wired the Coach dashboard action buttons to persisted API routes for Tomorrow.io weather alert drafts, snack slot claims, and volunteer role claims.
- Added API auth boundary tests covering private mutation routes and public registration intake.
- Added a Supabase read adapter for `/parent`, `/parent/rsvp`, and `/coach` so parent/coach dashboards render live profiles, memberships, guardians, players, events, RSVPs, announcements, media, weather, snack, and volunteer rows when linked records exist.
- Updated parent RSVP and coach action payloads to come from that Supabase snapshot instead of local seed IDs when the adapter is live.
- Bound `/parent`, `/parent/rsvp`, and `/coach` reads to the signed-in Supabase server session. Signed-out users now receive empty signed-out states, and signed-in users receive only rows scoped to their active parent guardian links or active coach memberships.
- Added `scripts/bootstrap-qa-session-users.mjs` and `npm run supabase:qa-users` to create or update real QA Supabase Auth users, profiles, active coach/parent memberships, active guardian links, players, events, announcements, media, snack slots, volunteer roles, and weather rows.
- Added `scripts/verify-qa-session-paths.mjs` and `npm run qa:session-proof` to sign in the QA parent and QA coach, assert populated `/parent`, `/parent/rsvp`, and `/coach` pages, and capture mobile screenshots.
- Added a verified server-session fallback for the current Supabase `base64-` auth cookie format so server-rendered pages can resolve the signed-in user before applying parent/coach scope filters.
- Verified populated signed-in browser paths against the live QA Supabase rows:
  - `output/playwright/parent-qa-session-live.png`
  - `output/playwright/parent-rsvp-qa-session-live.png`
  - `output/playwright/coach-qa-session-live.png`
- Added route-level live action tests for signed-in parent RSVP plus snack, volunteer, and weather draft actions. The tests assert client-submitted actor IDs are ignored and the verified Supabase session user is used.
- Added `npm run qa:rls-proof`, which signs in QA parent and coach users through the Supabase anon client and verifies parent, coach, and anonymous RLS boundaries against the seeded QA rows.
- Added PWA install prompt UX, `/offline`, and service-worker fallback coverage so offline states do not imply stale team data is current.
- Added parent-facing snack and volunteer claim controls backed by the existing authenticated Supabase claim routes.
- Added parent schedule notification preference reads and an authenticated preference save route that derives the user from the Supabase session.
- Added persisted coach weekly update drafts that save an announcement and pending `team_broadcast` notification rows without provider sends.
- Added media URL validation plus a family media report route that increments `report_count` and moves reported media to pending moderation.
- Added Sponsor Management V2 with authenticated admin sponsor saves, Supabase placement/logo metadata, pending/active/expired status support, and sponsor audit events. Sponsor billing remains disconnected unless Stripe is intentionally added later.
- Added Media Governance V2 with approved-only parent/team reads, admin hide/restore/remove controls, team/org visibility metadata, reviewer permission checks, and audit events for reports and moderation actions.
- Added Parent Replay V2 persistence with authenticated coach/admin publishing, reviewed/published Supabase replay rows, pending parent notification drafts, and audit events. AI generation remains disconnected and provider sends do not occur.
- Added Admin Theme Studio defaults with organization-level theme/color/mascot/logo-status defaults, an authenticated admin defaults route, all-team logo/default/audit status, and tenant default save controls.
- Added Mobile App Decision metrics with Supabase `mobile_usage_events`, install/standalone client measurement, and a public usage-event route so Expo remains gated on actual PWA and push-demand evidence.
- Added deterministic assistive suggestions across admin, coach, and parent dashboards. Suggestions summarize existing scoped records only and cannot approve, publish, RSVP, or send provider messages.
- Added Reporting and Archive exports with authenticated admin CSV generation, audit logging, and an archive readiness checklist covering non-chat preservation and chat deletion proof.
- Added Provider Integration approval boundaries with notification provider approval status, authenticated provider delivery review, and delivery-attempt logs for approved or suppressed email/SMS/Web Push attempts. External provider sends remain disconnected.
- Hardened the shared Supabase auth and role boundary by adding reusable access-control decisions, routing coach/admin team actions through the shared checker, and blocking parent RSVP writes unless the event and player share a team and the authenticated parent has an active guardian link.

### Remaining Gap

- Signed-out users now correctly receive `401` responses from private mutation APIs, and parent/coach private surfaces show explicit signed-out or missing-membership states instead of empty private forms.
- Local `.env.local` must use a real Supabase anon key for `NEXT_PUBLIC_SUPABASE_ANON_KEY`; the current local value is a service-role JWT and `qa:rls-proof` correctly refuses to run.
- The manual GitHub `supabase-qa-proof.yml` workflow needs QA Supabase secrets before it can prove `qa:rls-proof` and `qa:session-proof` in CI.

### Next

- Correct local and GitHub QA secrets, then run `npm run supabase:qa-users`, `npm run qa:rls-proof`, and the manual Supabase QA proof workflow.
