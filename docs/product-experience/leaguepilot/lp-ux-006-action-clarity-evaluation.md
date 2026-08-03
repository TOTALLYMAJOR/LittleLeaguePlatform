# LP-UX-006 Action Clarity Evaluation

Date: 2026-08-03

Status: `in-progress` — slice 1 applied; full evaluation report pending (multi-agent evaluation running; this file will be expanded with the per-page scorecard, systemic findings, and prioritized recommendations).

Branch: `ux/lp-ux-001-family-shell`

Trigger: user (viewing as admin and coach) reports difficulty determining what actions are available on a given page and "what is being asked of me."

## Evaluation Frame

Heuristics applied per page: (H1) one unmistakable primary action or an explicit all-clear; (H2) verb-first user-language labels naming object and outcome; (H3) every count/badge pairs with the control that resolves it; (H4) consequence transparency at point of action (the app's drafts-for-review model must be visible where the user acts, not in fine print); (H5) above-the-fold task orientation at 390 and 1440; (H6) consistent primary/secondary CTA grammar; (H7) zero states that say "you're done."

## Slice 1 Applied (coach home action queue, `components/role-dashboard-experiences.tsx`)

Label-level fixes for the most-reported surface, ahead of the full report:

| Before | After | Rationale |
|---|---|---|
| "4 items need attention" | "4 tasks in your queue" | H3: points at the queue that resolves it |
| "Ready with 2 actions" | "2 tasks open" | contradiction removed |
| "2 grouped actions" | "2 tasks to do" / "All clear" | H2: system language → task language; H7 explicit all-clear |
| "Draft RSVP nudge" | "Draft RSVP reminder" | H2: plain object |
| "Open family help" | "Assign snacks & volunteers" | H2: names the actual task |
| "Save weekly update" | "Save weekly update draft" | H4: consequence in label; consistent with the weekly-update builder |
| Drafts disclaimer after all buttons | Moved above the queue; reworded: "Everything here saves a draft for your review. Nothing is sent to families until you approve it." | H4: read before acting |

Pins updated in sync: `components/feature-panels.test.tsx` (3 assertions), `scripts/capture-season-certainty-proof.mjs` coach readyTexts. Verified: `npm test` 115 files / 677 tests pass.

## Pending

- Full per-page scorecard (coach + admin routes), systemic patterns, doc-alignment vs the Saturday-ready task model (05/06), and ordered recommendations — to be appended here.
- Admin surfaces untouched pending the report; expected themes: approval queues framed as passive tables, no cross-queue "do this first" ranking on `/admin`.

## Handoff

If this session ends before the report lands: re-run the evaluation per the frame above (evaluators over app/coach/*, app/admin/*, AppShell attention signals, output/playwright screenshots, docs 02/05/06/07), or continue from whatever scorecard section exists below this line.
