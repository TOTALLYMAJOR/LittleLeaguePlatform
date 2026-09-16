# LP-UX-022: Homepage layout refinement

Date: 2026-09-16
Status: Implemented and verified locally

## Scope

Refine the signed-out homepage composition without changing public routes, signed-in redirects, child privacy defaults, or provider-send authority. The primary defects were the weather card obscuring the community photo and the animated intro adding a competing scrolling alert story.

## Changes

- Removed the one-time intro overlay, scrolling alert ticker, and replay control from `/`.
- Grouped the community photo and weather example into one game-day panel. The weather content now follows the image in normal flow at desktop and mobile widths instead of floating over it.
- Replaced fake precision such as temperature, wind, rain, and lightning-distance readings with a compact three-step review flow: weather check, coach review, family alert.
- Kept the weather state explicitly illustrative and draft-only. It says `Example`, `Drafted for your review`, and `Nothing sent to families yet`.
- Tightened the mobile header and trust-point layout so Schedule, Sign in, and theme controls remain available without a tall stacked navigation block.
- Preserved the public Schedule, Sponsors, and Sign in destinations, the signed-in role redirect, the community image, and the manual Light/Dark theme.

## Truth boundaries

- The homepage does not claim current provider weather, a completed coach decision, or family notification delivery.
- The example does not write data, send a message, grant access, or change schedule authority.
- Children still do not create accounts, and the page does not expose private team or child data.
- This is source and local browser proof only. It is not hosted deployment or production acceptance evidence.

## Local verification

- Browser review at 1280 by 720, 1024 by 768, 768 by 900, and 390 by 844 in Light mode.
- Full-page browser review at 390 by 844 in Dark mode.
- Accessibility snapshot preserved one H1, labeled navigation, a labeled weather-review list, and the existing legal footer.
- Browser console: 0 errors and 0 warnings.
- `npm test -- app/routes-smoke.test.ts components/landing-weather-notification.test.tsx`: 25 passed.
- `npm test`: 141 files and 856 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed with 0 errors and three warnings outside this slice.
- `npm run build`: passed after rerunning outside the restricted sandbox so Next.js could spawn its TypeScript subprocess.
