---
name: leaguepilot-interaction-motion-mobile
description: Apply LeaguePilot's interaction, motion, and mobile contract when building or reviewing any parent, coach, admin, or public UI — touch targets, motion rules, reduced-motion, responsive widths, focus, forced-colors, and mobile-first states. Use for any change to layout, animation, gestures, viewport behavior, or interactive states, and when checking whether a screen works one-handed at a field.
---

# LeaguePilot Interaction, Motion, and Mobile

This repo's users operate phones one-handed, outdoors, minutes before leaving.
Every interaction rule below exists in the codebase or the recorded design
system (`docs/product-experience/leaguepilot/04-production-design-system.md`)
and several are enforced by committed tests — follow them, don't restate them.

## Touch and interaction

- Hit targets: **44px minimum**; **48px** for the consequential actions
  (answer/RSVP, accept, acknowledge). Enforced for Family surfaces by
  `components/family/family-acceptance-contract.test.tsx` — extend that test
  when adding Family controls, don't sidestep it.
- One primary action per viewport region; segmented controls for the RSVP
  grammar; destructive confirms live in sheets, never bare buttons.
- Focus: one ring — `outline: 2px solid var(--accent); outline-offset: 2px` on
  every interactive element, inputs included. No bespoke shadows.
- Hover is an enhancement, never the only affordance — every hover state has a
  visible resting state on touch.
- Status is never color alone: tone + icon + label (the `StatusChip` grammar).

## Motion

- Animate **transform and opacity only**, 120–180ms, `var(--ease)`. No
  layout-property animation (width/height/top) in operational UI.
- Every animation respects reduced motion. The shipped pattern is
  `useReducedMotion()` from `motion/react` rendering a resting state
  (`components/landing-sky.tsx`) — reuse it; the global CSS kill-switch is the
  backstop, not the design.
- Motion communicates state change (an item clearing, a sheet opening). Never
  decorative loops in signed-in surfaces; ambient motion is a public-landing
  concession only.
- `motion@12` is already a dependency (imported from `motion/react`). Do not
  add another animation library.

## Mobile-first

- Author at 390px first; verify at 320, 390, 768, 1440 (the repo's proof
  widths). No document-level horizontal overflow at any of them — wide content
  scrolls inside its own `overflow-x: auto` container.
- Content widths: overview surfaces `min(100%, 1152px)`, reading/task surfaces
  `min(100%, 820px)`, sheets 560px.
- Type floor: 16px body (17px critical body); nothing rendered below 12px.
  Tabular numerals (`font-variant-numeric: tabular-nums`) on times and counts.
- Primary actions sit thumb-reachable (bottom-anchored on mobile sheets).
- No fake device chrome ever — no painted status bars or keyboards.
- PWA: the app shell must stay useful offline for reads, with an honest
  freshness line; writes disabled offline with plain copy, never silently
  queued unless the offline outbox gate is on.

## States that must exist before a surface ships

Loading, empty (says what will appear and who makes it appear), error
(per-lane degradation, never silently green), permission-denied (named reason
and next step), stale (source + version line), and — where relevant — conflict
(409 copy) and offline. Dark mode only via the token system; forced-colors
blocks extend to new components.

## Verification

- `npm run qa:contrast-proof` and `npm run qa:manual-theme-proof` are the
  recorded harnesses; contrast claims cite proof artifacts, not intent.
- Playwright + the preinstalled Chromium render real pixels — measure, don't
  eyeball, when sizing fixed frames or checking overflow.
