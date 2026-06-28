# UI Wireframe Screen Specs

This companion spec expands `prompts/aura-gemini-global-ui-design.md` into wireframe-by-wireframe handoff notes for the core Little League HQ operational surfaces. It is a design and frontend planning artifact only. It does not define new runtime APIs, schema changes, provider behavior, or production claims.

Use `docs/Features.md`, `docs/capability-matrix.md`, and `docs/production-audit-action-items.md` as implementation truth before building from this document.

## Global Rules

### Product Boundaries

- Children never log in. Parent and guardian accounts manage child access.
- Parents see only linked child, team, schedule, RSVP, media, snack, volunteer, chat, and replay records.
- Coaches manage assigned teams only. Admins are organization-scoped.
- Registration creates a pending request only; it is not account or child access.
- Queued notification records are not sent messages.
- Draft, preview, pending, and approved must stay visually distinct.
- Provider configured is not hosted proof. Provider disconnected must be visible where relevant.
- Deterministic Parent Replay and AI Coach Workspace drafts are not AI-provider output.
- Sponsor billing proof is admin-only and separate from child-facing sponsor placement.
- Archived seasons are readable and exportable, not editable.

### Status Language

Use these labels consistently:

- `Live data`: Supabase-backed read or write path is active for the signed-in user.
- `Seed fallback`: Typed local seed state is being shown because live rows or auth context are unavailable.
- `Draft`: User-reviewed copy or operational data that has not been approved or published.
- `Queued`: Internal record exists; no external provider send is implied.
- `Pending review`: Human approval is required before the action can affect access, delivery, visibility, or family-facing content.
- `Approved`: Human approval was recorded; still show whether provider delivery is connected.
- `Denied`: Access, permission, policy, or validation blocked the action.
- `Provider disconnected`: Email, SMS, push, weather delivery, maps embed, AI, Stripe, or upload execution is not production-active.
- `Read-only`: Archived, unauthorized, or proof-only surface.
- `Audit logged`: Actor, timestamp, target, and summary are available.

Avoid vague success copy such as "sent", "done", or "published" unless the backed action actually happened. Prefer concrete copy: "3 notification records queued. No provider send occurred."

### Visual Direction

- Keep the app premium, calm, and operational. This is repeated-use software, not a landing page.
- Use a Soft Structuralism baseline: quiet neutral canvas, restrained team accents, crisp status treatment, dense but breathable layouts.
- Do not use decorative gradient orbs, cartoon sports styling, hidden safety notices, or marketing hero takeovers.
- Keep cards and controls at the existing 8px radius unless a pill is semantically useful for badges, chips, segmented controls, or primary CTAs.
- Use richer nested surfaces only for complex tool areas such as command center panels, approval drawers, replay previews, and mobile event cards. Do not place cards inside cards.
- Use icons only where they speed scanning, with labels or accessible names. Prefer thin, precise line icons if a future icon library is added.
- Motion should use transform and opacity only, with custom cubic-bezier timing. No required workflow should depend on animation.

### Responsive Baseline

- Mobile: 360px to 430px, parent and coach game-day speed first.
- Tablet: 768px to 1024px, sideline review and light admin work.
- Desktop: 1280px and up, dense admin operations.
- Mobile screens use a single-column order with primary action first, then event/status context, then secondary modules.
- Tablet screens use two columns where useful, with the right panel becoming a bottom sheet or below-the-fold section.
- Desktop screens may use 2-zone or 3-zone layouts, but all panes need stable widths and no horizontal text clipping.

### Shared Screen Spec Template

Each implementation screen should document:

- Goal.
- Current route and source seams.
- Desktop layout.
- Tablet behavior.
- Mobile order.
- Components and field content.
- Primary and secondary CTAs.
- Interactions and state changes.
- Permissions and access gates.
- Empty, loading, error, read-only, and access-denied states.
- Status and boundary copy.
- QA notes.

## Route Crosswalk

