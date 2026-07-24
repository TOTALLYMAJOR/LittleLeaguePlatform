# LeaguePilot Family Experience Blueprint

Status: Design specification
Prepared: 2026-07-23
Scope: Public discovery through season transition, plus administrator readiness and correction controls
Evidence base: Current production experience at `https://www.leaguepilot.us`, inspected at desktop and 390 px on 2026-07-23; current repository contracts in `docs/privacy-security.md`, `docs/agentic-architecture.md`, `docs/Features.md`, and the App Router implementation.

## 1. Product promise

LeaguePilot is the calm, trusted place where a family can answer seven questions in five seconds:

1. What happens next?
2. When do we leave?
3. Where do we go?
4. What should we bring?
5. Who is responsible?
6. What changed?
7. What is still unresolved?

The experience serves adults coordinating youth sports. Children do not log in. A guardian account may coordinate more than one child and more than one team without switching accounts.

### Product-truth brief

| Field | Contract |
| --- | --- |
| Purpose | Reduce missed details, unsafe assumptions, and family coordination stress while preserving official human authority. |
| Primary users | Parents, guardians, approved temporary caregivers, coaches, league administrators. |
| Desired outcome | Each family reaches the right place, at the right time, with the right preparation and an explicit responsible adult. |
| Business outcome | Higher verified participation, fewer preventable operational failures, faster access activation, and durable family value through Parent Replay. |
| Current state | Public schedule, access request, role sign-in, parent/coach/admin surfaces, RSVP, attendance, messaging, notifications, weather review, family access, and Parent Replay have partial or local implementations. The end-to-end family cycle is not yet one coherent experience. |
| Evidence | Live public screenshots, DOM snapshots, route and service implementation, feature and policy documents. |
| Primary action | Signed-out: `Request Team Access`. Signed-in parent: resolve the next time-sensitive family task. |
| Constraints | Child privacy, explicit roles, guardian and custody restrictions, human approval for consequential actions, provider-send gates, poor-connectivity use, WCAG 2.2 AA. |
| Completion | The journeys, authority rules, responsive behavior, states, notifications, audit requirements, analytics, and acceptance criteria in this document are implemented and proven. |

## 2. Evidence-based audit of the live experience

### Audit scope

Combined UX and screenshot-based accessibility audit of the signed-out home, public schedule, team-access request, and sign-in entry points. This audit does not claim authenticated family, coach, or administrator behavior was proven in production.

### Captured steps

| Step | Evidence | Health | Findings |
| --- | --- | --- | --- |
| 1. Public home, desktop | [01-public-home-desktop.png](../output/playwright/family-experience-audit/01-public-home-desktop.png) | Needs correction | Strong visual calm and credible game-day photography. `Sign in` is the dominant hero and header action, while acquisition is secondary. Parent Replay explains internal steps and approval status but does not preview a meaningful family memory. The footer exposes demo-organization language. |
| 2. Public schedule, desktop | [02-public-schedule-desktop.png](../output/playwright/family-experience-audit/02-public-schedule-desktop.png) | Critical usability issue | Calendar cell width forces event names into near-vertical letter stacks. Essential arrival time, opponent, activity type, field, venue, status, and action are not presented in one scan. Raw ICS source is displayed as product UI. Duplicate demo venue entries reduce trust. |
| 3. Request access, desktop | [03-request-access-desktop.png](../output/playwright/family-experience-audit/03-request-access-desktop.png) | Critical privacy/trust issue | The form is prefilled with a fictional adult, email, and child identity. The heading and helper copy use internal terms such as self-registration, local request, invite token, and access grant. There is no expected timing, verification sequence, privacy explanation, or clear next-step timeline. |
| 4. Sign in, desktop | [04-sign-in-desktop.png](../output/playwright/family-experience-audit/04-sign-in-desktop.png) | Needs correction | Identity and league approval are usefully separated. A demonstration coach email is prefilled. The sign-up mode competes with the requested access-first acquisition model. Recovery, invite acceptance, pending access, expired invitation, and wrong-email paths are not visible at entry. |
| 5. Public home, mobile | [05-public-home-mobile.png](../output/playwright/family-experience-audit/05-public-home-mobile.png) | Needs correction | The page reflows without document overflow and touch targets are generally legible. The acquisition priority remains reversed, Calendar disappears from the mobile header, and the long marketing sequence delays the next useful action. |
| 6. Public schedule, mobile | [06-public-schedule-mobile.png](../output/playwright/family-experience-audit/06-public-schedule-mobile.png) | Critical usability issue | The seven-column month grid is too narrow for event titles. Status text clips, event details are separated from their dates, and the raw ICS block can overflow horizontally. A mobile agenda would be substantially faster and safer. |

### Confirmed strengths

- The visual language is calm, consistent, and more operational than promotional.
- The public site states that adults own child access and children do not sign in.
- Sign-in identity is correctly distinguished from approved private access.
- The public calendar is explicitly read-only.
- Parent Replay already communicates a coach-approval boundary.
- Mobile pages reflow into a single column and retain visible focusable controls.

### Highest-impact corrections

1. Make `Request Team Access` the only primary signed-out CTA. Keep `Sign In` secondary.
2. Replace the public month grid with a responsive agenda or calendar-agenda hybrid.
3. Remove all prefilled identities from production forms.
4. Translate internal implementation and permission language into family outcomes.
5. Replace raw ICS content with Apple Calendar, Google Calendar, Outlook, and Download Calendar actions.
6. Delay install promotion until a signed-in family has completed a value event.
7. Make Parent Replay tangible with a real family-facing preview, privacy state, author, and approved source.

### Accessibility evidence limits

Screenshots and DOM snapshots can reveal hierarchy, reflow, labels, clipping, and likely target-size or contrast risks. They cannot prove keyboard order, screen-reader output, zoom at 200-400%, high-contrast behavior, live-region announcements, cognitive comprehension, provider email accessibility, or full WCAG conformance. Those require implementation-level and assistive-technology testing.

### Phase 0 implementation evidence, 2026-07-24

The local production scaffold now corrects the audited public surfaces without changing official schedules, guardian authority, attendance, transportation, or provider-send truth:

- `Request Team Access` is primary and Sign In remains secondary.
- Public schedule uses an agenda plus event-detail layout and provider-specific calendar actions. Unpublished arrival guidance remains visibly unresolved rather than inferred.
- Registration and sign-in fields start empty. Family copy explains the league review sequence, configured timing, privacy protection, and next step.
- Public schedule and team choices are scoped to one canonical organization and exclude archived teams.
- Installation remains ineligible after public browsing and becomes eligible only after a signed-in RSVP confirmation or critical-message acknowledgment.
- Parent Replay includes a concrete at-home activity and explicit coach-approval and child-privacy boundaries.

`npm run qa:public-family-proof` preserves screenshots and a machine-readable report under `output/playwright/public-family-phase0/`. The local matrix passes at 320, 390, 768, and 1440 pixels with no document overflow, no visible family implementation copy, no prefilled identity, no cross-organization or archived-team option, and no tested interactive control below 44 pixels. This is local browser evidence, not hosted deployment, moderated family comprehension, screen-reader, forced-colors, or production-provider proof.

## 3. Experience architecture: the six-stage family cycle

| Stage | Family goal | Primary surfaces | Exit condition |
| --- | --- | --- | --- |
| 1. Discover and request | Find the team and ask for the right private access. | Public discovery, public schedule, Request Team Access. | Request receipt exists with a reference code and expected review window. |
| 2. Verify and activate | Prove the adult-child-team relationship and safely activate identity. | Guardian-child-team verification, invitation, first sign-in. | Identity is confirmed, approved links are active, unresolved links remain visibly pending. |
| 3. Configure and orient | Set language and communication behavior, then understand the family home. | Notification and language setup, Family Mission Control. | At least one reachable channel is verified; critical fallback behavior is understood; home shows the next decision. |
| 4. Coordinate the week | Manage all children, events, RSVPs, rides, and temporary care. | Multi-child schedule, Event Passport, RSVP, attendance, transportation, caregiver authorization. | Every imminent event has a response and a responsible-adult state or a visible unresolved flag. |
| 5. Handle change and learn | Receive priority messages, survive disruption, acknowledge critical instructions, and preserve emotional value. | Priority communication, disruption state, critical acknowledgment, Parent Replay. | The family sees the current official plan, confirms any required action, and can revisit the approved recap. |
| 6. Transition and renew | Add guardians, move teams or seasons, and preserve only appropriate continuity. | Additional guardian invitation, season transition, administrator readiness, public corrections. | Old access is retired or archived, new scope is explicitly approved, and unresolved readiness blockers have owners. |

Cross-stage rules:

- The family account is the stable container. Child, team, season, and caregiver access are scoped records inside it.
- `Official`, `family response`, `attendance observed`, `provider delivered`, `read`, and `acknowledged` are independent evidence lanes.
- A single official event revision is the source for every schedule, home, notification, calendar, and offline projection.
- No automated recommendation can mutate an official record or impersonate a human authority.

## 4. Role, authority, and privacy matrix

Legend: `V` view, `P` propose/draft, `A` approve, `M` mutate after policy checks, `-` no access.

