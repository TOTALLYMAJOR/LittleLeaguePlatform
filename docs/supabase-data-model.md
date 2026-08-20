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
supabase/migrations/0025_family_first_sign_in.sql
supabase/migrations/0026_parent_invite_acceptance.sql
supabase/migrations/0027_additional_guardian_requests.sql
supabase/migrations/0028_transportation_responsibility.sql
supabase/migrations/0029_temporary_caregiver_authorizations.sql
supabase/migrations/0030_official_communication_revisions.sql
supabase/migrations/0031_parent_replay_family_story.sql
supabase/migrations/0032_season_transition_reviews.sql
supabase/migrations/0033_registration_invitation_issuance.sql
supabase/migrations/20260724143554_security_definer_execution_hardening.sql
supabase/migrations/20260726134836_data_api_service_role_grants.sql
supabase/migrations/20260726142404_relocate_btree_gist_extension.sql
supabase/migrations/20260726143452_fix_additional_guardian_revocation_ambiguity.sql
supabase/migrations/20260726143938_restrict_rls_helper_execution.sql
supabase/migrations/20260726144407_restore_anon_rls_policy_evaluation.sql
supabase/migrations/20260726182645_optimize_rls_auth_initplans.sql
supabase/migrations/20260819084447_event_change_receipts.sql
supabase/migrations/20260819161500_sponsor_program_spine.sql
supabase/migrations/20260819190000_sponsor_fulfillment_evidence.sql
```

Migrations `20260819161500_sponsor_program_spine.sql` and `20260819190000_sponsor_fulfillment_evidence.sql` are source candidates with local transactional behavior proof only. Neither has been applied or read back on preview or production; hosted targets remain aligned through `20260819084447_event_change_receipts.sql`.

Migration `20260819084447_event_change_receipts.sql` is installed locally and on the protected production project. Local transactional behavior proof passed before promotion, the reviewed production apply used no seed data, and the guarded follow-up plan/readback returned current. Preview remains on the earlier promoted chain until separately advanced.

Demo seed:

```text
supabase/seed.sql
scripts/bootstrap-demo-tenant.mjs
```

The active LeaguePilot Supabase production project is installed and migration-history readback is aligned at 41 migrations through `20260819084447_event_change_receipts.sql`. On 2026-07-26, a clean PostgreSQL 17 reset and the empty-data Supabase preview `gmrvnnkxksqkcxcmydhr` first applied `0022` through `0033` plus six timestamped hardening migrations; after explicit approval, the same reviewed 18-migration gap was applied to production without seed data. A later clean reset and preview promotion applied migration 40, and a separate explicit production approval promoted and read back the same migration without seed data. On 2026-08-19, a later single approved production apply promoted `20260819084447_event_change_receipts.sql` without seed data, and the guarded follow-up plan/readback returned current. The earlier additive migration follows [Supabase's row-invariant RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select) by wrapping 72 `auth.uid()` calls across 49 policies in scalar subqueries; it changes no policy name, command, role, permissiveness, normalized predicate, grant, or RLS setting. The first local pass exposed `authorization` as a reserved alias in `0028` and `0029`; after those aliases were replaced, the chain installed. Transportation now permits multiple pending offers while a partial unique index enforces only one final assignment. Error-level lint also found and the additive chain repaired an ambiguous `revocation_reason` reference in the additional-guardian revocation function.

Current Supabase projects may use opt-in Data API grants. The compatibility migration preserves `select`, `insert`, `update`, and `delete` for `anon`, `authenticated`, and `service_role` on the 58 legacy RLS-governed tables. For the 20 server-adapter tables added in `0022`-`0024`, it first revokes `public`, `anon`, and `authenticated`, then grants those four DML privileges only to `service_role`. Production readback confirms all 92 public tables have RLS and the intended privilege split holds. The extension hardening migration relocates `btree_gist` from `public` to `extensions`, and the dependent field-reservation exclusion constraint remains valid. The RLS-helper hardening removes the default broad `PUBLIC` execution grant, then explicitly grants the eight helpers to `authenticated`, `anon`, and `service_role`; preview real-session proof confirms anonymous denial still evaluates to zero rows rather than a function-permission error.

The hosted preview and production both prove ordered application through `20260726182645`, migration-history readback, and no-op guarded follow-up plans. Performance Advisor warnings on each target are 175 after all 49 `auth_rls_initplan` findings were cleared; the 175 `multiple_permissive_policies` findings remain open. Preview retains real-session parent/coach/anonymous boundaries and the provider-free `0028`/`0029` lifecycle. Production readback confirms unchanged normalized policy, grant, and RLS-state digests, unchanged sampled row counts, disabled provider flags, and narrower read-only parent/coach/admin/anonymous session boundaries without application mutations. Neither target's evidence proves production signed-in browser behavior, every feature lifecycle, Realtime change delivery, provider behavior, backup/PITR/restore, or operational acceptance. See `docs/supabase-migration-rehearsal-2026-07-26.md`.

`supabase/seed.sql` adds a minimal demo organization, active season, and teams with UUID IDs so public registration has valid team choices. `scripts/bootstrap-demo-tenant.mjs` is the richer fictional product-demo seed: it creates demo auth users and populated tenant rows for admin, coach, and parent workflows while keeping provider sends and payment collection disconnected.

## Migration Promotion Boundary

Use only an explicitly approved, correctly classified target; rehearse on QA/preview before any production apply. Do not rely on the repository's cached link metadata or the default app database URL. Before applying:

1. Confirm the target project reference and environment independently.
2. Review the target's backup, point-in-time recovery, and restore procedure.
3. Run the guarded dry-run plan and inspect the exact ordered migration list.
4. Apply without seed data.
5. Read back migration history and run security advisors.
6. Seed only fictional QA users, then run real-session RLS and populated lifecycle proof.

The guarded runner requires target-specific values supplied through the process environment:

```env
SUPABASE_MIGRATION_TARGET_REF=<approved-qa-or-preview-ref>
SUPABASE_MIGRATION_TARGET_ENV=preview
SUPABASE_POOLER_DATABASE_URL=<direct-or-session-pooler-database-url>
```

Plan first, then apply only after reviewing that plan:

```bash
npm run supabase:plan
SUPABASE_MIGRATION_CONFIRM=apply-reviewed-migrations npm run supabase:push
```

Target ref, target classification, app-target override, seed opt-in, and apply confirmations are invocation-only; the runner deliberately ignores those keys in `.env.local`. Seed inclusion is opt-in and forbidden for production promotion. The protected production ref must be classified as `production`, no other ref may use that classification, and production apply requires the distinct per-invocation confirmation `SUPABASE_MIGRATION_CONFIRM=apply-reviewed-production-migrations` after QA/preview evidence and approval pass.

Use the direct database endpoint when IPv6 is available or the Supavisor session pooler on port `5432` from IPv4-only environments. The guarded runner rejects transaction-pooler URLs on port `6543` because migration tooling uses prepared statements.

## Core Tables

| Area | Tables |
| --- | --- |
| Identity and access | `profiles`, `organizations`, `organization_memberships`, `team_memberships` |
| League structure | `seasons`, `teams`, `players`, `player_guardians`, `parent_invites` |
| Guardian safety | `guardian_authorizations`, `emergency_contacts`, `player_health_notes` |
| Scheduling | `events`, `event_series`, `event_change_logs`, `event_change_receipts`, `field_locations`, `field_reservations`, `rsvps`, `snack_schedule_slots`, `volunteer_signups`, `weather_alerts`, `game_day_resolution_reviews` |
| Team portal | `announcements`, `media_items`, `sponsors`, `sponsor_packages`, `sponsor_placements`, `sponsor_assets`, `sponsor_billing_records`, `sponsorship_agreements`, `sponsorship_invoices`, `sponsor_payment_ledger_entries`, `team_brand_profiles`, `team_brand_surface_validation_runs`, `brand_asset_uploads`, `brand_monitoring_events` |
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
- Temporary caregiver authorizations are separate from guardian membership and from coordination notes. Scope is one child/team, selected events, at most 14 days, Event Passport view, optional pickup, and fixed prohibitions. Exact-email acceptance, future-start state, expiry, revocation, restriction checks, and audit history are explicit.
- Game-day monitor, confirm, delay, and cancel decisions require assigned coach/admin review. Delay/cancel changes, evidence, audit/change logs, and notification drafts are committed together; no provider send occurs in the RPC.
- Explicit notification acknowledgment is recipient-scoped and requires an existing delivery attempt. It does not infer provider acceptance, delivery, or read evidence.
- Sponsor fulfillment requirements are unique per agreement and benefit kind; evidence is an observation with an `observed_at` the database refuses to place in the future. Neither table stores a deliverable state, delivered count, or delivered timestamp: delivery is folded from a requirement, its placement window, and its evidence on read, so `delivered` is unreachable without an evidence row. A `blocked_at` reason suppresses a deliverable claim and can never produce delivery. Evidence carries insert and select grants only; correcting one is a separately authorized action. `supabase/sponsor-fulfillment-invariants.sql` checks all of this on any target and must return zero rows. Locally proved in a rolled-back transaction; not hosted.
- Event-change receipts are unique per change and guardian. Their SQL-authorized RPC records seen or explicit acknowledgment only after re-deriving active player-guardian scope; high-impact requirement remains derived from the existing change type. Receipt rows follow the source change-log lifetime. The contract is locally proved and installed/read back on production; real signed-in production acknowledgment acceptance remains separate.

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
- Data API table grants and row authorization are separate. The compatibility migration restores legacy-table DML behind existing RLS and explicitly removes browser-role access from the 20 server-adapter-only tables before granting service-role DML.

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

## Family Migration Promotion

The shared ordered chain is installed through `20260726182645` on isolated preview `gmrvnnkxksqkcxcmydhr` and in production, and both guarded follow-up plans are empty. `npm run qa:rls-proof` and `npm run qa:migration-gap-proof` ran only on preview after migration 40, covering real-session parent/coach/anonymous policies plus the provider-free transportation and caregiver happy/denial/revocation path. Production received read-only parent, coach, admin, and anonymous session queries after migration 40; they performed no application mutation or provider call. Cross-organization, cross-team, cross-family, competing-offer, wrong-role, expiry, cache-clearing, correction, downstream-refusal, production signed-in browser and populated lifecycle behavior, Realtime, provider behavior, and backup/PITR/restore remain pending after schema promotion and before operational acceptance.

Migration `0029_temporary_caregiver_authorizations.sql` adds least-privilege, time-bound caregiver scope separate from guardian membership: one child/team, selected scheduled events, a maximum 14-day window, selected Event Passport view, optional pickup, and fixed medical/custody/attendance/schedule/publishing/roster/delegation prohibitions. Exact-email acceptance, active-guardian revalidation, hashed single-use proof, pickup-restriction review, automatic expiry, attributed revocation, and audit events are enforced server-side. Provider sandbox evidence is a separate gate: notification drafts, approval, provider acceptance, verified delivery/failure, read, and acknowledgment remain independent proof lanes.