| Experience | Current route seams | Type |
| --- | --- | --- |
| Season Command Center | `/admin`, `/admin/teams`, `/schedule`, `/admin/archive` | Future consolidated screen using existing modules |
| Admin Launch Readiness Console | `/admin/health`, `/admin/security`, `/admin/operations` | Future consolidated proof console |
| Parent Event Journey | `/parent`, `/parent/rsvp`, `/team-portal`, `/schedule` | Future parent-focused event detail flow |
| Coach Playbook Loop | `/coach`, `/coach/rsvps`, `/coach/parent-replay` | Future guided coach workbench |
| Notification Approval Queue | `/admin/operations`, `/schedule`, `/api/provider-delivery/review` | Future queue refinement |
| Weather Safety Workflow | `/coach`, `/api/weather-alerts/draft`, `/api/provider-delivery/review` | Future guided weather review |
| Team Chat | `/team-chat`, `/api/team-chat/messages`, `/api/team-chat/moderation`, `/api/team-chat/read-receipts` | Existing route refinement |
| Media Governance | `/admin`, `/parent`, `/team-portal`, `/api/media/report`, `/api/media/moderation` | Future moderation-focused refinement |
| Snacks & Volunteers | `/parent`, `/coach`, `/team-portal`, `/api/snack-slots/claim`, `/api/volunteer-signups/claim` | Future family-help refinement |
| Parent Replay | `/coach/parent-replay`, `/team-portal`, `/api/coach/parent-replay` | Existing signature route refinement |
| Analytics UI | `/admin`, `/admin/health`, `/coach`, `/api/mobile-usage-events` | Future metrics refinement |
| Admin Theme/Branding Console | `/admin/themes`, `/team-portal`, `/api/admin/team-branding`, `/api/admin/theme-defaults` | Existing route refinement |

## Screen Specs

### 1. Season Command Center

Goal: Give an org admin one season operations surface for readiness holds, team setup, schedule conflicts, roster balance, and archive state without mixing proof-only items with editable work.

Current seams: `/admin`, `/admin/teams`, `/schedule`, `/admin/archive`, `lib/domain/season-planning.ts`, `lib/supabase/team-management.ts`, `lib/supabase/schedule-management.ts`, `lib/supabase/archive-vault.ts`.

Desktop layout:

- Header band: season name, status badge, source badge, primary hold, and "Export admin snapshot" secondary action.
- Left zone, 28% width: "Primary holds" ranked by launch impact. Order: missing parent links, missing coaches, empty schedules, unresolved imports, archived write locks, provider queue holds.
- Center zone, 44% width: event stack and team stack. Show current week events first, then teams grouped by division with roster count, coach, brand status, and schedule count.
- Right zone, 28% width: detail panel with tabs `Overview`, `Team`, `Event`, `Roster`, `Archive`, and `Audit`.
- Footer rail: draft/provider boundary summary and last audit timestamp.

Tablet behavior:

- Two-column layout: left hold list plus center stack. Detail tabs collapse beneath the selected row.
- Event and team rows use compressed status badges, not full paragraphs.

Mobile order:

1. Season status and primary hold.
2. "Fix next hold" CTA.
3. This week event stack.
4. Teams by division.
5. Selected detail accordion.
6. Archive/read-only banner.
7. Audit summary.

Components and content:

- Hold card: title, affected count, severity, owner role, source route, and recommended next action.
- Team row: team name, division, coach, active roster count, parent-link count, theme preset, archived state.
- Event row: event type, start time, venue, conflict badge, RSVP state, draft alert count.
- Archive panel: archived seasons, export availability, mutation lock proof.

CTAs:

- Primary: "Fix next hold" routes to the exact current surface, such as `/admin/teams` or `/schedule`.
- Secondary: "Open schedule", "Open team setup", "Open archive vault", "View audit".
- Disabled CTAs must explain whether the blocker is role, archived state, missing live rows, or provider boundary.

Interactions:

- Selecting a hold filters center rows and opens the right detail tab.
- Selecting an event opens event detail, conflict summary, affected families, and draft-alert status.
- Selecting a team opens team detail, roster lifecycle, coach assignment, guardian-link status, and theme status.
- Filters: division, season status, team status, event status, and "only holds".

Permissions:

- Admin-only editing. Coaches may be linked out to assigned-team routes in future, but this screen must present admin ownership.
- Archived season rows are read-only and clearly labeled.

States:

- Empty: "No teams or schedule rows are available for this season."
- Loading: skeleton rows for holds, events, and teams with the header still visible.
- Error: "Season command data could not load. No records were changed."
- Read-only: archived season banner locks team, roster, RSVP, and schedule edit CTAs.
- Access denied: admin role gate with route links to auth/account only.

Status and copy:

- Use "preview", "queued", and "read-only" language for team builder, schedule alerts, and archived records.
- Do not say roster changes are published unless the admin-approved publish path runs.

QA notes:

- Verify the highest-severity hold is first on mobile and desktop.
- Verify no event row can imply provider delivery.
- Verify archived rows cannot present editable CTAs.

### 2. Admin Launch Readiness Console

Goal: Show whether the app is ready for real-family launch by separating app feature coverage from hosted proof, provider configuration, auth/RLS proof, and production blockers.

Current seams: `/admin/health`, `/admin/security`, `/admin/operations`, `docs/production-audit-action-items.md`, `lib/domain/health.ts`, `lib/supabase/security-proof.ts`, `lib/supabase/admin-operations.ts`.

