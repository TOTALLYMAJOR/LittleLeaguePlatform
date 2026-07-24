# Supabase Data Model

This document tracks the first production Supabase data model for Little League HQ. Routes are moving one slice at a time from typed seed data to Supabase service adapters, with local seed fallback kept for unavailable live reads.

## Migration

Primary migrations:

```text
supabase/migrations/0001_core_schema.sql
supabase/migrations/0002_platform_hardening.sql
supabase/migrations/0003_registration_approval_workflow.sql
supabase/migrations/0004_fix_registration_approval_digest.sql
...
supabase/migrations/0024_coordination_loops.sql
```

Demo seed:

```text
supabase/seed.sql
scripts/bootstrap-demo-tenant.mjs
```

The configured Supabase project has a previously verified migration baseline, but migration `0024` still requires an explicitly selected QA/preview target before it is pushed. Locally, migrations `0001` through `0024` install together in an empty PostgreSQL database, and transaction/RLS smoke checks cover the new coordination loops. That local evidence does not prove hosted migration state, provider behavior, or production deployment. `supabase/seed.sql` adds a minimal demo organization, active season, and teams with UUID IDs so public registration has valid team choices. `scripts/bootstrap-demo-tenant.mjs` is the richer fictional product-demo seed: it creates demo auth users and populated tenant rows for admin, coach, and parent workflows while keeping provider sends and payment collection disconnected.

From this WSL environment, Supabase's direct database URL requires IPv6 and may not connect. Keep using the project's IPv4 transaction pooler URL in:

```env
SUPABASE_POOLER_DATABASE_URL=
```

Then run:

```bash
npm run supabase:push
```

## Core Tables

| Area | Tables |
| --- | --- |
| Identity and access | `profiles`, `organizations`, `organization_memberships`, `team_memberships` |
| League structure | `seasons`, `teams`, `players`, `player_guardians`, `parent_invites` |
| Guardian safety | `guardian_authorizations`, `emergency_contacts`, `player_health_notes` |
| Scheduling | `events`, `event_series`, `event_change_logs`, `field_locations`, `field_reservations`, `rsvps`, `snack_schedule_slots`, `volunteer_signups`, `weather_alerts`, `game_day_resolution_reviews` |
| Team portal | `announcements`, `media_items`, `sponsors`, `sponsor_packages`, `sponsor_placements`, `sponsor_assets`, `sponsor_billing_records`, `team_brand_profiles`, `team_brand_surface_validation_runs`, `brand_asset_uploads`, `brand_monitoring_events` |
| Coach planning | `drill_videos`, `drill_video_sources`, `drill_video_assignments` |
| Parent Replay | `practice_run_receipts`, `parent_replays`, `parent_replay_templates`, `ai_generation_runs`, `learning_plans` |
| Team chat | `team_chat_channels`, `team_chat_messages`, `team_chat_threads`, `team_chat_message_reads`, `team_chat_reactions`, `team_chat_attachments`, `team_chat_reports`, `chat_moderation_audit_events` |
| Notifications | `notifications`, `notification_preferences`, `notification_delivery_attempts`, `push_subscriptions` |
| Family coordination | `family_event_handoffs` |
| Admin operations | `registration_requests`, `registration_approval_actions`, `roster_imports`, `roster_import_rows`, `team_build_plans`, `audit_events` |

## Hardening Additions

`0002_platform_hardening.sql` raises the model from MVP foundation to production-ready shape:

