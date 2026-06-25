# Feature Implementation Tracker

Production scaffold decision: feature slices live in the root Next.js app with typed local seed fallbacks and Supabase-backed production paths for auth-scoped reads, writes, audits, provider-safe drafts, and admin operations. External email, SMS, Web Push sends, Stripe payments, AI providers, and native app distribution remain disconnected unless explicitly approved and configured.

| Feature | Phase | Status | Implemented routes | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| CSV Duplicate Detection | Phase 1 - Launch Readiness | Done | `/admin/imports` | `lib/domain/domain.test.ts`; `npm test`; `npm run build` | Parses CSV, normalizes rows, separates blocking errors from warnings, simulates audited commit. |
| Smart Invite Recovery | Phase 1 - Launch Readiness | Done | `/invite/recover`, `/invite/expired`, `/admin/invites` | `lib/domain/domain.test.ts`; `npm test`; `npm run build` | Checks not found, expired, accepted, active season, and hourly/daily limits; hashes only, no raw token display. |
| Admin Health Dashboard | Phase 1 - Launch Readiness | Done | `/admin/health` | `lib/domain/domain.test.ts`; `npm test`; `npm run build` | Computes missing coaches, missing parent links, pending/failed invites, duplicate warnings, empty schedules, media, archive state. |
| Parent Dashboard | Phase 2 - Parent Engagement | Done | `/parent` | `lib/domain/domain.test.ts`; `npm test`; `npm run build` | Parent-scoped child/team summary, upcoming events, coach update, RSVP needs, recent media, registration completion. |
| One-Tap RSVP | Phase 2 - Parent Engagement | Done | `/parent/rsvp`, `/coach/rsvps` | `lib/domain/domain.test.ts`; `npm test`; `npm run build` | Parent can RSVP only for linked child; coach sees assigned-team aggregate attendance summary. |
| RSVP Reliability Tracker | Phase 2 - Coach Operations | Done | `/coach` | `components/feature-panels.test.tsx`; `lib/domain/domain.test.ts`; `npm test`; `npm run build` | Coach dashboard derives family response rate, no-response count, late-change count, and reminder mode from assigned-team RSVP records without public parent leaderboards. |
| Schedule Change Alerts | Phase 2 - Parent Engagement | Done | `/schedule` | `components/feature-panels.test.tsx`; `lib/domain/domain.test.ts`; `npm test`; `npm run build` | Admin/coach event edits show an impact preview with affected families, existing RSVPs, no-response players, and draft alert channels before creating push/email/SMS notification records. No provider sends. |
| Notification Preference Center | Phase 2 - Parent Engagement | Done | `/parent` | `components/feature-panels.test.tsx`; `npm test`; `npm run build` | Parent dashboard shows push, email, SMS fallback, urgent-only SMS, quiet hours, and digest frequency as the production messaging contract. Provider subscription updates are not connected. |
| Team Chat | Phase 2 - Parent Engagement | Done | `/team-chat` | `components/feature-panels.test.tsx`; `lib/domain/domain.test.ts`; `npm test`; `npm run build` | Assigned parents/coaches/admins can use private team chat; no child accounts or direct messages. |
| Parent Replay | Signature Feature | Done | `/coach/parent-replay`, `/api/coach/parent-replay`, `/team-portal` | `components/feature-panels.test.tsx`; `lib/domain/domain.test.ts`; `app/api-live-actions.test.ts`; `npm test`; `npm run build` | Coach practice recap builder accepts 2-3 focus areas and generates home activities plus coach-to-parent translations, aggregate micro-coaching streaks, a memory moment, coach video, parent tip, skill cards, and team quest. Authenticated coach/admin publishing persists reviewed Supabase replay rows and pending parent notification drafts. No external provider send or AI provider runs. |
| AI Coach Workspace | Signature Feature | Done | `/coach/parent-replay` | `components/feature-panels.test.tsx`; `lib/domain/domain.test.ts` | Deterministic review-only workspace creates New Parent Brief, Weekly Digest, Practice Replay, and Announcement Cleaner drafts from existing announcements, schedule, pinned posts, volunteer needs, and coach-selected focus areas. Each draft shows source evidence and the Preview -> Edit -> Approve -> Publish workflow. No AI provider or automatic publish is connected. |
| Team Portal Feature Hub | Tier 1-3 Product Surface | Done | `/team-portal`, `/` | `components/feature-panels.test.tsx`; `lib/domain/domain.test.ts`; `npm test`; `npm run build` | Team-scoped portal displays weekly digest, Game Day Calm Mode essentials, field maps, coach video library, parent education, coach-to-parent translation, skill cards, team quests, weather alert boundary, skill trees, season storybook, memory timeline, volunteer center, and AI learning-plan boundary. Assigned coaches and org admins can update portal colors and mascot through Supabase-backed APIs. |
| Branded Team Chat | Phase 2 - Parent Engagement | Done | `/team-chat` | `components/feature-panels.test.tsx`; `lib/domain/domain.test.ts`; `npm test`; `npm run build` | Team Chat uses each team's mascot and colors, adds a branded clubhouse header, quick-topic chips, pinned coach notes, Game-Day Questions, Supabase persistence, read receipts, Realtime subscription wiring, and moderation controls. |
| Multi-Theme System and Theme Designer | Platform Foundation | Done | `/team-portal`, `/admin/themes`, `/api/admin/theme-defaults` | `components/feature-panels.test.tsx`; `lib/domain/domain.test.ts`; `app/api-live-actions.test.ts`; `npm test`; `npm run build` | Theme presets exist for soccer, football, baseball, scouts, golf, tennis, swim, and generic. Assigned coaches/admins can apply presets, mascot, and colors through Supabase-backed writes, and admins can save tenant defaults for future teams. |
| Coach Dashboard | Phase 2 - Coach Operations | Done | `/coach` | `components/feature-panels.test.tsx`; `npm test`; `npm run build` | Assigned-team coach view shows RSVP summaries, reliability patterns, editable weekly update draft, weather alert drafts, snacks, volunteers, and Parent Replay entry point. |
| Admin Dashboard | Phase 1 - Launch Readiness | Done | `/admin` | `components/feature-panels.test.tsx`; `npm test`; `npm run build` | Admin view summarizes teams, registration queue, sponsors, notification architecture, and readiness cards. |
| Registration System | Phase 1 - Access Readiness | Done | `/registration`, `/admin`, `/admin/registrations` | `lib/domain/domain.test.ts`; `components/feature-panels.test.tsx`; `app/api-live-actions.test.ts`; `npm test`; `npm run build` | Parent self-registration creates pending review requests. Admin approval/rejection flows create audited Supabase approval actions and derive reviewer identity from the verified session. |
| Snacks, Volunteers, Sponsors | Phase 2 - Community Operations | Done | `/team-portal`, `/coach`, `/admin`, `/api/admin/sponsors` | `components/feature-panels.test.tsx`; `app/api-live-actions.test.ts`; `npm test`; `npm run build` | Snack and volunteer claims use authenticated Supabase APIs. Sponsor Management V2 supports admin-only CRUD, placement settings, logo asset rows, pending/active/expired status, and audit events. |
| PWA, Mobile, Dark Mode | Platform Foundation | Done | all routes, `/offline`, `/api/mobile-usage-events` | `app/routes-smoke.test.ts`; `npm test`; `npm run build` | Manifest, service worker, install prompt UX, offline fallback, responsive layout, system dark mode, and PWA/native decision usage metrics are present. |