Desktop layout:

- Header: readiness verdict, blocker count, last proof run, environment badge, and "Run proof checklist" placeholder action.
- Gate grid: `Auth/RLS`, `Hosted smoke`, `Provider sends`, `Brand surfaces`, `Admin operations`, `Public intake`, `AI/provider boundary`, `Native app decision`.
- Drawer drill-down: opens from each gate with evidence, source files, affected routes, done criteria, and next command/manual proof.
- Bottom section: audit log and evidence preservation instructions.

Tablet behavior:

- Gate grid becomes two columns.
- Drawer becomes an inline detail panel under the selected gate.

Mobile order:

1. Verdict and blocker count.
2. Blocker gates only.
3. Warning gates.
4. Passing gates.
5. Selected gate detail.
6. Evidence preservation checklist.

Components and content:

- Gate card: status `blocker`, `warning`, `covered`, or `deferred`; owner; proof type; route/source.
- Evidence row: claim, current proof, missing proof, and source.
- Override modal: reason, actor, timestamp, expiration, and affected launch risk.

CTAs:

- "Open proof route", "Open source doc", "Copy done criteria", "Record manual proof".
- Override CTA is admin-only and must be visually secondary to fixing the blocker.

Interactions:

- Gate cards sort blockers first, then warnings, covered, deferred.
- Drawer tabs: `Evidence`, `Actions`, `Routes`, `Audit`.
- Override modal requires typed reason and shows "Override does not make provider or hosted proof true."

Permissions:

- Admin-only. Non-admins see a read-only access gate with no evidence details that could leak org data.

States:

- Empty: all gates covered shows a compact green readiness summary plus remaining deferred decisions.
- Loading: gate skeletons with last known verdict hidden unless fresh data exists.
- Error: show stale-proof warning if data cannot refresh.
- Read-only: non-admin or hosted proof-only mode disables override and proof-recording actions.
- Access denied: "Organization admin access is required to view launch proof."

Status and copy:

- "Covered" means represented in code or tests, not production ready.
- "Hosted proof missing" is distinct from "feature missing."
- "Provider send deferred" is not a failure if launch copy commits to draft-only notifications.

QA notes:

- Verify P0 blockers from production audit stay visible above all warnings.
- Verify override copy cannot be mistaken for true proof.
- Verify mobile hides no blocker detail behind horizontal scrolling.

### 3. Parent Event Journey

Goal: Give a parent the fastest path from "what is happening next?" to RSVP, directions, alerts, snack/volunteer help, and Parent Replay visibility.

Current seams: `/parent`, `/parent/rsvp`, `/team-portal`, `/schedule`, `lib/domain/parent-dashboard.ts`, `lib/domain/rsvp.ts`, `lib/domain/venues.ts`, `lib/domain/community.ts`.

Desktop layout:

- Header: next event, child/team badge, RSVP state, access/source badge.
- Main left column: event summary, time, arrival time, venue, alert status, RSVP controls, note editor.
- Main right column: map fallback, snack/volunteer needs, coach update, Parent Replay summary, media visibility notice.
- Lower band: family calendar, RSVP history, notification preferences, support request.

Tablet behavior:

- Event summary and RSVP controls stay side by side.
- Secondary modules stack in two columns below.

Mobile order:

1. Event title, team, child, time, arrival time.
2. Alert priority: cancellation, time change, location change, weather draft, coach note, snack/volunteer.
3. RSVP buttons: Going, Maybe, Not going, Cancel RSVP.
4. RSVP note editor.
5. Map fallback/directions.
6. Snack and volunteer openings.
7. Coach update.
8. Parent Replay visibility.
9. Calendar and history.

Components and content:

- RSVP control: large segmented buttons with current state, save state, and read-only state.
- Note editor: collapsed by default when no note; expands inline; unsaved copy says "Note not saved yet."
- Event alert stack: priority sorted and timestamped.
- Snack/volunteer block: open slots first, claimed slots second, hidden if not linked to the parent's team.
- Map fallback: direct link visible whenever embed/key/quota is unavailable.
- Replay block: show latest coach-approved replay only; deterministic preview drafts remain coach/admin side.

CTAs:

- Primary: selected RSVP response.
- Secondary: "Add note", "Open directions", "Claim snack slot", "Claim volunteer role", "Ask for help".

Interactions:

- RSVP save updates local visible state only after API success.
- Cancel RSVP requires confirmation copy: "This clears your attendance response for this child."
- Map opens in a new browser tab or platform maps app.
- Snack/volunteer claims return clear persisted or sign-in-required messages.

Permissions:

