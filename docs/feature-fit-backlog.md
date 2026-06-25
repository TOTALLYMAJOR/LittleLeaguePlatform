# Feature Fit Backlog

This backlog translates the pasted feature inventory into repo-fit work. It is not a claim that every item is production-ready. For implementation truth, use `docs/Features.md` and `docs/capability-matrix.md`.

## Status Rubric

- `Covered`: represented in the current app, route, domain model, API, migration, or test suite.
- `Harden`: partially present, but needs production proof, richer UX, provider wiring, QA, or policy work.
- `Build`: fits this repo, but does not yet have a first-class implementation.
- `Defer`: fits a later product phase or external provider decision.

## Repo Fit Rules

- Keep child privacy, role scope, and row-level security ahead of convenience.
- Keep provider sends approval-gated until real provider credentials, preference enforcement, retries, and audit logs are proven.
- Keep AI and generated coaching content as reviewed drafts unless evals, privacy filters, and provider boundaries are implemented.
- Put parent-facing weekly work on `/parent`, `/parent/rsvp`, `/team-portal`, `/team-chat`, and `/coach/parent-replay`.
- Put admin operations on `/admin`, `/admin/health`, `/admin/imports`, `/admin/registrations`, `/admin/invites`, and `/admin/themes`.
- Put coach operations on `/coach`, `/coach/rsvps`, `/coach/parent-replay`, and schedule/weather APIs.

## Source Categories Covered

- Core Admin Features.
- Team Management Features.
- Theme and Branding Features.
- Parent Features.
- RSVP and Attendance Features.
- Coach Features.
- Schedule and Event Features.
- Notification Features.
- Weather Features.
- Maps and Venue Features.
- Team Chat Features.
- Media and Memory Features.
- Snacks, Volunteers, and Community Features.
- Sponsor Features.
- Mobile, PWA, and Accessibility Features.
- Signature Differentiation Features.
- Security, Auth, and Production Readiness Features.
- Analytics and Success Metrics.

## P0 - Production Safety And Access Proof

### Auth, Roles, RLS, And Audit Proof

- Status: `Harden`
- Repo fit: Supabase auth, session-derived actor IDs, authenticated writes, role-based access, signed-out UX, missing-role UX, row-level security policies, QA user seeding, and session proof scripts already fit the current production scaffold.
- Current seams: `lib/supabase/route-auth.ts`, `lib/supabase/server.ts`, `supabase/migrations/*`, `supabase/rls-policy.test.ts`, `scripts/bootstrap-qa-session-users.mjs`, `scripts/verify-qa-session-paths.mjs`, `app/api-auth.test.ts`, `app/api-live-actions.test.ts`.
- Backlog list:
  - `Covered`: Supabase Auth.
  - `Covered`: Session-Derived Actor IDs.
  - `Covered`: Authenticated Writes.
  - `Covered`: Role-Based Access Control.
  - `Covered`: Parent Role Access.
  - `Covered`: Coach Role Access.
  - `Covered`: Admin Role Access.
  - `Covered`: Signed-Out UX.
  - `Covered`: Missing-Role UX.
  - `Covered`: Row-Level Security Policies.
  - `Covered`: Live-Data RLS Tests.
  - `Covered`: Production RLS Coverage.
  - `Covered`: Cross-Team Access Tests.
  - `Covered`: Archived-Season Access Tests.
  - `Covered`: RLS Production Proof Dashboard.
  - `Covered`: Audit Events.
  - `Covered`: Production Audit Logs.
  - `Covered`: Provider Boundary Testing.
  - `Covered`: Live-Data Action Tests.
  - `Covered`: QA User Seeding.
  - `Covered`: Session Proof Script.
  - `Covered`: Build Verification.
  - `Covered`: Unit Tests.
  - `Covered`: Feature Panel Tests.
  - `Defer`: Production Provider Send Tests.

### Admin Operations Foundation

