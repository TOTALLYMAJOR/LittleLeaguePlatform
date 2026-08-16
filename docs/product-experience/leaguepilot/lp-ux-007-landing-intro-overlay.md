# LP-UX-007 Landing Intro Overlay

Date: 2026-08-04

Status: `done-local-browser-verified`

Branch: `ux/lp-ux-001-family-shell`

Request: a fast-loading landing experience for leaguepilot.us that captures both the joy of kids playing and the hard reality (nobody gets paid; without technology it is a lot of work; communication is the key), rendered as an overlay on top of the app, dedicated to the Pearl River youth sport administrators and volunteers.

## What Shipped

A once-per-session cinematic overlay on the public `/` landing:

1. **Chaos (gray):** five teams of kids — different sports (soccer ball, basketball, bat, kick line, track lane) — fade in and out running in disorder on a gray field. Caption: "The joy is easy. Five teams of it, every Saturday."
2. **The void (gray):** the field empties. Caption: "The work is not. Nobody gets paid, and the season does not run itself."
3. **Order arrives:** coach, parent, sponsor, and league admin appear holding phones — the phone screens light up as **the first color on screen** ("Communication is the key to all of it"), a gear truck pulls in, and a Saturday Schedule board fills with team names, times, and team-color chips.
4. **Color floods** the whole world (CSS `grayscale(1) → 0` on the scene group), then the overlay fades out on `animationend`, revealing the already-painted landing page whose headline — "Your season, organized." — is the payoff line.

"Built in honor of Pearl River Youth Sport Administrators and Volunteers" appears at the top of the overlay throughout, and permanently on the landing hero above the headline.

## Performance Techniques (the "loads quickly" contract)

- Zero images and zero video: the entire scene is inline SVG (symbol reuse via `<use>`), so the overlay adds no network requests.
- Zero animation JavaScript: the whole timeline is CSS keyframes animating only `transform`, `opacity`, and `filter` (compositor-friendly). Client JS (~2KB) exists only for: session replay guard, Skip button, Escape key, reduced-motion opt-out, and `animationend`-driven dismissal.
- Server-rendered page beneath: the overlay returns `null` on the server, so the landing HTML paints identically with or without it; dismissal reveals content with no layout shift.
- `prefers-reduced-motion: reduce` users never see the overlay (JS gate + CSS `display:none` backstop).
- Once per session via `sessionStorage["leaguepilot-intro-seen:v1"]`; Skip and Escape mark it seen.

## Implementation Notes

- `components/landing-intro-overlay.tsx` — client component; SVG scene; captions; sr-only narrative for screen readers; schedule board names follow the child-privacy rule (adult coach names, first name + last initial; never players).
- `app/globals.css` §"Landing intro overlay" — full timeline. Two hard-won rules: (1) never CSS-animate `transform` on SVG elements that carry positioning `transform` attributes (animate their class-only parent groups instead); (2) per-element `animation-delay` classes must not be lower-specificity than a shared `animation` shorthand selector, or the delays silently reset to 0 (the adults-visible-during-chaos bug).
- `app/page.tsx` — mounts the overlay; permanent `.landing-gateway-dedication` line.
- Exit is `animationend`-driven (name `li-overlay-out`) with a generous wall-clock fallback, so slow devices never cut the color flood short.

## Verification

- `npm test` — 118 files, 701 tests (includes new `components/landing-intro-overlay.test.tsx`: SSR-empty render, dedication/guards pinned, privacy-safe board names).
- `npm run typecheck`, `eslint` — clean. `npm run build` — compiles, 104 static jobs.
- Browser (Playwright, dev server): timeline frames at chaos / void / order-phones / color-flood / landing-revealed (desktop 1440) + mobile 390 in `output/playwright/lp-ux-007-intro/`; Skip detaches the overlay and reload does not replay; fresh contexts replay; `reducedMotion: reduce` never mounts it.

## Deferred / Notes for Next Agent

1. Screenshots came from `next dev` (Turbopack) — a production-mode visual pass on the deployed leaguepilot.us would confirm timing without dev jank. Dev-tools badge appears in dev screenshots only.
2. The overlay plays for signed-out visitors on `/` only (signed-in users redirect to role homes per LP-UX-003 and never see it).
3. Possible polish: a "Replay intro" link in the landing footer; subtle audio is deliberately out of scope.
4. When driving this app with Playwright against `next dev`, use `http://localhost:<port>` — Next 16 blocks `/_next` dev resources for `127.0.0.1`, which silently prevents hydration (overlay never mounts).
