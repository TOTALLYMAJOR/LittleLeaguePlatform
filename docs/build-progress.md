# Build Progress

This file tracks implementation progress while moving the app from the local reducer scaffold to Supabase-backed production slices.

## 2026-07-02

### Completed

- Wired `/coach/parent-replay` to the same signed-in Supabase coach dashboard adapter as `/coach`, so AI Coach Workspace requests now use the authenticated coach's real team UUID instead of local seed team IDs.
- Added explicit Parent Replay access gating for signed-out or unassigned coach users; the private AI workspace no longer falls back to seed team data when a signed-in coach membership is missing.
- Expanded AI Coach Workspace safety coverage for hidden media, hidden chat messages, cross-team context, private contacts, unsupported provider-send/publish claims, and obvious unsourced private/external claims.
- Filtered AI workspace media-derived drafts to approved team media only.
- Added `npm run qa:ai-coach-proof` to sign in as the QA coach, request a hosted OpenAI rewrite from `/coach/parent-replay`, assert draft/review-only boundaries, and capture `output/playwright/ai-coach-provider-rewrite-qa-session-live.png`.
- Deployed the corrected worktree to Vercel Production. `https://www.leaguepilot.us` now aliases deployment `dpl_EwvgSQY6ws7u7GmSnSAFtu9V9Zfi`.
- Ran hosted AI Coach Workspace proof against `https://www.leaguepilot.us`; the provider rewrite completed as OpenAI-sourced draft copy with no publish/send claim.
- Set launch scope for provider sends to draft/internal records only. Real email/SMS/Web Push sends remain a separate explicit implementation decision.
- Set Vercel Preview OpenAI env setup out of launch scope until a named non-production preview branch is chosen.

### Validation

- `npm test -- components/feature-panels.test.tsx lib/services/ai-coach/ai-coach-provider.test.ts lib/domain/domain.test.ts app/api/coach/ai-workspace/route.test.ts app/routes-smoke.test.ts` passed: 5 files, 107 tests.
- `npm run typecheck` passed.
- `npm run build` passed and generated 47 static pages with `/coach/parent-replay` server-rendered dynamically.
- `npm test` passed: 18 files, 178 tests.
- `QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:ai-coach-proof` passed.
- `vercel deploy --prod --yes` passed and aliased the deployment to `https://www.leaguepilot.us`.

### Remaining Gap

- Real email/SMS/Web Push sends remain disconnected by launch decision; implement provider adapters, webhooks, idempotent retries, suppression handling, cost controls, and sandbox proof only if real sends become explicit scope.
- Vercel Preview OpenAI env values remain unset by launch decision until a non-production preview branch target is named.
- The Next SWC lockfile warning still appears during the Vercel build even though local `typecheck` and `build` passed; it remains a non-blocking lockfile follow-up.

## 2026-07-01

### Completed

- Corrected Vercel Production `NEXT_PUBLIC_SUPABASE_ANON_KEY` from a `service_role` JWT to an `anon` JWT while keeping `SUPABASE_SERVICE_ROLE_KEY` server-only.
- Redeployed the existing production deployment instead of packaging the dirty local worktree; `https://www.leaguepilot.us` now aliases deployment `dpl_D8kTCkYhtrn6VA7VXrJAwM9kbYmf`.
- Ran hosted browser proof against `https://www.leaguepilot.us` for signed-out parent gates, signed-in parent and coach routes, parent RSVP/snack/volunteer/preference writes verified against Supabase rows, Parent Replay publish rows, provider-delivery review rows, and signed-in admin operations/security routes.
- Captured hosted route smoke screenshots for `/`, `/auth`, `/registration`, `/coach/parent-replay`, `/team-chat`, `/admin`, and `/offline`.
- Ran hosted brand proof for the `/admin/themes` 20-surface launch checklist.
- Made standalone typecheck deterministic by running `next typegen` before `tsc` in `npm run typecheck`.

### Validation

- `npm run supabase:qa-users` passed.
- `QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:session-proof` passed, including screenshots for parent live actions, Parent Replay private write, provider-delivery review, and admin operations/security.
- `npm run qa:rls-proof` passed.
- `QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:brand-proof` passed.
- `npm run typecheck` passed after `.next/types` was moved aside and regenerated.
- `npm test` passed: 18 files, 174 tests.
- `npm run build` passed and generated 48 app routes.

### Remaining Gap

- Superseded by the 2026-07-02 closeout above: hosted AI rewrite proof and broader AI eval coverage are now complete.
- Provider sends remain disconnected by launch decision unless real email/SMS/Web Push delivery becomes explicit production scope.
- Vercel Preview OpenAI env values remain unset by launch decision until a non-production preview branch target is named.
- The Next SWC lockfile warning remains a non-blocking Vercel build follow-up.

## 2026-06-27

### Completed

