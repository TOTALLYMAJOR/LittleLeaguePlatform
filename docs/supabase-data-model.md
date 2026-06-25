# Supabase Data Model

This document tracks the first production Supabase data model for Little League HQ. Routes are moving one slice at a time from typed seed data to Supabase service adapters, with local seed fallback kept for unavailable live reads.

## Migration

Primary migrations:

```text
supabase/migrations/0001_core_schema.sql
supabase/migrations/0002_platform_hardening.sql
supabase/migrations/0003_registration_approval_workflow.sql
supabase/migrations/0004_fix_registration_approval_digest.sql
```

Demo seed:

```text
supabase/seed.sql
```

The migrations have been applied to the configured Supabase project through the IPv4/session pooler. They create tables, indexes, update triggers, helper authorization functions, registration review RPCs, and initial Row Level Security policies. The seed file adds a demo organization, active season, and teams with UUID IDs so public registration has valid team choices.

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
| Scheduling | `events`, `event_series`, `event_change_logs`, `field_locations`, `field_reservations`, `rsvps`, `snack_schedule_slots`, `volunteer_signups`, `weather_alerts` |
| Team portal | `announcements`, `media_items`, `sponsors`, `sponsor_packages`, `sponsor_placements`, `sponsor_assets`, `sponsor_billing_records` |
| Parent Replay | `parent_replays`, `parent_replay_templates`, `ai_generation_runs`, `learning_plans` |
| Team chat | `team_chat_channels`, `team_chat_messages`, `team_chat_threads`, `team_chat_message_reads`, `team_chat_reactions`, `team_chat_attachments`, `team_chat_reports`, `chat_moderation_audit_events` |
| Notifications | `notifications`, `notification_preferences`, `notification_delivery_attempts`, `push_subscriptions` |
| Admin operations | `registration_requests`, `registration_approval_actions`, `roster_imports`, `roster_import_rows`, `team_build_plans`, `audit_events` |

## Hardening Additions

`0002_platform_hardening.sql` raises the model from MVP foundation to production-ready shape:

- Guardian authority is explicit through pickup, medical decision, emergency contact, media release, and communication authorization records.
- Emergency contacts and player health notes are separated from general roster data with stricter access policies.
- Notification consent is stored per user, channel, notification type, team/org scope, quiet hours, and opt-in/out timestamp.
- Provider delivery attempts are separated from notification records so queued, sent, failed, and suppressed states are auditable.
- Scheduling supports recurring series, field inventory, field reservation conflict prevention, cancellation reasons, schedule versions, and change logs.
- Team chat supports threads, replies, attachments, reactions, reports, read receipts, moderation, and retention timestamps.
- Parent Replay has reusable templates, deterministic/AI/coach-written source tracking, review timestamps, generated-run evidence, and approved learning plans.
- Sponsor management supports packages, placements, assets, contacts, dates, review status, and billing proof records separated from child-facing display.
- Automatic team-builder plans store preview/edit/approve/publish status, constraints, assignments, warnings, and admin approval evidence.
- Registration approval actions record the exact steps taken after a request: match existing player, create player, create guardian, create membership, or queue invite.

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

## Next Implementation Step

Move one route at a time from local reducer state to Supabase-backed reads/writes. Registration requests, registration approval, and Team Portal reads now have live Supabase paths. The next hardened workflow should add Supabase write adapters for team branding/theme updates, then move Team Chat channels/messages/moderation audit to Supabase Realtime.