## Requested Feature Tiers

| Tier | Features | Current scaffold state |
| --- | --- | --- |
| Tier 1 | Team-specific portals, coach practice recap builder, weekly digest, Game Day Calm Mode, field maps | Parent Replay route implements the practice recap builder. Team-specific context, Calm Mode essentials, Game Day question grouping, and field map links are scaffolded through existing team, schedule, RSVP, snack, volunteer, weather draft, and Team Chat data. Weekly digest is represented as a planned parent-facing rollup, not a provider send. |
| Tier 2 | Coach video library, parent education center, coach-to-parent translation, skill cards, team quests, weather alerts | Parent Replay generates coach video recommendations, parent education notes, parent-friendly translations, skill cards, and team quests. Weather alerts remain approval-gated and no automatic provider send occurs. |
| Tier 3 | Skill trees, season storybook, memory timeline, volunteer center, AI-generated learning plans | Replay focus areas roll up into skill-tree cues, memory moments, and a team timeline that also includes events, media, coach notes, and volunteer moments. AI-generated learning plans are not connected to an AI provider in this scaffold. |
| Signature | Parent Replay | Implemented as the differentiated coaching loop: after practice, coach selects 2-3 focus areas and the app generates parent-ready activities, translations, healthy aggregate engagement, and a memory artifact. |

