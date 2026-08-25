---
authority: reference
answers: null
supersedes: []
superseded_by: null
reviewed: 2026-08-22
---
# LeaguePilot User Manual

Last updated: 2026-07-17

This manual explains how league admins, coaches, and parents use the current LeaguePilot / Little League HQ app. It is written from the current repo truth in `docs/Features.md`, `docs/capability-matrix.md`, `docs/privacy-security.md`, and `docs/runbook.md`.

## Product Status And Boundaries

LeaguePilot is a private youth sports operations app for registration review, team communication, schedules, RSVPs, parent recaps, media review, sponsors, and league administration.

Current production boundary:

- Many parent, coach, and admin workflows are Supabase-backed when the signed-in account has active role rows.
- Some screens still show typed seed fallback when live rows or auth context are unavailable.
- Email, SMS, Web Push, Stripe collection, native app distribution, storage-provider uploads, and AI-provider publishing are not live by default.
- Notification and provider workflows create internal draft/review records unless a separate provider-send implementation is explicitly enabled and proven.
- Children do not log in. Parent or guardian accounts manage child access.
- Player names should appear as first name plus last initial.

## User Roles

### Parent Or Guardian

Parents can use linked family records only. A parent account can see child schedule information, RSVP controls, parent-visible media, coach updates, Team Chat, practice recaps, snack and volunteer openings, family access status, and notification preferences.

### Coach

Coaches can use assigned team records only. A coach account can see team readiness, attendance, RSVP summaries, roster information, schedule context, weather/field review, snack and volunteer gaps, Team Chat, weekly update drafts, practice recaps, Parent Replay, and review-only AI Coach Workspace drafts when provider env is configured.

### Organization Admin

Admins can manage the active organization scope. Admin tools include registrations, teams, family access, schedule and venues, communications, media review, sponsors, branding, security/audit, reports/archive, message delivery review, imports, invites, memberships, operations, and health.

## Getting Started

1. Open the app.
2. Select `Sign in`.
3. Sign in with the email and password supplied by the league.
4. Use the sidebar on desktop or bottom tabbar on mobile.
5. If your account has more than one role, use the role switch links in the app shell.

If you are signed out or your role link is missing, private rows stay hidden. This is expected.

## Registration

Use `/registration` when a parent needs to request access.

What happens:

1. Select the active team.
2. Enter parent name, parent email, player first name, and player last initial.
3. Submit the request.
4. The request enters admin review.

Important boundary:

- Submitting registration does not create a login.
- Submitting registration does not create a guardian-child access grant.
- Access is granted only after admin review and approval.
- Archived teams and archived seasons are not valid targets for new registration.

Admins review registration requests from `/admin/registrations` and related family access tools.

## Parent Guide

### Parent Home

Route: `/parent`

The Parent Home summarizes the next important event and family action. It can show:

- Next event time and location.
- Child RSVP status.
- Important schedule or coach updates.
- Snack and volunteer openings.
- Parent-visible media.
- Notification preference controls.
- Privacy and family access context.

### Schedule

Route: `/parent/schedule`

Use this route to review upcoming team schedule information. Schedule changes may create notification draft records, but external provider sends remain disconnected unless separately enabled.

### RSVP

Route: `/parent/rsvp`

Use RSVP buttons to respond for linked children only. The app should prevent a parent from reading or changing another team's private records.

Common RSVP states:

- `Going`
- `Maybe`
- `Not going`
- `Cancelled` where cancellation support exists

Archived seasons or historical records may remain visible but read-only.

### Messages

Route: `/parent/messages`

Team Chat is private to assigned parents, assigned coaches, and organization admins. Children do not have accounts and do not use direct messaging.

Parents can read and participate in their assigned team chat according to the active team access rules.

### Photos

Route: `/parent/photos`

Parents see approved, parent-visible media only. Reported, hidden, rejected, or removed media should stay out of parent-facing views until restored by an authorized coach or admin.

### Practice Recaps

Route: `/parent/practice-recaps`

Parents can review coach-approved practice recap material from Parent Replay. These recaps may include:

- Home activities.
- Coach-to-parent translations.
- Parent tips.
- Skill cards.
- Team quests.
- Memory moments.

### Family Access

Route: `/parent/family-access`

Use this area for two different paths:

- Ask the league to review another full guardian link. This does not grant access until an administrator approves the request and the exact invited email accepts.
- Authorize one temporary caregiver for one child/team, selected events, and no more than 14 days. Review the allowed and prohibited actions, copy the one-time link, and share it yourself. No message is sent automatically.

Temporary care never grants medical/health access, custody authority, RSVP/attendance changes, official schedule changes, publishing, roster/other-child access, or permission to pass access onward. Optional pickup fails closed when a restriction needs league review. Revoke temporary access with a reason when care ends early.

