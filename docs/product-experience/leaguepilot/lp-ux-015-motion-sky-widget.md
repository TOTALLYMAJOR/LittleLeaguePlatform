# LP-UX-015 Motion Sky, Quieter Ticker, Weather Widget, Immediate Sign-in

Date: 2026-08-15

Status: `done-local-browser-verified`

Branch: `ux/lp-ux-001-family-shell`

Request: use Framer Motion for a cloud pattern like the live app's navigation panel; make the ticker less prominent, slower, full-screen, and fade rather than disappear; restyle the LeaguePilot weather card as a weather-channel widget with wind and rain-shower icons; and shorten the time before a user can actually click Sign in.

## 1. Framer Motion Sky (`components/landing-sky.tsx`)

`motion@12.42.2` was already a dependency but unused anywhere in the app; this is its first use (imported from `motion/react`). Three cloud layers drift continuously across the full hero at staggered speeds (96s / 132s / 158s) with negative delays so the sky is mid-motion on arrival rather than starting empty.

Tuned to match the signed-in navigation panel's `.sidebar-video-backdrop`: that layer runs a desaturated video at `opacity: .13` under `--bg`-tinted scrims. The sky mirrors it — Gaussian-blurred cloud shapes at `0.09` opacity light / `0.13` dark, tinted from `--gateway-ink`/`--text` — so it reads as atmosphere, not illustration, and never competes with the headline.

`useReducedMotion()` handles the reduced-motion case declaratively (clouds render in a resting position, no drift), replacing what would otherwise be a separate CSS override.

**The intro's own cloud layer was removed.** With the overlay transparent (LP-UX-013), the page's sky already shows through, so keeping `li-clouds` meant two cloud layers stacked. The orphaned `li-cloud-*` rules, keyframes, and the `li-cloud-soft` SVG filter went with it.

## 2. Ticker: Quieter, Slower, Full-Bleed, Settles

| | Before | After |
|---|---|---|
| Height | 32px | 26px |
| Surface | solid `#10151c` + shadow | `rgb(16 21 28 / 62%)` + `backdrop-filter: blur(4px)` |
| Headline type | 0.72rem / 800 / full-strength amber | 0.64rem / 700 / amber at 78% |
| ALERT chip | solid red, 0.68rem / 850 | red at 82%, 0.6rem / 800 |
| Scroll loop | 14s | 30s |
| End state | `opacity: 0` — disappeared | `opacity: 0.34` — settles to an ambient presence |

Width was already full-bleed; measured to confirm (1440 of 1440).

## 3. Weather-Channel Widget (`components/landing-weather-notification.tsx`)

Rebuilt from a plain notification into a weather-widget layout:

- **Conditions row** — rain-shower glyph (sun behind cloud with falling drops), `68°`, "Rain showers · Field 2", severity chip.
- **Metrics strip** — Wind 14 mph, Rain 80%, Lightning 9 mi, each with its own inline SVG icon.
- **Alert copy** — the existing headline and the unchanged drafts-for-review line ("Drafted for your review—nothing sent to families yet").

Still a server component with no client JS, still grounded in the real `WeatherAlert` contract (`severity` ∈ `watch|delay|cancel_risk`), and the honesty test continues to assert the copy never implies a message was sent.

## 4. Sign In Reachable Immediately

The overlay is now `pointer-events: none` (only Skip re-enables it), and any pointer or focus interaction with the page dismisses the intro. **Measured: Sign in clicked at ~1.5s reaches `/auth`** — previously the page was blocked until the intro finished at ~20.6s.

This deliberately reverses the `inert` focus containment added in LP-UX-011 (finding #2). That fix was correct *at the time*: the overlay was opaque, so page controls were invisible yet still focusable — a genuine trap. Now the overlay is transparent and the page is in plain view, so blocking it would itself be the accessibility problem. A regression test asserts `inert = true` does not return.

## Verification

- `npm test` — 119 files, 710 tests (new assertions: no interaction block, interaction-dismiss wired, clouds owned by the page not the overlay).
- `npm run typecheck`, eslint, `npm run build` — clean; confirmed `motion` bundles without error on its first use in the app.
- Browser (Playwright, dev server), `output/playwright/lp-ux-015-final/`:
  - Sign-in click at ~1.5s → `/auth`, overlay `pointer-events: none`, zero page errors.
  - 3 motion clouds mounted, transform confirmed changing between samples (actually drifting, not merely present).
  - Ticker 1440px wide, 26px tall, opacity 1 → 0.34 (settles rather than vanishing).
  - Weather widget captured light and dark; full-page shots after the intro in both themes; `video/intro-final-1280.webm`.

## Notes for Next Agent

1. `motion/react` is now in the client bundle for `/`. If bundle size on the landing becomes a concern, `motion/react-m` with a `LazyMotion` feature bundle is the lighter path.
2. Cloud drift durations are deliberately long (96–158s). Anything much faster stops reading as ambient and starts competing with the copy.
3. The weather widget's readings (68°, 14 mph, 80%, 9 mi) are illustrative constants, not live data — deliberate, since signed-out visitors have no team context. If it is ever wired to real data, keep the drafts-for-review line intact.
4. `data-intro="playing"` on `<html>` remains the hook for anything the page should hold back while the intro runs.