## Original Feature Notes

1. Smart Invite Recovery
User Value

Parents often lose invite links, change phones, miss emails, or forward links incorrectly. Invite recovery reduces support requests for coaches and admins.

MVP Behavior

Parents can enter their email or phone number and request a new invite link.

System checks:

Is this email/phone connected to an existing parent invite?
Is the invite expired?
Has the parent already registered?
Is the season still active?
Recommended Schema
parent_invites
- id
- organization_id
- team_id
- player_id
- email
- phone
- invite_token_hash
- status -- pending, accepted, expired, revoked
- sent_count
- last_sent_at
- expires_at
- accepted_at
- created_at
- updated_at
Rules
Invite links should expire after 7–14 days.
Resend limit: max 3 per hour, 10 per day.
Store hashed invite tokens, not raw tokens.
Audit every resend.
MVP Screens
“Resend Invite” screen
Invite expired page
Admin invite status view
2. Parent Dashboard
User Value

Parents want one simple place to answer:
“What do I need to know about my child’s team?”

MVP Behavior

                                                                                                                                                         
RSVP Needed
Recent Media
3. One-Tap RSVP
User Value

Coaches need to know who is coming to games and practices without chasing parents in group chats.

MVP Behavior

For each event, parent can choose:

Going
Not Going
Maybe

Coach can view attendance summary.

Recommended Schema
events
- id
- organization_id
- team_id
- season_id
- title
- event_type -- game, practice, team_event
- starts_at
- ends_at
- location_name
- location_address
- status -- scheduled, cancelled, completed
- created_at
- updated_at

rsvps
- id
- event_id
- player_id
- parent_user_id
- response -- going, not_going, maybe
- note
- responded_at
- created_at
- updated_at
Permission Rules
Parent can RSVP only for their child.
Coach can view RSVP summaries for assigned teams.
Org admin can view all RSVP data.
Archived season RSVP data is read-only.
Coach Attendance View
Event: Saturday Game

Going: 9
Maybe: 2
Not Going: 1
No Response: 3
4. Schedule Change Alerts
User Value

This is one of the most appreciated features because parents hate missing last-minute schedule changes.

MVP Behavior

When a coach or org admin changes an event time, location, or status, the system notifies affected parents.

Trigger Events

Send alerts when:

Game/practice time changes
Location changes
Event is cancelled
New event is added
Recommended Schema
notifications
- id
- organization_id
- recipient_user_id
- team_id
- event_id nullable
- notification_type -- schedule_changed, event_cancelled, new_event, invite_sent
- title
- body
- channel -- push, email, sms
- status -- pending, sent, failed, read
- created_at
- sent_at
- read_at
MVP Notification Channels

Recommended order:

Push notification
Email fallback
SMS only for urgent changes or invite recovery

SMS should be limited in MVP because it adds cost.

Alert Example
Schedule changed:
Tigers vs Hawks is now Saturday at 10:30 AM at Field 3.
5. CSV Duplicate Detection
User Value

