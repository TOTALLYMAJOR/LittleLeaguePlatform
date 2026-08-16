# LP-UX-009 Cinematic Intro v2

Date: 2026-08-14

Status: `done-local-browser-verified`

Branch: `ux/lp-ux-001-family-shell`

Request: add weather patterns, cinematic photo moments of parents (packing the car, watching the game), and a Marvel-style rapid mascot flip to the LP-UX-007 intro overlay.

## The 18-second timeline (was 13.5s)

| Time | Beat |
|---|---|
| 0–6.6s | Five teams in gray disorder under drifting clouds ("The joy is easy…") |
| 6.4–14.1s | Rain falls across the emptied field ("The work is not. Nobody gets paid…") |
| 8.2–10.8s | **Cinema beat 1:** full-bleed letterboxed grayscale photo — parent at the field at dawn, car and gear in frame, slow push-in ("Every Saturday starts in a parking lot, rain or shine.") |
| 10.6–13.2s | **Cinema beat 2:** letterboxed overhead of a game in progress, slow pull-back |
| 12–14.1s | Order arrives: adults, phones light up (first color), truck, schedule board ("Communication is the key…") |
| 14.2–15.2s | **Mascot flip:** eight team badges flicker at ~8 fps with white flash cuts, landing on the LP shield |
| 15–17.2s | Color floods the world; the sun breaks through behind the clouds; rain gone |
| 17.4–18s | Overlay fades out on `animationend`, revealing the landing page |

## Implementation Notes

- **Photos are the repo's own licensed assets** (`leaguepilot-game-day-parent.png`, `leaguepilot-baseball-field-overhead.webp`) rather than downloaded stock — licensing certainty, zero external requests, and the parent photo already contains car + gear + phone + field. Rendered via `next/image` with blur placeholders; grayscale + letterbox + Ken Burns pans are pure CSS.
- **Weather:** cloud ellipse clusters on drifting wrapper groups; rain is 22 SVG lines distributed across the full canvas (`(i*129)%1140`, `(i*197)%740`) on a 0.7s translateY loop inside a fade wrapper — lines carry no transform attributes, wrappers do the animating (the LP-UX-007 rule). The sun is drawn *before* the clouds in DOM order so it rises behind them at 15.2s.
- **Mascot flip:** eight inline-SVG badges (team colors + white glyphs: star, bolt, paw, wing, flame, wave, wolf-den, crescent) absolutely centered, each shown for 0.12s by a no-fill `opacity` keyframe (auto-hides after its frame); the LP shield holds with a scale-settle; a `::after` white flash flickers through nine spikes. Badges sit outside `.li-world`, so they flash in full color against the still-gray scene.
- Captions gained beat 4; the parking-lot caption renders light with a text shadow since it sits over the photo.
- `INTRO_MS` fallback moved to 18s (+4s grace); exit remains `animationend`-driven. Skip/Escape/replay/reduced-motion paths unchanged from LP-UX-007/008.

## Verification

- `npm test` — 118 files, 703 tests (overlay test extended to pin rain/clouds/sun/cinema/mascots/photo imports and the new caption). One transient failure occurred when the dev server was killed mid-suite; two subsequent full runs clean.
- `npm run typecheck`, eslint, `npm run build` — clean.
- Browser frames in `output/playwright/lp-ux-009-intro-v2/`: chaos+clouds, full-sky rain over the void, both letterboxed photo beats, order+phones, a mid-flip mascot badge frame, and the finale (sun behind cloud, LP shield, colored board). Iterated twice from screenshots: rain initially clustered at the canvas top (distribution fix), and the sun initially collided with the schedule board (relocated to rise behind the clouds).
- Dev-mode capture caveat from LP-UX-007 still applies (use `localhost`, expect timing skew; production is smoother).

## Notes for Next Agent

1. The overlay now weighs ~5KB more JSX + the two photos load during the intro (blur-up, optimized by `next/image`). If Lighthouse on production flags the photo fetches, they can be downgraded to `quality={60}`.
2. Possible polish: thunder-flash during the rain beat (one 80ms white flicker), and a real 1200×630 OG image reusing the finale tableau (carried over from lp-ux-008 notes).
3. Mascot badges are generic by design (no team names) — if real league mascots land in `/admin/branding`, the flip could read them from theme data someday.