- Parent must have active guardian/player/team link.
- Parent cannot RSVP for unlinked children or view unlinked teams.
- Archived season locks RSVP and claim actions.

States:

- Empty: "No upcoming events for linked teams."
- Loading: next event skeleton with RSVP buttons disabled.
- Error: "Event details could not load. No RSVP was changed."
- Read-only: archived season or unlinked historical event.
- Access denied: signed-out or missing-link panel with recovery/admin contact path.

Status and copy:

- Use first name plus last initial for players.
- Never expose other families' private RSVP notes.
- Weather alerts are drafts unless explicitly approved and delivered.

QA notes:

- Verify 360px mobile keeps all RSVP buttons readable and at least 44px tall.
- Verify cancellation is the first alert if present.
- Verify Parent Replay does not show coach-only draft content.

### 4. Coach Playbook Loop

Goal: Guide a coach through a 5-step weekly/game-day workflow: check attendance, review weather, fill family-help gaps, draft parent update, and publish or queue Parent Replay.

Current seams: `/coach`, `/coach/rsvps`, `/coach/parent-replay`, `/api/coach/weekly-update`, `/api/weather-alerts/draft`, snack/volunteer claim APIs.

Desktop layout:

- Header: coach name, assigned teams, next event, source/access badge.
- Left rail: 5-step playbook with progress state.
- Center work area: active step detail.
- Right rail: evidence and draft preview, including RSVP checkpoint and provider/draft boundaries.

Tablet behavior:

- Step rail becomes a horizontal segmented control.
- Evidence rail moves below the active step.

Mobile order:

1. Assigned team and next event.
2. Step control.
3. Active step card.
4. RSVP checkpoint.
5. Draft preview.
6. Boundary/audit note.

Components and content:

- Step 1 Attendance: aggregate counts, no-response families, private reliability note.
- Step 2 Weather: draft alert CTA, thresholds, escalation, provider retry status.
- Step 3 Family help: snack and volunteer open slots, caps, fairness notes.
- Step 4 Weekly update: editable draft text area and source evidence chips.
- Step 5 Parent Replay: focus-area selector, preview, coach approval, queue/publish action.

CTAs:

- "Queue RSVP reminder draft", "Draft weather alert", "Save weekly update draft", "Open Parent Replay", "Queue Parent Replay".
- Publish confirmation pattern: show what becomes family-visible, what creates notification drafts, and that provider sends do not occur.

Interactions:

- Completing a step marks it reviewed for the current session but does not imply provider delivery.
- Draft cards use Preview -> Edit -> Approve -> Publish language.
- RSVP checkpoint is always visible before communication actions.

Permissions:

- Coach sees assigned teams only.
- Admin preview may be allowed, but the acting role must be visible.
- Missing coach membership shows setup/access state, not blank data.

States:

- Empty: no assigned teams or no upcoming assigned events.
- Loading: assigned-team and next-event skeletons.
- Error: "Coach playbook data could not load. No drafts were saved."
- Read-only: archived season or admin proof-only preview.
- Access denied: signed-out or missing coach membership panel.

Status and copy:

- RSVP reliability is private coach insight, not public shaming.
- Weekly update is an editable draft until saved; saved still means pending notification drafts, not provider send.

QA notes:

- Verify coach cannot appear to act on another team's data.
- Verify all generated content shows review boundary before queueing.
- Verify the playbook remains usable on tablet sideline widths.

### 5. Notification Approval Queue

Goal: Let admins or authorized reviewers inspect, approve, reject, and understand queued notification records without implying external delivery.

Current seams: `/admin/operations`, `/schedule`, `/api/provider-delivery/review`, `lib/supabase/provider-delivery.ts`, `lib/domain/notifications.ts`.

Desktop layout:

- Header: queue count, channel filters, provider status, and preference enforcement status.
- Left pane: queue list grouped by notification type and urgency.
- Center pane: selected notification preview with channel tabs `Push`, `Email`, `SMS`.
- Right pane: metadata, recipients, preference checks, audit history, delivery-attempt logs.

Tablet behavior:

- Queue list and preview use two columns; metadata becomes collapsible.

Mobile order:

1. Queue summary and provider disconnected badge.
2. Filters.
3. Queue list.
4. Selected preview.
5. Metadata accordion.
6. Approve/reject controls.

Components and content:

- Queue row: title, type, team, event, channel, status, approval status, urgency, created time.
- Channel preview: body, character count or push length, recipient count, quiet-hours/preference result.
- Metadata panel: source route, actor, event/team, provider status, retry state, audit.
- Reject reason flow: required reason, optional template reasons, confirmation.

CTAs:

- "Approve for provider review", "Reject draft", "Open source event", "Copy preview".
- If providers are disconnected, approved copy says "Approved record remains internal until provider adapter exists."

