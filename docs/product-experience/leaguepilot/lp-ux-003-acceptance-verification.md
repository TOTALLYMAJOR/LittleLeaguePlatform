# LP-UX-003 Schedule and RSVP Local Acceptance

Date: 2026-07-30 (US/Central)

## Verdict

LP-UX-003 is **done-local-accepted** at exact commit `376bd0c` on branch `ux/lp-ux-003-responsive-acceptance`.

The branch starts directly from merged `origin/main` commit `8602469`, which contains the complete LP-UX-001 through LP-UX-007 implementation chain. This acceptance is local code, test, production-build, authenticated browser, responsive, interaction-state, and contrast evidence only. It is not a push, merge, deployment, hosted write proof, provider proof, or production acceptance.

## Accepted boundary

- Routes: `/parent/schedule` and compatibility task route `/parent/rsvp`.
- Actor: authenticated Parent with approved guardian scope.
- Tenant propagation: organization, season, linked team, guardian, player, event, and schedule-version context already supplied by the server-scoped route adapters.
- State model: existing RSVP answers and existing version/conflict semantics only. No enum, lifecycle, API, RPC, schema, RLS, or domain change.
- Failure and concurrency: the browser harness intercepts a stored-success response followed by `schedule_changed` on Schedule and `guardian_conflict` on Needs Reply. The shared control renders the existing persisted-success and review-before-retry copy.
- Idempotency: production UI still sends the existing per-action `Idempotency-Key`; the proof does not alter that contract.
- Provider and hosted safety: all browser-proof `/api/rsvps` requests are intercepted locally. Hosted rows mutated: zero. Provider calls executed: zero.
- Security check: no new identifier input, tenant selector, role path, payload field, provider boundary, export, or privileged action was introduced.

## Corrections made

1. Schedule Directions and Event Passport controls now meet the 44px Family touch-target floor.
2. The All dates control now meets the same target floor.
3. The seven-day ribbon retains 44px date targets at 320px through contained horizontal scrolling instead of compressing the controls.
4. Week labels use the existing 12px minimum typography token.
5. Shared RSVP hover and focus states no longer inherit the global action-orange hover fill. Neutral and selected states retain semantic, contrast-safe paints after success or conflict.

No new UI surface was required. The existing Family shell, filter, Event Passport, `RsvpControl`, task-list, and route patterns resolved the acceptance defects.

## Browser evidence

`output/playwright/lp-ux-003-schedule-rsvp/proof.json` records 10 authenticated route/viewport results:

- `/parent/schedule`: 320, 390, 768, 1024, and 1440 pixels.
- `/parent/rsvp`: 320, 390, 768, 1024, and 1440 pixels.
- Document overflow: zero.
- Extra or missing main landmarks: zero.
- Undersized audited controls: zero.
- Serious or critical axe findings: zero.
- Page errors: zero.
- Non-aborted request failures: zero.
- Intercepted RSVP requests: four, covering two local stored-success responses and both required 409 conflict branches.

`output/playwright/lp-ux-003-contrast/proof.json` records eight additional authenticated results for the two routes in family-light, device-light, device-dark, and forced-colors modes. Numeric text thresholds are 4.5:1 for normal text and 3:1 for large text. All eight results pass with zero serious/critical axe findings, console errors, failed requests, horizontal overflow, or extra main landmarks.

## Repository validation

- `npm run check:skills`: passed.
- LP-UX-003 focused suite: 50 tests passed before correction.
- Acceptance contract and proof wiring: 24 tests passed after correction.
- Full Vitest suite: 124 files, 701 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed with 17 pre-existing warnings and zero errors.
- `npm run build`: passed on a fresh Next.js 16.2.11 production build.
- `npm run qa:schedule-rsvp-proof`: passed.
- Focused `npm run qa:contrast-proof`: eight results passed.
- `git diff --check`: passed.
- `npm audit --audit-level=high`: remains non-green with nine existing high-severity findings in the ESLint/minimatch development chain. The complete suggested repair requires the breaking ESLint 10 upgrade and is outside this bounded UI slice.

## Remaining gates

- Independent review of `376bd0c` may be run before publication.
- No push is authorized or performed by this acceptance.
- Hosted signed-in route proof remains open.
- Real Supabase/RLS write and readback proof remains open and must run only against an explicitly isolated QA target.
- Offline/reconnect conflict proof, manual screen-reader review, 200%/400% zoom review, one-handed timing, outdoor readability, and production acceptance remain separate.
- LP-UX-004 through LP-UX-007 still need their own responsive acceptance commits. The next safe slice is LP-UX-004 on existing utility routes; there is no approved new Family product surface.