The invited caregiver opens `/caregiver/accept`, reviews the exact scope, signs in with the named email, and accepts. `/caregiver` then shows only the authorized child, selected events, actions, and time window. Future scope does not activate before its start; expired or revoked scope reveals no private event details and clears the caregiver cache namespace at next contact.

### Transportation

Route: `/parent/transportation`

Outbound and return responsibility are separate. A ride request stays unassigned until another active team guardian offers and the requesting guardian separately accepts at the current official schedule version. A changed schedule requires review, and either adult can withdraw with an attributed reason.

### Settings

Route: `/parent/settings`

Use settings for account and preference management where available.

## Coach Guide

### Coach Home

Route: `/coach`

Coach Home summarizes team readiness for the next event. It can show:

- RSVP counts.
- Missing replies.
- Field and weather status.
- Snack and volunteer gaps.
- Drafts that need review.
- Practice recap status.
- Weekly update builder.

### Schedule

Route: `/coach/schedule`

Use this route to review assigned-team schedule context. Schedule and alert records remain review-oriented unless provider delivery is explicitly configured and approved.

### Attendance

Route: `/coach/attendance`

Use attendance to review RSVP aggregates and family response patterns for assigned teams. The UI should not expose private records from unrelated teams.

Compatibility route:

- `/coach/rsvps` points to the attendance workflow.

### Messages

Route: `/coach/messages`

Use Team Chat for assigned team communication. Coaches can post coach notes and moderate according to access rules.

### Practice Recaps And Parent Replay

Route: `/coach/practice-recaps`

Use the practice recap builder to create Parent Replay material.

Typical flow:

1. Select 2-3 focus areas.
2. Review generated parent-friendly content.
3. Edit as needed.
4. Approve/publish only when the recap is ready.

Compatibility route:

- `/coach/parent-replay` points to the practice recap workflow.

Boundary:

- Parent Replay publish creates reviewed Supabase replay rows and pending parent notification drafts.
- It does not automatically send email, SMS, or push notifications.

### AI Coach Workspace

The AI Coach Workspace is review-only. When `AI_COACH_PROVIDER_ENABLED=true` and server-side OpenAI env values are configured, assigned coaches/admins can request a provider rewrite through the server route.

Boundary:

- Provider drafts do not publish by themselves.
- Provider drafts do not send notifications.
- Output must stay source-grounded and coach-reviewed.

### Roster

Route: `/coach/roster`

Use roster views for assigned-team player information. Child privacy rules apply, including first name plus last initial display.

### Snacks And Volunteers

Route: `/coach/snacks-volunteers`

Use this route to review snack and volunteer coverage. Parent claims save through authenticated Supabase APIs when live rows are configured.

### Weather And Fields

Route: `/coach/weather-fields`

Use this route for weather and field readiness context. Weather drafts use provider-normalized records when configured, but external delivery still requires approval and provider proof.

### Drafts

Route: `/coach/drafts`

Use drafts to review team-facing or parent-facing messages before any publish step.

## Admin Guide

### Admin Overview

Route: `/admin`

Admin Overview summarizes league health, pending review queues, team status, registration queue, and review/safety status.

### Registrations

Route: `/admin/registrations`

Use this route to approve, reject, or review pending registration requests.

Approval should require:

- Active admin authority.
- Existing parent profile where required.
- Bounded verification evidence.
- Audited access changes.

### Teams

Route: `/admin/teams`

Use this route for season/team/player setup, team lifecycle, coach assignment, roster lifecycle, and team builder previews.

Archived seasons and archived teams are read-only for current write paths.

### Family Access

Route: `/admin/family-access`

Use this route to repair missing parent-player links and guardian access problems.

Compatibility route:

- `/admin/guardian-links` points to family access.

### Schedule And Venues

Route: `/admin/schedule-venues`

Use this route for schedule and venue operations. Schedule changes may queue internal notification drafts, but provider sends stay disconnected unless separately implemented and approved.

### Communications

Route: `/admin/communications`

Use communications for draft review and queued message records. Draft records do not equal delivered email, SMS, or push notifications.

### Media Review

Route: `/admin/media-review`

Use this focused route to review reported media and visibility before families see it.

Admins can:

- Review media reports.
- Set team or organization visibility.
- Approve media.
- Reject media.
- Hide media.
- Restore media.
- Remove media.

Boundary:

- Media upload/storage provider integration remains a separate production scope.
- Media moderation actions should produce audit records where the backing API is used.

### Sponsors

Route: `/admin/sponsors`

Use this focused route for sponsor records, placement settings, logo metadata, and billing proof records.

Admins can manage:

- Sponsor name and URL.
- Sponsor status: pending, active, expired.
- League or team sponsor level.
- Public placement setting.
- Logo URL metadata.
- Stripe Product/Price and invoice/payment-proof readiness records.

Boundary:

- Live Stripe collection is not connected by default.
- Sponsor billing status must stay separate from child-facing sponsor display.
- Stripe keys must remain server-side.

