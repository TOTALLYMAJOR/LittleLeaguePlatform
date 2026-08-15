# LP-UX-010 Ambient Weather + Coach Notification Card

Date: 2026-08-15

Status: `done-local-browser-verified`

Branch: `ux/lp-ux-001-family-shell`

Request: add a tasteful weather pattern (a cloudy sky drifting across the screen) to the persistent landing page, plus a weather-app-style notification card showing what a coach would actually see in the app.

## What Shipped

Two additions to the **persistent** `/` landing page (distinct from the one-time LP-UX-007/009 intro overlay, which still plays separately on first visit):

1. **Ambient sky.** A low-opacity (5–7%) SVG cloud layer drifts slowly (58–92s loops, staggered) behind the hero copy, tied to `--gateway-ink`/`--text` so it's theme-aware. It's decorative only (`aria-hidden`), pure CSS `transform` animation (compositor-friendly, no layout cost), and freezes under `prefers-reduced-motion`. One cloud's edge softly overlaps the hero photo — reads as a cloud-shadow crossing the field, which fits the theme rather than looking like a bug.
2. **Coach weather notification card.** A native-notification-style card (app icon, "LeaguePilot · Weather · now", headline, detail, severity badge) floats over the hero photo, top-right on desktop. It's built from the product's real `WeatherAlert` vocabulary (`lib/domain/contracts.ts`: `headline`/`detail`/`severity` ∈ `watch|delay|cancel_risk`/`status`), not invented copy — a proof point, not a mockup that could mislead. Copy: *"Possible delay — Riverside Rockets / Lightning within 10 miles of Field 2. Drafted for your review—nothing sent to families yet."* The "drafted… nothing sent" language matches the drafts-for-review honesty standard established in LP-UX-006/008 — the landing page never implies the product auto-sends anything to families.

## Implementation Notes

- **Server component, zero client JS.** `components/landing-weather-notification.tsx` has no hooks or "use client" — it renders in the initial HTML, costs nothing on the client, and needs no hydration.
- **Bug caught by screenshot, not assumed away:** nesting the notification card inside `.landing-gateway-media` would have inherited that element's `opacity: 0.52` mobile treatment (media becomes a dimmed full-bleed background photo under 760px) and washed the card out. Moved it to be a sibling instead.
- **Second bug caught by screenshot:** the card and the hero H1 both anchor near the top of `.landing-gateway-hero` on mobile — with the card absolutely positioned, its box visually covered "Your season," (the H1's first line), leaving only "organized." visible. First fix attempt (`position: static; order: -1` to make it a flow item ahead of the copy) revealed a second, subtler collision: `.landing-gateway-actions` carries an explicit `grid-row: 2` from the base (all-breakpoint) rule, so auto-placement couldn't put the card in row 1 and the copy in row 2 as intended — the copy got bumped to an implicit row 3, rendering the H1 *after* the action cards instead of before. Reverted to keeping the card `position: absolute` (preserving the original clean 2-row grid: copy autoplaced row 1, actions explicit row 2) and instead gave `.landing-gateway-copy` a fixed `padding-top: 200px` on mobile, sized to the card's rendered height plus clearance. Verified clean at both 390px and 320px (the card wraps to an extra detail line at 320px; the fixed padding still clears it).
- Severity color tokens reuse the existing warning/danger/accent semantic pairs (light hardcoded hex to match the card's own light frosted-glass surface; dark theme swaps to `var(--warning)`/`var(--danger)`/`var(--accent-strong)` + their `-soft` backgrounds).

## Verification

- `npm test` — 118 files, 706 tests (3 new: SSR-renders with no client JS, drafts-for-review honesty copy present and never implies "sent" outside that phrase, severity badge uses a real `WeatherAlertSeverity` value).
- `npm run typecheck`, eslint, `npm run build` — clean.
- Browser (Playwright, dev server): `output/playwright/lp-ux-010-weather/` — light 1440, dark 1440, light 390, light 320, reduced-motion (asserted from computed styles: card `opacity:1` with no animation, cloud `animation-name:none` — i.e., reduced-motion never leaves the card stuck invisible, a real risk with entrance-animation patterns).

## Notes for Next Agent

1. The notification is a single static example (`severity: "delay"`), not wired to any live data — intentional for the landing page (signed-out visitors have no team context). If a rotating set of examples is wanted later, keep every variant's copy grounded in the real `WeatherAlertSeverity`/`WeatherAlertStatus` unions so the page never shows the product doing something it can't actually do.
2. `.landing-gateway-copy`'s mobile `padding-top: 200px` is coupled to the card's rendered height — if the card's copy or icon size changes meaningfully, re-check mobile clearance by screenshot rather than assuming the number still holds.
