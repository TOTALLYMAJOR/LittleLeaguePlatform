# Backlog

This backlog turns the static Little League HQ prototype into a production youth sports platform with human-in-the-loop agents. Priorities are ordered by dependency and risk, not by visual appeal.

## P0 - Production Foundation

### App Scaffold

- Owner: Platform Agent
- Prototype surface: all routes in `index.html` and `app.js`
- Build a Next.js + TypeScript web app shell and move route data out of browser-only state.
- Acceptance: real routing, typed domain models, environment loading, CI checks, and Docker/dev runbooks.
- Risk: avoid freezing prototype assumptions into production contracts too early.

### Database And Access Model

- Owner: Data Steward Agent
- Prototype surface: teams, players, registrations, events, media links, threads, messages, notifications, invites
- Create Supabase Postgres schema, migrations, seed data, and row-level security for org admin, coach, and parent roles.
- Acceptance: no parent can read another team's private records; coaches are scoped to assigned teams; admins are scoped to the organization.
- Risk: child privacy and cross-team data leakage.

### Auth And Invite Links

- Owner: Access Agent
- Prototype surface: login, invites, parent self-registration
- Replace role preview with real email/SMS auth, expiring invite tokens, registration matching, and approval states.
- Acceptance: invited parent can claim access only to approved children/team records; invite attempts are logged.
- Risk: wrong guardian matched to child profile.

### Server-Side CSV Imports

- Owner: Import Agent
- Prototype surface: CSV Imports, Rosters, Schedule
- Move CSV validation/import to server jobs with preview, error report, approval, and rollback support.
- Acceptance: admin can validate before saving; invalid rows never partially mutate production records.
- Risk: duplicate players, wrong divisions, bad parent contacts, schedule conflicts.

### Audit Log

- Owner: Compliance Agent
- Prototype surface: dashboard recent activity, archive
- Add immutable audit events for auth, invite, registration review, CSV import, score entry, media moderation, and archive close.
- Acceptance: every sensitive admin action has actor, timestamp, target, before/after summary, and source workflow.
- Risk: logging child-sensitive free text.

## P1 - Core League Workflows

### Registration Review Queue

- Owner: Registration Agent
- Prototype surface: Parent Registrations
- Add match scoring, duplicate detection, guardian verification, approve/reject notes, and notification drafts.
- Acceptance: agent can suggest a match, but admin approval is required before account access changes.
- Risk: false positive match grants private team access.

### Roster Workspace

- Owner: Roster Agent
- Prototype surface: Rosters, My Team
- Add roster create/edit flows, parent contact management, coach-scoped edits, CSV export, and child display-name enforcement.
- Acceptance: display names never expose full child last names in parent/coach views.
- Risk: accidental full child name exposure.

### Schedule And Standings Engine

- Owner: Schedule Agent
- Prototype surface: Master Schedule, Standings
- Add schedule CRUD, conflict detection, score entry, standings recalculation, and score correction audit.
- Acceptance: standings derive only from completed game results; score entry is admin-only unless policy changes.
- Risk: incorrect score or standings update sent to families.

### Messaging And Notifications

- Owner: Communications Agent
- Prototype surface: Chat, Notifications, Invites
- Add realtime chat, coach-parent private messages, notification preferences, delivery queues, provider adapters, and unsubscribe controls.
- Acceptance: user preferences and opt-in rules are checked before provider calls.
- Risk: sending messages to wrong recipients or without consent.

### Media Link Governance

- Owner: Media Safety Agent
- Prototype surface: Media Links
- Add URL validation, visibility scoping, report queue, moderation actions, and provider-specific embed handling.
- Acceptance: reported media can be hidden pending review; parent users cannot remove other users' links.
- Risk: unsafe or incorrectly scoped child media.

### Season Archive And Retention

- Owner: Retention Agent
- Prototype surface: Season Archive
- Implement season close, read-only archived records, chat deletion, audit-only deletion proof, and export policies.
- Acceptance: archived season records remain readable; chat text is removed according to retention rules.
- Risk: retaining sensitive messages longer than promised.

## P2 - Agentic Assistance

### Admin Copilot

- Owner: Admin Copilot Agent
- Prototype surface: Dashboard, Registrations, Imports, Schedule
- Draft admin decisions, summarize risk, explain failed imports, and prepare invite batches.
- Acceptance: copilot produces recommendations only; admin clicks final approval.
- Risk: over-trusting suggestions around child access.

### Coach Assistant

- Owner: Coach Assistant Agent
- Prototype surface: My Team, Chat, Media Links, Schedule
- Draft weekly updates, answer schedule questions from approved data, and suggest missing roster tasks.
- Acceptance: generated messages are editable drafts and respect team scope.
- Risk: leaking another team's data in generated text.

### Parent Help Agent

- Owner: Parent Help Agent
- Prototype surface: My Team, Schedule, Standings, Media Links
- Answer parent questions from their approved team records and explain app actions.
- Acceptance: answers cite only records the parent can access.
- Risk: exposing private admin notes or another child's data.

### Operations Monitor

- Owner: Ops Agent
- Prototype surface: Roadmap, Dashboard
- Watch import failures, delivery failures, orphaned registrations, schedule conflicts, and archive readiness.
- Acceptance: alerts link to the exact admin workflow needed to resolve the issue.
- Risk: noisy alerts that hide real problems.

## P3 - Mobile And Scale

### Expo Mobile App

- Owner: Mobile Agent
- Prototype surface: My Team, Notifications, Media Links, Chat
- Build iOS/Android app with push tokens, in-app browser for Google Photos, YouTube player, and parent-first navigation.
- Acceptance: parent can complete core weekly workflows without desktop.
- Risk: push permissions and media privacy.

### Organization Multi-Tenancy

- Owner: Platform Agent
- Prototype surface: single organization assumption
- Add organization provisioning, custom divisions, branding, configurable seasons, and isolated tenant data.
- Acceptance: tenants cannot query or infer other tenants' data.
- Risk: cross-organization data leakage.

### Reporting And Exports

- Owner: Reporting Agent
- Prototype surface: Dashboard, Archive
- Add admin exports for rosters, contacts, schedule, standings, delivery logs, and archive manifests.
- Acceptance: exports are permission-checked and audit-logged.
- Risk: exports can contain child/contact data.