- Added `lib/domain/contracts.ts` as the strict domain contract source for existing entities, enum values, workflow-state unions, and state type guards.
- Added pure domain state machines and runtime guards for notification, weather-alert, and Parent Replay actionable states. UI code cannot move an object to `sent`; system-only transitions are enforced in the domain layer.
- Added `db/schema.sql` plus `db/rls/*.sql` as a Supabase Postgres/RLS reference schema for teams, players, events, RSVPs, notifications, weather alerts, and team chat messages.
- Added `lib/services/weather/` with National Weather Service first, Open-Meteo fallback, and optional Tomorrow.io adapters. Provider results normalize into `WeatherEventDraft` and always return draft weather-alert state.
- Added `lib/domain/policies.ts` and read-only React feature panels in `components/features/` for parent, coach, and admin audit surfaces. Panels render from domain types, use policy visibility helpers, and make no API calls.
- Hardened provider delivery review so approval checks provider/channel match, recipient notification preferences, and provider credential readiness before writing a queued or suppressed delivery-attempt record. External provider sends remain disconnected.
- Added authenticated notification unsubscribe and provider retry-plan routes. Both derive the actor from the verified Supabase session.
- Wired Supabase weather draft creation to the provider-order weather service: National Weather Service, Open-Meteo fallback, then optional Tomorrow.io. Persisted weather alerts still save as draft records only.
- Extended QA browser proof to seed a QA admin, verify `/admin/operations` and `/admin/security`, and click a parent RSVP action during `/parent/rsvp` proof.
- Added focused coverage for feature panels, provider readiness, unsubscribe/retry routes, weather provider fallback, Supabase weather draft wiring, domain policies, and state guards.

### Validation

- `npm run typecheck` passed.
- Focused API/provider/weather/feature-panel tests passed.

### Remaining Gap

- Live browser proof still depends on valid QA Supabase anon/user secrets.

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

### Superseded Next Items

These 2026-06-22 next items were completed in the 2026-06-23 hardening pass:

