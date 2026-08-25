---
authority: evidence
answers: null
supersedes: []
superseded_by: null
reviewed: 2026-08-22
---
# LP-UX-008 Landing Enhancements

Date: 2026-08-14

Status: `done-local-browser-verified`

Branch: `ux/lp-ux-001-family-shell`

Request: add the "Replay intro" affordance from LP-UX-007 and deliver five next-level enhancements to the landing page.

## Replay Intro (requested)

Quiet dotted-underline button bottom-right of the gateway (`components/replay-intro-button.tsx`). Dispatches `leaguepilot:intro-replay`; the overlay listens, clears the session guard, resets, and replays. Hidden under `prefers-reduced-motion` (CSS) and the handler re-checks the media query. Browser-verified: replay remounts the overlay even after Skip set the session guard.

## The Five Enhancements

1. **Blur-up hero (LQIP).** The hero photo moved to a static import with `placeholder="blur"` — Next generates the inline blur placeholder at build time, so the hero paints instantly as a soft preview and sharpens when the full image arrives. Verified: `srcset` + blur present in served HTML.
2. **SEO/social layer.** Page-level `metadata` export: canonical `https://leaguepilot.us`, OpenGraph + Twitter `summary_large_image` cards using the hero photo, description carrying the Pearl River dedication; plus server-rendered JSON-LD (`SportsOrganization`). Links shared to Slack/iMessage/X now unfurl with the field photo and the real value proposition.
3. **Live game-day chip.** Server-computed next-Saturday date ("Next game day: Saturday, August 15 · See the public schedule →", or "Game day is today"), pulsing dot (static under reduced motion), links to `/schedule`. Pure date math — no data dependency, fresh per request (`force-dynamic` was already set).
4. **Assurance chips.** The intro's hard-reality story is now permanent on the page as three icon chips: "Private by default. Children do not create accounts." / "Built for volunteers—nobody here gets paid." / "Field-ready. Schedules keep working offline on game day." Inline SVG icons, gateway-token colors, correct in both themes.
5. **Action-card affordances + recorded-defect fix.** Arrow slides in on card hover/focus (CSS-only, always-visible under reduced motion), explicit `:focus-visible` ring, and the doc-pinned `.landing-gateway-action.is-primary small` 3.85:1 contrast defect (01/08, deferred through lp-ux-005) is fixed: `#263b4d` → `#142f47` on the orange card (~4.7:1).

Note: a "dark gateway" enhancement was considered and **skipped as already shipped** — lp-ux-005 (Codex) delivered the full selected-dark gateway layer; these enhancements were verified against it.

## Verification

- `npm test` — 701 tests pass (routes-smoke gateway pins all preserved: the static import path still contains `/images/leaguepilot-community-game-day-hero.png`).
- `npm run typecheck`, eslint, `npm run build` — clean.
- Browser (dev server, Playwright): light/dark 1440 + light 390 screenshots in `output/playwright/lp-ux-008-enhancements/`; replay-click remounts overlay; `data-theme="dark"` applies with header, chips, and cards adapting; OG/Twitter/JSON-LD/blur asserted from served DOM. Game-day chip correctly computed "Saturday, August 15" on 2026-08-14.
- Transient dev-only artifact: a dark-reload screenshot taken <1s after reload can miss the header mid-hydration; re-shot after a longer settle shows it correctly. Not a product bug.

## Notes for Next Agent

- `metadataBase` is not set in `app/layout.tsx`; page metadata uses absolute `https://leaguepilot.us` URLs directly. If more pages need OG cards, add `metadataBase` at the layout level instead of repeating absolutes.
- The OG image reuses the hero photo; a purpose-built 1200×630 OG frame (headline + dedication over the photo) would be a worthwhile follow-up.
- Landing pins in `app/routes-smoke.test.ts` were deliberately left unchanged; new features are covered by the overlay test and browser proofs.