Interactions:

- Filters: channel, status, team, event, notification type, approval status, urgency.
- Approve/reject action updates visible row status and appends audit row.
- Reject requires reason before enabling CTA.

Permissions:

- Admin by default. Coach review may be limited to assigned-team drafts if implemented later.
- Parent never sees approval queue internals.

States:

- Empty: "No notification records need review."
- Loading: queue rows and preview skeleton.
- Error: "Queue could not refresh. No approval action was saved."
- Read-only: provider proof mode or insufficient reviewer role.
- Access denied: admin gate.

Status and copy:

- Avoid "Send now" unless a real provider adapter is implemented and passing preference checks.
- Use "Approve draft" and "Reject draft" for the current scaffold.

QA notes:

- Verify rejected items cannot remain visually actionable.
- Verify provider disconnected is visible in header and selected preview.
- Verify SMS urgency rules are visible before approval.

### 6. Weather Safety Workflow

Goal: Guide coaches/admins through weather review from forecast draft to threshold evaluation, field closure draft, approval queue, and parent-delivery boundary.

Current seams: `/coach`, `/api/weather-alerts/draft`, `/api/provider-delivery/review`, `lib/domain/weather.ts`, `lib/supabase/provider-delivery.ts`.

Desktop layout:

- Header: selected team/event, weather source status, provider status, and safety severity.
- Left column: event selector, forecast summary, thresholds.
- Center column: safety decision cards for heat, lightning, AQI, rain, field closure.
- Right column: draft alert, escalation rule, approval status, retry logs, history.

Tablet behavior:

- Selector and thresholds occupy the first row.
- Draft and history become stacked below safety cards.

Mobile order:

1. Event and severity.
2. Safety decision card with highest-risk threshold.
3. Draft weather alert CTA.
4. Threshold details.
5. Field closure draft.
6. Approval queue state.
7. History/retry logs.

Components and content:

- Threshold card: measurement, policy limit, state `ok` or `review`, plain-language guidance.
- Escalation card: coach/admin next action and parent-delivery boundary.
- Field closure draft: title, body, affected event, reason, status.
- Retry log: provider, reason, next retry, impact.

CTAs:

- "Draft weather alert", "Open approval queue", "Open schedule event", "Copy field closure draft".

Interactions:

- Draft weather alert requires selected event.
- Threshold review changes visual severity only; it does not cancel events.
- Approval queue link preserves selected event/team context where possible.

Permissions:

- Coach sees assigned teams only.
- Admin can view organization-wide weather drafts.
- Parent delivery remains deferred unless provider delivery is later implemented.

States:

- Empty: no upcoming assigned events.
- Loading: forecast and threshold skeleton.
- Error: weather provider unavailable, with local policy review still visible.
- Read-only: archived event/season.
- Access denied: signed-out or unassigned coach.

Status and copy:

- "Weather alert drafted" means draft record only.
- "Urgent weather alerts" remain deferred unless provider and policy gates are built.

QA notes:

- Verify high-risk threshold appears first on mobile.
- Verify no weather state auto-cancels the event.
- Verify parent-facing language is absent until approval.

### 7. Team Chat

Goal: Make private team communication feel mature, safe, and quick for game-day questions while keeping moderation and policy controls visible to authorized staff.

Current seams: `/team-chat`, `/api/team-chat/messages`, `/api/team-chat/moderation`, `/api/team-chat/read-receipts`, `lib/domain/chat.ts`, `lib/supabase/team-chat.ts`.

Desktop layout:

- Header: team brand mark, selected team, viewer role, private-team badge.
- Top toolbar: viewer selector, team selector, access explanation.
- Left pane: team card, quick topics, unread count, safety note, moderation summary.
- Center pane: pinned coach note, game-day question module, message list, compose area.
- Right pane: reporting summary, retention jobs, policy screens, audit log for coach/admin.

Tablet behavior:

- Team card and policy pane collapse into top accordions.
- Message list and compose area stay primary.

Mobile order:

1. Team and viewer access.
2. Pinned coach note.
3. Game-day question module.
4. Message list.
5. Compose box.
6. Moderation/report controls for authorized users.
7. Policy/retention summary.

Components and content:

- Message: author role, kind, body, timestamp, event link, read state, moderation state.
- Coach note: visually distinct from normal messages and can be pinned.
- Compose box: shows who can post and who will see the message.
- Moderation controls: hide/delete with reason, audit row.

CTAs:

- "Post message", "Send coach note", "Hide", "Delete", "Open map link", "Mark policy reviewed".

Interactions:

