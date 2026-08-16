# LP-UX-012 Intro v3 — One Continuous Transition

Date: 2026-08-15

Status: `done-local-browser-verified`

Branch: `ux/lp-ux-001-family-shell`

Request: remove the opening stick-figure animation so the whole load screen reads as one transition; keep the comic-book mascot flip; replace the moody photo interludes with ~8 small, cheery sport images that fade in and out; keep the weather but add a Nasdaq-style banner announcing a rain postponement; make the clouds float across the top and stay visible in light and dark; and make the whole thing look less like a cartoon drawing. Later in the same pass: move the ticker to the very top, and remove the rain and the flat white intro backdrop.

## What Changed

| Before (v2) | After (v3) |
|---|---|
| 5 teams of stick-figure runners scattering in "joyful disorder" (~6.6s of screen time) | Removed entirely. Eight small, cheery sport badges (soccer, basketball, baseball, football, track, swimming, volleyball, tennis) pop in and fade out in sequence — full color against the still-gray field |
| Two full-bleed letterboxed grayscale photos with Ken Burns pans (~5s) | Removed, along with both `next/image` imports — the overlay is now pure inline SVG + CSS with **zero image requests** |
| Falling rain lines across the sky | Removed. The postponement is now told by the ticker instead of illustrated |
| Flat white/`#f2f6ef` sky | Soft vertical gradient (`#dfe6ea` → `#f2f6ef`) so the backdrop has depth instead of reading as blank paper |
| Clouds bobbing left-right mid-scene, tinted by theme tokens | Larger 3-lobe soft clouds with a Gaussian-blur filter, floating along the top edge, moved **outside** `li-world` with a fixed light fill so they read identically in light and dark |
| Stick-figure adults (circle head + line limbs) and hard-cornered truck | Rounded head-and-shoulders person marks and a soft-radius truck — modern iconography rather than a sketch |
| 18s runtime | 14.5s, with beats overlapping rather than cutting — the ask for "one transition" |
| — | **New:** Nasdaq/news-chyron ticker pinned to the top of the scene: a red `● ALERT` chip plus a seamlessly looping scroll of `GAME POSTPONED — RAIN` / `ROCKETS VS COMETS MOVED TO NEXT SATURDAY` / `FAMILIES NOTIFIED VIA LEAGUEPILOT` / `COACH APPROVED THE CALL` |

Kept unchanged: the Pearl River dedication, the mascot flip finale and LP shield, the schedule board, the phones-light-up beat, Skip/Escape/replay, the session-once guard, and the reduced-motion opt-out.

## Bugs Found and Fixed During the Pass (all caught by reading screenshots, not by tests)

1. **All eight sport badges collapsed onto the SVG origin.** Each badge carried a `transform` *attribute* for positioning while CSS animated `transform` on the same element — the CSS value replaces the attribute rather than composing with it, so every badge animated from the top-left corner. This is the exact pitfall the LP-UX-007 code comment warned about for the old chaos figures. Fixed by splitting each badge into an outer attribute-positioned `<g>` and an inner CSS-animated `<g>`; the rule is now enforced by comment at both sites.
2. **Ticker overlapped the caption line.** `.li-ticker` used `bottom: 9%` while its nearest positioned ancestor was the full-viewport fixed overlay (header + scene + captions), so the percentage resolved against the wrong box. Fixed by introducing `.li-stage`, a `position: relative` wrapper around just the scene row, which is now the containing block for both the ticker and the pre-existing mascot layer. (Verified numerically: ticker bottom 780px vs captions top 848px.) The later "move it to the top" request then became a one-line `top: 0`.
3. **Scrolling ticker text bled through the red ALERT chip.** The track's `translateX` slid its content under the chip, and with both as plain flex children the later-painted track won. Fixed by giving the chip `position: relative; z-index: 1`.

## Verification

- `npm test` — 119 files, 708 tests. Overlay test updated to assert the new structure and to *negatively* assert the removals (`li-chaos`, `li-cinema`, `li-rain`, `next/image` all absent), so a future regression re-adding them fails CI.
- `npm run typecheck`, eslint, `npm run build` — clean.
- Browser (Playwright, dev server), `output/playwright/lp-ux-012-intro-v3/`: light 1440 across all six beats, dark 1440, mobile 390, plus a 3× zoom of the ticker chip confirming the bleed-through fix and a geometry assertion confirming the ticker sits flush at the top of the stage.
- One test flake (`feature-panels.test.tsx` 5s timeout) occurred while the dev server was competing for CPU; it passes in isolation and in a clean full run — not related to this change.

## Notes for Next Agent

1. The overlay now loads **no images at all** — if a future beat wants photography, weigh that against the current zero-request cost.
2. `.li-stage` is the containing block for any future absolutely-positioned overlay layer inside the scene; don't anchor new layers to `.landing-intro` directly or percentage offsets will resolve against the whole viewport again.
3. Sport badge glyphs are hand-authored paths in `JOY_SPORTS` + `JoySportGlyph`. Adding a ninth sport needs a matching `.li-joy-badge-9` delay rule in `globals.css`; the test asserts the count is exactly 8, so update it deliberately.
4. Timeline delays are hardcoded across both the component (`INTRO_MS`) and the CSS keyframe delays. Any retiming needs both.
