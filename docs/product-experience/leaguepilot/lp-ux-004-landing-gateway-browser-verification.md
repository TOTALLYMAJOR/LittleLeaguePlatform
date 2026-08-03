# LP-UX-004 Landing Gateway Browser Verification

Date: 2026-08-03

Status: `done-local-browser-verified`

Branch: `ux/lp-ux-001-family-shell`

Continuation: completes the in-browser gap recorded in `lp-ux-003-landing-gateway-remediation.md` and, after explicit user approval, resolves deferred item 1. Deferred item 3 (`10-reference-implementation-brief.md`) remains untouched.

## Browser Verification

The repo Playwright workflow ran against the local Next.js server at `http://127.0.0.1:3024` with the demo coach session, a persisted `leaguepilot-active-role=coach` cookie, a 1440×1000 viewport, and Playwright `colorScheme: "dark"`.

| Check | Result | Evidence |
|---|---|---|
| A signed-in dark-device visit to `/` redirects to the resolved role home. | Pass — final pathname `/coach`; browser `prefers-color-scheme: dark` matched. | `output/playwright/lp-ux-004-landing-gateway/signed-in-root-redirects-to-coach-dark.png` |
| The staff sidebar brand on `/coach` targets the role home and stays there when clicked. | Pass — rendered `href="/coach"`; final pathname remained `/coach` after click and settled render. | `output/playwright/lp-ux-004-landing-gateway/coach-brand-stays-on-coach-home-dark.png` |
| `/coach` offline-sync footer is a bordered card with separated lines and the required empty-state copy. | Pass — computed `display:grid`, `row-gap:4px`, `border-top:1px solid rgba(231, 222, 209, 0.22)`, and non-overlapping boxes for all three rows. | Coach screenshots above; `output/playwright/lp-ux-004-landing-gateway/proof.json` |
| `/account` offline-sync footer has the same card and copy contract. | Pass — same computed grid, border, gap, exact row text, and non-overlapping boxes. | `output/playwright/lp-ux-004-landing-gateway/account-offline-sync-card-dark.png`; `proof.json` |

Exact rendered footer rows on both routes:

1. `Offline sync`
2. `Nothing waiting to sync.`
3. `Counts only. Message contents and player details are never shown here.`

No browser `pageerror` events were recorded. This is local signed-in rendering evidence only; it is not hosted, provider, deployment, or production acceptance.

## Pre-change Visual Finding

The same screenshots confirm the known staff-shell accidental inversion. In dark mode the main canvas correctly follows dark tokens, but the desktop sidebar remains cream because the higher-specificity critical rule in `app/layout.tsx` pins `.sidebar.app-sidebar` to `background:#fdf8f1`. The cream backdrop gradients in `app/globals.css` reinforce that light surface while `.brand strong` and `.brand small` correctly consume dark-mode `var(--text)` and `var(--muted)`.

Against `#fdf8f1`, the current dark-token brand colors compute to approximately:

- Brand `#f6f1e9`: 1.06:1.
- Subtitle `#c6beb3`: 1.74:1.

That observation matches the deliberate staff-shell debt recorded in 04 §7 and the no-accidental-inversion rule in 08 A.4. It does not change the LP-UX-003 browser verdict: the requested redirect, role-home brand destination, and offline footer fixes all pass.

## Approved Change Applied

The user approved beginning the staff-shell dark-skin correction. The existing sidebar now follows the same semantic light/dark tokens as the rest of the staff shell while preserving its video texture and light-mode composition.

1. In `app/layout.tsx` critical shell CSS, three hard-coded light paints now use semantic tokens with the same light fallbacks:
   - `border-right:1px solid #e7ded1` → `border-right:1px solid var(--line,#e7ded1)`
   - `background:#fdf8f1` → `background:var(--bg,#fdf8f1)`
   - inactive `.nav a` `color:#68665f` → `color:var(--muted,#68665f)`