### Branding

Route: `/admin/branding`

Use branding to manage team identity, theme presets, mascot, colors, tenant defaults, logo metadata review, and launch validation.

Compatibility route:

- `/admin/themes` points to branding.

Boundary:

- Binary logo upload, public logo rendering, email rendering, push identity, and web cache invalidation still require provider proof.

### Security And Audit

Route: `/admin/security-audit`

Use this route to review RLS/security proof, audit evidence, and policy boundaries.

Compatibility route:

- `/admin/security` points to security/audit.

### Reports And Archive

Route: `/admin/reports-archive`

Use this route for exports, archive readiness, and read-only archived-season context.

Compatibility route:

- `/admin/archive` points to reports/archive.

Archive boundary:

- Archived non-chat records may remain visible as read-only.
- Chat text deletion and retention cleanup require separate proof.

### Message Delivery Review

Route: `/admin/message-delivery-review`

Use this route to review notification/provider records. Reviewing a delivery record does not prove a real external provider sent anything unless delivery attempts, credentials, webhooks, and hosted proof are in place.

### Operations, Health, Imports, Invites, Memberships, Settings

Additional admin routes:

- `/admin/operations` - provider inventory, approval queues, settings, and operational proof.
- `/admin/health` - tenant setup readiness and launch blockers.
- `/admin/imports` - CSV import checks and warnings.
- `/admin/invites` - invite recovery and invite state.
- `/admin/memberships` - membership management.
- `/admin/settings` - administrative settings.

## Team Portal And Shared Compatibility Routes

The primary role routes should be preferred, but older shared routes remain available for compatibility:

- `/team-portal` - shared team portal surface.
- `/team-chat` - shared Team Chat surface.
- `/schedule` - shared schedule surface.

The app shell and route topology keep these routes available while steering users toward parent, coach, and admin-specific routes.

## Notifications And Provider Sends

The app can create notification records and provider-review records. That is not the same as sending.

Do not treat these as live provider delivery unless the separate provider path is implemented and proven:

- Email send.
- SMS send.
- Web Push send.
- Stripe payment collection.
- AI-generated family-facing publish.
- Media storage upload.

Provider integrations require:

- Environment-managed secrets.
- Consent and opt-in checks.
- Human approval where sensitive.
- Delivery logs.
- Retry and failure states.
- Audit records.
- Hosted proof after deployment.

## Mobile And PWA Use

The app supports responsive layouts, a manifest, install prompt UX, offline fallback, and production-only service worker registration.

Mobile notes:

- Use the bottom tabbar for primary mobile navigation.
- Offline fallback means the app cannot reach current live data. It should not be treated as proof that stale team data is current.
- Web Push remains opt-in and provider-gated.
- Expo/native app distribution remains a later decision unless PWA usage proves insufficient.

## Privacy Rules For All Users

Follow these rules when using the app:

- Children do not log in.
- Do not share screenshots containing private child, family, or team information publicly.
- Do not use Team Chat for direct child messaging.
- Do not assume draft messages were delivered.
- Do not grant access outside admin review.
- Do not treat archived records as editable current-season records.
- Use first name plus last initial for player display.

## Common Troubleshooting

### I Can Sign In But See No Parent Data

Your account may not have an active guardian link. Ask an organization admin to review family access.

### I Can Sign In But See No Coach Data

Your account may not have an active coach team membership. Ask an organization admin to review team assignments.

### I Cannot Open Admin Routes

Admin routes require an active organization admin account. Sign in with the correct admin account or ask another admin to review your organization membership.

### Registration Submitted But Parent Cannot Access The Team

This is expected. Registration submit creates a pending review request only. Admin approval is required before any guardian-child access grant.

### A Notification Says Pending

Pending means the app has an internal record. It does not mean email, SMS, or push was sent.

### Media Is Missing From Parent View

The media may be pending, hidden, rejected, removed, or not parent-visible. Coaches/admins can review this from media moderation tools.

### Sponsor Is Visible But Payment Is Not

This is intentional. Public sponsor placement and payment proof are separate admin concerns.

## Admin Validation Checklist

Before inviting real families to a tenant, run or confirm the relevant proof gates from `docs/runbook.md`:

```bash
npm run typecheck
npm test
npm run build
npm audit
npm run supabase:qa-users
npm run qa:rls-proof
npm run qa:session-proof
npm run qa:tenant-readiness-proof
npm run qa:brand-proof
```

For hosted production proof, set `QA_PROOF_BASE_URL` to the hosted app URL before running browser proof commands.

## Source Documents

- `docs/Features.md` - feature implementation tracker.
- `docs/capability-matrix.md` - shipped capability versus production gaps.
- `docs/privacy-security.md` - child privacy, provider, and audit guardrails.
- `docs/runbook.md` - local, Docker, QA, hosted, and provider proof commands.
- `docs/production-task-board.md` - concrete launch and hardening work queue.
