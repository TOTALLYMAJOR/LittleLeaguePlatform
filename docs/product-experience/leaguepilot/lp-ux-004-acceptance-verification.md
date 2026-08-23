---
authority: evidence
answers: null
supersedes: []
superseded_by: null
reviewed: 2026-08-22
---
# LP-UX-004 Truthful Family Utilities Local Acceptance

Date: 2026-07-30 (US/Central)

## Verdict

LP-UX-004 is **done-local-accepted** at exact commit `bc4e761` on branch `ux/lp-ux-004-responsive-acceptance`.

The branch is stacked linearly on the accepted LP-UX-003 commits, which in turn start from merged `origin/main` commit `8602469`. This is local code, test, production-build, authenticated browser, responsive, interaction, and contrast evidence only. The accepted branch was pushed to `origin/ux/lp-ux-004-responsive-acceptance` on 2026-07-31; that publication is not a pull request, merge, deployment, hosted write proof, provider proof, or production acceptance.

## Accepted boundary

- Parent routes: `/parent/settings`, `/parent/more`, `/account`, and `/parent/practice-recaps`.
- Compatibility naming: `/coach/practice-recaps` remains unchanged and was not expanded by this slice.
- Actor: authenticated Parent with the server-resolved Family shell and existing approved access.
- Settings behavior: existing language, channel, quiet-hours, translation, and shared-device preferences only.
- More behavior: exact existing seven-destination utility list only.
- Account behavior: existing scoped profile and membership read, plain-language access labels, raw-identifier exclusion, and safe sign-out only.
- Practice Replay behavior: existing published replay read and save-for-later engagement only.
- Provider and hosted safety: the proof intercepts Settings and Practice Replay writes locally. Hosted rows mutated: zero. Provider calls executed: zero.
- Security check: no new identifier input, tenant selector, role path, payload field, provider boundary, media consent, membership grant, schema, API, route, or privileged action was introduced.

## Corrections made

1. The existing Practice Replay page now uses a zero-minimum grid track so intrinsic child width cannot expand the 320px document.
2. The nested replay timeline and list use the same containment rule, and timeline items can shrink within the parent track.
3. Replay timeline status text uses the existing 12px minimum typography token.
4. The browser harness waits for Account and Practice Replay settled states before auditing or capturing them.

No new UI surface was required. The existing Family shell, Settings form, More destination list, Account cards, and Practice Replay components resolved the acceptance defects.

## Browser evidence

`output/playwright/lp-ux-004-family-utilities/proof.json` records 20 authenticated route/viewport results:

- `/parent/settings`, `/parent/more`, `/account`, and `/parent/practice-recaps`.
- 320, 390, 768, 1024, and 1440 pixels for every route.
- Document overflow: zero.
- Extra or missing main landmarks: zero.
- Undersized audited controls: zero.
- Text below 12px: zero.
- Serious or critical axe findings: zero.
- Page errors: zero.
- Non-aborted request failures: zero.
- Intercepted mutations: one Settings save and one Practice Replay save.
- More destination audit: all seven approved links present.
- Account audit: no raw membership UUID and Sign out is keyboard focusable.

`output/playwright/lp-ux-004-contrast/proof.json` records 16 additional authenticated results for the four routes in family-light, device-light, device-dark, and forced-colors modes. Numeric text thresholds are 4.5:1 for normal text and 3:1 for large text. All 16 results pass with zero serious/critical axe findings, console errors, failed requests, horizontal overflow, or extra main landmarks.

## Repository validation

- `npm run check:skills`: passed.
- Full Vitest suite: 124 files, 702 tests passed.
- `node --check scripts/capture-family-utilities-proof.mjs`: passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed with 17 pre-existing warnings and zero errors.
- `npm run build`: passed on a fresh Next.js 16.2.11 production build.
- `npm run qa:family-utilities-proof`: 20 results passed.
- Focused `npm run qa:contrast-proof`: 16 results passed.
- `git diff --check`: passed.
- `npm audit --audit-level=high`: remains non-green with nine existing high-severity findings in the ESLint/minimatch development chain. The complete suggested repair requires the breaking ESLint 10 upgrade and is outside this bounded UI slice.

## Remaining gates

- Independent review of `bc4e761` remains available before pull request or merge.
- The acceptance branch is pushed; pull request, review, merge, and deployment remain separate actions.
- Hosted signed-in route proof remains open.
- Real Supabase/RLS write and readback proof remains open and must run only against an explicitly isolated QA target.
- Offline/reconnect behavior, manual screen-reader review, 200%/400% zoom review, one-handed timing, outdoor readability, and production acceptance remain separate.
- LP-UX-005 through LP-UX-007 still need their own responsive acceptance commits. The next safe slice is LP-UX-005 on the existing Family Photos and parent-context Team Portal surfaces; there is no approved new Family product surface.