| Capability | Public visitor | Guardian | Temporary caregiver | Coach | League admin | Automation |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Public schedule | V | V | V | V | V/M | Read and summarize public fields only |
| Request team access | P | P | - | - | A/M | Match recommendation only |
| Guardian-child link | - | V/P | - | V where roster policy allows | A/M | Duplicate/risk flag only |
| Custody restriction | - | V only when authorized | - | Minimum necessary operational warning | Restricted A/M | Never infer, relax, or summarize beyond policy |
| Medical information | - | V/M for authorized child | Minimum necessary temporary instructions | Minimum necessary safety view | Restricted policy view | Never diagnose or change |
| Team invitation | - | V/accept | V/accept limited scope | P | A/M | Draft and delivery-plan only |
| Official schedule | V public subset | V | V scoped | P/M if authorized | A/M | Detect conflict, never publish |
| RSVP | - | M for linked child | M only if delegated | V | Correct with audit | Remind, never invent response |
| Attendance | - | V after publication | V scoped | M observed truth | Correct with audit | Flag mismatch only |
| Transportation responsibility | - | M own offer/assignment acceptance | Accept assigned duty | Coordinate proposal | Override with reason | Suggest matches only |
| Caregiver authorization | - | M for own child within restrictions | Accept and view scope | Verify operational status | Restricted correction | Expiry reminder only |
| Team communication | - | V/respond per thread | V scoped | P/M after approval rules | A/M | Draft/summarize only |
| Critical instructions | - | V/acknowledge | V/acknowledge scoped | P/M if incident authority | A/M | Route/escalate, never author as official |
| Parent Replay | - | V linked children | V only if explicitly shared | P/A/M | Moderation/revoke | Draft assistance only |
| Add guardian | - | P if permitted | - | - | A/M where required | Risk check only |
| Season transition | - | V/confirm profile carry-forward | Expire by default | P | A/M | Readiness recommendation only |
| Readiness review | - | Own-family tasks only | Own assignment only | Team gaps only | Organization-wide minimum necessary | Aggregate and flag, no silent correction |
| Audit history | - | Own consequential actions | Own limited actions | Team-scoped | Organization-scoped | Append run attribution, never erase |

Privacy rules:

- Child display names default to first name plus last initial.
- A caregiver sees only the child, dates, events, pickup details, and safety information necessary for the authorized window.
- Administrators see readiness facts, not private family narrative, unless a specific support or safety task requires it.
- Parent Replay media requires current child/team consent and approved family-release scope.
- Analytics must not contain child names, medical text, message bodies, custody details, exact home addresses, or raw invitation tokens.

## 5. Mobile-first navigation model

### Signed out

- Header: LeaguePilot, `Request Team Access` primary, `Sign In` secondary.
- Page links: `Schedule`, `How Access Works`, `Parent Replay`.
- Mobile header keeps the primary action visible. Schedule may move into a compact menu but must remain one tap away.

### Parent and guardian

Bottom navigation, maximum five destinations:

1. `Home` - next decision and unresolved family items.
2. `Schedule` - all children, agenda, filters, and calendar actions.
3. `Messages` - critical lane first, team updates second, conversation third.
4. `Replay` - approved Parent Replays and saved activities.
5. `More` - family access, notification/language, account, season history.

Context switcher:

- A persistent family filter supports `Everyone`, each child, and optionally each team.
- Switching filters changes presentation only. It does not change identity or authorization context.
- Color never identifies a child by itself. Use child initial/name, team label, and accessible icon/shape.

Global mobile patterns:

- A `Changed` band sits above affected content until the guardian reviews the change.
- Offline status is compact and explicit: `Available offline`, `Saved on this device`, `Waiting to sync`, or `Last updated 4:10 PM`.
- Primary event action remains in the thumb zone. Destructive or authority-sensitive actions require a review sheet.
- No automatic carousel, hover-only content, or gesture-only action.

### Coach

`Today`, `Roster`, `Messages`, `Replay`, `More`. Parent-family private facts do not enter coach navigation.

### Administrator

Mobile is triage-first: `Readiness`, `Access`, `Schedule`, `Messages`, `More`. Bulk editing remains tablet/desktop unless a safe single-record correction is available.

## 6. Responsive page compositions

### Public home

- Mobile: value statement, `Request Team Access`, `Sign In`, next public events, how verification works, tangible Parent Replay preview, privacy promise.
- Tablet: two-column hero with request panel; agenda spans full width below.
- Desktop: asymmetric hero with acquisition panel and genuine product evidence. Header retains the same CTA priority.
- Installation is never promoted on the public home.

### Request Team Access

- Mobile: one question group per section; persistent progress and save/resume receipt.
- Tablet/desktop: form left, `What happens next` timeline right. The timeline remains visible while form sections advance.
- Never show another family or demonstration identity. Never show admin queues.

### Family Mission Control

- Mobile: `Next up` event passport, change band, unresolved actions, today/this week, Parent Replay memory.
- Tablet: two-column layout with event passport left and family action rail right.
- Desktop: 8/4 grid. Main agenda and event detail occupy the wide column; family readiness, critical messages, and responsibilities occupy the narrow column.

### Multi-child schedule

- Mobile: agenda by day with sticky date headers. Compact child/team filter chips. Month is an optional date picker, not the main content.
- Tablet: calendar-agenda split where selected date controls the agenda.
- Desktop: week or month overview at left/top with a full-width, non-truncated agenda list and event inspector.

### Event Passport

- Mobile order: status/change, event and child, leave/arrival/start, venue/field/directions, responsibility, bring list, RSVP, critical instructions, source and freshness.
- Tablet/desktop: logistics summary and action panel side by side. Supporting communication and audit timeline below.

### Parent Replay

- Mobile: approved story card, short coach note, 2-3 focus areas, one family activity, optional consented media, save/share controls.
- Tablet/desktop: story and media left; activity and progress right. Approval, author, team, date, and privacy scope are always visible.

### Administrator readiness

- Mobile: blocker queue grouped by urgency and authority; single-record resolution only.
- Tablet: queue plus selected blocker inspector.
- Desktop: readiness summary, dependency view, selected blocker, and audit/recovery panel. Private family detail is fetched only after a scoped task is opened.

## 7. Surface specifications

Every surface below uses the same state vocabulary: loading, empty, pending, offline, error, cancelled, changed, expired, and completed. A state may be not applicable only when the surface cannot logically enter it.

### 7.1 Public discovery

- User and context: unauthenticated adult looking for a team, schedule, or invitation path.
- Primary question: `Is this where my family belongs, and how do I get access?`
- Five-second hierarchy: league/team identity, next public events, Request Team Access, privacy promise, Sign In.
- Actions: primary `Request Team Access`; secondary `Sign In`, `View Schedule`, `How Access Works`.
- Triggers and inputs: direct visit, search, league link, QR code, event link; optional team/season query.
- Source, truth, authority: organization public profile and explicitly public event projection; league admin publishes.
- Privacy and authorization: no roster, child, contact, private venue note, RSVP, chat, or media exposure.
- Explanation and approval: explain review steps, expected timing, privacy, and next action; no approval to view public data.
- Responsive behavior: composition in section 6; mobile primary CTA visible without scroll.
- States: loading skeleton; no-public-events empty state; stale-data warning; offline cached public agenda; unavailable/error; cancelled or changed event labels; season-ended state.
- Notifications and escalation: none before consent; offer request receipt notifications only after form submission.
- Audit: public-content publication and correction history, not visitor browsing history tied to identity.
- Accessibility: semantic landmarks, meaningful image alt, 44 px targets, visible focus, no color-only status, reflow at 400%.
- Analytics: `public_home_viewed`, `public_schedule_opened`, `team_access_started`, `sign_in_selected`, with no identity data.
- Acceptance: Request Team Access is visually and semantically primary at all breakpoints; Sign In is secondary; no demo labels; public event data never contains private fields.

### 7.2 Request Team Access

- User and context: adult who knows or is discovering a child’s team.
- Primary question: `What do I provide, and what happens after I submit?`
- Five-second hierarchy: team/league, three-step timeline, estimated review window, form progress, privacy statement.
- Actions: primary `Send Request`; secondary `Save and Finish Later`, `I Already Have an Invitation`, `Sign In`.
- Inputs: adult name, reachable email or mobile, relationship to child, child first name and last initial, team/season, optional coach or registration reference. Avoid free-text sensitive history.
- Source, truth, authority: request is claimant-supplied and unverified; league admin approves links against authoritative roster/registration records.
- Privacy and authorization: rate limit, enumeration-safe responses, minimum data, encrypted transport/storage, no public queue.
- Explanation and approval: state `We will match your request to league records. Most reviews are completed within [organization-configured window]. You will receive an invitation or a request for more information.` League approval is mandatory.
- Responsive behavior: progressive sections on mobile; timeline beside form on larger screens.
- States: blank initial; saving; submitted/pending; needs information; duplicate request; offline save draft only; error with preserved input; cancelled; expired draft; approved/completed.
- Notifications and escalation: receipt immediately; reminder only if expected review window is exceeded; support path with request reference.
- Audit: submission time, claimed team, risk signals, review decisions, actor, reason code, notifications. Do not duplicate raw sensitive text into audit.
- Accessibility: labels above fields, autocomplete tokens, error summary linked to fields, no placeholder-only labels, understandable relationship choices.
- Analytics: `access_request_started`, `access_request_team_selected`, `access_request_submitted`, `access_request_needs_help`, `access_request_completed`.
- Acceptance: every production field is empty by default; no internal terms such as local request, token, access grant, authorization, implementation, or endpoint; receipt includes timing, privacy, next step, reference, and support.

### 7.3 Guardian-child-team verification

- User and context: requester responding to a match or information-needed step.
- Primary question: `Which child and team will I be allowed to see, and what proof is still needed?`
- Five-second hierarchy: adult identity, masked child/team match, verification status, requested evidence, reviewer timeline.
- Actions: `Confirm Match`, `This Is Not My Child`, `Provide Requested Information`, `Contact League`.
- Inputs: invitation/request reference, authenticated identity, organization-defined low-risk proof. Never ask for unnecessary identity documents.
- Source, truth, authority: roster/registration is authoritative for child/team; approved guardian-link record is authoritative for access; admin is responsible authority.
- Privacy and authorization: reveal only enough masked data to confirm. Custody restrictions require restricted reviewer routing and must never be disclosed to an unauthorized claimant.
- Explanation and approval: show why a match was suggested, which fields matched, and that a league reviewer makes the decision.
- Responsive behavior: one decision per mobile screen; comparison panel on larger screens.
- States: no match, one likely match, ambiguous match, pending review, more information needed, rejected with safe explanation, expired, approved.
- Notifications: notify on status change; never include child-sensitive details in lock-screen content.
- Audit: match inputs, algorithm version if used, confidence reasons, reviewer, decision, override reason.
- Accessibility: masked values have meaningful screen-reader labels; status change announced; document upload alternative if offered.
- Analytics: `verification_opened`, `match_confirmed`, `match_disputed`, `verification_info_submitted`.
- Acceptance: automation may recommend but never approve; ambiguous and restricted cases fail closed; approval creates only the explicitly reviewed relationship and team scope.

