# Backlog Now

These are the next production-enabling tasks that should happen before adding more surface area. They turn the current local MVP scaffold into a safer, persistent product foundation.

## 1. Production Data And Auth Foundation

- Create Supabase project, environment contract, and local development setup.
- Move typed seed models into migrations for organizations, seasons, teams, memberships, players, guardian links, events, RSVPs, registrations, invites, notifications, media links, snacks, volunteers, sponsors, themes, and audit events.
- Add Supabase Auth roles for org admin, coach, and parent.
- Add RLS policies and tests for parent child/team scope, coach assigned-team scope, and org admin organization scope.

Acceptance:
- Parent cannot read another team's private records.
- Coach cannot edit another team's portal, roster, schedule, chat, snack, volunteer, or Parent Replay records.
- Admin is scoped to one organization.

## 2. Registration And Invite Access Workflow

- Convert `/registration` from local queue to persisted registration requests.
- Add admin review actions: approve, reject, request more info.
- Connect accepted registration to guardian-child access only after admin approval.
- Store hashed invite tokens only; no raw token display.
- Audit every invite recovery, registration review, and access grant.

Acceptance:
- Registration request never grants access on submit.
- Admin approval creates the guardian/team link and audit event.
- Rejected/pending users cannot access private team data.

## 3. Team Portal And Theme Persistence

- Persist team `themeKey`, mascot, colors, and future logo asset metadata.
- Add dedicated admin theme management route, likely `/admin/themes`.
- Keep assigned coach edit scope for only their team.
- Add contrast validation for team colors in light and dark mode.

Acceptance:
- Theme changes survive refresh and are audit logged.
- Admin can see/edit all team themes.
- Assigned coach can edit only assigned team branding.

## 4. Schedule, RSVP, Snacks, Volunteers

- Persist events, RSVPs, snack slots, and volunteer roles.
- Add parent signup actions for snack and volunteer slots.
- Add conflict checks for event updates.
- Keep notification records as drafts until delivery provider integration is approved.

Acceptance:
- RSVP/snack/volunteer updates are permission-checked and persisted.
- Schedule changes create notification drafts with recipients, channels, and approval status.

## 5. Team Chat Production Path

- Move Team Chat channels/messages/moderation audit to Supabase tables.
- Use Supabase Realtime for team-scoped live updates.
- Add retention policy: chat deletion at season close, audit-only deletion proof.
- Add message reporting and moderation queue.

Acceptance:
- Parents only receive messages for their assigned team.
- Hidden/deleted messages disappear from family view and produce audit records.
- Season close removes chat text according to retention policy.

## 6. PWA And Mobile Hardening

- Add install prompt UX and offline fallback route.
- Test manifest/service worker from standalone build and Docker.
- Add Web Push subscription storage behind explicit opt-in.
- Keep Expo native app as later work unless PWA usage proves insufficient.

Acceptance:
- PWA install works in Chrome/Edge mobile and desktop.
- Offline fallback is understandable and does not imply stale data is current.
- No push send occurs without opt-in and provider configuration.

## 7. Validation And CI

- Add CI commands for `npm run typecheck`, `npm test`, `npm run build`, and lint.
- Add route smoke tests for `/`, `/admin`, `/coach`, `/parent`, `/registration`, `/team-portal`, `/team-chat`, and `/coach/parent-replay`.
- Keep Playwright screenshots for new user-visible route work.

Acceptance:
- Pull requests cannot merge with type/test/build failures.
- Route smoke test catches blank pages and missing PWA assets.