- Guardian authority is explicit through pickup, medical decision, emergency contact, media release, and communication authorization records.
- Emergency contacts and player health notes are separated from general roster data with stricter access policies.
- Notification consent is stored per user, channel, notification type, team/org scope, quiet hours, and opt-in/out timestamp.
- Provider delivery attempts are separated from notification records so queued, sent, failed, suppressed, retry, idempotency, provider-response, webhook, and dead-letter state are auditable. Execution metadata lives in `0021_notification_delivery_execution.sql`.
- Scheduling supports recurring series, field inventory, field reservation conflict prevention, cancellation reasons, schedule versions, and change logs.
- Team chat supports threads, replies, attachments, reactions, reports, read receipts, moderation, and retention timestamps.
- Parent Replay has reusable templates, deterministic/AI/coach-written source tracking, review timestamps, generated-run evidence, and approved learning plans.
- Sponsor management supports packages, placements, assets, contacts, dates, review status, and billing proof records separated from child-facing display.
- Automatic team-builder plans store preview/edit/approve/publish status, constraints, assignments, warnings, and admin approval evidence.
- Team brand profiles store published logo/banner URLs, display and short names, fallback avatar labels, primary/secondary/accent/button colors, hero copy, 20-surface validation runs, reviewed asset uploads, and monitoring events.
- Registration approval actions record the exact steps taken after a request: match existing player, create player, create guardian, create membership, or queue invite.
- Drill video records store YouTube metadata references, source allowlist state, Made-for-Kids and embeddability flags, admin review state, and coach-only practice-plan assignments. They do not store copied videos, downloaded thumbnails, clips, or parent-facing assignments.
- Season Launch commit and rollback execute as admin-only atomic RPCs. Provenance is retained on imported players, guardian links, memberships, and invites; rollback stops once downstream family, attendance, safety, learning, media-consent, RSVP, or handoff activity exists.
- Practice completion is an auditable receipt separate from planning, start, Parent Replay approval, and publication. A completed receipt may be linked to one same-team Replay only.
- Caregiver handoffs are guardian-owned coordination records for one linked player and event. They do not create a profile, invite, membership, or access grant.
- Transportation requests, offers, and assignments are separate from caregiver coordination notes. Outbound and return are independent; a request is unassigned, a driver offer records only driver-side acceptance, and assignment requires the requesting guardian’s second acceptance at the same official schedule version. Recorded pickup restrictions fail closed. Withdrawal creates attributed history and no provider send.
- Game-day monitor, confirm, delay, and cancel decisions require assigned coach/admin review. Delay/cancel changes, evidence, audit/change logs, and notification drafts are committed together; no provider send occurs in the RPC.
- Explicit notification acknowledgment is recipient-scoped and requires an existing delivery attempt. It does not infer provider acceptance, delivery, or read evidence.

## Security Shape

- Supabase Auth users map to `profiles`.
- Children are stored in `players`; children do not authenticate.
- Parents get access through `team_memberships` plus `player_guardians`.
- Coaches can manage assigned team surfaces.
- Organization admins can manage organization-wide surfaces.
- Public registration can only insert pending `registration_requests`.
- Chat is scoped to team membership and includes moderation audit records.
- Weather, notification, and Parent Replay records are persisted as draft/queued records before any provider send.
- Health notes and emergency contact records are not general team portal content; they use explicit guardian/team-manager policies.
- AI-generated content is stored as a draft/review artifact before a learning plan or Parent Replay can be treated as approved.

## TypeScript Boundary

Supabase helper files live in:

```text
lib/supabase/
```

- `browser.ts` creates the browser client with the anon key.
- `admin.ts` creates a server-only service-role client for backend jobs and seeding.
- `database.types.ts` captures the first typed subset of the schema used by app routes.
- `team-portal.ts` loads the `/team-portal` snapshot from Supabase: teams, branding, players, guardian links, invites, memberships, schedules, media, and Parent Replay records.

## Demo Tenant Boundary

Run the product-demo seed only with explicit confirmation:

```bash
DEMO_TENANT_SEED_CONFIRM=load-fictional-data npm run supabase:demo-tenant
```

The seed is idempotent and writes fixed fictional UUIDs under `LeaguePilot Demo League`. It is meant to make local, QA, preview, or intentionally selected hosted environments feel fully populated for product review. It does not prove production readiness, provider delivery, Stripe payments, media storage, AI-provider output, or hosted browser proof.

## Coordination Loop Promotion

Apply migration `0024` only to an explicitly selected disposable QA/preview project, then run signed-in admin, coach, and guardian journeys with database readback. Provider sandbox evidence is a separate gate: notification drafts, approval, provider acceptance, verified delivery/failure, read, and acknowledgment must remain independent proof lanes.
