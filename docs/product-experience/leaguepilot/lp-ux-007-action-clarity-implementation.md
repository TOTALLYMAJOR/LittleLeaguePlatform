---
authority: evidence
answers: null
supersedes: []
superseded_by: null
reviewed: 2026-08-22
---
# LP-UX-007 Action Clarity Implementation

Date: 2026-08-03

Status: `done-local-browser-verified`

Branch: `ux/lp-ux-001-family-shell`

Continuation: implements `NEXT ITEMS FOR CODEX` from `lp-ux-006-action-clarity-evaluation.md` in order. `10-reference-implementation-brief.md` remains untouched.

## Ordered Implementation

1. **Fictitious actions removed.** Coach RSVP reminder actions now insert a real pending email draft in the existing `notifications` review outbox, validate assigned-team event and active guardian scope, suppress an existing identical pending draft, and write `rsvp_reminder_draft_created` audit evidence. No provider send occurs. Weather drafts are decision evidence linked to the Resolution Room and no longer inflate the coach task count.
2. **One coach radar count.** The radar header, center, and queue all use the same enumerated task array. Each visible row is one family RSVP, snack, or volunteer task and the header anchors to that exact list.
3. **Focused coach surfaces.** `/coach/drafts` enumerates pending drafts with per-item Review disclosure; `/coach/snacks-volunteers` puts claimable work before covered work; `/coach/weather-fields` renders the Resolution Room; `/coach/attendance` puts Save reminder draft beside each eligible no-response family. Coach settings remain absent from navigation.
4. **Done states.** Admin queues collapse to one all-clear statement when empty; clear radar categories read `Nothing needed`; media defaults to pending/reported items with a real empty state; delivery review defaults to pending with an approval count.
5. **Consequences and preconditions.** Draft-only and instant Team Chat consequences are stated at the action. Disabled registration, guardian, communication, roster, rollback, and resolution actions render their missing precondition inline. The schedule inspector link is no longer styled as a save action.
6. **Admin ends at queues.** `/admin` contains linked health metrics, linked Suggested reviews, and the resolving queues with `Fix next hold`. Composer, sponsor CRUD, media review, planning, lineup, and other workbenches do not render inline. Queue CTAs start with verbs, and priority mechanics are explained without exposing raw scoring internals.
7. **Shared shell attention.** One selector defines admin queue routes, counts, and actions for both the page and shell. Badges visibly say `due`, `unread`, or `review`; a regression test asserts badge count equals queue length. The context bar distinguishes `All caught up` from unavailable task counts.
8. **390px first viewport.** Family and staff role/organization/season/team/access context compresses to one line with a disclosure. The announcement is static at phone width, staff sidebar video is suppressed on mobile, and the first family/coach/admin task plus its action appears before secondary overview material.
9. **Workbenches and identity.** Coach and admin schedule routes lead with the Resolution Room and place event editing behind an explicit disclosure. Schedule/delivery telemetry moved to Admin Operations. Alias pages redirect to canonical destinations. Navigation uses `RSVPs`, `Parent Replay`, and `Team Portal`. Parent Replay presents one `Confirm and publish` action while still executing the existing audited approve-then-publish transitions.
10. **Staff vocabulary.** Admin queue rows pluralize real user units and end with `League admin acts next`; team status chips name whether admin action is required. Mobile `Providers` is `Message approvals`, the expiry badge is `Session expiring`, and Team Portal help text describes user-visible content rather than shared-component architecture.

## Draft-Persistence Boundary

- Tenant scope: the verified session coach's active team membership, the selected assigned-team event, and an active guardian link for that team's player.
- Actor authority: the route derives the actor from the authenticated session; client-supplied actor identity is not accepted.
- Persisted state: existing `notifications.status = pending`; no enum, state machine, schema, or migration changed.
- Provider impact: none. The record is review-only and creates no provider attempt.
- Audit: `audit_events.action = rsvp_reminder_draft_created` records the coach, team, event, and draft count without exposing child contact data.
- Failure/idempotency: invalid or cross-team targets fail closed; an identical pending team/event/recipient/title draft is returned rather than duplicated. A database uniqueness constraint was not introduced, so concurrent identical requests remain a narrow race to address only with separately approved schema work.

## Browser Verification

The repository `qa:season-certainty-proof` Playwright workflow ran against `http://127.0.0.1:3001` with configured fictional QA parent, coach, and admin sessions. It checked 375×812, 390×844, 768×1024, 1024×900, and 1440×1100, rejected horizontal document overflow, and failed on browser errors.

| Surface | Result | Representative evidence |
|---|---|---|
| Parent first task and compact Family context | Pass | `output/playwright/lp-ux-007-action-clarity/parent-mobile-390.png` |
| Coach one-count radar and first task | Pass; matched `in your queue` | `output/playwright/lp-ux-007-action-clarity/coach-mobile-390.png`; `coach-desktop-1440.png`; `proof.json` |
| Real pending draft review list | Pass; 4 current pending drafts rendered in the selected QA scope | `output/playwright/lp-ux-007-action-clarity/coach-focused-a/coach-drafts-mobile-390.png`; `coach-drafts-desktop-1440.png`; `proof.json` |
| Per-family RSVP reminder list | Pass | `output/playwright/lp-ux-007-action-clarity/coach-focused-a/coach-attendance-mobile-390.png`; `proof.json` |
| Claim-first snacks and volunteers | Pass | `output/playwright/lp-ux-007-action-clarity/coach-focused-b/coach-community-mobile-390.png` |
| Focused coach Resolution Room | Pass | `output/playwright/lp-ux-007-action-clarity/coach-focused-b/coach-weather-mobile-390.png`; `proof.json` |
| Coach schedule Resolution Room and edit affordance | Pass | `output/playwright/lp-ux-007-action-clarity/coach-schedule/coach-schedule-mobile-390.png`; `coach-schedule-desktop-1440.png`; `proof.json` |
| Queue-only Admin home and 390px first action | Pass; matched `What is blocking launch?` | `output/playwright/lp-ux-007-action-clarity/admin/admin-mobile-390.png`; `admin-desktop-1440.png`; `proof.json` |
| Admin schedule Resolution Room and change lens | Pass | `output/playwright/lp-ux-007-action-clarity/admin-schedule/admin-schedule-mobile-390.png`; `admin-schedule-change-lens-desktop-1440.png`; `proof.json` |
| Admin Operations telemetry disclosure | Pass | `output/playwright/lp-ux-007-action-clarity/admin-operations/admin-operations-mobile-390.png`; `admin-operations-desktop-1440.png`; `proof.json` |

The initial browser run found the theme prepaint `<Script>` emitted outside the document head. It was replaced by an identified raw prepaint script inside `<head>`; the reruns above recorded no browser errors. These are local signed-in rendering results, not hosted, provider, deployment, or production acceptance.

## Repository Verification

- `npm run typecheck` — passed.
- `npm test` — 115 files, 679 tests passed.
- `npm run build` — passed; 104 static pages generated and the standalone postbuild completed.
- `git diff --check` — passed at closeout.

## Explicitly Deferred

1. Hosted/production browser acceptance, provider delivery, and provider readback are not claimed.
2. A database uniqueness constraint for concurrent identical RSVP reminder-draft requests was not introduced because it would require separately approved schema work.
3. `10-reference-implementation-brief.md` was not touched.