- Team Portal branding and the admin theme designer now save through authenticated Supabase write adapters at `/api/admin/team-branding` and `/api/admin/theme-defaults`.
- Parent and coach UI actions now call persisted RSVP, snack, volunteer, weather, notification preference, field-location, and media moderation/report APIs where those actions exist.
- Private mutation API routes now require a verified browser Supabase bearer session and derive actor, reviewer, parent, or user IDs from that session instead of trusting client-submitted IDs.

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
- Hardened admin membership mutation and live RLS proof by requiring an active organization admin for team-membership changes, writing membership audit events, tightening RSVP RLS to active guardian links, and extending `qa:rls-proof` with an unlinked-player RSVP denial.
- Added cross-team and archived-season RLS proof rows, locked archived-season event and RSVP mutations behind active-season checks, and added `/admin/security` as the production proof dashboard for RLS and audit evidence.
- Added provider-boundary tests, expanded live-action route tests, added a Supabase-backed roster import audit endpoint, and pointed archived-season health status at the security proof route.
- Added `/admin/operations` with organization settings, provider inventory, approval queue counts, and recent audit logs sourced from Supabase with local fallback.
- Added `/admin/teams` and `/api/admin/teams` for organization-scoped team CRUD by active admin, with season/division setup evidence and team audit events.
- Added team lifecycle status, coach assignment fields, roster counts, team archive audit actions, and tenant-isolated admin guards to the team setup path.
- Added `/admin/guardian-links` and a guardian repair API that activates parent-player links, restores parent team membership, and writes audit events under org-admin authorization.
- Added `/admin/archive`, team logo asset metadata, logo governance policy, and logo submission audit records for archive vault and brand governance coverage.
- Hardened the admin theme console with per-team Theme QA, dark preview contrast labels, mobile contrast labels, and coverage in feature-panel tests.
- Expanded `/admin/themes` into an admin customization workbench with identity/color modules, tenant defaults, logo asset metadata review, and launch-proof summaries while keeping binary upload and provider rendering gated.
- Added a parent onboarding checklist to the parent dashboard covering guardian link, schedule, notification preference, and RSVP readiness.
- Added RSVP history, edit buttons, retained cancellation status, and cancellation migration support to the parent RSVP workflow.
- Added parent family calendar filters, an expanded approved media feed, and a computed action checklist on the parent dashboard.
- Added draft-only parent support intake, archived RSVP read-only UI, a coach RSVP reminder queue, and explicit coach role access copy.
- Added coach onboarding, selected-event schedule detail, schedule create/update service helpers, and team/venue conflict detection.
- Added schedule venue records, recurring-event previews, local ICS calendar export, and RSVP sync counts.
- Added schedule notification workflow/status summaries plus push and email channel readiness gates.
- Hardened SMS channel readiness and sent/failed/read notification status coverage.
- Added VAPID adapter status, unsubscribe preference updates, retry-log derivation, and recipient preference enforcement checks.
- Added push device summary, email fallback eligibility, urgent-only SMS rules, and notification open-rate tracking.
- Added weather approval queue, provider retry log, alert history, and sport-specific threshold policy helpers.
- Added league-specific, heat, lightning, and air-quality weather threshold review helpers.
- Added rain thresholds, field-closure drafts, weather escalation rules, and coach safety notes.
- Added team-portal embedded map metadata, venue markers, map quota handling, and field layout metadata.
- Added venue page metadata plus parking, field entrance, and restroom notes to the team portal.
- Added arrival instructions, venue intelligence summary, map fallback UX, and location-change highlighting.
- Added facility notes plus Team Chat reporting UI, retention job, and media/message policy summaries.
- Added media approve/reject helpers, upload storage provider status, and admin media reporting summary.
- Added family-facing media moderation queue, retention policy, role visibility, and consent-control summaries.
- Added per-player media consent, photo visibility flags, private team album, and takedown request summaries.
- Added parent/volunteer memory moments, exportable season memory rows, and snack reminder summaries.
- Added snack conflict handling, snack audit trail, snack cancellation preview, and volunteer role caps.
- Added volunteer reminders, cancellation preview, approval policies, and snack/volunteer fairness balance.
- Added duty rotation, family opt-out, sibling-aware assignment, and missed-slot tracking summaries.
- Added sponsor public display policy plus team portal, schedule, and media gallery placement summaries.
- Added email/banner sponsor placement summaries plus touch target QA and offline-state hardening evidence.
- Added cache invalidation policy, manual dark toggle state, contrast checks, and Parent Replay prompt/eval harness.
- Added privacy filters plus invite acceptance, invite-to-account time, and failed-invite metrics.
- Added parent-link completion, RSVP response, schedule-alert open, and weekly-active-parent metrics.
- Added support-request, CSV import error, coach weekly update send, and Game Day Calm Mode usage metrics.
- Added Parent Replay completion, micro-coaching streak, media engagement, and notification opt-out metrics.
- Reconciled the feature-fit backlog section statuses after all item-level Build/Harden rows were completed; explicit Defer rows remain provider/product decisions.
- Added the review-only AI Coach Workspace first slice: New Parent Brief, Weekly Digest, Practice Replay, and Announcement Cleaner drafts with source evidence and Preview -> Edit -> Approve -> Publish boundaries.
- Added Smart FAQ, Coach Inbox Prioritization, Parent Brief Before Game, and Season Timeline drafts to the AI Coach Workspace with sourced answers, grouped chat evidence, game-day essentials, and season memory scaffolding.
- Added Coach Knowledge Base, Action Item Extraction, Safety Monitor, and End-of-Season Storybook drafts to complete the AI Coach Workspace feature packet while keeping all outputs coach/admin reviewed.
- Added sponsor billing proof foundations with Stripe Product/Price lookup keys, invoice references, payment-proof status, admin-only migration tables, and child-facing display separation.
- Added automatic team-builder foundations with balanced assignment previews, sibling/guardian grouping, friend-request consideration, skill-balance scores, approval workflow, publish audit, and admin-only migration tables.
- Added brand-profile launch validation foundations with 20 surface checks, test brands, success metrics, monitoring events, alert rules, coach feedback prompts, acceptance criteria, and Supabase tables for brand profiles, validation runs, asset uploads, and monitoring events.
- Added `qa:brand-proof` and wired the manual Supabase QA workflow to capture hosted browser proof for the `/admin/themes` 20-surface brand launch checklist, monitoring events, alert rules, and screenshot artifact.
- Corrected QA Supabase secret configuration, applied QA migrations through `0019`, and passed the manual GitHub `Supabase QA proof` workflow on 2026-06-28: https://github.com/TOTALLYMAJOR/LittleLeaguePlatform/actions/runs/28328007719.
- Documented the current Vercel/Supabase networking posture: no Vercel Static IP requirement unless direct Postgres/pooler IP allowlisting becomes a deliberate fixed-egress architecture decision.
- Added the authenticated AI Coach Workspace provider rewrite path with OpenAI Responses API support, local privacy filters, `store: false`, source-evidence prompts, Vercel Production/Development env wiring, and review-only UI messaging.

### Remaining Gap

- Signed-out users now correctly receive `401` responses from private mutation APIs, and parent/coach private surfaces show explicit signed-out or missing-membership states instead of empty private forms.
- QA Supabase proof is now passing in GitHub Actions. The remaining hosted gap is production browser smoke against the deployed aliases and production Supabase env values.
- Vercel Preview OpenAI env setup is still blocked until a non-production preview branch target is chosen.

### Next

- Run hosted production browser smoke for signed-out, parent, coach, and admin routes, preserving screenshots or CI artifacts.
- Run hosted AI Coach Workspace rewrite proof with a signed-in assigned coach/admin, preserving evidence that output stays draft/review-only.
- Keep provider sends and direct database IP allowlisting out of launch scope unless they become explicit production requirements.
