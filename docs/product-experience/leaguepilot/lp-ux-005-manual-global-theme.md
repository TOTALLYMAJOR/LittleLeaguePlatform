---
authority: evidence
answers: null
supersedes: []
superseded_by: null
reviewed: 2026-08-22
---
# LP-UX-005 Manual Global Theme

Date: 2026-08-03

Status: `done-local-browser-verified`

Branch: `ux/lp-ux-001-family-shell`

Continuation: supersedes the former automatic device-dark behavior and the deliberately deferred Family dark theme recorded in 04 §7, 08 A.4, and `lp-ux-004-landing-gateway-browser-verification.md`. The user explicitly approved one app-wide theme with light as the initial state and dark only by opt-in. Deferred `10-reference-implementation-brief.md` remains untouched.

## Decision Applied

LeaguePilot now has one theme contract across public, Family, coach, admin, account, and shared routes:

1. A first visit renders Light, even when the browser or device prefers dark colors.
2. A visible control lets the user select Dark or return to Light from public, Family, or staff chrome.
3. The explicit choice is stored under the versioned local key `leaguepilot-color-theme:v1` and restored before interactive hydration.
4. Route navigation and reload retain the saved choice. There is no `system` state and no remaining `@media (prefers-color-scheme: dark)` application rule.
5. Storage absence, invalid values, and storage access failure all fail safely to Light.

`app/layout.tsx` renders `data-theme="light"` on the root and runs the identified `beforeInteractive` prepaint script with hydration warning suppression limited to the root attribute. `ThemeToggle` changes the root attribute and storage synchronously. The CSS dark system is now selected by `html[data-theme="dark"]`, and the former Family `color-scheme: light` lock is retired.

## Dark Surface Remediation

Browser inspection showed that root tokens alone were insufficient because several later Family features carried literal paper/cream values. The selected-dark layer now binds these surfaces back to semantic tokens without changing their structure or authority:

- Parent Weekly cards, replay, schedule, readiness, deep operations, and mobile navigation.
- Family Mission Control and Family tools.
- Family Access status, Communication Room filters, Parent Replay, transportation, season story, and Team Chat avatars.
- Coach field-mode, verified context, mobile navigation, and role-specific Season Certainty accents.

Team and semantic colors remain accents, but text-bearing dark states use contrast-safe foregrounds. No route, data scope, permission, Supabase adapter, provider behavior, or child-privacy rule changed.

## Browser Verification

`npm run qa:manual-theme-proof` ran against the local Next.js server with the repository demo parent, coach, and admin sessions.

| Contract | Result |
|---|---|
| Dark-preference device with no saved choice | Pass: `/` rendered `data-theme="light"` and `color-scheme: light`. |
| Explicit Dark selection | Pass: `/` changed to dark and remained dark after reload; control changed to `Use light mode`. |
| Explicit return to Light | Pass: signed-in `/parent` remained light after navigation; control changed to `Use dark mode`. |
| All Family routes in selected Dark | Pass: 13 routes at 390×844 and 1440×1000 (26 authenticated results). |
| Staff roles in selected Dark | Pass: `/coach` and `/admin` at 1440×1000. |
| Accessibility and consistency | Pass for the 28 selected-dark authenticated route/viewport checks: zero serious/critical axe findings, zero light content-panel leaks, zero document overflow, and zero browser `pageerror` events. Public theme-state checks also had zero overflow and browser errors; the already-deferred gateway subtext contrast item remains separately recorded. |

Family routes covered: `/parent`, `/parent/family-access`, `/parent/messages`, `/parent/more`, `/parent/photos`, `/parent/practice-recaps`, `/parent/schedule`, `/parent/settings`, `/parent/setup`, `/parent/transportation`, `/account`, `/team-chat`, and `/team-portal`.

Machine-readable evidence: `output/playwright/lp-ux-005-manual-theme/proof.json` (32 results).

Representative screenshots:

- `public-default-light-dark-device.png`
- `public-selected-dark-persisted.png`
- `parent-mobile-390-dark.png`
- `parent-desktop-1440-dark.png`
- `parent-schedule-mobile-390-dark.png`
- `parent-schedule-desktop-1440-dark.png`
- `team-chat-mobile-390-dark.png`
- `team-chat-desktop-1440-dark.png`
- `parent-selected-light.png`
- `coach-selected-dark.png`
- `admin-selected-dark.png`

This is local browser evidence. It is not hosted, deployment, or production acceptance.

## Repository Verification

- `npm run qa:manual-theme-proof` — 32 browser results passed.
- `npm run typecheck` — passed; Next.js route types generated successfully.
- `npm test` — 115 files, 677 tests passed.
- `npm run build` — passed; 103 static-generation jobs completed and standalone assets copied.
- `git diff --check` — passed.

## Explicitly Deferred

1. Hosted persistence and production acceptance are not claimed.
2. The known `.landing-gateway-action.is-primary small` contrast item remains outside this slice.
3. `10-reference-implementation-brief.md` remains untouched as instructed.
4. Sidebar subtitle copy and signed-out coach-facing landing copy remain unchanged.

## Files Changed and Added

- `app/globals.css`
- `app/layout.tsx`
- `app/parent/parent-weekly.css`
- `app/routes-smoke.test.ts`
- `components/ui/AppShell.tsx`
- `components/ui/AppShell.test.tsx`
- `components/ui/ThemeToggle.tsx`
- `lib/theme.ts`
- `lib/theme.test.ts`
- `scripts/capture-manual-theme-proof.mjs`
- `package.json`
- `docs/Features.md`
- `docs/capability-matrix.md`
- `docs/product-experience/leaguepilot/00-engagement-status.md`
- `docs/product-experience/leaguepilot/01-current-experience-audit.md`
- `docs/product-experience/leaguepilot/03-route-and-navigation-map.md`
- `docs/product-experience/leaguepilot/04-production-design-system.md`
- `docs/product-experience/leaguepilot/08-accessibility-and-responsive-contract.md`
- `docs/product-experience/leaguepilot/lp-ux-004-landing-gateway-browser-verification.md`
- `docs/product-experience/leaguepilot/lp-ux-005-manual-global-theme.md`
- `output/playwright/lp-ux-005-manual-theme/`