### 7.4 Invitation and first sign-in

- User and context: approved adult opening an email/SMS invitation or existing account.
- Primary question: `Is this invitation valid, and what access will I receive?`
- Five-second hierarchy: league, invited email/phone masked, role and child/team scope, expiry, continue action.
- Actions: `Accept Invitation`, `Sign In`, `Use a Different Email`, `Request a New Invitation`.
- Source, truth, authority: signed single-use invitation record and approved link; identity provider proves identity only.
- Privacy and authorization: token is secret, short-lived, single-use, and never logged in analytics; identity must match invitation policy.
- Explanation and approval: distinguish identity confirmation from league-approved access in family language.
- Responsive behavior: compact centered task surface; no marketing detour.
- States: valid, already accepted, wrong account, pending identity verification, expired, revoked, error, completed.
- Notifications: acceptance confirmation; notify inviter/admin of safe status, not password or provider details.
- Audit: invitation created/sent/delivered/accepted/revoked/expired as separate events.
- Accessibility: password manager compatibility, no timed interaction without extension, clear recovery path.
- Analytics: `invite_opened`, `invite_identity_mismatch`, `invite_accepted`, `invite_refresh_requested`.
- Acceptance: no prefilled demo email; expired and wrong-account paths preserve the approved scope and never create a new link automatically.

### 7.5 Notification and language setup

- User and context: newly activated guardian before entering the family home.
- Primary question: `How will I receive ordinary and urgent updates in the language I understand?`
- Five-second hierarchy: preferred language, critical channel, routine channel, quiet hours, preview.
- Actions: `Save Preferences`; secondary `Skip for Now` only after a reachable critical fallback is explained.
- Inputs: language, channel by message class, quiet hours, timezone, translation preference, accessibility format.
- Source, truth, authority: guardian preference record; official message source remains untranslated canonical content plus labeled translation.
- Privacy and authorization: consent per channel and purpose; shared-device privacy options; no child details in lock-screen previews by default.
- Explanation and approval: show that translation may contain errors and official times/places remain linked to canonical event data. Provider sends require configured delivery and consent gates.
- Responsive behavior: stacked preference groups on mobile; preview panel on larger screens.
- States: channel unverified, verification pending, provider unavailable, unsubscribed, partially configured, completed.
- Notifications: verification message; fallback warning if no critical channel is reachable.
- Audit: consent text version, timestamp, source, changes, verification, unsubscribe.
- Accessibility: language names in their own language, screen-reader preview, no flag-only language selector.
- Analytics: `notification_setup_started`, `language_selected`, `channel_verification_started`, `preferences_saved`.
- Acceptance: critical, transactional, team update, conversation, and memory notification classes are independently configurable where safety policy allows.

### 7.6 Family Mission Control

- User and context: signed-in guardian coordinating one or more children.
- Primary question: `What does my family need to do next?`
- Five-second hierarchy: critical change, next event/passport, leave time, responsible adult, unresolved task, next child.
- Actions: event-specific primary action; secondary `View Week`, `Messages`, `Replay`.
- Inputs: approved family links, official schedule projection, RSVP, responsibilities, messages, weather review, offline freshness.
- Source, truth, authority: each card names its source and freshness; no inferred success from missing evidence.
- Privacy and authorization: only linked children; private facts minimized; child selector is a presentation filter.
- Explanation and approval: recommendations state their rule and evidence. No recommendation mutates official records.
- Responsive behavior: composition in section 6.
- States: loading skeleton, no linked children, no upcoming events, access pending, partial data, offline, sync conflict, changed, season complete.
- Notifications: critical unresolved item may create an in-app banner; provider escalation follows taxonomy and preferences.
- Audit: consequential family actions only, not every card view.
- Accessibility: h1 summarizes next event, logical reading order, skip links to each child, large outdoor contrast mode.
- Analytics: `mission_control_viewed`, `next_action_opened`, `child_filter_changed`, `offline_pack_opened`.
- Acceptance: within the first viewport the guardian can answer the seven product-promise questions or see an explicit `Not assigned`/`Not confirmed` state.

### 7.7 Multi-child family schedule

- User and context: guardian coordinating children across teams and possibly organizations.
- Primary question: `Where are the conflicts, and what does each child need?`
- Five-second hierarchy: today/next seven days, conflicts, child/team, leave and arrival times, status/action.
- Actions: `Open Event`, `Resolve Conflict`, `Add to Calendar`, filters.
- Inputs: all approved child/team event projections, family timezone, travel estimate if guardian opts in.
- Source, truth, authority: official schedule records; travel estimate is labeled informational and never changes arrival time.
- Privacy and authorization: no cross-family visibility; organization boundaries remain enforced even in a combined client view.
- Explanation and approval: conflict reason shows overlapping official times and optional travel buffer; no auto-RSVP.
- Responsive behavior: agenda-first mobile, hybrid tablet, overview plus agenda desktop.
- States: empty week, conflicting, changed, cancelled, offline cached, partial organization outage, expired season.
- Notifications: conflict digest is optional; official changes use disruption rules.
- Audit: calendar subscriptions and conflict-resolution actions, not filter changes.
- Accessibility: list alternative for any visual calendar; child/team text accompanies color; keyboard date navigation.
- Analytics: `family_schedule_viewed`, `schedule_conflict_opened`, `event_passport_opened`, `calendar_action_selected`.
- Acceptance: every event row displays team, activity type, date, arrival time, opponent if relevant, venue, field, status, and one context action without truncating essential text.

### 7.8 Event Passport

- User and context: guardian or scoped caregiver preparing for one event.
- Primary question: `What is the current plan for this event?`
- Five-second hierarchy: current status/version, child/team/activity, leave-arrive-start, venue/field, responsible adult, changed fields.
- Actions: context-aware `RSVP`, `Acknowledge Change`, `Get Directions`, `Assign Ride`, `View Message`.
- Inputs: official event, team participation, family response, responsibility, bring list, safety note, weather review, version/freshness.
- Source, truth, authority: official event authority named with timestamp; family and coach observations are separately labeled.
- Privacy and authorization: event-specific minimum necessary fields; caregiver view is time-bound.
- Explanation and approval: changed fields show before/after and publisher attribution. Predictions are optional, labeled, and never official.
- Responsive behavior: composition in section 6.
- States: scheduled, tentative, changed, relocated, delayed, cancelled, completed, expired, offline, conflicting update.
- Notifications: follows event disruption severity and acknowledgment rules.
- Audit: official revisions, acknowledgments, responsibility changes, directions opens only as anonymous analytics.
- Accessibility: status appears in text at top and document title; map has address/directions text alternative.
- Analytics: `event_passport_viewed`, `event_change_reviewed`, `directions_opened`, `bring_list_opened`.
- Acceptance: one event version drives passport, schedules, home, notifications, calendar feed, and offline copy; stale copies visibly yield to the newer version.

### 7.9 RSVP and attendance

- User and context: guardian responding before event; coach recording observed attendance.
- Primary question: guardian `Can this child attend?`; coach `Who is actually here?`
- Five-second hierarchy: child/event, current RSVP, deadline, responsible adult, observed attendance as a separate lane.
- Actions: guardian `Going`, `Not Going`, `Unsure`; coach `Present`, `Absent`, `Late` after event window.
- Inputs: actor, child/event, expected record/schedule version, optional bounded note.
- Source, truth, authority: guardian owns RSVP response; coach owns observed attendance; admin corrections require reason.
- Privacy and authorization: no other family’s reason is visible; medical explanations do not belong in RSVP notes.
- Explanation and approval: version conflicts show what changed and ask for a fresh response. No automation sets either truth.
- Responsive behavior: one-tap response with confirmation and undo window; roster matrix on coach tablet/desktop.
- States: unanswered, answered, saved on device, syncing, conflict, closed, cancelled, attendance pending, completed.
- Notifications: reminders for unanswered RSVP; stop after response; no attendance shaming.
- Audit: actor, time, before/after, event version, device-sync receipt, corrections.
- Accessibility: radio-group semantics, no swipe-only response, confirmation live region.
- Analytics: `rsvp_prompt_viewed`, `rsvp_submitted`, `rsvp_sync_conflict`, `attendance_recorded`.
- Acceptance: RSVP never becomes attendance; offline response never claims server save until receipt exists; schedule change may request reconfirmation without erasing prior history.

### 7.10 Transportation assignment

- User and context: guardians coordinating rides for a specific event.
- Primary question: `Who is responsible for getting this child there and home?`
- Five-second hierarchy: child/event, outbound responsibility, return responsibility, seat availability, acceptance status.
- Actions: `I Can Drive`, `Request a Ride`, `Offer Seats`, `Accept Assignment`, `Withdraw`.
- Inputs: guardian identity, event, direction, seats, pickup coordination, explicit acceptance.
- Source, truth, authority: guardians own offers and acceptance; organization policy may require coach/admin visibility but not silent assignment.
- Privacy and authorization: home addresses are not exposed by default; use private coordination after mutual acceptance; custody restrictions override matching.
- Explanation and approval: recommendation explains match criteria and excluded constraints. Both affected adults approve an assignment.
- Responsive behavior: compact responsibility card in passport; dedicated coordination sheet for details.
- States: unassigned, requested, offer pending, awaiting acceptance, assigned, changed, withdrawn, expired, cancelled.
- Notifications: request, offer, acceptance, reminder, withdrawal, event disruption.
- Audit: parties, event, direction, seats, acceptance, changes; minimize location details.
- Accessibility: explicit outbound/return labels, not directional icons alone.
- Analytics: `ride_requested`, `ride_offered`, `ride_assignment_accepted`, `ride_assignment_withdrawn`.
- Acceptance: automation never silently assigns responsibility; the Event Passport shows `Not assigned` until required acceptance evidence exists.