- Status: `Harden`
- Repo fit: Admin operations are already centered on `/admin`, `/admin/health`, `/admin/imports`, `/admin/registrations`, `/admin/invites`, and Supabase admin APIs.
- Current seams: `app/admin/page.tsx`, `app/admin/health/page.tsx`, `app/admin/imports/page.tsx`, `app/admin/registrations/page.tsx`, `app/admin/invites/page.tsx`, `lib/domain/health.ts`, `lib/domain/csv.ts`, `lib/supabase/operations.ts`.
- Backlog list:
  - `Covered`: Admin Dashboard.
  - `Covered`: Admin Health Dashboard.
  - `Covered`: CSV Roster Import.
  - `Covered`: CSV Duplicate Detection.
  - `Covered`: Roster Validation.
  - `Covered`: Import Preview.
  - `Covered`: Import Commit Simulation.
  - `Covered`: Import Audit Trail.
  - `Covered`: Registration Queue.
  - `Covered`: Parent Registration Review.
  - `Covered`: Smart Invite Recovery.
  - `Covered`: Invite Expired Page.
  - `Covered`: Invite Status View.
  - `Covered`: Invite Resend Limits.
  - `Covered`: Hashed Invite Tokens.
  - `Covered`: Pending Invite Tracking.
  - `Covered`: Failed Invite Tracking.
  - `Covered`: Admin Readiness Cards.
  - `Covered`: Teams Missing Coaches Check.
  - `Covered`: Players Missing Parent Contact Check.
  - `Covered`: Duplicate Roster Warning Check.
  - `Covered`: Empty Schedule Detection.
  - `Covered`: Archived Season Status.
  - `Covered`: Sponsor Records.
  - `Covered`: Notification Architecture View.
  - `Covered`: Organization Settings.
  - `Covered`: Audit Logs.
  - `Covered`: Provider Inventory.
  - `Covered`: Approval Queues.
  - `Covered`: Organization-Scoped Admin Auth.

## P1 - Team, Season, And Brand Management

### Team Management

- Status: `Harden`
- Repo fit: Team selection, roster summaries, memberships, branding, and portal views already exist. Team CRUD, division setup, season setup, coach assignment, archiving, and guardian repair should extend the existing team/membership schema instead of becoming separate admin tools.
- Current seams: `app/team-portal/page.tsx`, `app/admin/memberships/page.tsx`, `lib/supabase/memberships.ts`, `lib/supabase/team-branding.ts`, `lib/domain/team-branding.ts`, `lib/domain/parent-dashboard.ts`, `supabase/migrations/0001_core_schema.sql`.
- Backlog list:
  - `Covered`: Team Selector.
  - `Covered`: Team Profile.
  - `Covered`: Team Roster Summary.
  - `Covered`: Team Branding.
  - `Covered`: Team Feature Hub.
  - `Covered`: Team Portal.
  - `Covered`: Team CRUD.
  - `Covered`: Division Setup.
  - `Covered`: Season Setup.
  - `Covered`: Coach Assignment.
  - `Covered`: Roster Lifecycle.
  - `Covered`: Team Archiving.
  - `Covered`: Tenant Isolation.
  - `Covered`: Team Memberships.
  - `Covered`: Role-Based Team Access.
  - `Covered`: Player-Guardian Linking.
  - `Covered`: Guardian Link Repair Flow.
  - `Covered`: Missing-Link UX.
  - `Covered`: Archived Season Read-Only Mode.
  - `Covered`: Season Archive Vault.

### Theme And Branding

- Status: `Harden`
- Repo fit: Theme presets and admin theme management are first-class in this repo. Logo upload, asset policy, brand governance, and broader QA should extend the existing `/admin/themes` and team branding APIs.
- Current seams: `app/admin/themes/page.tsx`, `app/team-portal/page.tsx`, `app/api/admin/team-branding/route.ts`, `app/api/admin/theme-defaults/route.ts`, `lib/supabase/team-branding.ts`, `lib/domain/team-branding.ts`, `supabase/migrations/0009_tenant_theme_defaults.sql`.
- Backlog list:
  - `Covered`: Multi-Theme System.
  - `Covered`: Theme Presets.
  - `Covered`: Soccer Theme.
  - `Covered`: Football Theme.
  - `Covered`: Baseball Theme.
  - `Covered`: Scouts Theme.
  - `Covered`: Golf Theme.
  - `Covered`: Tennis Theme.
  - `Covered`: Swim Theme.
  - `Covered`: Generic Theme.
  - `Covered`: Team Mascot Customization.
  - `Covered`: Team Color Customization.
  - `Covered`: Supabase Theme Storage.
  - `Covered`: Theme Designer.
  - `Covered`: Admin Theme Console.
  - `Covered`: Theme Preview.
  - `Covered`: Contrast Checks.
  - `Covered`: Theme Audit Events.
  - `Covered`: Logo Upload.
  - `Covered`: Logo Asset Policy.
  - `Covered`: Tenant Brand Defaults.
  - `Covered`: Brand Governance.
  - `Harden`: Dark Mode Theme QA.
  - `Harden`: Mobile Theme QA.
  - `Harden`: Per-Team Brand Contrast Checks.

