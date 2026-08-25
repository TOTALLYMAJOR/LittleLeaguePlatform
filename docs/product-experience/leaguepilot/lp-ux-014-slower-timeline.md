---
authority: evidence
answers: null
supersedes: []
superseded_by: null
reviewed: 2026-08-22
---
# LP-UX-014 Slower Timeline + Deferred Weather Card

Date: 2026-08-15

Status: `done-local-browser-verified`

Branch: `ux/lp-ux-001-family-shell`

Request: hold the landing page's weather notification card back until the intro finishes (raised as an open judgment call at the end of LP-UX-013), and slow the on-screen animation down.

## Deferred Weather Card

With the overlay transparent, the page's own weather notification card and the intro's rain-delay ticker were on screen simultaneously — two weather messages telling the same story.

The overlay now sets `data-intro="playing"` on `<html>` while it runs and deletes it on dismissal (including via Skip, Escape, and the fallback timer, since all paths share the same effect cleanup). CSS keys off it:

```css
html[data-intro="playing"] .landing-weather-card { opacity: 0; animation: none; }
```

Clearing `animation` and restoring it on attribute removal **restarts** the card's entrance, so it fades in properly after the intro instead of snapping to the animation's end state. Visitors who never see the intro (reduced motion, or already seen this session) are unaffected — the attribute is never set, and the card behaves exactly as before.

## Slower Timeline

Every beat scaled roughly 1.4×, with element durations lengthened too so things linger rather than just starting later. 48 timing declarations updated; total runtime **14.5s → ~20.6s** (measured: overlay self-dismisses at 20.7s).

| Beat | Before | After |
|---|---|---|
| Sport badges | 1.1s each, 0.42s stagger, done by 4.3s | 1.6s each, 0.6s stagger, done by 6.2s |
| Ticker | fades in 3.2s, 9s scroll loop | fades in 4.6s, 14s scroll loop |
| Cast + truck + phones | 8.0–9.5s | 11.2–13.2s |
| Schedule board + rows | 9.6–10.5s | 13.4–14.6s |
| Mascot flip | 10.65–11.6s, 0.22s per badge | 15.0–16.4s, 0.32s per badge |
| Colour flood + sun | 11.7s, 2.2s duration | 16.4s, 2.8s duration |
| Overlay exit | 13.9s | 19.4s |
| Cloud drift loops | 8/9/11s | 12/14/17s |

`INTRO_MS` (the fallback timer for suspended animations, e.g. a backgrounded tab) moved 14.5s → 20s, keeping its ~4s margin over the CSS exit.

## Verification

- `npm test` — 119 files, 709 tests. `npm run typecheck`, eslint, `npm run build` — clean.
- Browser (Playwright, dev server), `output/playwright/lp-ux-014-slower/`:
  - Card gating asserted from computed styles: during intro `opacity: 0` with `data-intro="playing"`; after dismissal the attribute is `undefined` and the card reaches `opacity: 1` once its 1.4s delay elapses.
  - Overlay self-dismiss measured at **20.7s**, matching the intended 19.4s exit + 0.6s fade + 0.6s unmount — confirming the retimed exit path still fires rather than falling through to the timer.
  - Five beat screenshots at the new times, plus `video/intro-slower-1280.webm` recording the full run through to the card fading in afterwards.
- The retiming was applied by exact-string substitution with a uniqueness assertion per declaration, so a stale or duplicated value would have failed loudly rather than being silently skipped.

## Notes for Next Agent

1. Timeline values live in two places that must move together: the CSS delays in `globals.css` and `INTRO_MS` in `landing-intro-overlay.tsx`. The fallback timer should stay comfortably *after* the CSS exit, or it will cut the animation short.
2. `data-intro` on `<html>` is the general hook for "the intro is running" — any other page element that should hold back during the intro can key off it rather than adding new coordination.
3. Screenshot timings in the capture scripts are now tuned to the ~20s timeline; earlier scripts using the 14.5s beats will sample the wrong moments.