### 7.11 Temporary-caregiver authorization

- User and context: guardian delegating limited event care to another adult.
- Primary question: `What may this person do, for which child, and for how long?`
- Five-second hierarchy: caregiver, child, events/dates, allowed actions, prohibited actions, expiry.
- Actions: `Review and Authorize`, `Revoke`, caregiver `Accept`.
- Inputs: adult contact/identity, scope, start/end, pickup permission, communication permission, minimum necessary safety instructions.
- Source, truth, authority: guardian authorization constrained by custody/league policy; restricted cases route to admin review.
- Privacy and authorization: least privilege, explicit expiry, no blanket medical or custody access, no onward delegation.
- Explanation and approval: review sheet states exactly what becomes visible. Guardian and caregiver acceptance required; admin approval only where policy says.
- Responsive behavior: stepwise mobile scope builder; summary and history on larger screens.
- States: draft, identity pending, awaiting acceptance, active, expiring, expired, revoked, blocked by restriction.
- Notifications: invitation, activation, approaching expiry, revocation, relevant event disruption.
- Audit: scope, policy version, guardian, caregiver, acceptance, activation, revocation.
- Accessibility: plain-language permission list; dates and times announced unambiguously.
- Analytics: `caregiver_authorization_started`, `caregiver_scope_reviewed`, `caregiver_authorization_activated`, `caregiver_authorization_revoked`.
- Acceptance: access expires automatically; revocation propagates to every surface and cached private data is cleared at next contact.

### 7.12 Priority communication

- User and context: family receiving team information among ordinary conversation.
- Primary question: `Does this require action, and who said it?`
- Five-second hierarchy: message class, action/deadline, official author, affected child/event, current status.
- Actions: `Acknowledge`, context action, `Reply` only when enabled.
- Inputs: approved message record, linked event/team, audience, severity, delivery plan.
- Source, truth, authority: named human publisher; drafts and automation assistance are never shown as the authority.
- Privacy and authorization: audience resolved server-side; lock-screen preview minimizes child/team details.
- Explanation and approval: label why a message is critical and what acknowledgment means. Human approval required for published team communication.
- Responsive behavior: dedicated critical lane above update/conversation lanes.
- States: draft, scheduled, published, provider pending, delivered, failed, read, acknowledgment required, acknowledged, withdrawn.
- Notifications: taxonomy in section 10.
- Audit: draft source, approver, publisher, version, audience count, provider evidence, acknowledgment.
- Accessibility: severity conveyed by label/icon/structure, not color; headings and deadlines readable by assistive tech.
- Analytics: `priority_message_opened`, `message_action_selected`, `message_acknowledged`.
- Acceptance: critical messages cannot appear as ordinary chat; provider delivery, read, and acknowledgment remain separate.

#### Communication Room surface

Implementation status: approved responsive design is implemented locally at `/parent/messages`; signed-in browser comparison passes at 390, 768, and 1440 pixels. Hosted Supabase/RLS proof remains a separate gate. The implementation task and proof boundary are recorded in `docs/communication-room-implementation.md`.

- User and situational context: signed-in guardian coordinating one or more approved children and teams, often outdoors, in motion, under time pressure, or with unreliable connectivity.
- Primary question answered: `What requires me, what is officially current, and what is only team conversation?`
- Five-second information hierarchy: critical action and deadline, affected child/event, named human publisher and version, official updates, then team conversation.
- Primary actions: `Review and acknowledge`, `Review change`, `Open Event Passport`, and `Reply in conversation` only where enabled.
- Secondary actions: change child/team context, view the canonical message language, contact the team, retry a saved reply, or open message history.
- Triggers and inputs: approved priority-message record, official event revision, coach/team update, team-chat message, scoped audience, current family/team context, receipt evidence, language choice, and last successful sync.
- Source of truth: published communication record and version for critical/official lanes; team-chat record for conversation; Event Passport for current schedule truth. Conversation never mutates an official record.
- Responsible authority: named incident or schedule publisher for critical/official content; assigned coach/admin for team updates; authenticated assigned adult for conversation.
- Privacy and authorization boundaries: server-resolved family/team scope; children do not sign in; no direct child messaging; lock-screen previews minimize child/team detail; other families cannot see acknowledgment exceptions.
- Explanation requirements: state why a message is critical, what changed, who published it, which version is current, and what acknowledgment proves and does not prove. Translations are labeled and retain canonical times, places, and links.
- Approval requirements: authorized human approval before critical, official, or published team communication. Replies need sender authority but cannot change schedule, attendance, transportation responsibility, guardian access, medical information, custody restrictions, or emergency instructions.
- Mobile behavior: signed-in family header, visible multi-child context, three-lane switcher, full-width authority-first message cards, 44-pixel targets, offline freshness band, and bottom navigation with `Messages` selected.
- Tablet behavior: family filters and lane switcher above a two-column message stream and operational context rail.
- Desktop behavior: persistent family/team rail, central message stream, and right-side event, publisher, acknowledgment, and safety context.
- States: loading skeleton; empty lane with explanation; awaiting publication; scheduled; published; provider pending; delivered; read; acknowledgment required; acknowledged; offline copy; local reply pending; send error with saved draft; withdrawn; superseded; expired; cancelled event link; corrected version; completed action.
- Notification and escalation: notification class follows section 11; critical reminders target the same guardian and then create a private admin exception; routine conversation respects preferences and quiet hours; retries remain idempotent.
- Audit history: draft source, approver, publisher, message and event versions, audience resolution, provider attempts, delivery/read evidence, acknowledgment actor/time, reply author, moderation action, correction, withdrawal, and superseding record.
- Accessibility: class, action, deadline, and authority are textual and structural rather than color-only; headings preserve reading order; controls meet 44 by 44 pixels; focus moves to confirmations; live announcements are reserved for active critical changes; 200% zoom and 400% reflow preserve lanes and actions.
- Analytics: `communication_room_opened`, `communication_context_changed`, `communication_lane_selected`, `priority_message_opened`, `official_update_opened`, `conversation_reply_started`, `conversation_reply_sent`, `offline_copy_viewed`, `message_acknowledged`.
- Implementation-ready acceptance: critical, official, update, and conversation records cannot be confused; Published, Delivered, Read, and Acknowledged are independently visible; current child/team context stays visible without account switching; an affected parent can identify action, child/event, publisher, version, and unresolved state within five seconds; cached essential content shows freshness; failed or offline replies never appear sent; automated assistance never impersonates the human authority.

### 7.13 Weather or schedule disruption

- User and context: family whose event plan may or has changed.
- Primary question: `What changed, is it official, and what should I do now?`
- Five-second hierarchy: official status, changed fields, effective time, publisher, required action, unresolved impacts.
- Actions: `Review Change`, `Acknowledge`, `Update RSVP`, `Open Directions`, `Contact Team`.
- Inputs: official event revision, weather evidence, field status, impact preview, audience.
- Source, truth, authority: weather provider is evidence; authorized human publishes the operational decision.
- Privacy and authorization: audience limited to affected teams/families; no unnecessary family data in impact analysis.
- Explanation and approval: show evidence, decision, human attribution, and before/after. Automated recommendation cannot publish.
- Responsive behavior: disruption band precedes all event details; before/after sheet available.
- States: monitoring, recommendation ready, awaiting decision, official change published, partially delivered, acknowledged, superseded, resolved.
- Notifications: severity-based immediate or batched delivery; retries do not duplicate acknowledgment.
- Audit: evidence snapshot/hash, recommender, approver, event version, changed fields, audiences, delivery.
- Accessibility: assertive announcements reserved for active critical changes; plain language, no flashing.
- Analytics: `disruption_opened`, `change_details_viewed`, `disruption_acknowledged`, `rsvp_reconfirmed`.
- Acceptance: one official revision propagates to every relevant surface; no prediction, provider alert, or draft alters schedule truth.

### 7.14 Critical-message acknowledgment

- User and context: authorized adult required to confirm receipt of emergency or time-critical instructions.
- Primary question: `What am I confirming, for whom, and by when?`
- Five-second hierarchy: critical label, instruction, affected child/event, deadline, author, acknowledgment control.
- Actions: `I Have Read This`; secondary `I Need Help` or event-specific response.
- Inputs: message version, actor, scope, timestamp.
- Source, truth, authority: published critical message and named incident authority.
- Privacy and authorization: only affected adults; acknowledgment does not imply agreement, compliance, attendance, or safety completion.
- Explanation and approval: state exactly what acknowledgment proves and does not prove.
- Responsive behavior: focused task sheet; remains available offline if previously synced, with pending acknowledgment clearly local.
- States: required, saved on device, syncing, acknowledged, version superseded, expired, withdrawn.
- Notifications: escalating reminders to the same guardian, then admin exception queue. Do not expose non-acknowledgers to other families.
- Audit: actor, message/version, receipt time, sync time, escalation.
- Accessibility: control immediately follows instruction, focus moves to confirmation, confirmation announced.
- Analytics: `critical_message_viewed`, `critical_acknowledgment_submitted`, `critical_help_selected`.
- Acceptance: a new critical version requires a new acknowledgment; delivery/read never count as acknowledgment.

### 7.15 Parent Replay

- User and context: family revisiting what the child practiced and sharing a safe activity at home.
- Primary question: `What did they work on, and how can we encourage it?`
- Five-second hierarchy: child/team/date, approved coach note, 2-3 focus areas, one doable activity, privacy/author.
- Actions: `Try This Activity`, `Save`, optional `Share With Approved Guardian`.
- Inputs: approved practice receipt, reviewed replay draft, approved drill/media, current consent and release scope.
- Source, truth, authority: coach-approved replay; AI or deterministic assistance is disclosed in history but never impersonates the coach.
- Privacy and authorization: linked family only, consented media, first name plus last initial, no rankings, diagnosis, or sensitive coach notes.
- Explanation and approval: family copy says `Approved by Coach [name] on [date]`. Any generated suggestion explains source focus areas. Coach approval required before publication.
- Responsive behavior: composition in section 6.
- States: no replay, draft not family-visible, approved, published, media unavailable, consent changed, corrected, withdrawn, archived.
- Notifications: memory-class notification after publication, never critical; quiet hours respected.
- Audit: source receipt, draft origin, reviewer, approval, publication, media consent, correction/withdrawal.
- Accessibility: captions/transcripts for media, activity instructions in text, no autoplay.
- Analytics: `parent_replay_opened`, `replay_activity_started`, `replay_saved`, `replay_shared_to_approved_guardian`.
- Acceptance: public preview shows a realistic approved outcome, not workflow implementation; family Replay never exposes draft or private notes; revocation removes future access and invalidates cached media.