## P2 - Parent, RSVP, And Coach Operations

### Parent Dashboard And Preferences

- Status: `Harden`
- Repo fit: Parent features belong in `/parent`, `/parent/rsvp`, team portal reads, notification preferences, and guardian-link flows. Calendar, media feed, action checklist, and support request UX are natural follow-ons.
- Current seams: `app/parent/page.tsx`, `app/parent/rsvp/page.tsx`, `lib/domain/parent-dashboard.ts`, `lib/supabase/dashboard-data.ts`, `app/api/notification-preferences/route.ts`.
- Backlog list:
  - `Covered`: Parent Dashboard.
  - `Covered`: Child/Team Summary.
  - `Covered`: Upcoming Schedule.
  - `Covered`: Latest Coach Announcement.
  - `Covered`: RSVP Needed Section.
  - `Covered`: Recent Media.
  - `Covered`: Registration Completion Status.
  - `Covered`: Signed-Out Empty State.
  - `Covered`: Parent-Scoped Data Loading.
  - `Build`: Parent Onboarding Flow.
  - `Harden`: Missing-Link Parent UX.
  - `Build`: RSVP History.
  - `Build`: RSVP Edits.
  - `Build`: RSVP Cancellations.
  - `Covered`: Notification Preferences.
  - `Covered`: Quiet Hours.
  - `Covered`: Push/Email/SMS Preferences.
  - `Covered`: Urgent-Only SMS Preference.
  - `Covered`: Digest Frequency Preference.
  - `Build`: Parent Calendar View.
  - `Build`: Parent Schedule Filters.
  - `Build`: Parent Media Feed.
  - `Covered`: Parent Team Home.
  - `Build`: Parent Action Checklist.
  - `Build`: Parent Support Request Flow.

### RSVP And Attendance

- Status: `Harden`
- Repo fit: RSVP belongs in parent actions, coach summaries, event-level aggregates, and archive read-only policy.
- Current seams: `app/parent/rsvp/page.tsx`, `app/coach/rsvps/page.tsx`, `app/api/rsvps/route.ts`, `lib/domain/rsvp.ts`, `lib/supabase/operations.ts`.
- Backlog list:
  - `Covered`: One-Tap RSVP.
  - `Covered`: Going RSVP.
  - `Covered`: Not Going RSVP.
  - `Covered`: Maybe RSVP.
  - `Covered`: RSVP Notes.
  - `Covered`: Coach RSVP Summary.
  - `Covered`: Assigned-Team Attendance View.
  - `Covered`: No-Response Tracking.
  - `Covered`: RSVP Permission Rules.
  - `Covered`: Parent Can RSVP Only For Linked Child.
  - `Covered`: Coach Can View Assigned-Team RSVPs.
  - `Covered`: Org Admin Can View All RSVP Data.
  - `Build`: Archived RSVP Read-Only Mode.
  - `Covered`: RSVP Reliability Tracker.
  - `Covered`: Late RSVP Change Tracking.
  - `Covered`: No-Response Pattern Tracking.
  - `Harden`: RSVP Reminder Queue.
  - `Covered`: RSVP Aggregate Counts.
  - `Covered`: Event-Level Attendance Summary.
  - `Covered`: Player-Level RSVP Status.

### Coach Tools

- Status: `Harden`
- Repo fit: Coach work belongs on `/coach`, `/coach/rsvps`, `/coach/parent-replay`, and provider-safe action APIs. AI-like tools should stay deterministic or draft-only until provider policy is added.
- Current seams: `app/coach/page.tsx`, `app/coach/rsvps/page.tsx`, `app/coach/parent-replay/page.tsx`, `app/api/coach/weekly-update/route.ts`, `app/api/coach/parent-replay/route.ts`, `lib/domain/parent-replay.ts`, `lib/domain/communications.ts`.
- Backlog list:
  - `Covered`: Coach Dashboard.
  - `Covered`: Assigned-Team Coach View.
  - `Covered`: RSVP Summaries.
  - `Covered`: Weather Alert Drafts.
  - `Covered`: Snack Slot View.
  - `Covered`: Volunteer Role View.
  - `Covered`: Parent Replay Entry Point.
  - `Harden`: Coach Role Auth UX.
  - `Build`: Coach Onboarding.
  - `Covered`: Weekly Update Drafts.
  - `Covered`: Coach Weekly Update Builder.
  - `Covered`: Coach Announcement Composer.
  - `Covered`: Coach Action Payload Persistence.
  - `Covered`: Coach Parent Replay Builder.
  - `Covered`: Coach Practice Recap Builder.
  - `Covered`: Coach-to-Parent Translation Engine.
  - `Covered`: Coach Video Recommendation.
  - `Covered`: Coach Parent Tip Generator.
  - `Covered`: Coach Skill Card Generator.
  - `Covered`: Coach Team Quest Generator.

