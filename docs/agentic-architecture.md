# Agentic Architecture

## Objective

Little League HQ should become a private youth sports operations platform where agents help with administrative work without bypassing human approval, provider consent, or child privacy policy.

The current prototype is static. It proves screens and workflow intent, not production capability.

## Current Prototype Surfaces

- Login and role preview.
- Dashboard and role-aware queue.
- My Team home.
- Teams and rosters.
- Master schedule and score entry.
- Standings.
- Team chat and coach-parent private messaging.
- Media links for Google Photos and YouTube.
- Parent self-registration and registration review.
- CSV roster and schedule validation simulation.
- Notification preferences and notification log simulation.
- Parent invite simulation.
- Permission matrix.
- Roadmap.
- Season archive simulation.

## Production Layers

### Experience Layer

- Next.js web app for admin, coach, and parent users.
- Expo mobile app for parent/coach weekly workflows.
- Shared design tokens and role-aware navigation.

### Domain Service Layer

- Organization, season, division, team, roster, guardian, event, score, standing, media, message, notification, invite, and audit services.
- Service policies enforce permissions before any agent or UI action mutates state.
- Provider adapters isolate email, SMS, push, media embeds, and auth provider behavior.

### Data Layer

- Supabase Postgres with migrations and row-level security.
- Immutable audit event table.
- Retention-aware message storage.
- Import job tables for CSV preview, validation errors, approvals, and rollback metadata.

### Agent Control Plane

- Agent orchestrator that receives workflow events and user requests.
- Tool registry for scoped service calls.
- Policy engine for role, tenant, child privacy, consent, and approval requirements.
- Human approval queue for sensitive actions.
- Evaluation harness for permission leakage, hallucinated data, and provider-send safety.

## Agents

### Platform Agent

Owns app scaffolding, environment setup, Docker, CI, deployment, observability, and tenant boundaries.

Can propose infrastructure changes. Cannot weaken auth, RLS, audit, or privacy gates without explicit review.

### Data Steward Agent

Owns schema, migrations, seed data, imports, data contracts, and row-level policy tests.

Validates that production records match the youth sports domain: organization, season, division, team, player, guardian, roster assignment, event, score, standing, media link, thread, message, invite, notification, audit event.

### Access Agent

Owns auth, invite tokens, parent self-registration, account claims, role assignments, and guardian-child access.

May recommend a guardian match. Must require admin approval before granting private team access.

### Registration Agent

Owns the registration queue, duplicate detection, match confidence, review notes, and status transitions.

Can draft approval/rejection recommendations. Cannot approve a child access request by itself.

### Roster Agent

Owns roster imports, roster edits, player display policy, parent contacts, jersey numbers, and coach-scoped roster views.

Must enforce first name plus last initial for child display outside admin-only contexts.

### Schedule Agent

Owns schedule imports, event CRUD, conflict detection, score entry workflows, standings calculations, and correction audit.

Must keep standings derived from completed games only.

### Communications Agent

Owns invite drafting, notification preferences, delivery queues, chat summaries, coach-parent drafts, provider delivery logs, and unsubscribe handling.

Can draft messages and queue sends. Provider calls require consent checks, policy checks, and human-approved send actions.

### Media Safety Agent

Owns Google Photos and YouTube link validation, team/org visibility, report queues, moderation recommendations, and embed behavior.

Can flag or recommend hiding media. Production hiding/removal should be audited.

### Retention Agent

Owns season close readiness, read-only archive creation, chat deletion, audit-only deletion proof, and retention schedules.

Must preserve roster/schedule/score/standing records while deleting chat text when the season is closed.

### Admin Copilot Agent

Owns summaries and recommendations across admin workflows.

Can explain next actions, failed imports, pending registrations, schedule conflicts, and archive readiness. It should produce drafts and recommendations, not final irreversible actions.

### Coach Assistant Agent

Owns team-scoped drafts and summaries for coaches.

Can draft weekly updates, answer schedule questions from approved team data, and summarize team chat. It must not reference another team's private data.

### Parent Help Agent

Owns parent-facing help from approved parent-accessible data.

Can answer "when is my child's next game" or "where is the album link" only from records the parent can access.

## Workflow Pattern

Every agentic workflow should follow the same shape:

1. User or system event enters a service endpoint.
2. Service loads only records the actor can access.
3. Agent receives scoped context, never global raw data by default.
4. Agent produces a recommendation, draft, validation result, or risk summary.
5. Policy engine decides whether the result can be automatic or must go to human approval.
6. Human approves sensitive actions.
7. Service performs mutation or provider call.
8. Audit event records actor, agent, inputs summary, decision, target, and result.

## Sensitive Action Gates

Require explicit human approval for:

- Granting or revoking parent access to child/team data.
- Importing roster or schedule CSV rows into production records.
- Sending parent invites by email or SMS.
- Sending push notifications.
- Posting generated coach/admin messages.
- Correcting final scores after publication.
- Removing or hiding media links.
- Closing a season archive and deleting chat text.

## Data Boundary Rules

- Parents see only their approved child, team, schedule, standings, team media, and allowed messages.
- Coaches see assigned teams and related parent contacts according to policy.
- Admins see organization-scoped records, not cross-tenant records.
- Child display names default to first name plus last initial.
- Chat text should not appear in archive summaries after deletion.
- Agent prompts should receive minimized context, not entire database exports.

## Suggested Production Contracts

Core tables:

- `organizations`
- `seasons`
- `divisions`
- `teams`
- `team_memberships`
- `players`
- `guardians`
- `guardian_player_links`
- `registrations`
- `invites`
- `events`
- `scores`
- `standings_snapshots`
- `media_links`
- `threads`
- `messages`
- `notification_preferences`
- `notification_deliveries`
- `csv_import_jobs`
- `audit_events`
- `agent_runs`
- `approval_requests`

Provider adapters:

- Auth provider.
- Email provider.
- SMS provider.
- Push provider.
- YouTube embed helper.
- Google Photos in-app browser handler.

## Implementation Sequence

1. Create production web scaffold and typed domain contracts.
2. Add database schema, migrations, RLS, seed data, and tests.
3. Implement auth, organization membership, roles, and invite claims.
4. Move rosters, teams, schedules, and standings behind service APIs.
5. Add CSV import jobs with preview, approval, save, and rollback.
6. Add registration matching and admin approval.
7. Add notification preferences, delivery queues, and provider adapters.
8. Add chat persistence and retention jobs.
9. Add agent control plane with scoped tools and approval queue.
10. Add Expo mobile app after core policies are stable.

## Non-Goals For The Static Prototype

- Do not bolt real auth into `app.js`.
- Do not add real provider keys to this folder.
- Do not make browser-only state look persistent.
- Do not skip backend policy because the UI already disables buttons.
- Do not make agents autonomous for child access, messaging, or retention decisions.