- Viewer/team selectors recalculate access before showing messages.
- Realtime insert/update refreshes message list but does not reorder pinned note incorrectly.
- Moderation actions update message state and audit log.
- Read receipts run silently after message visibility.

Permissions:

- Assigned parents, assigned coaches, and org admins can view.
- Coach/admin can announce and moderate according to current access model.
- Children have no chat accounts or direct messages.

States:

- Empty: "No team messages yet. Coach notes will appear here."
- Loading: message list skeleton with access header.
- Error: chat unavailable, no draft lost if possible.
- Read-only: viewer lacks post permission but can view.
- Access denied: private team chat panel with membership explanation.

Status and copy:

- "Private to assigned team members" must remain visible.
- Push chat alerts remain deferred unless provider work is later implemented.

QA notes:

- Verify denied viewers see no message content.
- Verify pinned coach note is visually separate on mobile.
- Verify moderation controls never dominate the parent view.

### 8. Media Governance

Goal: Give families confidence that media is private and reviewable while giving staff clear moderation, visibility, consent, retention, and takedown controls.

Current seams: `/admin`, `/parent`, `/team-portal`, `/api/media/report`, `/api/media/moderation`, `lib/domain/media.ts`, `lib/supabase/media-governance.ts`.

Desktop layout:

- Header: media visibility posture, pending reports, upload provider status, retention policy.
- Left pane: moderation queue grouped by pending, hidden, reported, approved.
- Center pane: selected media detail with link validation, team, visibility, reports, consent flags.
- Right pane: actions, takedown request, audit events, retention and private-album notes.

Tablet behavior:

- Queue plus detail two-column layout.
- Action/audit pane becomes inline below selected detail.

Mobile order:

1. Pending reports and visibility posture.
2. Media queue.
3. Selected media detail.
4. Visibility selector.
5. Moderation actions.
6. Consent/takedown/retention notes.

Components and content:

- Media row: title, type, team, status, visibility, report count, created time.
- Link validation chip: Google Photos, YouTube, or unsupported.
- Visibility selector: team-only or organization.
- Consent area: per-player consent, private album flag, takedown status.

CTAs:

- Parent: "Report media".
- Coach/admin: "Approve", "Reject", "Hide", "Restore", "Remove", "Open source link".

Interactions:

- Reporting creates review state without removing content immediately unless policy requires hiding.
- Hide removes media from parent-visible surfaces pending review.
- Remove action requires confirmation and reason.
- Visibility changes are explicit and audit logged.

Permissions:

- Parents can report visible linked-team media.
- Coaches/admins can moderate according to assigned team or org scope.
- Parent surfaces show approved media only.

States:

- Empty: no media links yet or no pending reports.
- Loading: queue and selected detail skeleton.
- Error: "Media action could not be saved. Visibility did not change."
- Read-only: parent report history or archived season media.
- Access denied: no linked team or staff role.

Status and copy:

- Upload/storage provider is not connected unless configured.
- "Approved" means visible under policy, not public internet publishing.

QA notes:

- Verify hidden/rejected/removed media is excluded from parent dashboards.
- Verify parent cannot see admin-only billing/sponsor data near media.
- Verify report actions do not expose other families' identities.

### 9. Snacks & Volunteers

Goal: Make family help easy to claim and coach/admin workload easy to scan without hiding fairness, caps, cancellation, approval, or audit boundaries.

Current seams: `/parent`, `/coach`, `/team-portal`, `/api/snack-slots/claim`, `/api/volunteer-signups/claim`, `lib/domain/community.ts`, `lib/supabase/operations.ts`.

Desktop layout:

- Header: selected team/event, open snack slots, open volunteer roles, source/access badge.
- Left column: parent claimable tasks sorted by next event.
- Center column: coach coverage view with gaps, caps, reminders, and no-response context.
- Right column: fairness engine, duty rotation, opt-outs, missed slots, audit trail.

Tablet behavior:

- Parent tasks and coach coverage sit side by side.
- Fairness/audit collapses below.

Mobile order:

1. Next event help needs.
2. Snack slot claim cards.
3. Volunteer role claim cards.
4. Claimed roles.
5. Cancellation/support path.
6. Fairness note.

Components and content:

- Claim card: event, item/role, due time, status, claimant if allowed, cap state, claim CTA.
- Coach coverage card: event, open/filled counts, families without assignments, reminder draft boundary.
- Fairness card: rotation state, opt-outs, sibling-aware assignment note.
- Audit row: action, actor, team/event, timestamp.

CTAs:

- Parent: "Claim snack slot", "Claim volunteer role", "Ask for help".
- Coach/admin: "Queue reminder draft", "Review caps", "Open event".

Interactions:

- Claim action disables while pending and updates only after API success.
- Cancellation flow requires reason and shows whether approval is required.
- Reminder queue creates draft only; no provider send.