## P3 - Schedule, Alerts, Weather, And Venues

### Schedule And Events

- Status: `Harden`
- Repo fit: Schedule is already a route and notification draft source. CRUD, conflicts, venue records, recurring events, calendar export, and sync should extend the existing event model and draft-alert workflow.
- Current seams: `app/schedule/page.tsx`, `lib/domain/schedule.ts`, `app/api/weather-alerts/draft/route.ts`, `app/api/provider-delivery/review/route.ts`, `lib/supabase/operations.ts`.
- Backlog list:
  - `Covered`: Schedule Management.
  - `Covered`: Event List.
  - `Harden`: Event Detail.
  - `Covered`: Event Edit Simulation.
  - `Covered`: Schedule Change Alerts.
  - `Covered`: New Event Alerts.
  - `Covered`: Event Cancelled Alerts.
  - `Covered`: Time Change Alerts.
  - `Covered`: Location Change Alerts.
  - `Build`: Schedule CRUD Service.
  - `Build`: Conflict Detection.
  - `Build`: Venue Records.
  - `Build`: Recurring Events.
  - `Build`: Calendar Export.
  - `Build`: RSVP Sync.
  - `Harden`: Schedule Notification Workflow.
  - `Covered`: Schedule Change Impact Preview.
  - `Covered`: Event Affected-Family Preview.
  - `Covered`: Alert Recipient Preview.
  - `Harden`: Event Status Tracking.

### Notifications

- Status: `Harden`
- Repo fit: Notification records, preferences, subscription storage, service worker, mobile usage events, and approval-gated provider delivery already exist. Real sends remain deferred until provider credentials and production safety checks are in place.
- Current seams: `app/api/push-subscriptions/route.ts`, `app/api/notification-preferences/route.ts`, `app/api/mobile-usage-events/route.ts`, `app/api/provider-delivery/review/route.ts`, `public/sw.js`, `public/manifest.webmanifest`, `lib/supabase/provider-delivery.ts`.
- Backlog list:
  - `Covered`: Notification Records.
  - `Harden`: Push Notification Channel.
  - `Harden`: Email Notification Channel.
  - `Harden`: SMS Notification Channel.
  - `Covered`: Notification Status Tracking.
  - `Covered`: Pending Notification Status.
  - `Harden`: Sent Notification Status.
  - `Harden`: Failed Notification Status.
  - `Harden`: Read Notification Status.
  - `Covered`: Web Push Subscription Storage.
  - `Covered`: PWA Service Worker.
  - `Build`: VAPID Send Adapter.
  - `Covered`: Permission Prompt UX.
  - `Build`: Unsubscribe Flow.
  - `Build`: Retry Logs.
  - `Harden`: Recipient Preference Enforcement.
  - `Build`: Device Management.
  - `Build`: Email Fallback.
  - `Harden`: SMS Urgency Rules.
  - `Build`: Alert Open Rate Tracking.

### Weather

- Status: `Harden`
- Repo fit: Weather should remain coach/admin scoped, event-linked, and approval-gated before parent delivery. Thresholds are future policy/config work.
- Current seams: `app/coach/page.tsx`, `app/team-portal/page.tsx`, `app/api/weather-alerts/draft/route.ts`, `app/api/provider-delivery/review/route.ts`, `lib/supabase/provider-delivery.ts`.
- Backlog list:
  - `Covered`: Weather Alerts.
  - `Covered`: Tomorrow.io Adapter.
  - `Covered`: Draft Weather Alerts.
  - `Covered`: Event Location Weather Lookup.
  - `Covered`: Scoped Coach Weather Rows.
  - `Covered`: Authenticated Weather Draft Trigger.
  - `Harden`: Weather Approval Queue.
  - `Build`: Weather Provider Retry Logs.
  - `Build`: Weather Alert History.
  - `Build`: Sport-Specific Weather Thresholds.
  - `Build`: League-Specific Weather Thresholds.
  - `Build`: Heat Thresholds.
  - `Build`: Lightning Thresholds.
  - `Build`: Air Quality Thresholds.
  - `Build`: Rain Thresholds.
  - `Build`: Field Closure Drafts.
  - `Build`: Weather Escalation Rules.
  - `Defer`: Parent Weather Delivery.
  - `Defer`: Urgent Weather Alerts.
  - `Build`: Weather Safety Notes.