2. In `app/globals.css`, replace the cream `.sidebar-video-backdrop span` paint with the equivalent semantic gradients:

   ```css
   background:
     linear-gradient(
       180deg,
       color-mix(in srgb, var(--bg) 82%, transparent),
       color-mix(in srgb, var(--bg) 90%, transparent) 48%,
       color-mix(in srgb, var(--bg) 94%, transparent)
     ),
     linear-gradient(90deg, color-mix(in srgb, var(--accent) 6%, transparent), transparent 56%);
   ```

3. `.brand` and navigation text keep their established token roles. No new palette, component, layout, motion, or visible copy was introduced.

Visual inspection after the initial two-paint correction exposed the coupled inactive-navigation literal in the same critical CSS. It was included because it became low contrast only after the sidebar correctly changed to dark. This keeps the correction within the approved staff-sidebar scope and prevents a new accidental inversion.

## Sidebar Theme Verification

The repo Playwright pattern reran with the demo coach session at 1440×1000 across `/coach` and `/account` in both device preferences.

| Mode and routes | Result |
|---|---|
| Dark `/coach`, `/account` | Sidebar `rgb(17, 24, 33)`; brand 15.88:1; subtitle, inactive navigation, and section labels 9.71:1. |
| Light `/coach`, `/account` | Sidebar `rgb(253, 248, 241)`; brand 14.63:1; subtitle, inactive navigation, and section labels 5.44:1. |

All four states retained the staff shell, matched the 1440px document width without horizontal overflow, kept the local video visible at `opacity:0.13`, retained a token-resolved scrim, and recorded no browser `pageerror` events. Machine-readable evidence: `output/playwright/lp-ux-004-landing-gateway/sidebar-theme-proof.json`.

This is local signed-in browser evidence. It is not hosted, deployment, or production acceptance. The Family light-only statement was accurate for this verification and was later superseded by the explicit app-wide manual-theme decision and proof in `lp-ux-005-manual-global-theme.md`.

## Repository Validation

- `npx vitest run app/routes-smoke.test.ts` - 19 tests passed after the source-contract assertion was updated from the retired cream literal to the semantic sidebar tokens.
- `npm test` - 114 files, 672 tests passed.
- `npm run typecheck` - clean; Next.js route types generated successfully.
- `npm run build` - production build completed successfully, including all 103 static-generation jobs and the standalone asset copy.
- `git diff --check` - clean.

## Explicitly Deferred

1. **`.landing-gateway-action.is-primary small` 3.85:1 contrast:** untouched.
2. **`10-reference-implementation-brief.md`:** untouched as instructed.
3. **Sidebar brand subtitle `Little League HQ demo`:** untouched.
4. **Signed-out coach-facing landing path/copy:** untouched.

## Files Changed and Added

- `app/layout.tsx`
- `app/globals.css`
- `app/routes-smoke.test.ts`
- `docs/Features.md`
- `docs/product-experience/leaguepilot/lp-ux-004-landing-gateway-browser-verification.md`
- `output/playwright/lp-ux-004-landing-gateway/signed-in-root-redirects-to-coach-dark.png`
- `output/playwright/lp-ux-004-landing-gateway/coach-brand-stays-on-coach-home-dark.png`
- `output/playwright/lp-ux-004-landing-gateway/account-offline-sync-card-dark.png`
- `output/playwright/lp-ux-004-landing-gateway/proof.json`
- `output/playwright/lp-ux-004-landing-gateway/coach-sidebar-dark-after.png`
- `output/playwright/lp-ux-004-landing-gateway/account-sidebar-dark-after.png`
- `output/playwright/lp-ux-004-landing-gateway/coach-sidebar-light-after.png`
- `output/playwright/lp-ux-004-landing-gateway/account-sidebar-light-after.png`
- `output/playwright/lp-ux-004-landing-gateway/sidebar-theme-proof.json`
