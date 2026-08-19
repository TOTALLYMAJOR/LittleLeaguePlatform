# LP-UX-016 Clubhouse Landing Blend

Date: 2026-08-15

Status: `done-local-browser-verified`

Branch: `ux/lp-ux-001-family-shell`

Request: blend the supplied Little League HQ clubhouse reference into the LeaguePilot youth app without replacing the app's existing routes, privacy boundaries, or operational truth.

## Design Direction

The signed-out `/` gateway now borrows the reference's friendly clubhouse language while retaining LeaguePilot's existing content and real community game-day image:

- a floating rounded public header with compact pastel route pills;
- a sky-to-field canvas with a warmer, softer first impression;
- the existing rounded display face at a larger editorial scale;
- compact pastel privacy, volunteer, and offline assurances;
- a white-framed game-day image with the existing weather-review card layered over it;
- three rounded wayfinding cards for Schedule, Sponsors, and Account; and
- responsive light and dark treatments at desktop and 390px mobile widths.

New or revised interface symbols use the existing Lucide dependency. The current intro, game-day photo, theme choice, reduced-motion behavior, and long-form operational copy remain in place.

## Preserved Product Boundaries

This is a presentation-only public-gateway slice.

- `/schedule`, `/sponsors`, and `/auth` remain the destinations.
- A signed-in visitor still redirects through `getServerShellAccess()` to the server-confirmed role home.
- The weather values remain illustrative signed-out content, and the card still says it is a draft that has not been sent.
- No domain model, database schema, RLS policy, authenticated mutation, provider delivery, audit contract, or production configuration changed.
- Children still do not log in or receive exposed private roster, media, family, or team data.

## Task Safety Record

- Tenant context: organization-neutral signed-out gateway; signed-in redirect continues to use authenticated shell access.
- Tenant isolation: no tenant rows are loaded or written by this visual change.
- Actor authorization: public links remain public; protected destinations retain their existing guards.
- Lifecycle transitions: none.
- Config and ownership: root page and shared public-shell presentation only.
- Audit and failure behavior: no mutation or provider action exists to audit or retry.
- Idempotency: not applicable because the slice performs no write.

## Local Verification

- `npm run check:skills` passed.
- Focused ESLint passed for the four edited TSX files.
- Full `npm run lint` completed with zero errors and three warnings outside this slice.
- `npm run typecheck` passed.
- Focused route, weather honesty, and intro tests passed: 3 files, 32 tests.
- Full `npm test` passed: 129 files, 740 tests.
- `npm run build` passed, including the production compile, TypeScript phase, 104-page generation, and standalone asset copy.
- Browser checks at 1440x1000 and 390x844 found no horizontal overflow and no console errors in light or dark mode.
- Screenshots are retained under `output/playwright/lp-ux-016-clubhouse-blend/`.
- `git diff --check` passed.

These are local source, test, and browser-render checks only. No hosted deployment, provider behavior, production acceptance, or human usability acceptance is inferred.