### Maps And Venues

- Status: `Harden`
- Repo fit: Existing field-location API and portal/chat map links are the right place to build venue intelligence. Avoid a separate venue app.
- Current seams: `app/api/field-locations/route.ts`, `app/team-portal/page.tsx`, `app/team-chat/page.tsx`, `lib/supabase/operations.ts`.
- Backlog list:
  - `Covered`: Google Maps Integration.
  - `Covered`: Field Location API.
  - `Covered`: Google Maps URL Storage.
  - `Covered`: Embed URL Storage.
  - `Covered`: Map Links.
  - `Build`: Embedded Map UI.
  - `Build`: Venue Marker Management.
  - `Build`: Quota Handling.
  - `Build`: Field Layout Metadata.
  - `Build`: Venue Pages.
  - `Build`: Parking Notes.
  - `Build`: Field Entrance Notes.
  - `Build`: Restroom Info.
  - `Build`: Arrival Instructions.
  - `Build`: Venue Intelligence Layer.
  - `Build`: Map Fallback UX.
  - `Covered`: Field Map Links.
  - `Covered`: Game Day Directions.
  - `Harden`: Location Change Highlighting.
  - `Build`: Facility Notes.

## P4 - Team Chat, Media, Community, And Sponsors

### Team Chat

- Status: `Harden`
- Repo fit: Team chat is implemented as a private team-scoped route backed by Supabase. Reporting UI, retention jobs, push alerts, and policy screens are natural hardening work.
- Current seams: `app/team-chat/page.tsx`, `app/api/team-chat/messages/route.ts`, `app/api/team-chat/moderation/route.ts`, `app/api/team-chat/read-receipts/route.ts`, `lib/supabase/team-chat.ts`, `lib/domain/chat.ts`.
- Backlog list:
  - `Covered`: Team Chat.
  - `Covered`: Branded Team Chat.
  - `Covered`: Team Mascot Chat Header.
  - `Covered`: Team Color Chat Branding.
  - `Covered`: Private Team Chat.
  - `Covered`: Assigned Parent Access.
  - `Covered`: Assigned Coach Access.
  - `Covered`: Admin Chat Access.
  - `Covered`: Local Message Posting.
  - `Covered`: Supabase Chat Persistence.
  - `Covered`: Missing Channel Creation.
  - `Covered`: Message Save.
  - `Covered`: Announcement Save.
  - `Covered`: Moderation Writes.
  - `Covered`: Read Receipts.
  - `Covered`: Realtime Subscriptions.
  - `Covered`: Authenticated Chat Writes.
  - `Covered`: Pinned Coach Notes.
  - `Covered`: Quick Topic Chips.
  - `Covered`: Game-Day Questions.
  - `Covered`: Chat Moderation Controls.
  - `Build`: Reporting UI.
  - `Build`: Retention Jobs.
  - `Defer`: Push Chat Alerts.
  - `Build`: Media/Message Policy Screens.

### Media And Memories