### 7.16 Additional guardian invitation

- User and context: current guardian adding another authorized adult.
- Primary question: `Who will gain access, and what will they be able to see or do?`
- Five-second hierarchy: adult identity, child/team scope, permissions, restrictions, review requirement.
- Actions: `Send for Review` or `Send Invitation` when policy permits; `Cancel`.
- Inputs: adult contact, relationship, scoped children/teams, permission set.
- Source, truth, authority: current guardian proposes; league/custody policy determines whether admin approval is mandatory.
- Privacy and authorization: never reveal whether an email already has unrelated LeaguePilot access; no blanket family scope default.
- Explanation and approval: review sheet explains visibility and actions. Restricted or ambiguous cases fail closed.
- Responsive behavior: scoped checklist then confirmation.
- States: draft, review required, pending invitation, accepted, declined, expired, revoked, blocked.
- Notifications: invite, reminder, acceptance to proposing guardian, safe rejection/support.
- Audit: proposer, scope, decision, invitation lifecycle, revocation.
- Accessibility: permission descriptions use verbs and examples; no prechecked high-risk permissions.
- Analytics: `guardian_invite_started`, `guardian_scope_selected`, `guardian_invite_submitted`, `guardian_invite_accepted`.
- Acceptance: accepting an invite never expands beyond its approved scope; children do not receive accounts.

### 7.17 Season transition or team change

- User and context: family moving to a new season/team or leaving the organization.
- Primary question: `What carries forward, what expires, and what needs confirmation?`
- Five-second hierarchy: old and new scope, effective date, retained preferences, expiring access, unresolved tasks.
- Actions: `Review New Team`, `Confirm Preferences`, `Download Family Record`, `Get Help`.
- Inputs: admin-approved roster/team change, season lifecycle, guardian links, preference carry-forward policy.
- Source, truth, authority: admin-approved team/season records; guardian confirms preferences but does not assign roster.
- Privacy and authorization: old team content becomes archived/read-only or unavailable by policy; caregiver access expires by default; chat retention follows policy.
- Explanation and approval: itemized carry-forward table. Human admin approval for roster/team truth.
- Responsive behavior: before/after summary with one decision at a time on mobile.
- States: proposed, pending approval, scheduled, active, rejected, cancelled, partially migrated, archived.
- Notifications: advance notice, activation, removed-scope confirmation, unresolved setup reminder.
- Audit: before/after scope, approver, effective time, policy version, rollback/correction.
- Accessibility: dates include year and timezone where relevant; archived/current states are explicit.
- Analytics: `season_transition_opened`, `transition_preferences_confirmed`, `new_team_opened`.
- Acceptance: no silent carry-forward of caregiver scope, custody exceptions, medical information, media consent, transportation responsibility, or RSVP.

### 7.18 Administrator readiness review

- User and context: organization admin preparing a team/season or investigating preventable failures.
- Primary question: `What could stop a family from being ready, who can resolve it, and by when?`
- Five-second hierarchy: critical blockers, affected counts, next deadline, responsible role, evidence freshness.
- Actions: `Open Blocker`, `Assign Owner`, `Request Information`, `Preview Impact`, authorized `Resolve`.
- Inputs: aggregate readiness rules, explicit evidence lanes, scoped exception records.
- Source, truth, authority: service-computed rules over authoritative records; admin resolves within policy.
- Privacy and authorization: default to counts and reason codes; private family detail loads only for a scoped resolution task.
- Explanation and approval: each rule lists inputs, last evaluation, why it matters, responsible authority, and safe resolution. Consequential mutations require preview and approval.
- Responsive behavior: composition in section 6.
- States: evaluating, ready, blocked, warning accepted, stale, provider unavailable, partially resolved, completed.
- Notifications: owner assignment, deadline escalation, no family broadcast until an authorized message is approved.
- Audit: rule result, evidence, actor, assignment, resolution, before/after, automation run.
- Accessibility: priority is not color-only; sortable/filterable queue has table/list alternatives.
- Analytics: `readiness_review_opened`, `blocker_opened`, `blocker_owner_assigned`, `impact_previewed`, `blocker_resolved`.
- Acceptance: admin can find preventable failures without browsing unnecessary private family data; readiness never infers success from missing/stale evidence.

### 7.19 Public-Surface Corrections

- User and context: authorized admin correcting public team, event, venue, or explanatory content.
- Primary question: `What public fact is wrong, who will be affected, and can it be safely corrected?`
- Five-second hierarchy: current published value, proposed correction, affected surfaces/audience, authority, rollback.
- Actions: `Preview Correction`, `Publish Correction`, `Revert` where operationally safe.
- Inputs: target record/version, changed fields, reason, effective time, audience preview.
- Source, truth, authority: canonical public record; authorized admin or schedule authority publishes.
- Privacy and authorization: preview scans for private fields and blocks accidental exposure; no child-specific public content.
- Explanation and approval: before/after diff, propagation map, attribution, and notification impact. Human approval is mandatory.
- Responsive behavior: read-only preview on mobile; full diff and dependency view on tablet/desktop.
- States: draft, validation error, impact ready, awaiting approval, published, partially propagated, superseded, reverted.
- Notifications: only if correction changes a subscribed or safety-relevant event; avoid notifications for cosmetic copy fixes.
- Audit: before/after, reason, actor, approval, version, propagation receipts, revert.
- Accessibility: diffs announced with added/removed labels, not color alone.
- Analytics: `public_correction_started`, `correction_previewed`, `correction_published`, `correction_reverted`.
- Acceptance: one corrected source propagates to public schedule, event passport, calendars, notifications, offline refresh, and cached projections; partial propagation opens an admin incident.

## 8. Visual directions

### Direction A: Modern Team Utility

- Character: energetic, direct, sport-adjacent, highly scannable.
- Palette: current navy/mist foundation with restrained cobalt and semantic amber/red/green reserved for state.
- Typography: strong geometric sans with tabular numerals.
- Composition: bold time blocks, dense agenda rows, compact controls, high-contrast event status.
- Strengths: excellent sideline speed, confident schedule/actions, strong coach fit.
- Risks: can feel institutional or too competitive for anxious families; emotional value is weak.

### Direction B: Calm Family Operations

- Character: reassuring, structured, logistics-led, quiet under stress.
- Palette: navy ink, cool mist, white surfaces, restrained cobalt action, semantic status tokens.
- Typography: accessible humanist sans for language; tabular figures for time.
- Composition: agenda-first, one dominant next-event passport, clear responsibility and unresolved states, limited elevation.
- Strengths: best five-second comprehension, multi-child coordination, disruption handling, and accessibility.
- Risks: can feel utilitarian unless Parent Replay and photography add warmth.

### Direction C: Community Sports Journal

- Character: warm, expressive, memory-centered.
- Palette: same operational base with warmer image treatment and soft team accents inside consented memory surfaces.
- Typography: sans operational UI with a distinct but accessible editorial display face only inside Replay titles.
- Composition: narrative recap, photography, seasonal timeline, coach voice, family activity.
- Strengths: strongest lasting emotional value and product differentiation.
- Risks: poor fit for critical schedule or emergency contexts if allowed to spread across operational UI.

### Recommendation

Use **Calm Family Operations** as the system direction.

Borrow:

- From Modern Team Utility: compact agenda rows, bold leave/arrival numerals, visible event state, thumb-ready action placement.
- From Community Sports Journal: Parent Replay story composition, warm approved imagery, seasonal memory timeline, and coach voice.

Keep operational and memory modes visibly related but behaviorally distinct. A critical change must never look like a journal card.

## 9. Component and design-token system

### Token principles

- Semantic tokens, not raw color names, are the component API.
- Team branding is decorative context and never overrides safety/status semantics.
- Light and dark modes use the same hierarchy. Outdoor mode may increase contrast and reduce translucency.
- Density changes by surface, not arbitrary card sizing.

### Core tokens

| Token | Light intent | Dark intent |
| --- | --- | --- |
| `--surface-canvas` | Cool mist page background | Deep navy canvas |
| `--surface-primary` | White task surface | Raised navy |
| `--surface-subtle` | Cool neutral grouping | Subtle dark grouping |
| `--text-primary` | Navy ink | Near-white |
| `--text-secondary` | Accessible slate | Light slate |
| `--action-primary` | Restrained cobalt | Lighter cobalt meeting AA |
| `--focus-ring` | High-contrast blue/white double ring | High-contrast light/dark double ring |
| `--status-info` | Blue semantic | Blue semantic |
| `--status-success` | Green semantic | Green semantic |
| `--status-warning` | Amber semantic | Amber semantic |
| `--status-critical` | Red semantic | Red semantic |
| `--status-changed` | Violet/blue distinct from critical | Same semantic family |
| `--line-subtle` | Cool border | Dark-mode border |

Numerical targets:

- Base text: 16 px minimum; critical body copy 17-18 px.
- Operational time: 24-32 px mobile, tabular numerals.
- Touch target: 44 by 44 px minimum; 48 px preferred outdoors.
- Radius: 8 px controls, 12 px operational surfaces, 16 px only for memory/media.
- Spacing: 4 px base; common steps 8, 12, 16, 24, 32.
- Focus: 2 px inner plus 2 px offset contrast ring.
- Motion: 120-180 ms feedback only; no automatic motion for critical content; respect reduced motion.

### Components

