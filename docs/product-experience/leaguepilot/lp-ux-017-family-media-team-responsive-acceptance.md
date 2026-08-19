# LP-UX-017 Family Media and Team Responsive Acceptance

Date: 2026-08-19 (US/Central)

## Verdict

LP-UX-017 is `done-local-browser-verified` on the current dirty `ux/lp-ux-001-family-shell` checkout. It hardens the existing Family Photos and parent-context Team Portal surfaces only.

This establishes local source, component, authenticated-route, responsive, theme, forced-colors, and intercepted-interaction evidence. It is not a commit, publication, deployment, hosted Supabase readback, provider result, production-data acceptance, or human acceptance.

## Implemented boundary

- `/parent/photos` keeps the existing approved-and-family-released projection, masked child labels, authenticated `/api/media/report` contract, and no consent writer.
- Successful report responses remove only the selected photo and use polite status feedback. Failed or unavailable responses retain all photos, use alert feedback, and permit retry.
- Repeated photo actions have item-specific accessible names.
- Parent-context `/team-portal` stays read-only and excludes staff branding, acting-user, and capability controls. Event title, time, and location now wrap as separate semantic values.
- Family media and team cards contain long content, stack actions at small widths, preserve 44px actions and focus paint, and receive explicit forced-colors treatment.
- The verified-family context disclosure now wraps as a real summary and expands into a contained responsive detail grid instead of inheriting the retired flat-strip layout.
- Explicit Dark mode now gives the shared Family brand and desktop navigation token-based contrast.
- No route, domain type, schema, migration, RLS policy, provider integration, staff workflow, or public API changed.

## Local evidence

- `output/playwright/lp-ux-017-family-media-team/proof.json` records 26 passing results: 20 authenticated Light/Dark route checks at 320, 390, 768, 1024, and 1440 pixels; four forced-colors checks; and two report interactions.
- Every authenticated route result retains server-derived `parent` role and data scope, exact Family navigation, no horizontal overflow or audited containment failure, no undersized action, no serious/critical axe finding, visible focus, and no staff-control, email, or raw-identifier leakage.
- The parent QA account contained zero released photos. Success and failure interactions therefore mount the production `FamilyPhotos` component with two isolated approved fixtures, intercept `/api/media/report`, and record `providerOrDatabaseMutation: false`. Success removes one exact item; failure retains both and restores the retry action.
- Focused manual-theme proof passes five results for the two routes at 390 and 1440 pixels plus saved Light replacement, using `http://localhost:3020` so Next.js development hydration remains same-origin.
- Focused component, route-guard, smoke, and topology validation passes 72 tests across five files.
- Repository validation passes skill discovery, typecheck, production build, `git diff --check`, and all 744 Vitest cases with one worker and a runner-only 15-second timeout. Lint exits successfully with three pre-existing unused-symbol warnings outside this slice.

## Remaining gates

- Hosted parent-role behavior and production-data correctness are not proved.
- A populated authenticated released-media read and real report write/readback remain open; they require an explicitly authorized isolated QA mutation window.
- Provider delivery is not part of media reporting and no provider was called.
- Manual assistive-technology review, production deployment, and human acceptance remain open.