- Status: `Harden`
- Repo fit: Media governance exists through approved media reads, moderation/report APIs, and portal/admin surfaces. Uploads, per-player consent, private albums, and memory/storybook features should reuse the media and Parent Replay timeline models.
- Current seams: `app/api/media/report/route.ts`, `app/api/media/moderation/route.ts`, `lib/supabase/media-governance.ts`, `lib/domain/media.ts`, `app/team-portal/page.tsx`, `app/parent/page.tsx`, `app/admin/page.tsx`.
- Backlog list:
  - `Covered`: Team Photos.
  - `Covered`: Team Media.
  - `Covered`: Supabase Media Reads.
  - `Covered`: Media Moderation API.
  - `Harden`: Approve Media.
  - `Harden`: Reject Media.
  - `Covered`: Remove Media.
  - `Build`: Upload Storage Provider.
  - `Build`: Reporting UI.
  - `Covered`: Link Validation.
  - `Build`: Family-Facing Moderation Queue.
  - `Build`: Media Retention Policy.
  - `Harden`: Role-Based Media Visibility.
  - `Build`: Media Consent Controls.
  - `Build`: Per-Player Media Consent.
  - `Build`: Photo Visibility Flags.
  - `Build`: Private Team Album.
  - `Build`: Takedown Request Flow.
  - `Covered`: Team Memory Timeline.
  - `Covered`: Season Storybook.
  - `Covered`: End-of-Season Highlights.
  - `Covered`: Player Milestones.
  - `Build`: Parent-Submitted Moments.
  - `Build`: Volunteer Moments.
  - `Build`: Exportable Season Memories.

### Snacks, Volunteers, And Community

- Status: `Harden`
- Repo fit: Snack and volunteer claims already use authenticated APIs. The remaining work is fairness, reminders, caps, cancellation, approval, and audit.
- Current seams: `app/api/snack-slots/claim/route.ts`, `app/api/volunteer-signups/claim/route.ts`, `app/parent/page.tsx`, `app/coach/page.tsx`, `app/team-portal/page.tsx`, `lib/supabase/operations.ts`.
- Backlog list:
  - `Covered`: Snack Schedules.
  - `Covered`: Snack Slot Claim Endpoint.
  - `Covered`: Coach Snack Slot View.
  - `Covered`: Parent-Facing Snack Claim UI.
  - `Build`: Snack Reminders.
  - `Build`: Snack Conflict Handling.
  - `Build`: Snack Audit Trail.
  - `Build`: Snack Cancellations.
  - `Covered`: Volunteer Signups.
  - `Covered`: Volunteer Claim Endpoint.
  - `Covered`: Coach Volunteer Role View.
  - `Covered`: Parent-Facing Volunteer Claim UI.
  - `Build`: Volunteer Role Caps.
  - `Build`: Volunteer Reminders.
  - `Build`: Volunteer Cancellation Flow.
  - `Build`: Volunteer Approval Policies.
  - `Covered`: Volunteer Center.
  - `Build`: Snack and Volunteer Fairness Engine.
  - `Build`: Duty Rotation.
  - `Build`: Family Opt-Outs.
  - `Build`: Sibling-Aware Duty Assignment.
  - `Build`: Missed-Slot Tracking.

### Sponsors

- Status: `Harden`
- Repo fit: Sponsor management belongs in admin, with display policy separated from child safety and parent workflows. Billing should stay deferred unless sponsor payments become a real product requirement.
- Current seams: `app/admin/page.tsx`, `app/api/admin/sponsors/route.ts`, `lib/supabase/sponsors.ts`, `supabase/migrations/0007_sponsor_v2_status.sql`.
- Backlog list:
  - `Covered`: Sponsor Management.
  - `Covered`: Sponsor Records.
  - `Covered`: Sponsor CRUD.
  - `Covered`: Sponsor Logo Assets.
  - `Covered`: Sponsor Placement Rules.
  - `Defer`: Sponsor Billing/Invoicing.
  - `Harden`: Public Display Policy.
  - `Build`: Team Portal Sponsor Placement.
  - `Build`: Schedule Sponsor Placement.
  - `Build`: Media Gallery Sponsor Placement.
  - `Build`: Email Sponsor Placement.
  - `Build`: Banner Sponsor Placement.

## P5 - Mobile, Differentiators, And Metrics

### Mobile, PWA, And Accessibility

- Status: `Harden`
- Repo fit: Mobile-first web and PWA are already in scope. Expo should remain evidence-gated until usage metrics prove a native need.
- Current seams: `app/globals.css`, `app/offline/page.tsx`, `public/manifest.webmanifest`, `public/sw.js`, `app/api/mobile-usage-events/route.ts`.
- Backlog list:
  - `Covered`: Mobile-First UI.
  - `Covered`: Responsive Layouts.
  - `Covered`: Mobile Navigation.
  - `Covered`: Small-Viewport Grid Stacking.
  - `Harden`: Touch Target QA.
  - `Harden`: Offline States.
  - `Covered`: Native App Decision.
  - `Defer`: Expo Readiness.
  - `Defer`: App Store Requirement Planning.
  - `Covered`: PWA Installation.
  - `Covered`: Web App Manifest.
  - `Covered`: Service Worker.
  - `Covered`: Standalone Build Asset Copy.
  - `Covered`: Install Prompt UX.
  - `Covered`: Offline Route Testing.
  - `Build`: Cache Invalidation Policy.
  - `Covered`: Push Subscription Support.
  - `Covered`: Dark Mode.
  - `Covered`: System Dark Mode CSS.
  - `Build`: Manual Dark Toggle.
  - `Harden`: Accessibility Contrast Checks.