| Component | Purpose | Required variants |
| --- | --- | --- |
| `PrimaryAction` | One dominant action in a task scope | default, loading, disabled-with-reason, destructive-review |
| `StatusBand` | Critical, changed, warning, offline, success | icon, label, timestamp, source, optional action |
| `AgendaRow` | One event in a scannable list | public, family, changed, cancelled, completed |
| `EventPassport` | Canonical event logistics | full, compact, offline, caregiver |
| `TimeStack` | Leave, arrive, start | known, estimated, unresolved, changed |
| `ResponsibilityCard` | Outbound/return/caregiver truth | unassigned, pending, accepted, changed |
| `FamilyFilter` | Everyone/child/team presentation filter | compact chips, menu, desktop rail |
| `CriticalMessage` | Isolated acknowledgment-required instruction | unread, read, acknowledged, superseded |
| `ChangeDiff` | Before/after official revision | compact, full audit |
| `ReceiptTimeline` | Request/invite/provider lifecycle | current step, completed, failed, expired |
| `VerificationMatch` | Masked relationship review | likely, ambiguous, rejected, approved |
| `ReplayStory` | Approved family memory | text, media, media-unavailable, archived |
| `OfflineReceipt` | Device versus server truth | cached, saved-device, syncing, synced, conflict |
| `ReadinessRule` | Admin blocker explanation | ready, blocked, stale, warning-accepted |
| `CalendarActions` | Calendar integration choices | Apple, Google, Outlook, Download |

No component may:

- Use color as its only status signal.
- Replace an unknown value with a success check.
- Hide authority, timestamp, or changed state when those affect a decision.
- Make a predicted time look official.
- Combine provider delivery, read, and acknowledgment into one status.

## 10. Revised family-facing UX copy

| Current concept | Replace with |
| --- | --- |
| Hero primary `Sign in` | `Request Team Access` |
| Hero secondary `Request access` | `Sign In` |
| Header `Sign up` | `Request Team Access` |
| `Parent self-registration request with admin review before access.` | `Connect your family to a team.` |
| `This form creates a pending local registration request only.` | `Tell us which team and child you are connected to. A league administrator will verify the match before private team details appear.` |
| `It does not create a login, invite token, or guardian-child access grant.` | `Submitting does not open private team information. We will email or text you after the league reviews your request.` |
| `Submit for review` | `Send Request` |
| Request receipt | `Request received. Most reviews take [configured time]. We will contact [masked destination] if the league needs more information.` |
| `Registration system` | `Team access` |
| `Admin review` | `League verification` |
| `Private access` | `Member sign in` |
| `Your account confirms who you are.` | `Sign in with the email or phone connected to your invitation.` |
| `Calendar exports stay preview-only here. Authenticated team calendars use the private schedule export endpoint.` | `Add this schedule to the calendar you already use. Future official changes will update according to your calendar provider.` |
| `ICS preview` | `Add to your calendar` |
| Parent Replay public heading | `See what they learned, not just the score.` |
| Parent Replay public body | `After practice, an approved coach recap gives your family one encouraging activity to try at home.` |
| Install prompt | `Keep game-day details handy` after a qualifying value event, with `Add LeaguePilot to this device` secondary action |

Verification explanation:

> We protect team information by checking each adult’s connection to a child and team. After you send a request, the league compares it with current registration or roster records. Most reviews take [configured time]. You will receive an invitation, a request for more information, or a safe explanation of what to do next. Children do not create LeaguePilot accounts.

Privacy explanation:

> Your request is visible only to authorized league reviewers. Private schedules, messages, contact details, and child information stay hidden until the league approves your connection.

Parent Replay preview:

> **Avery L. kept their eyes up and found open space.**
> Approved by Coach Taylor, July 15
> Try it at home: place two shoes six steps apart. Dribble slowly between them three times while naming the open side.

The preview must be labeled as an example on the public site. It must not imply a real child or production family.

## 11. Communication and notification taxonomy

| Class | Examples | Visual lane | Delivery | Approval | Acknowledgment |
| --- | --- | --- | --- | --- | --- |
| Critical instruction | Emergency instruction, immediate field evacuation, same-day safety action | Dedicated critical surface | Immediate configured channels plus retry/escalation | Authorized incident human | Required when policy says |
| Official disruption | Cancellation, relocation, time change, major delay | Changed-event band and priority inbox | Immediate for imminent event; otherwise configured | Authorized schedule human | Required for high-impact or imminent changes |
| Action required | RSVP deadline, caregiver acceptance, ride assignment | Home task queue | Configured reminder cadence | Record owner or policy-approved workflow | Completion state, not message acknowledgment |
| Team update | Uniform, snack, weekly update, approved coach note | Updates lane | Digest or configured channel | Authorized human publisher | Optional read state |
| Conversation | Direct or team chat | Conversation lane | User preference and quiet hours | Sender authority | None |
| Memory | Parent Replay published, season story | Replay lane | Low-priority, quiet-hours respected | Coach-approved publication | None |
| Account/security | Invitation, sign-in, access change, consent change | Account lane | Required verified channel | Service event after authorized mutation | Often confirmation, not acknowledgment |

Rules:

- Critical content never appears only inside chat.
- The notification title begins with the action or change, not the product name.
- Lock-screen previews omit child name and sensitive team detail by default.
- Translations are labeled and retain the canonical time, place, and link.
- Delivery retries are idempotent. A provider acceptance response is not delivery.
- Quiet hours never suppress an organization-defined emergency class, but setup must explain this clearly.

## 12. Readiness-rule catalog

| Rule | Inputs | Blocks | Responsible authority | Safe remediation |
| --- | --- | --- | --- | --- |
| `FAM-ACCESS-001` | Approved guardian-child link and active team membership | Private team access | League admin | Review match and approve/reject |
| `FAM-CHANNEL-001` | At least one verified critical channel | Critical notification readiness | Guardian | Verify email/mobile or contact league |
| `FAM-LANG-001` | Preferred language and canonical fallback | Translation readiness | Guardian | Select language/fallback |
| `FAM-EVENT-001` | Current official event version and venue/field | Event passport completeness | Schedule authority | Correct official event |
| `FAM-RSVP-001` | Guardian response against current event version | Participation planning | Guardian | Respond/reconfirm |
| `FAM-RIDE-001` | Accepted outbound/return responsibility | Transportation certainty | Guardians | Request/accept assignment |
| `FAM-CARE-001` | Active caregiver scope and acceptance | Caregiver access | Guardian/admin policy | Complete or revoke scope |
| `FAM-CRIT-001` | Acknowledgment for current critical version | Critical receipt | Guardian | Read and acknowledge |
| `TEAM-COACH-001` | Active assigned coach | Team launch | League admin | Assign coach |
| `TEAM-SCHEDULE-001` | At least one current official event or explicit no-event state | Schedule readiness | Schedule admin | Publish or mark intentionally empty |
| `TEAM-COMMS-001` | Approved sender and reachable audience plan | Team communication | Admin/coach | Resolve authority/preferences |
| `TEAM-REPLAY-001` | Practice receipt, approved replay, consented sources | Parent Replay publication | Coach | Review, correct, approve |
| `OPS-PROVIDER-001` | Feature flag, kill switch, consent, provider config | External delivery | Admin/operator | Configure and prove provider path |
| `OPS-FRESH-001` | Critical evidence within policy freshness window | Positive readiness summary | Record owner | Refresh evidence |
| `OPS-PRIVACY-001` | No unauthorized/private field in public projection | Public publication | Admin | Remove field and republish correction |

Readiness display contract:

- `Ready` requires positive, fresh evidence for every critical input.
- `Needs attention` means an authorized person can resolve a known gap.
- `Waiting` means another actor or external provider owns the next step.
- `Needs verification` means evidence is missing, stale, conflicting, or unavailable.
- `Waived` requires authorized human reason, scope, and expiry. It never converts the underlying fact to true.

## 13. Disruption-state model

```text
Monitoring
  -> Recommendation ready
  -> Human review
  -> Official revision published
  -> Projection fan-out
  -> Delivery and acknowledgment tracking
  -> Resolved or superseded
```

Independent evidence lanes:

| Lane | Example |
| --- | --- |
| Evidence | Weather warning, field closure report, conflict detection |
| Recommendation | `Move practice indoors` with reasons |
| Approval | Authorized schedule admin accepts/edits/rejects |
| Official record | Event version 7 changes venue and arrival time |
| Publication | Version 7 visible to affected roles |
| Provider acceptance | Email/SMS/push provider accepted request |
| Delivery | Provider confirms delivered |
| Read | App/message opened |
| Acknowledgment | Guardian confirms current critical version |
| Family response | RSVP or responsibility reconfirmed |

Propagation contract for one official revision:

1. Commit the new event version atomically with actor, reason, and changed fields.
2. Invalidate public, team, parent, coach, calendar, and offline projections.
3. Recompute affected family tasks, conflicts, and readiness.
4. Create a versioned communication draft with audience preview.
5. Require authorized human publication when provider notification is consequential.
6. Track delivery, read, and acknowledgment independently.
7. Detect partial propagation and open an administrator incident.

Correction is reversible when operationally possible. Reversal creates a new version; it never erases history.

## 14. Data and integration dependency map

| Experience | Required records/services | External integration | Proof boundary |
| --- | --- | --- | --- |
| Access request | organizations, teams, seasons, registration requests, rate limit | Email/SMS receipt optional | Submission is not approval or delivery |
| Verification | players, registrations/rosters, guardian links, restrictions, review queue | Identity provider | Identity is not guardian approval |
| Invitation | invitations, membership/link scope, audit | Supabase Auth/OAuth, email/SMS | Provider acceptance is not invitation acceptance |
| Mission Control | family links, events, RSVPs, responsibilities, messages, replay | Offline cache | Cached or seed data is not current server truth |
| Schedule/Passport | canonical events, venues, revisions, projections | Maps, Apple/Google/Outlook calendars | External calendar refresh is provider-controlled |
| Transportation | offers, assignments, acceptance, restrictions | Optional maps | Recommendation is not accepted responsibility |
| Caregiver | scoped authorization, identity, expiry, audit | Email/SMS invite | Invitation is not active authority |
| Communication | message versions, audiences, preferences, delivery log | SendGrid/Twilio/Web Push | Accepted, delivered, read, acknowledged are distinct |
| Weather disruption | weather evidence, field state, event revision, impact | Weather provider | Weather signal is not an official decision |
| Parent Replay | practice receipt, replay draft/approval, consent, media release | Optional OpenAI/media storage | Generated draft is not approval/publication |
| Readiness | rule definitions, evidence freshness, ownership, waivers | Observability/provider health | Aggregate status cannot infer missing evidence |
| Public correction | canonical record, projection fan-out, cache invalidation | CDN/calendar providers | Local publication is not complete propagation |