Permissions:

- Parent claims only linked-team openings.
- Coach views assigned-team coverage.
- Admin may view organization-wide coverage.
- Archived season is read-only.

States:

- Empty: "No open snack or volunteer needs for linked teams."
- Loading: claim cards skeleton.
- Error: "Claim could not be saved. The slot may already be filled."
- Read-only: archived, filled, capped, or policy-approval-required slots.
- Access denied: signed-out or missing team link.

Status and copy:

- Use "claimed", "open", "full", "needs approval", and "draft reminder".
- Do not imply automated reminders are sent.

QA notes:

- Verify duplicate claims produce a clear conflict state.
- Verify coach view does not expose unnecessary parent contact data.
- Verify mobile claim buttons do not clip long role names.

### 10. Parent Replay

Goal: Make Parent Replay the signature coach-reviewed practice-to-home loop while keeping deterministic generation, AI/provider boundaries, and notification draft status explicit.

Current seams: `/coach/parent-replay`, `/team-portal`, `/api/coach/parent-replay`, `lib/domain/parent-replay.ts`, `docs/evaluation-plan.md`.

Desktop layout:

- Header: team, coach/admin preview role, signature feature badge, draft/provider boundary.
- Left column: team selector, acting user, 2-3 focus area selector, coach approval requirements.
- Center column: generated replay preview with 30-second, 2-minute, and 5-minute home activity cards.
- Right column: translations, team quest, coach video, parent tip, skill cards, memory moment, aggregate streak, publish history.
- Lower band: AI Coach Workspace drafts and prompt/eval checks.

Tablet behavior:

- Builder and preview are two columns.
- Supporting artifacts stack below in a two-column grid.

Mobile order:

1. Team and boundary summary.
2. Focus area selector.
3. Queue/publish CTA state.
4. Activity cards in duration order.
5. Parent translations.
6. Parent tip and team quest.
7. Skill cards and memory moment.
8. Replay history.
9. Eval/boundary notes.

Components and content:

- Focus selector: exactly 2 or 3 supported focus areas.
- Activity cards: duration, title, coach cue, parent goal, steps.
- Draft card: source evidence, workflow Preview -> Edit -> Approve -> Publish.
- History row: status, focus areas, created time, reviewed/published evidence if available.

CTAs:

- "Queue Parent Replay", "Open Team Portal replay", "Copy activity", "Review draft".

Interactions:

- Selecting more than 3 focus areas should show validation before queue.
- Queue action shows pending state and clear result copy.
- Team Portal shows only coach-approved/persisted replay history for families.

Permissions:

- Assigned coach or admin can queue/publish for a team.
- Parents view family-facing replay content in Team Portal only.
- No child-specific private data or parent leaderboard.

States:

- Empty: no replay history for selected team.
- Loading: preview cards skeleton.
- Error: "Parent Replay could not be queued. No family-facing content changed."
- Read-only: parent preview or archived season.
- Access denied: unassigned coach or signed-out user.

Status and copy:

- "Generated" means deterministic local guidance unless an AI provider is later wired.
- "Queued" means persisted replay and pending parent notification drafts; no provider send occurred.

QA notes:

- Verify all three durations stay in order on mobile.
- Verify focus-area validation is obvious before the CTA.
- Verify AI-provider language is absent unless a real provider is added.

### 11. Analytics UI

Goal: Surface operational metrics that help admins and coaches improve launch readiness and weekly engagement without adding external analytics or violating child privacy.

Current seams: `/admin`, `/admin/health`, `/coach`, `/api/mobile-usage-events`, `lib/domain/metrics.ts`, `lib/supabase/reporting.ts`.

Desktop layout:

- Header: reporting scope, date range, source badge, privacy note.
- Metric bands: launch funnel, parent engagement, coach operations, notification health, community coverage, Parent Replay, media, mobile/PWA.
- Detail panel: selected metric definition, numerator/denominator, source records, trend placeholder, action link.
- Export/proof rail: route to admin exports and audit evidence.

Tablet behavior:

- Metric bands become two-column groups.
- Detail panel appears below selected metric.

Mobile order:

1. Reporting scope and privacy note.
2. Top 3 actionable metrics.
3. Filter controls.
4. Metric cards grouped by role.
5. Selected metric detail.
6. Export/proof link.

Components and content:

- Metric card: label, value, direction, threshold, owner role, route/action.
- Definition drawer: source tables/events, update cadence, privacy rule, production gap.
- Coach metric card: RSVP response rate, weekly update draft rate, Parent Replay completion.
- Admin metric card: invite acceptance, parent links, failed invites, import error rate, notification opt-out.

