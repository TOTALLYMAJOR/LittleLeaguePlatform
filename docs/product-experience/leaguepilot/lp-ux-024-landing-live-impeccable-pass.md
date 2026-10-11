# LP-UX-024: Landing live Impeccable pass

Date: 2026-10-10
Status: Implemented and verified locally; exact lockfile replay pending

## Purpose

Run a rendered, evidence-led quality pass on the signed-out homepage without changing its product direction, public routes, signed-in redirect, child-privacy defaults, or provider-send authority.

## Preserved direction

- The homepage remains a compact public gateway for Schedule, Sponsors, and Sign in.
- The community game-day photo remains the primary visual.
- The weather panel remains an illustrative, draft-only coach-review example. It does not claim live conditions or family delivery.
- Light and Dark themes, the manual theme control, the dedication, privacy assurances, and signed-in role routing remain unchanged.

## Corrections

- Removed the accidental parent surface behind the three action cards so card hierarchy is expressed by the cards themselves.
- Hid decorative connector arrows at the mobile breakpoint so the three weather-review steps occupy one stable three-column row.
- Restored white LP initials on the blue public brand mark in Dark mode after an older selector overrode the newer brand treatment.
- Restored a minimum 44px height for public navigation and theme controls at every viewport.

## Local verification

- Browser review covered 1440 by 900 and 390 by 844 in Light and Dark modes through the real theme control.
- Both viewports retained exact document/client width parity, one H1, and labeled public, get-started, and legal navigation.
- The final browser matrix reported zero console errors and zero page errors. Public-header Schedule, Sponsors when visible, Sign in, and theme controls measured at least 44px high.
- Focused Dark-mode axe checks reported no color-contrast or target-size violations.
- `npm test -- app/routes-smoke.test.ts components/landing-weather-notification.test.tsx`: 2 files and 25 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed with zero errors and three warnings outside this slice.
- `npm run build`: passed and generated all 109 static pages before the final on-demand route manifest.

## Proof boundary and remaining verification constraint

The repository-pinned Node 22.23.2 and npm 10.9.8 runtimes were used. The first clean dependency install stopped on an `ENOTEMPTY` cleanup error, so the successful local browser, lint, typecheck, test, and build runs used an in-place dependency tree resolving Next 16.4.0 while the unchanged package lock records Next 16.3.5. A fresh exact-lock `npm ci` replay remains the next local verification step. This document is source and local-browser evidence only; it is not hosted deployment or production acceptance.
