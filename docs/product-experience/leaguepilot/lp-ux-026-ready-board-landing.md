# LP-UX-026: Ready Board landing composition

Date: 2026-10-10
Status: Accepted in Impeccable Live and verified locally

## Purpose

Refine the signed-out landing page live without changing the product truth established by the clubhouse direction: a welcoming community surface that lets families, volunteers, and league staff find the next useful action immediately.

## Accepted live direction

- The user selected “The Organized Clubhouse” as the north star and “Tactile and friendly” as the component character.
- Impeccable Live generated three builds of the same theme across the full `.landing-gateway` surface.
- Variant 3, “Ready Board,” was accepted with `density: comfortable` and `action-presence: 0.6`.
- The accepted source has no variant wrappers, carbonize rules, parameter comments, or preview data attributes.

## Implemented composition

- Desktop uses an operational two-column board: the headline stays on the left, the enlarged community/weather proof owns the wider right column, and the game-day status joins Schedule, Sponsors, and Account in the cloud band below.
- Mobile collapses the board into a single readable flow. The game-day image and draft-only weather example stack instead of splitting into cramped half-width columns.
- The Pearl River administrator and volunteer dedication remains permanently visible above the headline.
- Three assurance chips preserve the child-account, volunteer-league, and offline-schedule boundaries and align to the hero section's lower edge.
- The accepted compact three-action rail and game-day status now share one lower cloud-band control group immediately above the public legal footer; the headline, visual proof, and assurances remain above it in reading order.
- Two low-opacity cloud layers drift left to right behind that rail without intercepting pointer input.
- Reduced-motion rendering keeps identical server/client markup, disables and hides the decorative cloud layer through CSS, and leaves the action rail visible and usable.

## Preserved boundaries

- `/schedule`, `/sponsors`, and `/auth` remain the three signed-out destinations; signed-in `/` visits still resolve to the existing role home.
- The weather card remains a static example labeled for review, and it still states that nothing has been sent to families.
- Children do not receive accounts, no private player data is added, and no provider send or access grant occurs.
- The one-shot LP-UX-025 baseball celebration remains the opening curtain before the page becomes visible.

## Local verification

- Impeccable Live completion: event `74bd5cf3`, all three variants arrived, Variant 3 accepted, parameters persisted, and the completion phase returned `completed`.
- Follow-up Impeccable event `e6bf1191` delivered three action-area builds; Compact Cloud Rail (Variant 3) was accepted, then steer event `09ce245d` moved that rail into the same band as the decorative clouds.
- `npm test -- app/routes-smoke.test.ts components/landing-celebration.test.tsx components/landing-weather-notification.test.tsx`: 3 files and 28 tests passed.
- `npm run typecheck`: passed.
- Playwright proof covered desktop Light at 1440×1100, mobile Dark at 390×844, and reduced-motion mobile Light at 390×844.
- All three cases reported no horizontal overflow, exactly one `#landing-title`, no Impeccable preview markers, the game-day status and all three actions inside the cloud zone, assurances aligned to the hero bottom, and action-card heights at or above the accepted compact-rail 84px floor.
- Desktop proof measured the enlarged visual at 819px versus the 481px copy column.
- Normal-motion cases rendered two cloud layers behind the action rail in their shared parent zone and observed the cloud transforms changing. Reduced motion retained the same two decorative child nodes inside a `display: none` cloud layer, kept the action rail visible, and emitted no browser error.
- Evidence: `output/playwright/lp-ux-026-ready-board/desktop-light.png`, `mobile-dark.png`, `mobile-reduced.png`, and `proof.json`.

## Proof boundary and live-mode state

This is local source, dev-server, focused-test, typecheck, and headless-browser evidence only. It is not hosted deployment or production acceptance. The development-only Impeccable Live script injection remains in `app/layout.tsx` while the live editing session is active and must be removed when Live mode is explicitly exited.