CTAs:

- "Open readiness", "Open parent links", "Open notification queue", "Export CSV", "View proof".

Interactions:

- Selecting a metric opens definition detail.
- Filters: date range, team, division, role, route source.
- Missing live rows show seed fallback state rather than zero-as-truth.

Permissions:

- Admin can see org aggregate and team breakdowns.
- Coach sees assigned-team aggregates only.
- Parents do not see comparative analytics.

States:

- Empty: no metrics for selected scope.
- Loading: metric-card skeleton.
- Error: "Metrics could not load. Do not treat zeroes as verified."
- Read-only: proof/export-only mode.
- Access denied: role gate.

Status and copy:

- Metrics are derived from app records, not external analytics.
- Avoid ranking families or children publicly.

QA notes:

- Verify zero values distinguish "no data" from true zero.
- Verify coach cannot filter to unassigned teams.
- Verify mobile metric values remain legible without clipping.

### 12. Admin Theme/Branding Console

Goal: Let admins govern team branding across web surfaces while preserving contrast, role scope, audit evidence, and provider-gated email/push rendering.

Current seams: `/admin/themes`, `/team-portal`, `/api/admin/team-branding`, `/api/admin/theme-defaults`, `lib/domain/team-branding.ts`, `lib/domain/brand-validation.ts`, `lib/supabase/team-branding.ts`.

Desktop layout:

- Header: brand coverage, selected team, source badge, last audit event.
- Left pane: all-team table with theme preset, mascot, primary/secondary swatches, contrast, logo status, mobile/dark QA, audit date.
- Center pane: theme editor with actor, team, sport preset, mascot, color controls, tenant defaults.
- Right pane: live previews for desktop, mobile, dark, invite/email placeholder, push identity placeholder.
- Lower band: 20-surface launch validation, test brands, metrics, monitoring events, alerts, coach feedback, acceptance criteria.

Tablet behavior:

- Team table becomes scrollable list with fixed swatches.
- Editor and preview stack in two rows.

Mobile order:

1. Coverage and selected team.
2. Team selector.
3. Contrast and QA status.
4. Theme editor fields.
5. Save CTAs.
6. Preview cards.
7. Launch validation.
8. Audit list.

Components and content:

- Team row: team name, division, theme, mascot, swatches, contrast label, logo status, last audit.
- Editor: acting user, program theme, mascot, primary color, secondary color.
- Preview card: route/surface label, safe accent use, contrast state.
- Validation row: surface, covered/blocked, provider boundary, done criteria.

CTAs:

- "Save team theme", "Save as tenant defaults", "Open Team Portal", "Copy brand QA checklist".

Interactions:

- Choosing a theme preset updates color and mascot draft before save.
- Contrast warning remains visible until corrected.
- Saving appends audit evidence and refreshes team row.
- Tenant default save must not silently overwrite existing team-specific branding.

Permissions:

- Org admins can edit all teams.
- Assigned coaches can edit only their own team where current route allows it.
- Parents see branded surfaces only, no brand admin controls.

States:

- Empty: no team records available.
- Loading: team list, editor, and preview skeleton.
- Error: "Theme could not be saved. Current branding is unchanged."
- Read-only: coach viewing unassigned team or proof-only brand QA.
- Access denied: non-admin/non-coach editor gate.

Status and copy:

- Logo upload and provider-backed email/push rendering remain provider-gated unless proven.
- "20-surface coverage" is checklist coverage, not hosted proof, unless `qa:brand-proof` or hosted browser evidence exists.

QA notes:

- Verify text contrast on previews in light, dark, and mobile cards.
- Verify swatches have labels or accessible names.
- Verify provider-backed email/push rendering is never implied by web preview coverage.

## Implementation Notes

- Keep this doc and `prompts/aura-gemini-global-ui-design.md` separate: this file is the screen-by-screen handoff, the prompt is the global design-generation brief.
- Prefer refining existing route modules and shared classes before adding new concepts.
- When future implementation begins, map each screen to the route crosswalk and avoid creating duplicate surfaces without a route decision.
- Use current component seams in `components/feature-panels.tsx` for the first UI pass, then extract shared components only when duplication becomes real.
- Before calling a UI slice done, verify the relevant role, empty, loading, error, read-only, and access-denied states in browser screenshots at 360px, 768px, and 1280px.

## Documentation QA Checklist

- Every screen above includes desktop, tablet, mobile, components, CTAs, interactions, permissions, states, status copy, and QA notes.
- Provider, AI, notification, payment, registration, media, and archive language preserves existing boundaries.
- The route crosswalk distinguishes existing route refinements from future consolidated screens.
- No new API, schema, provider, or TypeScript contract is introduced by this document.