Minimum new or clarified domain contracts:

- `family_households` or equivalent account-level aggregation across approved links.
- Versioned `event_revisions` with changed-field diff and source authority.
- `transportation_offers` and `transportation_assignments` with dual acceptance.
- Time-bound `caregiver_authorizations` separated from medical-decision authority.
- Versioned `critical_acknowledgments`.
- `notification_classes`, canonical content, translations, and audience receipts.
- `public_projection_receipts` and propagation incident records.
- Organization-configured review windows, escalation policy, and language support.

## 15. Accessibility and safeguarding requirements

### Accessibility

- Target WCAG 2.2 AA. Aim for AAA contrast for essential event details outdoors.
- All tasks must work by keyboard, touch, switch input, and screen reader.
- Support 200% zoom and 400% reflow without horizontal scrolling for normal content.
- Use semantic headings, lists, tables, dialogs, status, and alert roles.
- Move focus intentionally after route changes, critical updates, validation failure, and dialog completion.
- Use live regions sparingly. Critical state changes are assertive; ordinary saves are polite.
- Never rely on color, shape, icon, sound, or position alone.
- Use plain language at approximately grade 6-8 for family logistics.
- Dates include day, date, time, and timezone where ambiguity is possible.
- Minimum 44 px targets with adequate spacing for one-handed, outdoor use.
- Honor reduced motion, reduced transparency where supported, forced colors, text spacing, and system font scaling.
- Provide captions/transcripts and text alternatives for Parent Replay media.
- Maintain a list/agenda alternative to every calendar visualization.
- Validate translated layouts for expansion, right-to-left direction, and mixed-language names.

### Safeguarding

- Children never receive accounts, direct invitations, or notification-channel configuration.
- Do not expose full child names in public, lock-screen, analytics, or general admin readiness views.
- Custody restrictions and medical information are never inferred, summarized by general-purpose automation, or silently relaxed.
- A temporary caregiver receives the minimum information for a bounded time and purpose.
- Location sharing defaults to event venues, not homes.
- Do not rank children, shame attendance, or expose family response reasons.
- Media is private, quarantined, scanned, stripped of hidden metadata, consent-checked, and explicitly released before family display.
- Support/report pathways must be visible but must not reveal a reporter to other families.
- Account, consent, caregiver, and guardian-scope revocations clear relevant private caches.

## 16. Analytics measurement plan

### North-star outcome

`Family readiness before departure`: percentage of imminent family-event instances where official event detail is fresh, guardian response is current, and required responsibility/acknowledgment states are resolved before the configured departure threshold.

This is an operational completeness measure, not proof that the family arrived or was safe.

### Supporting measures

| Goal | Measures |
| --- | --- |
| Acquisition | Request Team Access start/completion, request abandonment by step, median review time |
| Activation | Invitation acceptance, first-sign-in completion, verification exception rate |
| Orientation | Channel verification, language setup, first Mission Control success |
| Coordination | RSVP completion before deadline, unresolved transportation rate, conflict opens and resolutions |
| Disruption | Time from evidence to human decision, publication fan-out latency, delivery/read/acknowledgment by separate lane |
| Reliability | Offline passport opens, sync conflicts, stale event views, partial propagation incidents |
| Parent Replay | Approved replay open rate, activity starts, saves, returns after 7/30 days |
| Administration | Readiness blockers found before event, resolution time, private-detail opens per blocker |
| Accessibility | Keyboard completion, zoom/reflow regressions, translated overflow, screen-reader task success from moderated studies |

### Event rules

- Use pseudonymous actor and organization identifiers with retention limits.
- Never send child names, message bodies, health/custody text, addresses, invitation secrets, or free-text notes.
- Include `surface`, `role`, `state`, `event_version`, `connection_state`, and `language`, where safe.
- Track exposure before conversion. Do not interpret button clicks without knowing the state shown.
- Separate client intent from server receipt and provider outcome.

## 17. Phased implementation backlog

### Phase 0: Public trust corrections

1. Reverse signed-out CTA priority on home and header.
2. Replace `Sign up` with `Request Team Access`.
3. Remove all production form defaults and demo footer language.
4. Rewrite access and auth copy in family language.
5. Replace public calendar with agenda-first rows and a non-truncating hybrid desktop view.
6. Replace ICS preview with calendar provider actions.
7. Gate install prompt behind a value-event policy.
8. Add a tangible, clearly labeled Parent Replay example.

Proof: desktop/mobile screenshots, keyboard pass, 400% reflow, public/private field test, production browser proof.

### Phase 1: Access and activation spine

1. Request receipt and configurable review timeline.
2. Verification status/more-information flow.
3. Invitation valid/wrong-account/expired/revoked flows.
4. First-sign-in notification and language setup.
5. Additional guardian invitation with scoped approval.

Proof: real-session RLS and cross-family isolation, invitation lifecycle, audit history, provider sandbox delivery, recovery.

### Phase 2: Family Mission Control

1. Household aggregation and child/team filters.
2. Five-second next-event passport.
3. Multi-child agenda and conflict explanation.
4. Version-aware RSVP and offline receipts surfaced coherently.
5. Value-event install policy.

Proof: 375/390/768/1440 matrix, offline/reconnect conflicts, organization isolation, performance budget.

Local implementation status (2026-07-24): Parent Home leads with a guardian-scoped Mission Control, child/team filters, an Event Passport, seven-day agenda, explicit overlap evidence, schedule-version-aware RSVP review, and source/freshness/offline truth. Arrival, leave time, separate field, bring list, and responsible adult remain unresolved rather than inferred. The caregiver coordination form begins blank and explicitly grants no transportation, pickup, schedule, or access authority. Focused source/render tests pass, and signed-in 375/390/768/1440 empty-state browser proof records zero overflow and zero browser errors. Populated multi-child, offline/reconnect, organization-isolation, performance, accessibility, and hosted proof remain separate gates.

### Phase 3: Responsibility and temporary care

1. Transportation request/offer/dual acceptance.
2. Outbound/return responsibility in Event Passport.
3. Time-bound caregiver scope, acceptance, expiry, and revocation.
4. Restriction-aware fail-closed policies.

Proof: permission tests, revocation cache clearing, audit, no silent assignment.

Transportation implementation status (2026-07-24): migration `0028` defines service-only request, offer, assignment, mutual-acceptance, restriction-check, and withdrawal records/RPCs. Outbound and return are distinct. A driver offer is the driver-side acceptance; the requesting guardian must separately accept at the same official schedule version before Event Passport names an adult. Version drift becomes needs review, pickup restrictions fail closed without exposing details, withdrawals are attributed, and no home address or provider send is involved. Source/API/render tests pass, and signed-in 375/390/768/1440 migration-unavailable proof records disabled mutation controls, zero overflow, and zero browser errors. Ordered migration/RLS/populated/offline/hosted proof remains open; local SQL installation is unavailable because this workspace lacks `psql` and WSL Docker integration. Temporary-caregiver authorization remains the next local slice.

Temporary-caregiver implementation status (2026-07-24): migration `0029` creates service-only authorization and selected-event records rather than guardian membership. A current guardian reviews one child/team, 1-10 events, a maximum 14-day window, required Event Passport view, optional pickup, and fixed prohibited actions. An exact-email adult separately accepts a one-time hashed fragment secret; future windows remain accepted-upcoming until their authorized start. Medical/health information, custody authority, RSVP/attendance changes, official schedule changes, publishing, roster/other-child access, and onward delegation are never included. Pickup restrictions fail closed without exposing details. Expiry and attributed revocation remove server access; the caregiver surface clears its private cache namespace at next contact. Source, API, route, and render tests pass with zero provider sends. Signed-in degraded parent, invitation-acceptance, and no-access portal proof passes 375/390/768/1440 with zero overflow and browser errors. Ordered migration/RLS/populated/cache/offline/hosted proof remains open.

### Phase 4: Priority communication and disruption

1. Message taxonomy and critical lane.
2. Versioned critical acknowledgment.
3. Official event revision and projection fan-out.
4. Human-reviewed weather/change decision flow.
5. Partial-propagation monitoring and correction/revert.

Proof: provider sandbox, webhook evidence, idempotent retries, one-revision multi-surface browser proof, escalation.

Official-communication implementation status (2026-07-24): migration `0030` adds service-only official-message threads, immutable attributed versions, additive corrections/withdrawals, exact current-season event schedule-version checks, idempotency, critical-admin review, and disruption linkage to an existing official event change. Publishing projects one canonical version to Communication Room, Mission Control, Family Schedule, and Event Passport, while external provider delivery stays optional/pending behind its separate review. A required projection mismatch opens an auditable incident. Family reads suppress superseded notification rows, display current wording and correction history, and keep Published, Delivered, Read, and Acknowledged distinct. Acknowledgment now fails closed for superseded versions or delivery evidence from another version. The administrator workbench requires an explicit human review and publishes zero provider sends. Source/API/render tests pass; signed-in migration-unavailable proof at 375/390/768/1440 records zero overflow, undersized controls, and browser errors. Ordered migration/RLS, populated four-surface readback, partial-propagation lifecycle, offline/browser accessibility, provider sandbox/webhook, and hosted proof remain open.

### Phase 5: Parent Replay and season continuity

