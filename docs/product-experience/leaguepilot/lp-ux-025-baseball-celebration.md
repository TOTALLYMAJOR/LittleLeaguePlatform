# LP-UX-025: Baseball celebration motion

Date: 2026-10-10
Status: Implemented and verified locally

## Purpose

Add a quick moment of game-day joy before the signed-out landing page becomes visible without reviving the former long-form intro, replay control, or any unverified product story.

## Owner direction

Animate a baseball being hit before the page renders visually, then have its exit become a group of cheering silhouettes.

## Implemented interpretation

- The sequence owns the first visible paint through a short, opaque opening curtain. The landing page loads underneath and is revealed only after the curtain exits.
- A batter swings, the ball follows a short arc, and four filled cheering community silhouettes rise at the ball's exit point.
- The cheering group holds briefly, then the whole curtain dissolves to reveal the landing page. The animation does not loop and has no skip or replay control.
- The illustration is decorative and excluded from the accessibility tree. The curtain is omitted when reduced motion is requested.
- The overlay is present in the server response to prevent a page-before-animation flash. A small client lifecycle releases the page on animation completion, with a fallback timer and CSS-only no-JavaScript release behavior.
- The header, hero, and public footer are inert while the opaque curtain is active, then restored when it exits.

## Preserved boundaries

- The community game-day photo remains the primary visual.
- Schedule, Sponsors, Sign in, signed-in role routing, theme behavior, copy, and action hierarchy are unchanged.
- The weather panel remains an illustrative draft-only coach-review example and makes no provider-delivery claim.
- No child identity, profile, account, or private team data is introduced.

## Local verification

- `npm test -- app/routes-smoke.test.ts components/landing-celebration.test.tsx components/landing-weather-notification.test.tsx`: 3 files and 28 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed with zero errors and three pre-existing warnings outside this slice.
- `npm run build`: passed under Next 16.4.0 and generated all 109 static pages before the final on-demand route manifest.
- Deterministic Playwright frames covered swing, ball flight, and cheering payoff in desktop and mobile Light, plus the cheering state in desktop and mobile Dark.
- The standalone production build verified that the curtain covers the full viewport above the public header, owns pointer hit-testing, locks scroll, and keeps the header, hero, and footer inert while active at both 1440px and 390px. It reported no horizontal overflow, console errors, or page errors.
- Unpaused desktop Light and mobile Dark runs removed the curtain, cleared the lifecycle marker, restored scrolling and the covered surfaces, and exposed the visible landing-page heading after roughly 3.2 seconds measured from navigation start.
- A 390px reduced-motion context rendered the curtain as `display: none`, removed it during hydration, and left the page immediately available without overflow or browser errors.
- A JavaScript-disabled 390px context began with the curtain visible and pointer-blocking, then reached the CSS-only release state with hidden visibility, zero opacity, and no pointer interception.

## Proof boundary

This is local source, build, and standalone-browser evidence only. It is not hosted deployment or production acceptance. As recorded in LP-UX-024, the in-place dependency tree resolves Next 16.4.0 while the current package lock records Next 16.3.5; a fresh exact-lock replay remains pending.
