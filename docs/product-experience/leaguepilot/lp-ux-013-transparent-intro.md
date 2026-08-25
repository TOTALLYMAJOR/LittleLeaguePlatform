---
authority: evidence
answers: null
supersedes: []
superseded_by: null
reviewed: 2026-08-22
---
# LP-UX-013 Transparent Intro Overlay

Date: 2026-08-15

Status: `done-local-browser-verified`

Branch: `ux/lp-ux-001-family-shell`

Request: "I thought I asked to remove that white intro. Could we make it invisible and overlay it on top of the landing page background."

Clarifies LP-UX-012, where "remove the white intro" was mistakenly read as the flat sky *inside* the SVG scene. The actual ask was the overlay's own opaque backdrop — the panel that hid the landing page while the animation played.

## What Changed

- **`.landing-intro` background is now `transparent`** (both themes). The live landing page — hero photo, headline, chips, action cards — is visible for the entire intro, and the animation dissolves into it instead of cutting to it.
- **Removed the SVG's backdrop rects**: the full-bleed sky gradient, the green field, the halfway line, and the centre circle, plus the now-unused `li-sky-gradient` def. What remains in `li-world` is only the cast, truck, board, and sun, which still start grayscale and resolve to colour at the finale — so the gray→colour device survives, now reading as the animation resolving into the already-colourful page.
- **Removed the overlay's own header** (`.landing-intro-top`, kicker, dedication). The page behind already renders the LeaguePilot brand and the Pearl River dedication line; repeating them doubled the text on screen. The orphaned `li-kicker-color` / `-dark` keyframes and the dark-theme rules for those elements were deleted with it.
- **`padding-top: 72px`** (64px on phones) on the overlay so the stage — and therefore the ticker — begins *below* the live public header, making the ticker read as a banner tucked under the site nav rather than something covering it.
- **Skip is now a floating solid pill** rather than a header button, and **captions sit in translucent dark pills**. Both carry their own surfaces, so they stay legible over cream, over the photo, or over the orange Account card, in either theme — which also let all the per-theme colour overrides for them be deleted.

## Layout Collisions Found and Fixed (all caught by reading screenshots)

1. **Doubled brand and dedication** — the overlay header sat directly on top of the page's real header, and Skip landed on the theme toggle. Fixed by deleting the overlay header entirely.
2. **Captions covered the action cards.** The caption `<p>` is absolutely positioned inside a zero-height container; with no `bottom`, it anchored at the container's top and grew *downward* onto the cards. A geometry check measuring the container looked fine while the visible pill did not — a good reminder to measure the painted element. Fixed with `bottom: 0` so a two-line caption grows upward into empty space. Verified on `.li-cap-3` itself: pill bottom 720px vs cards top 741px.
3. **Skip overlapped the page's own "Replay intro" link** in the bottom-right corner. Moved to the same baseline as the captions, in the clear band above the cards.
4. **Phone layout had no such clear band** — caption and Skip both landed on the headline and on each other. Given a `@media (max-width: 640px)` stack instead: caption at `bottom: 76px`, Skip at `bottom: 18px`. Verified non-overlapping (caption ends 768px, Skip starts 790px).

## Verification

- `npm test` — 119 files, 709 tests. The dedication assertion moved from the overlay to `app/page.tsx`, and now *also* asserts the overlay does **not** contain it, so a future regression that re-adds the duplicate fails CI.
- `npm run typecheck`, eslint, `npm run build` — clean.
- Browser (Playwright, dev server), `output/playwright/lp-ux-013-transparent/`: light 1440 across five beats, dark 1440, mobile 390, plus a recorded `video/intro-transparent-1280.webm` of the full run. Geometry assertions for caption/card/Skip clearance at both desktop and phone widths.
- Two test flakes (`feature-panels.test.tsx`, and once the suite total) occurred on the first run immediately after killing the dev server; both pass on clean re-runs. Not related to this change.

## Notes for Next Agent

1. The overlay is now purely additive — it contributes animation layers and two controls, nothing that duplicates page content. Keep it that way: anything the landing page already renders should not be repeated in the overlay.
2. `padding-top: 72px` is coupled to the public header's height. If that header's height changes, this and the mobile `64px` need to change with it.
3. The caption and Skip bottom offsets (`clamp(150px, 20vh, 210px)`) are tuned to clear `.landing-gateway-actions`. If the action cards' height changes materially, re-check with a real bounding-box measurement of the painted pill — not the zero-height container.