Bad roster imports create confusion immediately. Duplicate detection prevents messy teams, wrong parent links, and repeated invites.

MVP Behavior

Before finalizing import, the admin sees possible duplicates.

Detect duplicates by:

Same player name + same team
Same parent email
Same parent phone
Same jersey number within team
Same player name across same season
Recommended Import Flow
Upload CSV
Validate required columns
Normalize names/emails/phones
Preview rows
Detect duplicates
Show warnings/errors
Admin resolves issues
Commit import
Send invites
Log import action
Recommended Schema
roster_imports
- id
- organization_id
- season_id
- uploaded_by_user_id
- filename
- status -- uploaded, validated, committed, failed
- total_rows
- valid_rows
- warning_rows
- error_rows
- created_at
- committed_at

roster_import_rows
- id
- roster_import_id
- row_number
- raw_data_json
- normalized_data_json
- status -- valid, warning, error, skipped
- issue_codes_json
- created_at
Example Issue Codes
missing_parent_email
duplicate_player_same_team
duplicate_parent_phone
invalid_phone
invalid_email
duplicate_jersey_number
MVP Recommendation

Warnings should not always block import.

Blocking errors:

Missing player name
Missing team
Invalid required parent contact
Duplicate exact player already on same team

Warnings:

Duplicate jersey number
Similar player name
Parent email used for another player
6. Admin Health Dashboard
User Value

Org admins need to know whether the season is ready before launch.

MVP Behavior

Admin dashboard shows operational problems.

Suggested Cards
Teams without coaches
Players without parent contact
Pending parent invites
Failed SMS/email invites
Duplicate roster warnings
Teams with no upcoming events
Recent media uploads
Archived season status
Recommended Queries
-- Teams missing coaches
SELECT teams.id, teams.name
FROM teams
LEFT JOIN team_memberships 
  ON team_memberships.team_id = teams.id 
  AND team_memberships.role = 'coach'
  AND team_memberships.status = 'active'
WHERE team_memberships.id IS NULL;

-- Pending invites
SELECT COUNT(*)
FROM parent_invites
WHERE status = 'pending'
AND expires_at > now();

-- Players without parent links
SELECT players.id, players.first_name, players.last_initial
FROM players
LEFT JOIN player_guardians
  ON player_guardians.player_id = players.id
WHERE player_guardians.id IS NULL;
Recommended Additional Schema
player_guardians
- id
- player_id
- parent_user_id nullable
- parent_invite_id nullable
- relationship -- mother, father, guardian, other
- status -- invited, active, removed
- created_at
- updated_at
Recommended MVP Priority Order
Phase 1: Launch Readiness

Build these first:

CSV duplicate detection
Smart invite recovery
Admin health dashboard

Reason: these help the organization successfully onboard teams and parents.

Phase 2: Parent Engagement

Build next:

Parent dashboard
One-tap RSVP
Schedule change alerts

Reason: these are the features parents and coaches will feel every week.

Suggested MVP Navigation
Org Admin
Dashboard
Teams
Rosters
CSV Imports
Invites
Schedule
Media
Audit Logs
Settings
Coach
My Teams
Roster
Schedule
RSVPs
Messages
Media
Parent
Home
Schedule
RSVP
Roster
Media
Notifications
MVP Success Metrics

Track these after launch:

Invite acceptance rate
Average time from invite sent to account created
Number of failed invites
Percentage of players linked to parents
RSVP response rate
Schedule alert open rate
Weekly active parents
Number of support requests per team
CSV import error rate
My Recommendation

For the contractor-buildable MVP, I would define the first release around this:

Admin can import rosters cleanly.
Parents can reliably join.
Coaches can manage schedules and RSVPs.
Parents can see what matters immediately.
Admins can detect launch problems before families complain.

That gives the product a strong operational foundation before adding more advanced media, chat, payments, or tournament features.