### Signature Differentiation

- Status: `Harden`
- Repo fit: Parent Replay is the signature differentiator. Keep coaching output parent-ready, age-appropriate, and coach-reviewed. AI remains a boundary, not a shipping claim.
- Current seams: `app/coach/parent-replay/page.tsx`, `app/api/coach/parent-replay/route.ts`, `lib/domain/parent-replay.ts`, `app/team-portal/page.tsx`, `docs/evaluation-plan.md`.
- Backlog list:
  - `Covered`: Parent Replay.
  - `Covered`: Parent Replay Home Practice Loop.
  - `Covered`: 30-Second Home Activity.
  - `Covered`: 2-Minute Home Activity.
  - `Covered`: 5-Minute Home Activity.
  - `Covered`: Practice Focus Area Selection.
  - `Covered`: Parent-Ready Activity Generation.
  - `Covered`: Coach Video Recommendation.
  - `Covered`: Parent Tip.
  - `Covered`: Skill Cards.
  - `Covered`: Team Quest.
  - `Covered`: Local Notification Records.
  - `Covered`: AI Learning Plan Boundary.
  - `Covered`: Deterministic Local Guidance.
  - `Defer`: Human-Reviewed AI Drafts.
  - `Build`: Prompt/Eval Harness.
  - `Build`: Privacy Filters.
  - `Defer`: Provider Usage Controls.
  - `Covered`: Family Micro-Coaching Streaks.
  - `Covered`: Aggregate Team Engagement View.
  - `Covered`: Game Day Calm Mode.
  - `Covered`: Coach-to-Parent Translation Engine.
  - `Covered`: Parent-Friendly Skill Explanations.
  - `Covered`: Age-Appropriate Activity Guidance.
  - `Covered`: Player Growth Loop.

### Analytics And Success Metrics

- Status: `Build`
- Repo fit: Metrics should be derived from existing Supabase tables and app events, then displayed in admin/coach health surfaces. Do not add external analytics until privacy and consent are settled.
- Current seams: `app/admin/health/page.tsx`, `app/admin/page.tsx`, `app/coach/page.tsx`, `app/api/mobile-usage-events/route.ts`, `lib/supabase/reporting.ts`.
- Backlog list:
  - `Build`: Invite Acceptance Rate.
  - `Build`: Average Invite-to-Account Time.
  - `Build`: Failed Invite Count.
  - `Build`: Parent Link Completion Rate.
  - `Build`: RSVP Response Rate.
  - `Build`: Schedule Alert Open Rate.
  - `Build`: Weekly Active Parents.
  - `Build`: Support Requests Per Team.
  - `Build`: CSV Import Error Rate.
  - `Build`: Coach Weekly Update Send Rate.
  - `Build`: Game Day Calm Mode Usage.
  - `Build`: Parent Replay Completion Rate.
  - `Build`: Micro-Coaching Streak Rate.
  - `Build`: Media Engagement Rate.
  - `Build`: Notification Opt-Out Rate.

## Suggested Build Order

1. Finish production safety proof: RLS tests, cross-team access tests, audit-log coverage, and admin/provider boundary dashboard.
2. Complete team/season management: team CRUD, division setup, season setup, coach assignment, roster lifecycle, archive read-only states.
3. Complete parent and RSVP lifecycle: RSVP history, edits, cancellations, parent onboarding, parent calendar, action checklist, support requests.
4. Complete schedule and venue operations: real schedule CRUD, conflict detection, venue records, map fallback UX, calendar export.
5. Complete notification hardening: unsubscribe flow, retry logs, device management, VAPID send adapter, provider-send tests after provider approval.
6. Complete chat/media retention and reporting: chat retention jobs, media consent controls, private albums, takedown flow, exportable season memories.
7. Complete community operations: snack/volunteer reminders, cancellations, fairness engine, role caps, audit trail.
8. Complete metrics: admin/coach success dashboards from existing app events and Supabase records.