1. Family-facing approved Replay story.
2. Consent-aware media and accessible activity.
3. Season memory timeline.
4. Team/season transition carry-forward review.
5. Admin readiness rules and privacy-minimized failure analysis.

Proof: source/approval/publication boundaries, media lifecycle, archive and revocation, moderated parent comprehension.

Family Parent Replay implementation status (2026-07-24): `/parent/practice-recaps` now uses a dedicated guardian-scoped, published-only reader instead of the broad Team Portal. Parent compatibility scoping also removes draft Replays. The family story names linked children with first name/last initial, team, coach, publication date, a concrete short activity, coach cue, learning context, team quest, private save/tried states, and a season memory timeline. Text remains emotionally complete without child imagery. Migration `0031` makes optional media service-only and requires complete subject identification, administrator review, moderation, safety scan, family release, accessible alt text/transcript, and current team-family consent from every active guardian for every identified child. Every read rechecks current team, guardian consent, storage deletion, scan, release, and moderation state; attributed revocation removes media while retaining the text Replay. Individual family engagement is parent-only and explicitly non-ranking. Focused source/API/render tests pass, and signed-in populated 375/390/768/1440 proof records zero overflow, undersized controls, and browser errors. Ordered migration/RLS, media lifecycle, consent-revocation, offline/reconnect, assistive-technology, retention, moderated parent-comprehension, and hosted proof remain open.

Season continuity implementation status (2026-07-24): migration `0032` creates service-only, expiring, lock-versioned season/team transition reviews. An active organization administrator proposes the target and reason; every current signed-in guardian must accept the exact fixed carry/reset scope before a separate administrator application. Application rechecks the complete current guardian set, unchanged active source roster record, active same-organization target team/season, expiration, and lock version. It archives the source roster row and creates a new provenance-linked active child row carrying only first-name/last-initial display identity plus accepted guardian relationships. Jersey, permissions, custody restrictions, medical information, RSVP/attendance, transportation, temporary caregivers, media consent, notification preferences, and team conversation never carry. Expiration is display-only until an administrator explicitly closes the review with an attributed reason; there is no silent lifecycle mutation. A reasoned correction deletes only transition-created rows and restores the exact source status only before any known downstream family record exists; otherwise it fails closed and requires a new reviewed correction. Admin readiness rules now disclose their source of truth, responsible authority, aggregate-only privacy boundary, and deterministic non-mutating explanation. Source/API/render tests pass, and signed-in parent/admin 375/390/768/1440 degraded-state proof records zero overflow, undersized controls, and browser errors. Ordered migration/RLS, populated multi-guardian concurrency, expiration, apply/revert refusal, offline/reconnect, assistive-technology, moderated family comprehension, and hosted proof remain open.

## 18. Figma-ready prototype specification: primary parent journey

Selected prototype direction: Community Sports Journal.

Borrowed elements:

- Modern Team Utility supplies the scannable agenda mechanics, status bands, and direct event actions.
- Calm Family Operations supplies the verification timeline, privacy explanations, and logistics-led information hierarchy.
- Community Sports Journal owns the visual voice, Parent Replay storytelling, warm editorial typography, and emotional payoff.

Phase 0 Figma artifact:

- File: [LeaguePilot Phase 0 - Community Sports Journal](https://www.figma.com/design/c28Jx5U8wI2SPWPhbKaMje)
- Foundations: 5 variable collections, 74 variables, Light/Dark semantic color modes, 9 text styles, and 3 elevation styles.
- Reusable families: Button, Form Field, Status Band, Agenda Row, Calendar Actions, Access Timeline, Parent Replay Story, Public Header, Communication Lane Switcher, Communication Message, Message Composer, and Family App Header.
- Responsive compositions: Public Home, Public Schedule, Request Team Access, Parent Replay, and Communication Room at 390, 768, and 1440 pixels.
- Communication Room coverage: Critical, Updates, and Conversation lanes; multi-child/team context; human publisher and version; separate Published, Delivered, Read, and Acknowledged evidence; translation label; offline copy; read-only authority boundaries; ready/offline/sending/error composer states.
- Validation status: 12 component sets and 15 responsive screens with no unresolved placeholders, hardcoded component paints, unnamed nodes, forbidden family copy, non-Inter operational type, missing Replay images, or sub-44-pixel interactive targets.
- Boundary: this Figma artifact is the approved implementation contract; production code remains unchanged until the responsive compositions and authority copy are accepted.

### Frames

Create at:

- Mobile: 390 by 844.
- Tablet: 768 by 1024.
- Desktop: 1440 by 1024.

### Prototype flow

1. `P01 Public Home`
   - Primary CTA: Request Team Access.
   - Secondary: Sign In.
   - Show two public agenda rows and the access/privacy timeline.
2. `P02 Access Request - Team`
   - Select league/team and relationship.
   - Empty production fields.
3. `P03 Access Request - Family`
   - Adult contact and child first name/last initial.
   - Privacy explanation beside inputs.
4. `P04 Request Receipt`
   - Reference, expected review time, masked channel, three-step timeline.
5. `P05 Verification`
   - Masked suggested child/team match and explainable reasons.
6. `P06 Invitation`
   - Approved scope, expiry, accept/sign-in action.
7. `P07 Notification and Language`
   - Language, critical channel, routine channel, quiet hours.
8. `P08 Family Mission Control`
   - Critical change band, next event passport, two-child week, unresolved ride.
9. `P09 Multi-child Schedule`
   - Agenda with conflict and child/team filters.
10. `P10 Event Passport`
    - Leave/arrive/start, venue/field, opponent, status, bring list, responsibility.
11. `P11 RSVP`
    - Going/Not Going/Unsure with version-aware confirmation.
12. `P12 Transportation`
    - Request, offer, dual acceptance, outbound/return.
13. `P13 Caregiver Authorization`
    - Scope review, expiry, allowed/prohibited actions.
14. `P14 Communication Room`
    - Critical, Updates, and Conversation lanes; visible child/team context; human publisher/version; offline freshness; separate delivery/read/acknowledgment; reply only in conversation.
15. `P15 Official Disruption`
    - Before/after, human publisher, acknowledgment, RSVP reconfirmation.
16. `P16 Critical Acknowledgment`
    - Focused instruction and explicit meaning of acknowledgment.
17. `P17 Parent Replay`
    - Approved coach story, one activity, consented media placeholder, save.
18. `P18 Add Guardian`
    - Scoped children/teams and review requirement.
19. `P19 Season Transition`
    - Carry-forward table and expiring permissions.

### Figma component set

- Buttons: primary, secondary, tertiary, destructive review, icon.
- Form: text, select, segmented response, checkbox, channel verification, error summary.
- Navigation: public header, Family App Header, parent bottom bar, desktop rail, family filter, Communication Lane Switcher.
- Status: critical, changed, warning, pending, offline, completed, cancelled.
- Event: agenda row, date header, passport, time stack, venue, calendar actions.
- Coordination: RSVP, responsibility, caregiver scope, conflict card.
- Communication: Communication Message variants, priority message, critical acknowledgment, translation label, and Message Composer states.
- Access: receipt timeline, verification match, invitation scope.
- Replay: story, focus area, activity, consent/media state.
- Admin: readiness rule, impact diff, audit entry.

### Prototype interaction notes

- Request CTA moves to team selection.
- Receipt timeline animates only as feedback, and becomes static under reduced motion.
- Family filter swaps agenda content without changing authorization context.
- Opening a changed event first shows the official diff.
- RSVP updates locally to `Saving`, then `Confirmed` only after a simulated server receipt.
- Transportation remains `Awaiting acceptance` until the second actor accepts.
- Critical acknowledgment includes version in prototype variables.
- Parent Replay opens after operational tasks to demonstrate emotional payoff.

### Prototype content constraints

- Use fictional names only inside clearly labeled prototype/example data.
- Child names use first name plus last initial.
- No real contact, health, custody, or address data.
- Do not use lorem ipsum or internal implementation terms.
- Every changed/cancelled/expired/error state needs a reachable prototype branch.

## 19. System-level acceptance contract

The design is accepted only when all of the following are demonstrated:

1. A signed-out visitor sees `Request Team Access` as the primary CTA and `Sign In` as secondary at every supported width.
2. Public and family event rows show team, activity, date, arrival, opponent when applicable, venue, field, status, and action without essential truncation.
3. Apple Calendar, Google Calendar, Outlook, and calendar download actions replace raw ICS display.
4. Production forms contain no prefilled identity or child data.
5. Access copy explains verification, timing, privacy, and next steps in family language.
6. Installation is not promoted until a signed-in adult completes a qualifying value event such as confirming an RSVP, opening directions, or acknowledging a change.
7. One household view coordinates multiple approved children without account switching.
8. Event Passport answers all seven product-promise questions in five seconds or names the unresolved field.
9. Critical communication is visually, semantically, and behaviorally separate from ordinary conversation.
10. One official event revision reaches every relevant projection with the same version and opens an incident on partial propagation.
11. Essential event information remains available offline with freshness and sync truth.
12. Automation explains recommendations, names its evidence, and cannot publish, grant, assign, acknowledge, or change official truth.
13. Consequential actions show the responsible human, approval, audit history, and correction/reversal path where possible.
14. Administrators see aggregate readiness first and open private detail only for a scoped resolution task.
15. Parent Replay is coach-approved, emotionally credible, accessible, consent-aware, and private to approved family scope.
16. Child, family, organization, role, season, and temporary-caregiver isolation pass automated and real-session tests.
17. The primary journey passes keyboard, screen-reader, reduced-motion, forced-colors, 200% zoom, 400% reflow, outdoor contrast, and one-handed moderated tests.

## 20. Immediate prioritized action

Begin Phase 4 with a durable communication-revision model: preserve published wording and every correction/withdrawal as immutable attributed versions, connect one official event revision to every affected projection, show partial propagation as an operational incident, and require human approval before any provider execution. Communication Room receipt evidence is already proven in isolated QA; provider sandbox, ordered migration/RLS, hosted Phase 0, legacy invitation issuance, and populated Phase 3 proof remain separate external gates.
